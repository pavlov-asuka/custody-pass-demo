[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$contentDirectory = Join-Path $repositoryRoot 'content'
$requiredFiles = @(
    'demo/cases/C001.json',
    'demo/cases/C002.json',
    'demo/cases/C003.json',
    'demo/knowledge/topics.json'
)

foreach ($relativePath in $requiredFiles) {
    $path = Join-Path $contentDirectory $relativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "缺少当前 Demo 内容文件：$relativePath"
    }
}

$jsonFiles = @(Get-ChildItem -LiteralPath $contentDirectory -Recurse -File -Filter '*.json')
if ($jsonFiles.Count -eq 0) {
    throw 'content/ 中没有可校验的 JSON 文件。'
}

foreach ($file in $jsonFiles) {
    try {
        $null = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    }
    catch {
        throw "JSON 解析失败：$($file.FullName)"
    }
}

Write-Output ("内容校验通过：{0} 个当前 Demo JSON 文件。" -f $jsonFiles.Count)
