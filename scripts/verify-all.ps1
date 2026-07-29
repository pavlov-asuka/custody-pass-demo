[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$localDirectory = Join-Path $repositoryRoot '.local'
$logDirectory = Join-Path $localDirectory 'logs'
$dataDirectory = Join-Path $localDirectory 'data'
. (Join-Path $PSScriptRoot 'common.ps1')
$java = Join-Path (Get-JavaHome) 'bin/java.exe'
$node = Get-Command node -ErrorAction Stop
$serverProcess = $null
$originalServerPort = $env:SERVER_PORT
$originalMockDbUrl = $env:MOCK_DB_URL
$originalVerifyBase = $env:VERIFY_BASE
$verifyPort = 18080

& (Join-Path $PSScriptRoot 'test-backend.ps1')
& (Join-Path $PSScriptRoot 'build-app.ps1')

New-Item -ItemType Directory -Force -Path $logDirectory, $dataDirectory, (
    Join-Path $localDirectory 'test-results'
) | Out-Null

$jars = @(Get-ChildItem -LiteralPath (Join-Path $repositoryRoot 'backend/target') -File -Filter 'custody-training-*.jar')
if ($jars.Count -ne 1) {
    throw "系统验证要求 backend/target 中恰好有一个 JAR，实际为 $($jars.Count) 个。"
}

try {
    $env:SERVER_PORT = [string]$verifyPort
    $verifyDatabasePath = (Join-Path $dataDirectory 'verify-custody-training').Replace('\', '/')
    $env:MOCK_DB_URL = "jdbc:h2:file:$verifyDatabasePath;MODE=MySQL;AUTO_SERVER=TRUE"
    $env:VERIFY_BASE = "http://127.0.0.1:$verifyPort"

    $serverProcess = Start-Process -FilePath $java `
        -ArgumentList @('-jar', $jars[0].FullName, '--spring.profiles.active=mock') `
        -RedirectStandardOutput (Join-Path $logDirectory 'verify-app.log') `
        -RedirectStandardError (Join-Path $logDirectory 'verify-app.err.log') `
        -WindowStyle Hidden `
        -PassThru

    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
        if ($serverProcess.HasExited) {
            throw "系统验证应用提前退出，退出码：$($serverProcess.ExitCode)"
        }
        try {
            $health = Invoke-RestMethod -Uri "$($env:VERIFY_BASE)/api/health" -TimeoutSec 1
            if ($health.status -eq 'UP') {
                $ready = $true
                break
            }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $ready) {
        throw '系统验证应用在 30 秒内未就绪。'
    }

    & $node.Source (Join-Path $repositoryRoot 'tests/e2e/verify.mjs')
    if ($LASTEXITCODE -ne 0) {
        throw "系统 E2E 失败，退出码：$LASTEXITCODE"
    }
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
    if ($null -eq $originalVerifyBase) { Remove-Item Env:VERIFY_BASE -ErrorAction SilentlyContinue }
    else { $env:VERIFY_BASE = $originalVerifyBase }
}

Write-Output '统一验证通过。'
