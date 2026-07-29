[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$frontendDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'frontend'
$npm = Get-Command npm -ErrorAction Stop

Push-Location $frontendDirectory
try {
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        & $npm.Source ci
        if ($LASTEXITCODE -ne 0) {
            throw "前端依赖安装失败，退出码：$LASTEXITCODE"
        }
    }

    & $npm.Source run typecheck
    if ($LASTEXITCODE -ne 0) {
        throw "前端类型检查失败，退出码：$LASTEXITCODE"
    }

    & $npm.Source run build
    if ($LASTEXITCODE -ne 0) {
        throw "前端构建失败，退出码：$LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
