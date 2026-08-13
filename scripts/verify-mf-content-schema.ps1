[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent

# Run the existing release validation first. It only reads routes registered in release.
. (Join-Path $PSScriptRoot 'validate-content.ps1')

$routeSchema = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repositoryRoot 'contracts/schemas/route.schema.json') | ConvertFrom-Json
$rubricSchema = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repositoryRoot 'contracts/schemas/rubric.schema.json') | ConvertFrom-Json

$targets = @(
    @{ Kind = 'route'; Path = 'content/routes/accounting/ACC-MF-FRAME-001.json'; Schema = $routeSchema },
    @{ Kind = 'rubric'; Path = 'content/rubrics/accounting/ACC-MF-FRAME-001.json'; Schema = $rubricSchema },
    @{ Kind = 'route'; Path = 'content/routes/accounting/ACC-MF-EIR-002.json'; Schema = $routeSchema },
    @{ Kind = 'rubric'; Path = 'content/rubrics/accounting/ACC-MF-EIR-002.json'; Schema = $rubricSchema },
    @{ Kind = 'route'; Path = 'content/routes/accounting/ACC-MF-TA-003.json'; Schema = $routeSchema },
    @{ Kind = 'rubric'; Path = 'content/rubrics/accounting/ACC-MF-TA-003.json'; Schema = $rubricSchema },
    @{ Kind = 'route'; Path = 'content/routes/accounting/ACC-MF-CARRY-004.json'; Schema = $routeSchema },
    @{ Kind = 'rubric'; Path = 'content/rubrics/accounting/ACC-MF-CARRY-004.json'; Schema = $rubricSchema },
    @{ Kind = 'route'; Path = 'content/routes/accounting/ACC-MF-YIELD-005.json'; Schema = $routeSchema },
    @{ Kind = 'rubric'; Path = 'content/rubrics/accounting/ACC-MF-YIELD-005.json'; Schema = $rubricSchema }
)

foreach ($target in $targets) {
    $absolutePath = Join-Path $repositoryRoot $target.Path
    if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
        throw "Missing verification target: $absolutePath"
    }
    $value = Get-Content -Raw -Encoding UTF8 -LiteralPath $absolutePath | ConvertFrom-Json -DateKind String
    Test-JsonSchema -Value $value -Schema $target.Schema -Path $target.Path
    Write-Output ("Schema PASS: {0} ({1})" -f $target.Path, $target.Kind)
}

Write-Output 'Published MF FRAME/EIR/TA/CARRY/YIELD routes passed the active route/rubric schemas and ACCOUNTING release validation.'
