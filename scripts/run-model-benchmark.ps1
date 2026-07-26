[CmdletBinding()]
param(
    [string]$BaseUrl,
    [string]$ChatPath,
    [string]$ModelName,
    [ValidateSet('omit', 'enabled', 'disabled')]
    [string]$ThinkingMode,
    [switch]$SendUserIdHeader
)

$ErrorActionPreference = 'Stop'
$originalApiKey = $env:MODEL_API_KEY
$hadApiKey = $null -ne $originalApiKey -and $originalApiKey.Length -gt 0
$originalBaseUrl = $env:MODEL_BASE_URL
$originalChatPath = $env:MODEL_CHAT_PATH
$originalModelName = $env:MODEL_NAME
$originalSendUserIdHeader = $env:MODEL_SEND_USER_ID_HEADER
$originalBenchmarkRuns = $env:MODEL_BENCHMARK_RUNS
$originalThinkingMode = $env:MODEL_THINKING_MODE
$secureApiKey = $null
$plainApiKey = $null

try {
    $java = Get-Command java -ErrorAction SilentlyContinue
    $maven = Get-Command mvn -ErrorAction SilentlyContinue
    if ($null -eq $java -or $null -eq $maven) {
        throw '未找到 java 或 mvn，请先配置 JDK 17 和 Maven。'
    }

    if ($BaseUrl) { $env:MODEL_BASE_URL = $BaseUrl }
    if ($ChatPath) { $env:MODEL_CHAT_PATH = $ChatPath }
    if ($ModelName) { $env:MODEL_NAME = $ModelName }
    if ($ThinkingMode) { $env:MODEL_THINKING_MODE = $ThinkingMode }
    if ($SendUserIdHeader) { $env:MODEL_SEND_USER_ID_HEADER = 'true' }

    if ([string]::IsNullOrWhiteSpace($env:MODEL_BASE_URL)) {
        throw '缺少 MODEL_BASE_URL。'
    }
    if ([string]::IsNullOrWhiteSpace($env:MODEL_NAME)) {
        throw '缺少 MODEL_NAME。'
    }
    if (-not $hadApiKey) {
        $secureApiKey = Read-Host '请输入模型 API Key（不会回显，不会写入文件）' -AsSecureString
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureApiKey)
        try {
            $plainApiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        }
        $env:MODEL_API_KEY = $plainApiKey
    }
    if ([string]::IsNullOrWhiteSpace($env:MODEL_BENCHMARK_RUNS)) {
        $env:MODEL_BENCHMARK_RUNS = '3'
    }

    & $maven.Source -q spring-boot:run `
        '-Dspring-boot.run.profiles=mock,model-benchmark'
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    $plainApiKey = $null
    $secureApiKey = $null
    if ($hadApiKey) {
        $env:MODEL_API_KEY = $originalApiKey
    }
    else {
        Remove-Item Env:MODEL_API_KEY -ErrorAction SilentlyContinue
    }
    if ($null -eq $originalBaseUrl) { Remove-Item Env:MODEL_BASE_URL -ErrorAction SilentlyContinue }
    else { $env:MODEL_BASE_URL = $originalBaseUrl }
    if ($null -eq $originalChatPath) { Remove-Item Env:MODEL_CHAT_PATH -ErrorAction SilentlyContinue }
    else { $env:MODEL_CHAT_PATH = $originalChatPath }
    if ($null -eq $originalModelName) { Remove-Item Env:MODEL_NAME -ErrorAction SilentlyContinue }
    else { $env:MODEL_NAME = $originalModelName }
    if ($null -eq $originalSendUserIdHeader) { Remove-Item Env:MODEL_SEND_USER_ID_HEADER -ErrorAction SilentlyContinue }
    else { $env:MODEL_SEND_USER_ID_HEADER = $originalSendUserIdHeader }
    if ($null -eq $originalBenchmarkRuns) { Remove-Item Env:MODEL_BENCHMARK_RUNS -ErrorAction SilentlyContinue }
    else { $env:MODEL_BENCHMARK_RUNS = $originalBenchmarkRuns }
    if ($null -eq $originalThinkingMode) { Remove-Item Env:MODEL_THINKING_MODE -ErrorAction SilentlyContinue }
    else { $env:MODEL_THINKING_MODE = $originalThinkingMode }
}
