[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$backendDirectory = Join-Path $repositoryRoot 'backend'
. (Join-Path $PSScriptRoot 'common.ps1')
$maven = Get-MavenExecutable
$originalJavaHome = $env:JAVA_HOME
$env:JAVA_HOME = Get-JavaHome

& (Join-Path $PSScriptRoot 'validate-content.ps1')
& (Join-Path $PSScriptRoot 'build-frontend.ps1')

Clear-ReadOnlyBuildOutput -Path (Join-Path $backendDirectory 'target')
Push-Location $backendDirectory
try {
    & $maven clean -Pweb package
    if ($LASTEXITCODE -ne 0) {
        throw "同源 JAR 构建失败，退出码：$LASTEXITCODE"
    }
}
finally {
    Pop-Location
    if ($null -eq $originalJavaHome) { Remove-Item Env:JAVA_HOME -ErrorAction SilentlyContinue }
    else { $env:JAVA_HOME = $originalJavaHome }
}

$jars = @(Get-ChildItem -LiteralPath (Join-Path $backendDirectory 'target') -File -Filter 'custody-training-*.jar')
if ($jars.Count -ne 1) {
    throw "backend/target 中应恰好有一个可执行 JAR，实际为 $($jars.Count) 个。"
}
Write-Output ("同源 JAR：{0}" -f $jars[0].FullName)
