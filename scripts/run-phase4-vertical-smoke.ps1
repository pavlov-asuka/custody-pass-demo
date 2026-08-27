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
$nextRouteId = 'ACC-LIFE-ONBOARD-002'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$passwordPointer = [IntPtr]::Zero
$plainPassword = $null
$csrfHeaders = @{}
$evidence = [ordered]@{}

function ConvertTo-ApiJson {
    param($Body)
    if ($null -eq $Body) { return $null }
    $map = [ordered]@{}
    foreach ($key in @($Body.Keys)) {
        $value = $Body[$key]
        if ($value -is [System.Array]) {
            $list = [System.Collections.Generic.List[object]]::new()
            foreach ($item in @($value)) { $list.Add($item) }
            $map[$key] = $list
        }
        else {
            $map[$key] = $value
        }
    }
    return ($map | ConvertTo-Json -Depth 20 -Compress)
}

function Invoke-JsonApi {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('GET', 'POST', 'PUT')]
        [string] $Method,
        [Parameter(Mandatory = $true)]
        [string] $Path,
        $Body,
        [hashtable] $Headers = @{},
        [int] $ExpectedStatus = 200
    )

    $requestHeaders = @{ Accept = 'application/json' }
    foreach ($key in $Headers.Keys) { $requestHeaders[$key] = [string]$Headers[$key] }
    $parameters = @{
        Uri = ($BaseUrl.TrimEnd('/') + '/' + $Path.TrimStart('/'))
        Method = $Method
        Headers = $requestHeaders
        WebSession = $session
        UseBasicParsing = $true
        SkipHttpErrorCheck = $true
    }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json; charset=utf-8'
        $parameters.Body = ConvertTo-ApiJson -Body $Body
    }

    $response = Invoke-WebRequest @parameters
    $statusCode = [int]$response.StatusCode
    $content = $response.Content
    if ($content -is [byte[]]) {
        $content = [System.Text.Encoding]::UTF8.GetString($content)
    }
    if ($statusCode -ne $ExpectedStatus) {
        throw ("unexpected status {0} for {1} {2}: {3}" -f $statusCode, $Method, $Path, $content)
    }
    if ([string]::IsNullOrWhiteSpace($content)) {
        return [pscustomobject]@{ StatusCode = $statusCode; Body = $null }
    }
    return [pscustomobject]@{
        StatusCode = $statusCode
        Body = ($content | ConvertFrom-Json)
    }
}

function New-RequestId {
    return 'p4-' + [Guid]::NewGuid().ToString('N')
}

function Assert-True {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) { throw $Message }
}

function Complete-Step {
    param([string] $StepType, [string] $ContentVersion)
    return (Invoke-JsonApi -Method POST `
        -Path "/api/routes/$routeId/steps/$StepType/complete" `
        -Headers $csrfHeaders `
        -Body @{
            eventId = New-RequestId
            contentVersion = $ContentVersion
        }).Body
}

function Answer-Basic {
    param([string] $QuestionId, [string[]] $Answer, [string] $ContentVersion)
    return (Invoke-JsonApi -Method POST `
        -Path "/api/routes/$routeId/basic-practice/$QuestionId/answers" `
        -Headers $csrfHeaders `
        -Body @{
            requestId = New-RequestId
            contentVersion = $ContentVersion
            answer = $Answer
        }).Body
}

function Await-Terminal {
    param([long] $AttemptId)
    $terminal = $null
    for ($poll = 0; $poll -lt 100; $poll += 1) {
        $terminal = (Invoke-JsonApi -Method GET -Path "/api/attempts/$AttemptId").Body
        if ($terminal.processingStatus -ne 'SCORING') { return $terminal }
        Start-Sleep -Milliseconds 100
    }
    throw "attempt $AttemptId did not leave SCORING"
}

function Get-CorrectAnswer {
    param([string] $QuestionId)
    switch ($QuestionId) {
        'ACC-ROLE-Q-01' { return [string[]]@('B') }
        'ACC-ROLE-Q-02' { return [string[]]@('B') }
        'ACC-ROLE-Q-03' { return [string[]]@('SOURCE', 'CALC', 'POST', 'RECON') }
        default { throw "unknown questionId $QuestionId" }
    }
}

function Complete-Remediation {
    param([long] $AttemptId)
    $plan = (Invoke-JsonApi -Method GET -Path "/api/attempts/$AttemptId/remediation").Body
    Assert-True ($plan.totalTargets -gt 0) 'remediation plan has no targets'
    foreach ($target in @($plan.targets)) {
        $questionId = [string]$target.practice.questionId
        $answer = @(Get-CorrectAnswer -QuestionId $questionId)
        $feedback = (Invoke-JsonApi -Method POST `
            -Path "/api/attempts/$AttemptId/remediation/$($target.targetId)/answers" `
            -Headers $csrfHeaders `
            -Body @{
                requestId = New-RequestId
                answer = $answer
            }).Body
        Assert-True ([bool]$feedback.correct) "remediation target $($target.targetId) was not correct"
        $feedbackJson = $feedback | ConvertTo-Json -Depth 8 -Compress
        Assert-True ($feedbackJson -notmatch '"correctAnswer"') 'remediation feedback leaked correctAnswer'
    }
    $completed = (Invoke-JsonApi -Method GET -Path "/api/attempts/$AttemptId/remediation").Body
    Assert-True ([bool]$completed.completed) 'remediation plan not completed'
    Assert-True ([bool]$completed.practiceRetryUnlocked) 'comprehensive practice retry not unlocked after remediation'
    return [pscustomobject]@{
        TotalTargets = [int]$plan.totalTargets
        CompletedTargets = [int]$completed.completedTargets
    }
}

function Get-AllNodes {
    param($MapBody)
    return @($MapBody.regions | ForEach-Object { $_.modules } | ForEach-Object { $_.nodes } | ForEach-Object { $_ })
}

$failingAnswer = @{ responses = @{
    'payment-source' = 'PAYMENT-INSTRUCTION'; 'ending-payable' = 0
    'debit-account' = '银行存款'; 'credit-account' = '应付托管费'
    'reconciliation-result' = 'UNBALANCED'; 'result-note' = '已处理。'
} }
$passingAnswer = @{ responses = @{
    'payment-source' = 'BANK-STATEMENT'; 'ending-payable' = 800
    'debit-account' = '应付托管费'; 'credit-account' = '银行存款'
    'reconciliation-result' = 'BALANCED'
    'result-note' = '当日支付托管费1400元，期末应付托管费800元，资金、台账和估值结果勾稽一致。'
} }

try {
    $health = (Invoke-JsonApi -Method GET -Path '/api/health').Body
    Assert-True ($health.status -eq 'UP') 'health is not UP'

    $unauthorized = Invoke-JsonApi -Method GET -Path '/api/worlds' -ExpectedStatus 401
    Assert-True ($unauthorized.StatusCode -eq 401) 'unauthenticated worlds access must be 401'
    $evidence['unauthenticatedBlocked'] = $true

    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $csrf = (Invoke-JsonApi -Method GET -Path '/api/auth/csrf').Body
    Assert-True (-not [string]::IsNullOrWhiteSpace($csrf.headerName)) 'csrf headerName missing'
    Assert-True (-not [string]::IsNullOrWhiteSpace($csrf.token)) 'csrf token missing'
    $csrfHeaders[$csrf.headerName] = $csrf.token
    $null = Invoke-JsonApi -Method POST -Path '/api/auth/login' -Headers $csrfHeaders `
        -Body @{ employeeNo = $EmployeeNo; password = $plainPassword }
    $me = (Invoke-JsonApi -Method GET -Path '/api/auth/me').Body
    Assert-True ($me.employeeNo -eq $EmployeeNo) 'authenticated user mismatch'
    $evidence['employeeNo'] = $EmployeeNo

    $worlds = (Invoke-JsonApi -Method GET -Path '/api/worlds').Body
    Assert-True (@($worlds.worlds).Count -eq 3) 'world count is not 3'
    Assert-True ((@($worlds.worlds | Where-Object line -eq 'ACCOUNTING'))[0].availability -eq 'OPEN') `
        'ACCOUNTING is not OPEN'
    foreach ($openLine in @('ACCOUNTING', 'CLEARING', 'SUPERVISION')) {
        Assert-True ((@($worlds.worlds | Where-Object line -eq $openLine))[0].availability -eq 'OPEN') `
            "$openLine is not OPEN"
    }
    $clearingMap = Invoke-JsonApi -Method GET -Path '/api/lines/CLEARING/map'
    $clearingNodes = @(Get-AllNodes $clearingMap.Body)
    Assert-True ($clearingNodes.Count -eq 7) 'CLEARING map must expose seven nodes'
    $supervisionMap = Invoke-JsonApi -Method GET -Path '/api/lines/SUPERVISION/map'
    $supervisionNodes = @(Get-AllNodes $supervisionMap.Body)
    Assert-True ($supervisionNodes.Count -eq 4) 'SUPERVISION map must expose four nodes'

    $mapBefore = (Invoke-JsonApi -Method GET -Path '/api/lines/ACCOUNTING/map').Body
    $nextBefore = @(Get-AllNodes $mapBefore | Where-Object routeId -eq $nextRouteId)[0]
    Assert-True ($nextBefore.locked -eq $true) 'next node must start locked'
    $evidence['mapBeforeNextLocked'] = [bool]$nextBefore.locked

    $overview = (Invoke-JsonApi -Method GET -Path "/api/routes/$routeId").Body
    $contentVersion = [string]$overview.contentVersion
    $rubricVersion = [string]$overview.rubricVersion
    Assert-True (-not [string]::IsNullOrWhiteSpace($contentVersion)) 'contentVersion missing'
    Assert-True (-not [string]::IsNullOrWhiteSpace($rubricVersion)) 'rubricVersion missing'

    $sequenceBlocked = Invoke-JsonApi -Method GET `
        -Path "/api/routes/$routeId/steps/DEMONSTRATION" -ExpectedStatus 409
    Assert-True ($sequenceBlocked.Body.code -eq 'LEARNING_SEQUENCE_VIOLATION') `
        'sequence gate did not block demonstration'
    $evidence['sequenceGate'] = 'LEARNING_SEQUENCE_VIOLATION'

    $knowledge = (Invoke-JsonApi -Method GET -Path "/api/routes/$routeId/steps/KNOWLEDGE_CARD").Body
    $knowledgeJson = $knowledge | ConvertTo-Json -Depth 20 -Compress
    Assert-True ($knowledgeJson -notmatch 'referenceAnswer|mandatoryRequirements|"keywords"') `
        'knowledge step leaked private scoring assets'
    $null = Complete-Step -StepType 'KNOWLEDGE_CARD' -ContentVersion $contentVersion
    $null = Complete-Step -StepType 'KNOWLEDGE_CARD' -ContentVersion $contentVersion
    $null = Invoke-JsonApi -Method GET -Path "/api/routes/$routeId/steps/KNOWLEDGE_CARD"
    $null = Invoke-JsonApi -Method GET -Path "/api/routes/$routeId/steps/DEMONSTRATION"
    $null = Complete-Step -StepType 'DEMONSTRATION' -ContentVersion $contentVersion

    $basic = (Invoke-JsonApi -Method GET -Path "/api/routes/$routeId/steps/BASIC_PRACTICE").Body
    $basicJson = $basic | ConvertTo-Json -Depth 20 -Compress
    Assert-True ($basicJson -notmatch '"answer"\s*:') 'basic practice public content leaked answer key'
    $wrong = Answer-Basic -QuestionId 'ACC-ROLE-Q-01' -Answer @('A') -ContentVersion $contentVersion
    Assert-True (-not [bool]$wrong.correct) 'wrong basic answer unexpectedly correct'
    $q1 = Answer-Basic -QuestionId 'ACC-ROLE-Q-01' -Answer @('B') -ContentVersion $contentVersion
    $q2 = Answer-Basic -QuestionId 'ACC-ROLE-Q-02' -Answer @('B') -ContentVersion $contentVersion
    $q3 = Answer-Basic -QuestionId 'ACC-ROLE-Q-03' `
        -Answer @('SOURCE', 'CALC', 'POST', 'RECON') -ContentVersion $contentVersion
    Assert-True ([bool]$q1.correct -and [bool]$q2.correct -and [bool]$q3.practiceCompleted) `
        'basic practice did not complete'

    $draft1 = (Invoke-JsonApi -Method PUT -Path "/api/routes/$routeId/draft" `
        -Headers $csrfHeaders `
        -Body @{
            contentVersion = $contentVersion
            answer = $failingAnswer
            expectedRevision = 0
        }).Body
    Assert-True ([long]$draft1.revision -ge 1) 'draft revision did not advance'
    $conflict = Invoke-JsonApi -Method PUT -Path "/api/routes/$routeId/draft" `
        -Headers $csrfHeaders `
        -ExpectedStatus 409 `
        -Body @{
            contentVersion = $contentVersion
            answer = $passingAnswer
            expectedRevision = 0
        }
    Assert-True ($conflict.Body.code -eq 'DRAFT_CONFLICT') 'draft conflict not returned'
    $draftLatest = (Invoke-JsonApi -Method GET -Path "/api/routes/$routeId/draft").Body
    Assert-True ($draftLatest.answer.responses.'payment-source' -eq 'PAYMENT-INSTRUCTION') 'draft recovery mismatch'
    $evidence['draftRevision'] = [long]$draftLatest.revision
    $evidence['draftConflict'] = 'DRAFT_CONFLICT'

    $failRequestId = New-RequestId
    $firstSubmit = (Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -Body @{
            clientRequestId = $failRequestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $failingAnswer
        }).Body
    $firstDuplicate = (Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -Body @{
            clientRequestId = $failRequestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $failingAnswer
        }).Body
    Assert-True ($firstSubmit.attemptId -eq $firstDuplicate.attemptId) 'first submit not idempotent'
    $idempotencyConflict = Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -ExpectedStatus 409 `
        -Body @{
            clientRequestId = $failRequestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $passingAnswer
        }
    Assert-True ($idempotencyConflict.Body.code -eq 'IDEMPOTENCY_CONFLICT') `
        'idempotency conflict not returned'
    $firstAttemptId = [long]$firstSubmit.attemptId
    $firstResult = Await-Terminal -AttemptId $firstAttemptId
    Assert-True ($firstResult.processingStatus -eq 'COMPLETED') 'first attempt not COMPLETED'
    Assert-True ($firstResult.historicalConclusion -eq 'LEARNED_NOT_MASTERED') `
        'first attempt must be LEARNED_NOT_MASTERED'
    Assert-True ($firstResult.currentRouteState -eq 'LEARNED_NOT_MASTERED') `
        'route state after first fail must be LEARNED_NOT_MASTERED'
    $firstJson = $firstResult | ConvertTo-Json -Depth 20 -Compress
    Assert-True ($firstJson -notmatch '"itemId"|M-VERIFY|"keywords"|referenceAnswer') `
        'scoring response leaked private assets'
    $evidence['firstAttemptId'] = $firstAttemptId
    $evidence['firstConclusion'] = [string]$firstResult.historicalConclusion
    $evidence['firstTotalScore'] = [int]$firstResult.result.totalScore

    $nextAfterFail = @(Get-AllNodes (Invoke-JsonApi -Method GET -Path '/api/lines/ACCOUNTING/map').Body |
        Where-Object routeId -eq $nextRouteId)[0]
    Assert-True ($nextAfterFail.locked -eq $true) 'next node unlocked after not mastered'
    $evidence['nextLockedAfterFail'] = $true

    $blockedPracticeRetry = Invoke-JsonApi -Method POST `
        -Path "/api/attempts/$firstAttemptId/comprehensive-practice-retry" `
        -Headers $csrfHeaders `
        -ExpectedStatus 409
    Assert-True ($blockedPracticeRetry.Body.code -eq 'REMEDIATION_REQUIRED') `
        'comprehensive practice retry must require remediation'
    $blockedRetry = Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -ExpectedStatus 409 `
        -Body @{
            clientRequestId = New-RequestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $passingAnswer
        }
    Assert-True ($blockedRetry.Body.code -eq 'REMEDIATION_REQUIRED') `
        'second formal attempt must require remediation first'

    $remediation = Complete-Remediation -AttemptId $firstAttemptId
    $evidence['remediationTargetCount'] = [int]$remediation.TotalTargets
    $evidence['remediationCompletedTargets'] = [int]$remediation.CompletedTargets
    $practiceRetry = (Invoke-JsonApi -Method POST `
        -Path "/api/attempts/$firstAttemptId/comprehensive-practice-retry" `
        -Headers $csrfHeaders).Body
    Assert-True ([bool]$practiceRetry.practiceRetryUnlocked) 'comprehensive practice retry unlock failed'
    $firstAfterRemediation = @(Get-AllNodes (Invoke-JsonApi -Method GET -Path '/api/lines/ACCOUNTING/map').Body |
        Where-Object routeId -eq $routeId)[0]
    Assert-True ($firstAfterRemediation.state -eq 'LEARNED_NOT_MASTERED') `
        'remediation must not mark route PASSED'
    $evidence['stateAfterRemediation'] = [string]$firstAfterRemediation.state

    $passRequestId = New-RequestId
    $secondSubmit = (Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -Body @{
            clientRequestId = $passRequestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $passingAnswer
        }).Body
    $secondAttemptId = [long]$secondSubmit.attemptId
    Assert-True ($secondAttemptId -ne $firstAttemptId) 'second submit must create a new attempt'
    $secondDuplicate = (Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -Body @{
            clientRequestId = $passRequestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $passingAnswer
        }).Body
    Assert-True ($secondDuplicate.attemptId -eq $secondAttemptId) 'second submit not idempotent'
    $secondResult = Await-Terminal -AttemptId $secondAttemptId
    Assert-True ($secondResult.processingStatus -eq 'COMPLETED') 'second attempt not COMPLETED'
    Assert-True ($secondResult.historicalConclusion -eq 'PASSED') 'second attempt must be PASSED'
    Assert-True ($secondResult.currentRouteState -eq 'PASSED') 'route state after pass must be PASSED'
    Assert-True ([bool]$secondResult.result.scoreThresholdMet) 'pass score threshold not met'
    Assert-True ([bool]$secondResult.result.allMandatoryRequirementsMet) 'mandatory requirements not met'
    Assert-True ([int]$secondResult.result.totalScore -ge [int]$secondResult.result.passScore) `
        'total score below passScore'
    $evidence['secondAttemptId'] = $secondAttemptId
    $evidence['secondConclusion'] = [string]$secondResult.historicalConclusion
    $evidence['secondTotalScore'] = [int]$secondResult.result.totalScore

    $allNodesPass = Get-AllNodes (Invoke-JsonApi -Method GET -Path '/api/lines/ACCOUNTING/map').Body
    $firstAfterPass = @($allNodesPass | Where-Object routeId -eq $routeId)[0]
    $nextAfterPass = @($allNodesPass | Where-Object routeId -eq $nextRouteId)[0]
    Assert-True ($firstAfterPass.state -eq 'PASSED') 'first route not PASSED after success'
    Assert-True ($nextAfterPass.locked -eq $false) 'next node still locked after pass'
    Assert-True ($nextAfterPass.enterable -eq $true) 'published next node must be enterable'
    Assert-True ($nextAfterPass.state -eq 'NOT_STARTED') 'unlocked published node state mismatch'
    $evidence['firstStateAfterPass'] = [string]$firstAfterPass.state
    $evidence['nextUnlocked'] = $true
    $evidence['nextEnterable'] = [bool]$nextAfterPass.enterable

    $techSubmit = (Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -Body @{
            clientRequestId = New-RequestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = @{ responses = @{
                'payment-source' = 'BANK-STATEMENT'; 'ending-payable' = 800
                'debit-account' = '应付托管费'; 'credit-account' = '银行存款'
                'reconciliation-result' = 'BALANCED'
                'result-note' = '当日支付托管费1400元，期末应付托管费800元，资金、台账和估值结果勾稽一致。[SCORING_FAIL_ONCE]'
            } }
        }).Body
    $techAttemptId = [long]$techSubmit.attemptId
    $techFailed = Await-Terminal -AttemptId $techAttemptId
    Assert-True ($techFailed.processingStatus -eq 'FAILED') 'technical scoring fail not observed'
    Assert-True (-not $techFailed.PSObject.Properties['historicalConclusion'] -or `
        [string]::IsNullOrWhiteSpace([string]$techFailed.historicalConclusion)) `
        'technical fail must not create learning conclusion'
    $null = Invoke-JsonApi -Method POST `
        -Path "/api/attempts/$techAttemptId/retry-scoring" `
        -Headers $csrfHeaders
    $techCompleted = Await-Terminal -AttemptId $techAttemptId
    Assert-True ($techCompleted.processingStatus -eq 'COMPLETED') 'technical retry did not complete'
    Assert-True ($techCompleted.attemptId -eq $techAttemptId) 'technical retry must reuse attempt'
    $evidence['technicalAttemptId'] = $techAttemptId
    $evidence['technicalRetry'] = 'FAILED->COMPLETED on same attempt'

    $lowReview = (Invoke-JsonApi -Method POST -Path "/api/routes/$routeId/attempts" `
        -Headers $csrfHeaders `
        -Body @{
            clientRequestId = New-RequestId
            contentVersion = $contentVersion
            rubricVersion = $rubricVersion
            answer = $failingAnswer
        }).Body
    $lowResult = Await-Terminal -AttemptId ([long]$lowReview.attemptId)
    Assert-True ($lowResult.historicalConclusion -eq 'LEARNED_NOT_MASTERED') `
        'low review historical conclusion mismatch'
    Assert-True ($lowResult.currentRouteState -eq 'PASSED') `
        'low review must keep current route PASSED'
    $evidence['lowReviewAttemptId'] = [long]$lowReview.attemptId

    $notMasteredRecords = (Invoke-JsonApi -Method GET `
        -Path '/api/training-records?page=0&size=10&line=ACCOUNTING&conclusion=LEARNED_NOT_MASTERED').Body
    $passedRecords = (Invoke-JsonApi -Method GET `
        -Path '/api/training-records?page=0&size=10&line=ACCOUNTING&conclusion=PASSED').Body
    Assert-True ($notMasteredRecords.totalElements -ge 1) 'missing LEARNED_NOT_MASTERED history'
    Assert-True ($passedRecords.totalElements -ge 1) 'missing PASSED history'
    $firstHistory = (Invoke-JsonApi -Method GET -Path "/api/training-records/$firstAttemptId").Body
    Assert-True ($firstHistory.historicalConclusion -eq 'LEARNED_NOT_MASTERED') `
        'first history conclusion overwritten'
    Assert-True ($firstHistory.currentRouteState -eq 'PASSED') `
        'first history must show current route PASSED'
    Assert-True ($firstHistory.answerSnapshot.responses.'payment-source' -eq 'PAYMENT-INSTRUCTION') `
        'first answer snapshot mutated'
    $passHistory = (Invoke-JsonApi -Method GET -Path "/api/training-records/$secondAttemptId").Body
    Assert-True ($passHistory.historicalConclusion -eq 'PASSED') 'pass history conclusion mismatch'
    $evidence['historyNotMasteredCount'] = [int]$notMasteredRecords.totalElements
    $evidence['historyPassedCount'] = [int]$passedRecords.totalElements

    $otherSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $otherCsrfResponse = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/api/auth/csrf') `
        -WebSession $otherSession -UseBasicParsing
    $otherCsrfBody = $otherCsrfResponse.Content | ConvertFrom-Json
    $otherHeaders = @{ Accept = 'application/json' }
    $otherHeaders[$otherCsrfBody.headerName] = $otherCsrfBody.token
    $null = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/api/auth/login') `
        -Method POST -WebSession $otherSession -Headers $otherHeaders `
        -ContentType 'application/json; charset=utf-8' `
        -Body (@{ employeeNo = '10000001'; password = $plainPassword } | ConvertTo-Json -Compress) `
        -UseBasicParsing
    try {
        $otherDetail = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + "/api/training-records/$firstAttemptId") `
            -WebSession $otherSession -Headers @{ Accept = 'application/json' } `
            -UseBasicParsing -SkipHttpErrorCheck
        Assert-True ([int]$otherDetail.StatusCode -eq 404) 'cross-user record detail must be 404'
    }
    catch {
        throw
    }
    $otherList = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/api/training-records') `
        -WebSession $otherSession -Headers @{ Accept = 'application/json' } -UseBasicParsing
    $otherListBody = $otherList.Content | ConvertFrom-Json
    Assert-True ([int]$otherListBody.totalElements -eq 0) 'cross-user record list not isolated'
    $evidence['userIsolation'] = '404 detail + empty list for other user'

    $null = Invoke-JsonApi -Method POST -Path '/api/auth/logout' -Headers $csrfHeaders -ExpectedStatus 204
    $afterLogout = Invoke-JsonApi -Method GET -Path '/api/auth/me' -ExpectedStatus 401
    Assert-True ($afterLogout.StatusCode -eq 401) 'logout did not invalidate session'

    $summary = ('phase4-http-vertical=ok; user={0}; firstAttempt={1}; remediationTargets={2}; ' +
        'secondAttempt={3}; nextUnlocked=true; notMasteredRecords={4}; passedRecords={5}') -f `
        $EmployeeNo, $firstAttemptId, $remediation.TotalTargets, $secondAttemptId, `
        $notMasteredRecords.totalElements, $passedRecords.totalElements
    Write-Output $summary
    Write-Output ('phase4-http-evidence=' + ($evidence | ConvertTo-Json -Compress -Depth 5))
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
