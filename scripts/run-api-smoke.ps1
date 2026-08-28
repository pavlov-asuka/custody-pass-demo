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
        $payload = [ordered]@{}
        foreach ($key in @($Body.Keys)) {
            $value = $Body[$key]
            if ($value -is [System.Array]) {
                $list = [System.Collections.Generic.List[object]]::new()
                foreach ($item in @($value)) { $list.Add($item) }
                $payload[$key] = $list
            }
            else { $payload[$key] = $value }
        }
        $parameters.Body = ($payload | ConvertTo-Json -Depth 20 -Compress)
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
    $accountingWorld = @($worlds.worlds | Where-Object line -eq 'ACCOUNTING')[0]
    if ($accountingWorld.publishedRequiredRoutes -ne 39 -or
        $accountingWorld.passedRequiredRoutes -ne 0 -or
        $accountingWorld.progressPercent -ne 0) {
        throw 'ACCOUNTING world required progress is not line-scoped'
    }
    $clearingWorld = @($worlds.worlds | Where-Object line -eq 'CLEARING')[0]
    if ($clearingWorld.availability -ne 'OPEN' -or
        $clearingWorld.publishedRequiredRoutes -ne 7 -or
        $clearingWorld.passedRequiredRoutes -ne 0 -or
        $clearingWorld.progressPercent -ne 0 -or
        $clearingWorld.status -ne 'NOT_STARTED') {
        throw 'CLEARING world is not OPEN with seven untouched required routes'
    }
    $supervisionWorld = @($worlds.worlds | Where-Object line -eq 'SUPERVISION')[0]
    if ($supervisionWorld.availability -ne 'OPEN' -or
        $supervisionWorld.publishedRequiredRoutes -ne 4 -or
        $supervisionWorld.passedRequiredRoutes -ne 0 -or
        $supervisionWorld.progressPercent -ne 0 -or
        $supervisionWorld.status -ne 'NOT_STARTED') {
        throw 'SUPERVISION world is not OPEN with four untouched required routes'
    }

    $clearingMap = Invoke-JsonApi -Method GET -Path '/api/lines/CLEARING/map'
    $clearingNodes = @($clearingMap.regions | ForEach-Object modules |
        ForEach-Object nodes | ForEach-Object { $_ })
    if ($clearingNodes.Count -ne 7) { throw 'CLEARING map does not expose seven nodes' }
    $baseNode = @($clearingNodes | Where-Object routeId -eq 'CLR-BASE-001')[0]
    if ($null -eq $baseNode -or $baseNode.locked -or -not $baseNode.enterable) {
        throw 'CLEARING BASE route should be unlocked and enterable'
    }
    foreach ($lockedRouteId in @('CLR-FUND-PAYMENT-001', 'CLR-EX-CORE-001',
            'CLR-IB-INSTRUCTION-001', 'CLR-FUND-CLOSE-002', 'CLR-EX-FUNDS-002',
            'CLR-IB-DVP-CLOSE-002')) {
        $lockedNode = @($clearingNodes | Where-Object routeId -eq $lockedRouteId)[0]
        if ($null -eq $lockedNode -or -not $lockedNode.locked -or $lockedNode.enterable) {
            throw "CLEARING route should remain locked before BASE: $lockedRouteId"
        }
    }
    $clearingRoute = Invoke-JsonApi -Method GET -Path '/api/routes/CLR-BASE-001'
    if ($clearingRoute.routeId -ne 'CLR-BASE-001' -or
        $clearingRoute.state -ne 'NOT_STARTED' -or
        -not $clearingRoute.enterable -or
        [string]::IsNullOrWhiteSpace([string]$clearingRoute.contentVersion) -or
        [string]::IsNullOrWhiteSpace([string]$clearingRoute.rubricVersion)) {
        throw 'CLEARING BASE route is not publicly readable'
    }
    $supervisionMap = Invoke-JsonApi -Method GET -Path '/api/lines/SUPERVISION/map'
    $supervisionNodes = @($supervisionMap.regions | ForEach-Object modules |
        ForEach-Object nodes | ForEach-Object { $_ })
    if ($supervisionNodes.Count -ne 4 -or
        $supervisionNodes[0].routeId -ne 'SPV-CONTRACT-001' -or
        $supervisionNodes[0].locked -or -not $supervisionNodes[0].enterable -or
        $supervisionNodes[1].locked -eq $false -or
        $supervisionNodes[2].locked -eq $false -or
        $supervisionNodes[3].locked -eq $false) {
        throw 'SUPERVISION map does not expose the four-route required chain'
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
    $q2 = Answer-Basic -QuestionId 'ACC-ROLE-Q-02' -Answer @('B') -ContentVersion $contentVersion
    $q3 = Answer-Basic -QuestionId 'ACC-ROLE-Q-03' `
        -Answer @('SOURCE', 'CALC', 'POST', 'RECON') -ContentVersion $contentVersion
    if (-not $q1.correct -or -not $q2.correct -or -not $q3.practiceCompleted) {
        throw 'basic practice did not complete'
    }

    $draft = Invoke-JsonApi -Method PUT -Path "/api/routes/$routeId/draft" `
        -Headers $csrfHeaders `
        -Body @{
            contentVersion = $contentVersion
            answer = @{ responses = @{
                'payment-source' = 'BANK-STATEMENT'; 'ending-payable' = 800
            } }
            expectedRevision = 0
        }
    if ($draft.revision -lt 1) { throw 'draft revision was not created' }

    $answer = @{ responses = @{
        'payment-source' = 'BANK-STATEMENT'; 'ending-payable' = 800
        'debit-account' = '应付托管费'; 'credit-account' = '银行存款'
        'reconciliation-result' = 'BALANCED'
        'result-note' = '当日支付托管费1400元，期末应付托管费800元，资金、台账和估值结果勾稽一致。'
    } }
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
    $nextNode = @($allNodes | Where-Object routeId -eq 'ACC-LIFE-ONBOARD-002')[0]
    if ($nextNode.locked -or -not $nextNode.enterable) {
        throw 'next published node should be unlocked and enterable'
    }
    $records = Invoke-JsonApi -Method GET `
        -Path '/api/training-records?page=0&size=10&line=ACCOUNTING&conclusion=PASSED'
    if ($records.totalElements -lt 1) { throw 'training history is missing' }
    $history = Invoke-JsonApi -Method GET -Path "/api/training-records/$($attempt.attemptId)"
    if ($history.historicalConclusion -ne 'PASSED') { throw 'history snapshot mismatch' }

    $null = Invoke-JsonApi -Method POST -Path '/api/auth/logout' -Headers $csrfHeaders
    $summary = ("baseline-http-smoke=ok; user={0}; worlds=3; clearingNodes=7; route={1}; attempt={2}; " +
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
