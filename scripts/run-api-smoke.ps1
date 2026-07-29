[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $BaseUrl,

    [string] $EmployeeNo = '10000002',

    [Parameter(Mandatory = $true)]
    [SecureString] $Password
)

$ErrorActionPreference = 'Stop'
$routeId = 'ACC-LIFE-ROLE-001'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$passwordPointer = [IntPtr]::Zero
$plainPassword = $null
$csrfHeaders = @{}

function Invoke-JsonApi {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('GET', 'POST', 'PUT')]
        [string] $Method,
        [Parameter(Mandatory = $true)]
        [string] $Path,
        $Body,
        [hashtable] $Headers = @{}
    )

    $requestHeaders = @{ Accept = 'application/json' }
    foreach ($key in $Headers.Keys) { $requestHeaders[$key] = [string]$Headers[$key] }
    $parameters = @{
        Uri = ($BaseUrl.TrimEnd('/') + '/' + $Path.TrimStart('/'))
        Method = $Method
        Headers = $requestHeaders
        WebSession = $session
        UseBasicParsing = $true
        ErrorAction = 'Stop'
    }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json; charset=utf-8'
        $parameters.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
    }
    $response = Invoke-WebRequest @parameters
    if ([string]::IsNullOrWhiteSpace($response.Content)) { return $null }
    return $response.Content | ConvertFrom-Json
}

function New-RequestId {
    return 'smoke-' + [Guid]::NewGuid().ToString('N')
}

function Complete-Step {
    param([string] $StepType, [string] $ContentVersion)
    return Invoke-JsonApi -Method POST `
        -Path "/api/routes/$routeId/steps/$StepType/complete" `
        -Headers $csrfHeaders `
        -Body @{
            eventId = New-RequestId
            contentVersion = $ContentVersion
        }
}

function Answer-Basic {
    param([string] $QuestionId, [string[]] $Answer, [string] $ContentVersion)
    return Invoke-JsonApi -Method POST `
        -Path "/api/routes/$routeId/basic-practice/$QuestionId/answers" `
        -Headers $csrfHeaders `
        -Body @{
            requestId = New-RequestId
            contentVersion = $ContentVersion
            answer = $Answer
        }
}

try {
    $health = Invoke-JsonApi -Method GET -Path '/api/health'
    if ($health.status -ne 'UP') { throw 'health status is not UP' }

    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $csrf = Invoke-JsonApi -Method GET -Path '/api/auth/csrf'
    if ([string]::IsNullOrWhiteSpace($csrf.headerName) -or
        [string]::IsNullOrWhiteSpace($csrf.token)) {
        throw 'CSRF response is incomplete'
    }
    $csrfHeaders[$csrf.headerName] = $csrf.token
    $null = Invoke-JsonApi -Method POST -Path '/api/auth/login' -Headers $csrfHeaders `
        -Body @{ employeeNo = $EmployeeNo; password = $plainPassword }
    $me = Invoke-JsonApi -Method GET -Path '/api/auth/me'
    if ($me.employeeNo -ne $EmployeeNo) { throw 'authenticated user mismatch' }

    $worlds = Invoke-JsonApi -Method GET -Path '/api/worlds'
    if (@($worlds.worlds).Count -ne 3) { throw 'world count is not 3' }
    if ((@($worlds.worlds | Where-Object line -eq 'ACCOUNTING'))[0].availability -ne 'OPEN') {
        throw 'ACCOUNTING world is not OPEN'
    }
    foreach ($buildingLine in @('CLEARING', 'SUPERVISION')) {
        if ((@($worlds.worlds | Where-Object line -eq $buildingLine))[0].availability -ne 'BUILDING') {
            throw "$buildingLine world is not BUILDING"
        }
    }

    $mapBefore = Invoke-JsonApi -Method GET -Path '/api/lines/ACCOUNTING/map'
    $overview = Invoke-JsonApi -Method GET -Path "/api/routes/$routeId"
    $contentVersion = [string]$overview.contentVersion
    $rubricVersion = [string]$overview.rubricVersion
    if ([string]::IsNullOrWhiteSpace($contentVersion) -or
        [string]::IsNullOrWhiteSpace($rubricVersion)) {
        throw 'route versions are missing'
    }

    $null = Invoke-JsonApi -Method GET -Path "/api/routes/$routeId/steps/KNOWLEDGE_CARD"
    $null = Complete-Step -StepType 'KNOWLEDGE_CARD' -ContentVersion $contentVersion
    $null = Invoke-JsonApi -Method GET -Path "/api/routes/$routeId/steps/DEMONSTRATION"
    $null = Complete-Step -StepType 'DEMONSTRATION' -ContentVersion $contentVersion
    $null = Invoke-JsonApi -Method GET -Path "/api/routes/$routeId/steps/BASIC_PRACTICE"
    $q1 = Answer-Basic -QuestionId 'ACC-ROLE-Q-01' -Answer @('B') -ContentVersion $contentVersion
    $q2 = Answer-Basic -QuestionId 'ACC-ROLE-Q-02' -Answer @('A', 'B', 'D') -ContentVersion $contentVersion
    $q3 = Answer-Basic -QuestionId 'ACC-ROLE-Q-03' `
        -Answer @('FACT', 'CHECK', 'ACTION', 'FEEDBACK') -ContentVersion $contentVersion
    if (-not $q1.correct -or -not $q2.correct -or -not $q3.practiceCompleted) {
        throw 'basic practice did not complete'
    }

    $draft = Invoke-JsonApi -Method PUT -Path "/api/routes/$routeId/draft" `
        -Headers $csrfHeaders `
        -Body @{
            contentVersion = $contentVersion
            answer = 'HTTP smoke 自动保存草稿'
            expectedRevision = 0
        }
    if ($draft.revision -lt 1) { throw 'draft revision was not created' }

    $answer = @'
事实：7月9日托管费指令已执行但余额未变。核算岗不只是录入，我对组合责任和结果负责。
核查：先核实再判断，核查数据接收、资金执行、凭证、账务结果、估值结果和余额；执行成功不代表业务结果正确，系统成功不等于人工核验。
措施：协调相关岗位复核，按权限处理，超出权限及时报告和升级，不擅自修改。
责任人：本人持续跟进，识别可能影响账务、估值、净值及下游结果。
反馈：异常消除后复核，向管理人反馈结论，保存证据和处理记录，持续跟踪闭环。
'@
    $requestId = New-RequestId
    $attempt = Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -Body @{
            clientRequestId = $requestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $answer
        }
    $duplicate = Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -Body @{
            clientRequestId = $requestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $answer
        }
    if ($attempt.attemptId -ne $duplicate.attemptId) { throw 'formal submission is not idempotent' }

    $terminal = $null
    for ($poll = 0; $poll -lt 100; $poll += 1) {
        $terminal = Invoke-JsonApi -Method GET -Path "/api/attempts/$($attempt.attemptId)"
        if ($terminal.processingStatus -ne 'SCORING') { break }
        Start-Sleep -Milliseconds 100
    }
    if ($terminal.processingStatus -ne 'COMPLETED') {
        throw "attempt did not complete: $($terminal.processingStatus)"
    }
    if ($terminal.historicalConclusion -ne 'PASSED' -or
        $terminal.currentRouteState -ne 'PASSED') {
        throw 'formal route did not pass'
    }

    $mapAfter = Invoke-JsonApi -Method GET -Path '/api/lines/ACCOUNTING/map'
    $allNodes = @($mapAfter.regions | ForEach-Object modules |
        ForEach-Object nodes | ForEach-Object { $_ })
    $nextNode = @($allNodes | Where-Object routeId -eq 'ACC-LIFE-TAKEOVER-001')[0]
    if ($nextNode.locked -or $nextNode.enterable) {
        throw 'next BUILDING node should be unlocked for display but not enterable'
    }
    $records = Invoke-JsonApi -Method GET `
        -Path '/api/training-records?page=0&size=10&line=ACCOUNTING&conclusion=PASSED'
    if ($records.totalElements -lt 1) { throw 'training history is missing' }
    $history = Invoke-JsonApi -Method GET -Path "/api/training-records/$($attempt.attemptId)"
    if ($history.historicalConclusion -ne 'PASSED') { throw 'history snapshot mismatch' }

    $null = Invoke-JsonApi -Method POST -Path '/api/auth/logout' -Headers $csrfHeaders
    $summary = ("phase2-http-smoke=ok; user={0}; worlds=3; route={1}; attempt={2}; " +
        "status=COMPLETED; conclusion=PASSED; nextNodeUnlocked=true; records={3}") -f `
        $EmployeeNo, $routeId, $attempt.attemptId, $records.totalElements
    Write-Output $summary
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $plainPassword = $null
    $Password = $null
    $csrfHeaders = @{}
    $session = $null
}
