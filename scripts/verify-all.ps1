[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$localDirectory = Join-Path $repositoryRoot '.local'
$logDirectory = Join-Path $localDirectory 'logs'
$dataDirectory = Join-Path $localDirectory 'data'
. (Join-Path $PSScriptRoot 'common.ps1')
$java = Join-Path (Get-JavaHome) 'bin/java.exe'
$serverProcess = $null
$originalServerPort = $env:SERVER_PORT
$originalMockDbUrl = $env:MOCK_DB_URL
$verifyPort = 18080

& (Join-Path $PSScriptRoot 'test-backend.ps1')
& (Join-Path $PSScriptRoot 'build-app.ps1')

New-Item -ItemType Directory -Force -Path $logDirectory, $dataDirectory | Out-Null
$jars = @(Get-ChildItem -LiteralPath (Join-Path $repositoryRoot 'backend/target') `
    -File -Filter 'custody-training-*.jar')
if ($jars.Count -ne 1) {
    throw "阶段2验证要求 backend/target 中恰好有一个 JAR，实际为 $($jars.Count) 个。"
}

try {
    $env:SERVER_PORT = [string]$verifyPort
    $databaseName = 'phase2-smoke-' + [Guid]::NewGuid().ToString('N')
    $databasePath = (Join-Path $dataDirectory $databaseName).Replace('\', '/')
    $env:MOCK_DB_URL = "jdbc:h2:file:$databasePath;MODE=MySQL;AUTO_SERVER=TRUE"
    $baseUrl = "http://127.0.0.1:$verifyPort"
    $stdout = Join-Path $logDirectory 'phase2-smoke-app.log'
    $stderr = Join-Path $logDirectory 'phase2-smoke-app.err.log'

    $serverProcess = Start-Process -FilePath $java `
        -ArgumentList @('-jar', $jars[0].FullName, '--spring.profiles.active=mock') `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden `
        -PassThru

    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
        if ($serverProcess.HasExited) {
            throw "阶段2 HTTP smoke 应用提前退出，退出码：$($serverProcess.ExitCode)"
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
    if (-not $ready) { throw '阶段2 HTTP smoke 应用在 30 秒内未就绪。' }

    $password = ConvertTo-SecureString 'Demo@1234' -AsPlainText -Force
    & (Join-Path $PSScriptRoot 'run-api-smoke.ps1') `
        -BaseUrl $baseUrl -EmployeeNo '10000002' -Password $password
}
finally {
    if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id
        $serverProcess.WaitForExit()
    }
    if ($null -eq $originalServerPort) { Remove-Item Env:SERVER_PORT -ErrorAction SilentlyContinue }
    else { $env:SERVER_PORT = $originalServerPort }
    if ($null -eq $originalMockDbUrl) { Remove-Item Env:MOCK_DB_URL -ErrorAction SilentlyContinue }
    else { $env:MOCK_DB_URL = $originalMockDbUrl }
}

Write-Output '阶段2统一验证通过；未运行阶段1旧前端 E2E。'
