function Get-MavenExecutable {
    $command = Get-Command mvn -ErrorAction SilentlyContinue
    if ($null -ne $command) {
        return $command.Source
    }

    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($env:MAVEN_HOME)) {
        $candidates += Join-Path $env:MAVEN_HOME 'bin/mvn.cmd'
    }

    $repositoryRoot = Split-Path $PSScriptRoot -Parent
    $codingRoot = Split-Path (Split-Path (Split-Path $repositoryRoot -Parent) -Parent) -Parent
    $candidates += Join-Path $codingRoot 'Development/tools/maven/bin/mvn.cmd'

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return $candidate
        }
    }

    throw '未找到 Maven。请将 mvn 加入 PATH，或设置 MAVEN_HOME。'
}

function Get-JavaHome {
    if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        $configuredJava = Join-Path $env:JAVA_HOME 'bin/java.exe'
        if (Test-Path -LiteralPath $configuredJava -PathType Leaf) {
            return $env:JAVA_HOME
        }
    }

    $java = Get-Command java -ErrorAction SilentlyContinue
    if ($null -ne $java) {
        return (Split-Path (Split-Path $java.Source -Parent) -Parent)
    }

    $repositoryRoot = Split-Path $PSScriptRoot -Parent
    $codingRoot = Split-Path (Split-Path (Split-Path $repositoryRoot -Parent) -Parent) -Parent
    foreach ($candidate in @(
        (Join-Path $codingRoot 'Development/tools/jdk17'),
        (Join-Path $codingRoot 'Development/tools/jdk')
    )) {
        if (Test-Path -LiteralPath (Join-Path $candidate 'bin/java.exe') -PathType Leaf) {
            return $candidate
        }
    }

    throw '未找到 JDK 17。请将 java 加入 PATH，或设置 JAVA_HOME。'
}

function Clear-ReadOnlyBuildOutput {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction Stop |
        ForEach-Object {
            $_.Attributes = $_.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly)
        }
    $rootItem = Get-Item -LiteralPath $Path -Force
    $rootItem.Attributes = $rootItem.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly)
}
