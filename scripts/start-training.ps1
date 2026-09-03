[CmdletBinding()]
param(
    [switch]$Stop,
    [switch]$ResetKey,
    [switch]$Rebuild,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path $PSScriptRoot -Parent
$backendDirectory = Join-Path $repositoryRoot 'backend'
$localDirectory = Join-Path $repositoryRoot '.local'
$runtimeDirectory = Join-Path $localDirectory 'internal-training'
$logDirectory = Join-Path $localDirectory 'logs'
$settingsPath = Join-Path $runtimeDirectory 'settings.json'
$secretsPath = Join-Path $runtimeDirectory 'secrets.clixml'
$processPath = Join-Path $runtimeDirectory 'process.json'
$buildMarkerPath = Join-Path $runtimeDirectory 'finxscope-build.json'
$stdoutPath = Join-Path $logDirectory 'internal-training.out.log'
$stderrPath = Join-Path $logDirectory 'internal-training.err.log'

. (Join-Path $PSScriptRoot 'common.ps1')

function Read-RequiredText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [string]$DefaultValue = ''
    )

    while ($true) {
        $displayPrompt = if ([string]::IsNullOrWhiteSpace($DefaultValue)) {
            $Prompt
        }
        else {
            "$Prompt [$DefaultValue]"
        }
        $value = Read-Host $displayPrompt
        if ([string]::IsNullOrWhiteSpace($value)) {
            $value = $DefaultValue
        }
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            return $value.Trim()
        }
        Write-Host '此项不能为空。' -ForegroundColor Yellow
    }
}

function Read-RequiredSecureString {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt
    )

    while ($true) {
        $value = Read-Host $Prompt -AsSecureString
        if ($value.Length -gt 0) {
            return $value
        }
        Write-Host '此项不能为空。' -ForegroundColor Yellow
    }
}

function ConvertTo-SecureValue {
    param([AllowEmptyString()][string]$Value)

    if ([string]::IsNullOrEmpty($Value)) {
        return [System.Security.SecureString]::new()
    }
    return ConvertTo-SecureString -String $Value -AsPlainText -Force
}

function ConvertFrom-SecureValue {
    param([System.Security.SecureString]$Value)

    if ($null -eq $Value) {
        return ''
    }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Get-ConfiguredPort {
    $candidate = if ([string]::IsNullOrWhiteSpace($env:SERVER_PORT)) {
        8080
    }
    else {
        $env:SERVER_PORT
    }
    $port = 0
    if (-not [int]::TryParse([string]$candidate, [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
        throw "SERVER_PORT 无效：$candidate"
    }
    return $port
}

function Initialize-Configuration {
    New-Item -ItemType Directory -Force -Path $runtimeDirectory, $logDirectory | Out-Null

    Write-Host ''
    Write-Host '首次配置托管智训营内网启动参数。密钥和密码只会以当前 Windows 用户可解密的形式保存在 .local/。' -ForegroundColor Cyan

    $port = Get-ConfiguredPort
    $modelBaseUrl = if ([string]::IsNullOrWhiteSpace($env:MODEL_BASE_URL)) {
        Read-RequiredText -Prompt '内网模型网关地址（含 http:// 或 https://）'
    }
    else {
        $env:MODEL_BASE_URL
    }
    $modelName = if ([string]::IsNullOrWhiteSpace($env:MODEL_NAME)) {
        Read-RequiredText -Prompt '内网模型标识' -DefaultValue 'deepseek-v4-flash'
    }
    else {
        $env:MODEL_NAME
    }
    $publicUrl = if ([string]::IsNullOrWhiteSpace($env:TRAINING_PUBLIC_URL)) {
        Read-RequiredText -Prompt '学员访问地址' -DefaultValue "http://127.0.0.1:$port"
    }
    else {
        $env:TRAINING_PUBLIC_URL
    }

    $modelUri = $null
    if (-not [Uri]::TryCreate($modelBaseUrl, [UriKind]::Absolute, [ref]$modelUri)) {
        throw '内网模型网关地址必须是完整 URL。'
    }
    $publicUri = $null
    if (-not [Uri]::TryCreate($publicUrl, [UriKind]::Absolute, [ref]$publicUri)) {
        throw '学员访问地址必须是完整 URL。'
    }

    $databasePath = (Join-Path $localDirectory 'data/internal-training').Replace('\', '/')
    $defaultDbUrl = "jdbc:h2:file:$databasePath;MODE=MySQL;AUTO_SERVER=TRUE"
    $dbUrl = if ([string]::IsNullOrWhiteSpace($env:DB_URL)) { $defaultDbUrl } else { $env:DB_URL }
    $dbUsername = if ([string]::IsNullOrWhiteSpace($env:DB_USERNAME)) {
        if ($dbUrl -eq $defaultDbUrl) { 'sa' } else { Read-RequiredText -Prompt '数据库用户名' }
    }
    else {
        $env:DB_USERNAME
    }
    $dbDriver = if ([string]::IsNullOrWhiteSpace($env:DB_DRIVER)) {
        if ($dbUrl -eq $defaultDbUrl) { 'org.h2.Driver' } else { 'com.mysql.cj.jdbc.Driver' }
    }
    else {
        $env:DB_DRIVER
    }

    $employeeNo = if ([string]::IsNullOrWhiteSpace($env:BOOTSTRAP_USER1_EMPLOYEE_NO)) {
        Read-RequiredText -Prompt '首次登录员工号' -DefaultValue '10000001'
    }
    else {
        $env:BOOTSTRAP_USER1_EMPLOYEE_NO
    }
    $displayName = if ([string]::IsNullOrWhiteSpace($env:BOOTSTRAP_USER1_DISPLAY_NAME)) {
        Read-RequiredText -Prompt '首次登录显示名' -DefaultValue '内网学员'
    }
    else {
        $env:BOOTSTRAP_USER1_DISPLAY_NAME
    }

    $modelKey = if ([string]::IsNullOrWhiteSpace($env:MODEL_API_KEY)) {
        Read-RequiredSecureString -Prompt '内网 MODEL_API_KEY'
    }
    else {
        ConvertTo-SecureValue $env:MODEL_API_KEY
    }
    $databasePassword = if ($dbUrl -eq $defaultDbUrl) {
        ConvertTo-SecureValue ''
    }
    elseif (-not [string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
        ConvertTo-SecureValue $env:DB_PASSWORD
    }
    else {
        Read-RequiredSecureString -Prompt '数据库密码'
    }
    $bootstrapPassword = if ([string]::IsNullOrWhiteSpace($env:BOOTSTRAP_USER1_PASSWORD)) {
        Read-RequiredSecureString -Prompt '首次登录密码'
    }
    else {
        ConvertTo-SecureValue $env:BOOTSTRAP_USER1_PASSWORD
    }

    $settings = [ordered]@{
        version = 1
        serverPort = $port
        publicUrl = $publicUri.AbsoluteUri.TrimEnd('/')
        modelBaseUrl = $modelUri.AbsoluteUri.TrimEnd('/')
        modelName = $modelName
        dbUrl = $dbUrl
        dbUsername = $dbUsername
        dbDriver = $dbDriver
        bootstrapEmployeeNo = $employeeNo
        bootstrapDisplayName = $displayName
    }
    $settings | ConvertTo-Json | Set-Content -LiteralPath $settingsPath -Encoding utf8
    [pscustomobject]@{
        ModelApiKey = $modelKey
        DatabasePassword = $databasePassword
        BootstrapPassword = $bootstrapPassword
    } | Export-Clixml -LiteralPath $secretsPath

    Write-Host "配置已保存：$runtimeDirectory" -ForegroundColor Green
}

function Reset-ModelKey {
    if (-not (Test-Path -LiteralPath $secretsPath -PathType Leaf)) {
        Initialize-Configuration
        return
    }

    $secrets = Import-Clixml -LiteralPath $secretsPath
    $newKey = Read-RequiredSecureString -Prompt '新的内网 MODEL_API_KEY'
    [pscustomobject]@{
        ModelApiKey = $newKey
        DatabasePassword = $secrets.DatabasePassword
        BootstrapPassword = $secrets.BootstrapPassword
    } | Export-Clixml -LiteralPath $secretsPath
    Write-Host 'MODEL_API_KEY 已更新。' -ForegroundColor Green
}

function Get-ManagedProcess {
    if (-not (Test-Path -LiteralPath $processPath -PathType Leaf)) {
        return $null
    }
    try {
        $state = Get-Content -Raw -LiteralPath $processPath | ConvertFrom-Json
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($state.pid)" -ErrorAction Stop
        if ($null -eq $process -or $process.Name -notin @('java.exe', 'javaw.exe')) {
            return $null
        }
        if ([string]::IsNullOrWhiteSpace($process.CommandLine) -or $process.CommandLine -notlike '*custody-training-*.jar*') {
            return $null
        }
        return $process
    }
    catch {
        return $null
    }
}

function Stop-Training {
    $managed = Get-ManagedProcess
    if ($null -eq $managed) {
        Remove-Item -LiteralPath $processPath -Force -ErrorAction SilentlyContinue
        Write-Host '托管智训营当前未运行。'
        return
    }

    Stop-Process -Id $managed.ProcessId -ErrorAction Stop
    $deadline = [DateTime]::UtcNow.AddSeconds(15)
    while ([DateTime]::UtcNow -lt $deadline -and (Get-Process -Id $managed.ProcessId -ErrorAction SilentlyContinue)) {
        Start-Sleep -Milliseconds 250
    }
    Remove-Item -LiteralPath $processPath -Force -ErrorAction SilentlyContinue
    Write-Host '托管智训营已停止。' -ForegroundColor Green
}

function Get-ApplicationJar {
    $jars = @(Get-ChildItem -LiteralPath (Join-Path $backendDirectory 'target') -File -Filter 'custody-training-*.jar' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike '*.original' })
    if ($jars.Count -eq 1) {
        return $jars[0]
    }
    return $null
}

function Test-BuildRequired {
    param([System.IO.FileInfo]$Jar)

    if ($Rebuild -or $null -eq $Jar -or -not (Test-Path -LiteralPath $buildMarkerPath -PathType Leaf)) {
        return $true
    }

    try {
        $buildMarker = Get-Content -Raw -LiteralPath $buildMarkerPath | ConvertFrom-Json
        if ($buildMarker.jarLastWriteUtc -ne $Jar.LastWriteTimeUtc.ToString('o')) {
            return $true
        }
    }
    catch {
        return $true
    }

    $inputs = @(
        (Join-Path $backendDirectory 'pom.xml'),
        (Join-Path $backendDirectory 'src'),
        (Join-Path $repositoryRoot 'content'),
        (Join-Path $repositoryRoot 'frontend/src'),
        (Join-Path $repositoryRoot 'frontend/index.html'),
        (Join-Path $repositoryRoot 'frontend/package.json'),
        (Join-Path $repositoryRoot 'frontend/package-lock.json'),
        (Join-Path $repositoryRoot 'frontend/vite.config.ts')
    )
    foreach ($input in $inputs) {
        if (-not (Test-Path -LiteralPath $input)) {
            continue
        }
        $item = Get-Item -LiteralPath $input
        if (-not $item.PSIsContainer) {
            if ($item.LastWriteTimeUtc -gt $Jar.LastWriteTimeUtc) {
                return $true
            }
            continue
        }
        $newer = Get-ChildItem -LiteralPath $input -Recurse -File -ErrorAction Stop |
            Where-Object { $_.LastWriteTimeUtc -gt $Jar.LastWriteTimeUtc } |
            Select-Object -First 1
        if ($null -ne $newer) {
            return $true
        }
    }
    return $false
}

function Build-Application {
    Write-Host '正在构建内网同源应用……' -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot 'validate-content.ps1')
    & (Join-Path $PSScriptRoot 'build-frontend.ps1')

    $maven = Get-MavenExecutable
    $originalJavaHome = $env:JAVA_HOME
    $env:JAVA_HOME = Get-JavaHome
    try {
        Clear-ReadOnlyBuildOutput -Path (Join-Path $backendDirectory 'target')
        Push-Location $backendDirectory
        try {
            & $maven clean package '-Pweb,finxscope' '-DskipTests'
            if ($LASTEXITCODE -ne 0) {
                throw "内网应用构建失败，退出码：$LASTEXITCODE"
            }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        if ($null -eq $originalJavaHome) {
            Remove-Item Env:JAVA_HOME -ErrorAction SilentlyContinue
        }
        else {
            $env:JAVA_HOME = $originalJavaHome
        }
    }

    $builtJar = Get-ApplicationJar
    if ($null -eq $builtJar) {
        throw '内网构建完成后未找到可执行 JAR。'
    }
    [ordered]@{
        profiles = @('web', 'finxscope')
        jarLastWriteUtc = $builtJar.LastWriteTimeUtc.ToString('o')
        builtAt = [DateTimeOffset]::Now.ToString('o')
    } | ConvertTo-Json | Set-Content -LiteralPath $buildMarkerPath -Encoding utf8
}

function Set-ProcessEnvironment {
    param(
        [hashtable]$OriginalValues,
        [string]$Name,
        [AllowEmptyString()][string]$Value
    )

    $OriginalValues[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process')
    [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
}

function Restore-ProcessEnvironment {
    param([hashtable]$OriginalValues)

    foreach ($name in $OriginalValues.Keys) {
        [Environment]::SetEnvironmentVariable($name, $OriginalValues[$name], 'Process')
    }
}

if ($Stop) {
    Stop-Training
    exit 0
}

New-Item -ItemType Directory -Force -Path $runtimeDirectory, $logDirectory | Out-Null

$managed = Get-ManagedProcess
if ($null -ne $managed -and $ResetKey) {
    Stop-Training
    $managed = $null
}
if ($null -ne $managed) {
    $existingSettings = Get-Content -Raw -LiteralPath $settingsPath | ConvertFrom-Json
    $loginUrl = "$($existingSettings.publicUrl.TrimEnd('/'))/login"
    Write-Host "托管智训营已运行：$loginUrl" -ForegroundColor Green
    if (-not $NoBrowser) {
        Start-Process $loginUrl
    }
    exit 0
}
Remove-Item -LiteralPath $processPath -Force -ErrorAction SilentlyContinue

if (-not (Test-Path -LiteralPath $settingsPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $secretsPath -PathType Leaf)) {
    Initialize-Configuration
}
elseif ($ResetKey) {
    Reset-ModelKey
}

$settings = Get-Content -Raw -LiteralPath $settingsPath | ConvertFrom-Json
$secrets = Import-Clixml -LiteralPath $secretsPath

$jar = Get-ApplicationJar
if (Test-BuildRequired -Jar $jar) {
    Build-Application
    $jar = Get-ApplicationJar
}
if ($null -eq $jar) {
    throw '未找到可执行的 custody-training JAR。'
}

$javaHome = Get-JavaHome
$java = Join-Path $javaHome 'bin/java.exe'
$originalEnvironment = @{}
$process = $null
try {
    Set-ProcessEnvironment $originalEnvironment 'SPRING_PROFILES_ACTIVE' 'internal,finxscope'
    Set-ProcessEnvironment $originalEnvironment 'APP_MODE' 'internal'
    Set-ProcessEnvironment $originalEnvironment 'CASE_REVIEW_MODE' 'openai'
    Set-ProcessEnvironment $originalEnvironment 'MODEL_TRANSPORT' 'finxscope'
    Set-ProcessEnvironment $originalEnvironment 'MODEL_BASE_URL' ([string]$settings.modelBaseUrl)
    Set-ProcessEnvironment $originalEnvironment 'MODEL_NAME' ([string]$settings.modelName)
    Set-ProcessEnvironment $originalEnvironment 'MODEL_API_KEY' (ConvertFrom-SecureValue $secrets.ModelApiKey)
    Set-ProcessEnvironment $originalEnvironment 'DB_URL' ([string]$settings.dbUrl)
    Set-ProcessEnvironment $originalEnvironment 'DB_USERNAME' ([string]$settings.dbUsername)
    Set-ProcessEnvironment $originalEnvironment 'DB_PASSWORD' (ConvertFrom-SecureValue $secrets.DatabasePassword)
    Set-ProcessEnvironment $originalEnvironment 'DB_DRIVER' ([string]$settings.dbDriver)
    Set-ProcessEnvironment $originalEnvironment 'BOOTSTRAP_USER1_EMPLOYEE_NO' ([string]$settings.bootstrapEmployeeNo)
    Set-ProcessEnvironment $originalEnvironment 'BOOTSTRAP_USER1_DISPLAY_NAME' ([string]$settings.bootstrapDisplayName)
    Set-ProcessEnvironment $originalEnvironment 'BOOTSTRAP_USER1_PASSWORD' (ConvertFrom-SecureValue $secrets.BootstrapPassword)
    Set-ProcessEnvironment $originalEnvironment 'SERVER_PORT' ([string]$settings.serverPort)
    $secureCookie = if ([string]$settings.publicUrl -like 'https://*') { 'true' } else { 'false' }
    Set-ProcessEnvironment $originalEnvironment 'SESSION_COOKIE_SECURE' $secureCookie

    $process = Start-Process -FilePath $java `
        -ArgumentList @('-jar', ('"{0}"' -f $jar.FullName)) `
        -WorkingDirectory $backendDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru
}
finally {
    Restore-ProcessEnvironment $originalEnvironment
}

[ordered]@{
    pid = $process.Id
    jar = $jar.FullName
    startedAt = [DateTimeOffset]::Now.ToString('o')
} | ConvertTo-Json | Set-Content -LiteralPath $processPath -Encoding utf8

$healthUrl = "http://127.0.0.1:$($settings.serverPort)/api/health"
$deadline = [DateTime]::UtcNow.AddSeconds(90)
$healthy = $false
while ([DateTime]::UtcNow -lt $deadline) {
    if ($process.HasExited) {
        break
    }
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 3
        if ($response.status -eq 'UP') {
            $healthy = $true
            break
        }
    }
    catch {
        Start-Sleep -Milliseconds 750
    }
}

if (-not $healthy) {
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $processPath -Force -ErrorAction SilentlyContinue
    throw "托管智训营未能在 90 秒内启动。请查看：$stderrPath"
}

$loginUrl = "$($settings.publicUrl.TrimEnd('/'))/login"
Write-Host "托管智训营已启动：$loginUrl" -ForegroundColor Green
Write-Host "停止服务：.\scripts\start-training.ps1 -Stop"
if (-not $NoBrowser) {
    Start-Process $loginUrl
}
