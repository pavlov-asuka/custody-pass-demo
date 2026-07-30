[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$localDirectory = Join-Path $repositoryRoot '.local'
$logDirectory = Join-Path $localDirectory 'logs'
$dataDirectory = Join-Path $localDirectory 'data'
$testResultsDirectory = Join-Path $localDirectory 'test-results'
. (Join-Path $PSScriptRoot 'common.ps1')
$java = Join-Path (Get-JavaHome) 'bin/java.exe'
$serverProcess = $null
$originalServerPort = $env:SERVER_PORT
$originalMockDbUrl = $env:MOCK_DB_URL
$verifyPort = 18081

Write-Output '=== 阶段 4：内容校验 / 后端测试 / 同源构建 ==='
& (Join-Path $PSScriptRoot 'validate-content.ps1')
& (Join-Path $PSScriptRoot 'test-backend.ps1')
& (Join-Path $PSScriptRoot 'build-app.ps1')

New-Item -ItemType Directory -Force -Path $logDirectory, $dataDirectory, $testResultsDirectory | Out-Null
$jars = @(Get-ChildItem -LiteralPath (Join-Path $repositoryRoot 'backend/target') `
    -File -Filter 'custody-training-*.jar')
if ($jars.Count -ne 1) {
    throw "阶段4验证要求 backend/target 中恰好有一个 JAR，实际为 $($jars.Count) 个。"
}

try {
    $env:SERVER_PORT = [string]$verifyPort
    $databaseName = 'phase4-vertical-' + [Guid]::NewGuid().ToString('N')
    $databasePath = (Join-Path $dataDirectory $databaseName).Replace('\', '/')
    $env:MOCK_DB_URL = "jdbc:h2:file:$databasePath;MODE=MySQL;AUTO_SERVER=TRUE"
    $baseUrl = "http://127.0.0.1:$verifyPort"
    $stdout = Join-Path $logDirectory 'phase4-vertical-app.log'
    $stderr = Join-Path $logDirectory 'phase4-vertical-app.err.log'

    Write-Output ("=== 启动隔离 JAR：port={0}; db={1} ===" -f $verifyPort, $databaseName)
    $serverProcess = Start-Process -FilePath $java `
        -ArgumentList @('-jar', $jars[0].FullName, '--spring.profiles.active=mock') `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden `
        -PassThru

    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
        if ($serverProcess.HasExited) {
            throw "阶段4 隔离应用提前退出，退出码：$($serverProcess.ExitCode)"
        }
        try {
            $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -TimeoutSec 1
            if ($health.status -eq 'UP') {
                $ready = $true
                break
            }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $ready) { throw '阶段4 隔离应用在 30 秒内未就绪。' }

    Write-Output '=== 阶段 4 HTTP 纵向闭环 ==='
    $password = ConvertTo-SecureString 'Demo@1234' -AsPlainText -Force
    & (Join-Path $PSScriptRoot 'run-phase4-vertical-smoke.ps1') `
        -BaseUrl $baseUrl -EmployeeNo '10000002' -Password $password

    Write-Output '=== 阶段 4 浏览器纵向闭环（Playwright 1440x900） ==='
    $env:VERIFY_BASE = $baseUrl
    $env:PHASE4_EMPLOYEE_NO = '10000001'
    $env:PHASE4_PASSWORD = 'Demo@1234'
    Push-Location $repositoryRoot
    try {
        & node (Join-Path $repositoryRoot 'tests/e2e/phase4-vertical.mjs')
        if ($LASTEXITCODE -ne 0) {
            throw "阶段4 浏览器纵向闭环失败，退出码：$LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
        Remove-Item Env:VERIFY_BASE -ErrorAction SilentlyContinue
        Remove-Item Env:PHASE4_EMPLOYEE_NO -ErrorAction SilentlyContinue
        Remove-Item Env:PHASE4_PASSWORD -ErrorAction SilentlyContinue
    }
}
finally {
    if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
        $serverProcess.WaitForExit()
    }
    if ($null -eq $originalServerPort) { Remove-Item Env:SERVER_PORT -ErrorAction SilentlyContinue }
    else { $env:SERVER_PORT = $originalServerPort }
    if ($null -eq $originalMockDbUrl) { Remove-Item Env:MOCK_DB_URL -ErrorAction SilentlyContinue }
    else { $env:MOCK_DB_URL = $originalMockDbUrl }
}

Write-Output '阶段4纵向闭环验收通过；隔离服务已停止；临时数据位于 .local/（已忽略）。'
