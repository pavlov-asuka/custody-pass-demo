[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$backendDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend'
. (Join-Path $PSScriptRoot 'common.ps1')
$maven = Get-MavenExecutable
$originalJavaHome = $env:JAVA_HOME
$env:JAVA_HOME = Get-JavaHome

Push-Location $backendDirectory
try {
    & $maven test
    if ($LASTEXITCODE -ne 0) {
        throw "后端测试失败，退出码：$LASTEXITCODE"
    }
}
finally {
    Pop-Location
    if ($null -eq $originalJavaHome) { Remove-Item Env:JAVA_HOME -ErrorAction SilentlyContinue }
    else { $env:JAVA_HOME = $originalJavaHome }
}
