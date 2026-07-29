[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$backendDirectory = Join-Path $repositoryRoot 'backend'
$localDirectory = Join-Path $repositoryRoot '.local'
. (Join-Path $PSScriptRoot 'common.ps1')
$maven = Get-MavenExecutable
$originalJavaHome = $env:JAVA_HOME
$env:JAVA_HOME = Get-JavaHome
$originalMockDbUrl = $env:MOCK_DB_URL

New-Item -ItemType Directory -Force -Path (
    Join-Path $localDirectory 'data'
), (
    Join-Path $localDirectory 'logs'
), (
    Join-Path $localDirectory 'test-results'
) | Out-Null

if ([string]::IsNullOrWhiteSpace($env:MOCK_DB_URL)) {
    $databasePath = (Join-Path $localDirectory 'data/custody-training').Replace('\', '/')
    $env:MOCK_DB_URL = "jdbc:h2:file:$databasePath;MODE=MySQL;AUTO_SERVER=TRUE"
}

Push-Location $backendDirectory
try {
    & $maven spring-boot:run '-Dspring-boot.run.profiles=mock'
    if ($LASTEXITCODE -ne 0) {
        throw "Mock 启动失败，退出码：$LASTEXITCODE"
    }
}
finally {
    Pop-Location
    if ($null -eq $originalMockDbUrl) {
        Remove-Item Env:MOCK_DB_URL -ErrorAction SilentlyContinue
    }
    else {
        $env:MOCK_DB_URL = $originalMockDbUrl
    }
    if ($null -eq $originalJavaHome) { Remove-Item Env:JAVA_HOME -ErrorAction SilentlyContinue }
    else { $env:JAVA_HOME = $originalJavaHome }
}
