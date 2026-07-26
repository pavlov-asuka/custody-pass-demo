[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $BaseUrl,

    [Parameter(Mandatory = $true)]
    [string] $EmployeeNo,

    [switch] $SkipMutation
)

$ErrorActionPreference = 'Stop'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$securePassword = $null
$plainPassword = $null
$passwordBstr = [IntPtr]::Zero
$csrfHeaders = @{}
$healthStatus = $null
$loggedIn = $false
$exitCode = 0

function Get-FieldValue {
    param(
        [Parameter(Mandatory = $false)] $Object,
        [Parameter(Mandatory = $true)] [string[]] $Names
    )

    if ($null -eq $Object) { return $null }
    foreach ($name in $Names) {
        $property = $Object.PSObject.Properties[$name]
        if ($null -ne $property) { return $property.Value }
    }
    return $null
}

function Get-Collection {
    param(
        [Parameter(Mandatory = $false)] $Object,
        [Parameter(Mandatory = $true)] [string[]] $Names
    )

    if ($null -eq $Object) { return @() }
    if ($Object -is [System.Array]) { return @($Object) }

    foreach ($name in $Names) {
        $value = Get-FieldValue -Object $Object -Names @($name)
        if ($null -ne $value) { return @($value) }
    }
    return @($Object)
}

function Invoke-JsonApi {
    param(
        [Parameter(Mandatory = $true)] [ValidateSet('GET', 'POST')] [string] $Method,
        [Parameter(Mandatory = $true)] [string] $Path,
        [Parameter(Mandatory = $false)] $Body,
        [Parameter(Mandatory = $false)] [hashtable] $Headers = @{}
    )

    $requestHeaders = @{ Accept = 'application/json' }
    foreach ($key in $Headers.Keys) { $requestHeaders[$key] = [string]$Headers[$key] }
    $uri = ($BaseUrl.TrimEnd('/') + '/' + $Path.TrimStart('/'))
    $parameters = @{
        Uri = $uri
        Method = $Method
        Headers = $requestHeaders
        WebSession = $session
        UseBasicParsing = $true
        ErrorAction = 'Stop'
    }
    if ($null -ne $Body) {
        $parameters['ContentType'] = 'application/json; charset=utf-8'
        $parameters['Body'] = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }

    $response = Invoke-WebRequest @parameters
    if ([string]::IsNullOrWhiteSpace($response.Content)) { return $null }
    return ($response.Content | ConvertFrom-Json)
}

try {
    $healthResponse = Invoke-JsonApi -Method GET -Path '/api/health'
    $healthStatus = [string](Get-FieldValue -Object $healthResponse -Names @('status'))
    if ($healthStatus -ne 'UP') { throw 'health status not UP' }

    $securePassword = Read-Host 'Password' -AsSecureString
    $passwordBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordBstr)

    $csrfResponse = Invoke-JsonApi -Method GET -Path '/api/auth/csrf'
    $csrfHeaderName = [string](Get-FieldValue -Object $csrfResponse -Names @('headerName'))
    $csrfToken = [string](Get-FieldValue -Object $csrfResponse -Names @('token', 'csrfToken', 'value'))
    if ([string]::IsNullOrWhiteSpace($csrfHeaderName)) { throw 'csrf header name missing' }
    if ([string]::IsNullOrWhiteSpace($csrfToken)) { throw 'csrf token missing' }
    $csrfHeaders[$csrfHeaderName] = $csrfToken

    $loginBody = @{ employeeNo = $EmployeeNo; password = $plainPassword }
    $null = Invoke-JsonApi -Method POST -Path '/api/auth/login' -Body $loginBody -Headers $csrfHeaders
    $loggedIn = $true
    $null = Invoke-JsonApi -Method GET -Path '/api/auth/me' -Headers $csrfHeaders

    $casesResponse = Invoke-JsonApi -Method GET -Path '/api/cases' -Headers $csrfHeaders
    $cases = @(Get-Collection -Object $casesResponse -Names @('items', 'cases', 'data'))
    if ($cases.Count -eq 0) { throw 'no cases returned' }
    $caseId = [string](Get-FieldValue -Object $cases[0] -Names @('caseId', 'id'))
    if ([string]::IsNullOrWhiteSpace($caseId)) { throw 'case id missing' }

    $score = 'skipped'
    $scoreReviewerMode = 'skipped'
    if (-not $SkipMutation) {
        $answerBody = @{
            answer = '本题为部署冒烟测试占位答案：先核对业务事实、适用规则、估值或清算数据及复核留痕，再说明风险与处置建议。'
            clientRequestId = [Guid]::NewGuid().ToString()
        }
        $scoreResponse = Invoke-JsonApi -Method POST -Path ("/api/cases/{0}/submissions" -f $caseId) -Body $answerBody -Headers $csrfHeaders
        $scoreValue = Get-FieldValue -Object $scoreResponse -Names @('totalScore', 'score', 'total')
        if ($null -ne $scoreValue) { $score = [string]$scoreValue }
        $modeValue = Get-FieldValue -Object $scoreResponse -Names @('reviewerMode', 'reviewMode', 'answerMode', 'mode')
        if ($null -ne $modeValue) { $scoreReviewerMode = [string]$modeValue }
    }

    $recordsResponse = Invoke-JsonApi -Method GET -Path '/api/training-records' -Headers $csrfHeaders
    $records = @(Get-Collection -Object $recordsResponse -Names @('items', 'records', 'data'))
    $topicsResponse = Invoke-JsonApi -Method GET -Path '/api/knowledge/topics' -Headers $csrfHeaders
    $topics = @(Get-Collection -Object $topicsResponse -Names @('items', 'topics', 'data'))
    $questionBody = @{ question = '估值核对通常需要关注哪些方面？' }
    $questionResponse = Invoke-JsonApi -Method POST -Path '/api/knowledge/questions' -Body $questionBody -Headers $csrfHeaders
    $answerModeValue = Get-FieldValue -Object $questionResponse -Names @('answerMode', 'mode')
    $qaMode = if ($null -ne $answerModeValue) { [string]$answerModeValue } else { 'returned' }
    $null = Invoke-JsonApi -Method POST -Path '/api/auth/logout' -Headers $csrfHeaders
    $loggedIn = $false

    Write-Output ("status=ok; health={0}; cases={1}; score={2}; scoreReviewerMode={3}; records={4}; knowledgeTopics={5}; knowledgeAnswerMode={6}; logout=ok" -f $healthStatus, $cases.Count, $score, $scoreReviewerMode, $records.Count, $topics.Count, $qaMode)
}
catch {
    $exitCode = 1
    Write-Error ("Smoke test failed: {0}" -f $_.Exception.GetType().Name)
}
finally {
    if ($loggedIn) {
        try { $null = Invoke-JsonApi -Method POST -Path '/api/auth/logout' -Headers $csrfHeaders } catch { }
    }
    if ($passwordBstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordBstr)
    }
    $passwordBstr = [IntPtr]::Zero
    $plainPassword = $null
    $securePassword = $null
    $loginBody = $null
    $answerBody = $null
    $csrfToken = $null
    $csrfHeaderName = $null
    $csrfHeaders = @{}
    $session = $null
}

if ($exitCode -ne 0) { exit $exitCode }
