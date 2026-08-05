[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$contentRoot = Join-Path $repositoryRoot 'content'
$schemaRoot = Join-Path $repositoryRoot 'contracts/schemas'
$examplesRoot = Join-Path $repositoryRoot 'contracts/examples'

function Read-Json {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "缺少 JSON 文件：$Path"
    }
    try {
        return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 |
            ConvertFrom-Json -DateKind String
    }
    catch {
        throw "JSON 解析失败：$Path"
    }
}

function Require-Property {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Owner
    )
    if ($null -eq $Object.PSObject.Properties[$Name]) {
        throw "$Owner 缺少必需字段：$Name"
    }
}

function Test-JsonSchema {
    param(
        [Parameter(Mandatory = $false)]$Value,
        [Parameter(Mandatory = $true)]$Schema,
        [Parameter(Mandatory = $true)][string]$Path
    )

    if ($null -ne $Schema.PSObject.Properties['const'] -and
        $Value -ne $Schema.const) {
        throw "$Path 不符合 const 约束。"
    }
    if ($null -ne $Schema.PSObject.Properties['enum'] -and
        -not (@($Schema.enum) -ccontains $Value)) {
        throw "$Path 不在枚举范围内。"
    }
    if ($null -ne $Schema.PSObject.Properties['type']) {
        $validType = switch ($Schema.type) {
            'object' { $null -ne $Value -and
                $Value -isnot [string] -and
                $Value -isnot [System.Array] -and
                $null -ne $Value.PSObject }
            'array' { $Value -is [System.Array] }
            'string' { $Value -is [string] }
            'integer' { $Value -is [byte] -or $Value -is [int16] -or
                $Value -is [int32] -or $Value -is [int64] }
            'number' { $Value -is [byte] -or $Value -is [int16] -or
                $Value -is [int32] -or $Value -is [int64] -or
                $Value -is [single] -or $Value -is [double] -or $Value -is [decimal] }
            'boolean' { $Value -is [bool] }
            default { throw "$Path 使用了脚本未支持的 Schema 类型：$($Schema.type)" }
        }
        if (-not $validType) { throw "$Path 类型应为 $($Schema.type)。" }
    }

    if ($Value -is [string]) {
        if ($null -ne $Schema.PSObject.Properties['pattern'] -and
            $Value -notmatch $Schema.pattern) {
            throw "$Path 不符合 pattern 约束。"
        }
        if ($Schema.format -eq 'date-time') {
            $parsed = [DateTimeOffset]::MinValue
            if (-not [DateTimeOffset]::TryParse(
                $Value, [Globalization.CultureInfo]::InvariantCulture,
                [Globalization.DateTimeStyles]::RoundtripKind, [ref]$parsed)) {
                throw "$Path 不是有效的 date-time。"
            }
        }
    }
    if ($null -ne $Value -and
        $null -ne $Schema.PSObject.Properties['minimum'] -and
        [decimal]$Value -lt [decimal]$Schema.minimum) {
        throw "$Path 小于 minimum。"
    }
    if ($null -ne $Value -and
        $null -ne $Schema.PSObject.Properties['maximum'] -and
        [decimal]$Value -gt [decimal]$Schema.maximum) {
        throw "$Path 大于 maximum。"
    }
    if ($Value -is [System.Array]) {
        if ($null -ne $Schema.PSObject.Properties['minItems'] -and
            $Value.Count -lt [int]$Schema.minItems) {
            throw "$Path 少于 minItems。"
        }
        if ($null -ne $Schema.PSObject.Properties['maxItems'] -and
            $Value.Count -gt [int]$Schema.maxItems) {
            throw "$Path 超过 maxItems。"
        }
        if ($null -ne $Schema.PSObject.Properties['items']) {
            for ($index = 0; $index -lt $Value.Count; $index += 1) {
                Test-JsonSchema $Value[$index] $Schema.items "$Path[$index]"
            }
        }
    }
    if ($null -ne $Value -and
        $Schema.type -eq 'object') {
        if ($null -ne $Schema.PSObject.Properties['required']) {
            foreach ($required in @($Schema.required)) {
                if ($null -eq $Value.PSObject.Properties[$required]) {
                    throw "$Path 缺少 Schema 必需字段：$required"
                }
            }
        }
        if ($Schema.additionalProperties -eq $false) {
            $allowed = @($Schema.properties.PSObject.Properties.Name)
            foreach ($actual in @($Value.PSObject.Properties.Name)) {
                if ($allowed -notcontains $actual) {
                    throw "$Path 包含 Schema 未允许字段：$actual"
                }
            }
        }
        if ($null -ne $Schema.PSObject.Properties['properties']) {
            foreach ($property in @($Schema.properties.PSObject.Properties)) {
                $actual = $Value.PSObject.Properties[$property.Name]
                if ($null -ne $actual) {
                    Test-JsonSchema $actual.Value $property.Value "$Path.$($property.Name)"
                }
            }
        }
    }
}

$schemaFiles = @(
    'release-manifest.schema.json',
    'map.schema.json',
    'route.schema.json',
    'rubric.schema.json'
)
$schemas = @{}
foreach ($schemaFile in $schemaFiles) {
    $schema = Read-Json (Join-Path $schemaRoot $schemaFile)
    $schemas[$schemaFile] = $schema
    if ($schema.'$schema' -ne 'https://json-schema.org/draft/2020-12/schema') {
        throw "$schemaFile 未使用 JSON Schema 2020-12。"
    }
    foreach ($field in @('$id', 'title', 'type', 'required', 'properties')) {
        Require-Property $schema $field $schemaFile
    }
}

$releasePath = Join-Path $contentRoot 'releases/ACCOUNTING_2026.08.1.json'
$release = Read-Json $releasePath
Test-JsonSchema $release $schemas['release-manifest.schema.json'] '$.release'
foreach ($field in @('releaseId', 'releasedAt', 'map', 'routes')) {
    Require-Property $release $field '发布清单'
}
if (@($release.routes).Count -lt 1) { throw '发布清单至少需要一条正式路线。' }

$mapPath = Join-Path $contentRoot $release.map.path
$map = Read-Json $mapPath
Test-JsonSchema $map $schemas['map.schema.json'] '$.map'
foreach ($field in @('mapId', 'version', 'lines')) {
    Require-Property $map $field '地图资产'
}
$lines = @($map.lines)
if ($lines.Count -ne 3) { throw '地图必须恰好包含清算、核算、监督三条线。' }
$lineIds = @($lines | ForEach-Object { $_.line } | Sort-Object -Unique)
if (($lineIds -join ',') -ne 'ACCOUNTING,CLEARING,SUPERVISION') {
    throw '地图条线枚举不完整。'
}
$accounting = @($lines | Where-Object line -eq 'ACCOUNTING')
$clearing = @($lines | Where-Object line -eq 'CLEARING')
$supervision = @($lines | Where-Object line -eq 'SUPERVISION')
if ($accounting.availability -ne 'OPEN' -or
    $clearing.availability -ne 'BUILDING' -or
    $supervision.availability -ne 'BUILDING') {
    throw '三条线开放状态不符合当前产品决策。'
}
if (@($clearing[0].regions).Count -ne 0 -or @($supervision[0].regions).Count -ne 0) {
    throw '清算或监督不得包含虚假地图内容。'
}

$nodeIds = @{}
$routeNodes = @{}
foreach ($line in $lines) {
    foreach ($region in @($line.regions)) {
        foreach ($module in @($region.modules)) {
            foreach ($node in @($module.nodes)) {
                if ($nodeIds.ContainsKey($node.nodeId)) { throw "地图节点 ID 重复：$($node.nodeId)" }
                $nodeIds[$node.nodeId] = $true
                $routeNodes[$node.routeId] = $node
            }
        }
    }
}
foreach ($node in $routeNodes.Values) {
    foreach ($prerequisite in @($node.prerequisiteNodeIds)) {
        if (-not $nodeIds.ContainsKey($prerequisite)) {
            throw "地图前置节点引用不存在：$prerequisite"
        }
    }
}

$publishedRoutes = @{}
foreach ($routeRelease in @($release.routes)) {
    foreach ($field in @('routeId', 'contentVersion', 'rubricVersion', 'contentPath', 'rubricPath')) {
        Require-Property $routeRelease $field "发布路线 $($routeRelease.routeId)"
    }
    $route = Read-Json (Join-Path $contentRoot $routeRelease.contentPath)
    $rubric = Read-Json (Join-Path $contentRoot $routeRelease.rubricPath)
    Test-JsonSchema $route $schemas['route.schema.json'] "$.routes.$($routeRelease.routeId)"
    Test-JsonSchema $rubric $schemas['rubric.schema.json'] "$.rubrics.$($routeRelease.routeId)"
    if ($route.routeId -ne $routeRelease.routeId -or
        $rubric.routeId -ne $routeRelease.routeId -or
        $route.contentVersion -ne $routeRelease.contentVersion -or
        $rubric.rubricVersion -ne $routeRelease.rubricVersion) {
        throw "发布路线版本或稳定 ID 不一致：$($routeRelease.routeId)"
    }
    foreach ($step in @('KNOWLEDGE_CARD', 'DEMONSTRATION', 'BASIC_PRACTICE', 'COMPREHENSIVE_PRACTICE')) {
        Require-Property $route.steps $step "路线 $($route.routeId)"
    }
    if (@($route.steps.KNOWLEDGE_CARD.cards).Count -lt 1 -or
        @($route.steps.KNOWLEDGE_CARD.cards).Count -gt 3) {
        throw "知识卡数量不符合 Schema：$($route.routeId)"
    }
    if (@($route.steps.BASIC_PRACTICE.questions).Count -lt 1 -or
        @($route.steps.BASIC_PRACTICE.questions).Count -gt 5) {
        throw "基础练习数量不符合 Schema：$($route.routeId)"
    }
    $questionIds = @{}
    foreach ($question in @($route.steps.BASIC_PRACTICE.questions)) {
        foreach ($field in @('questionId', 'type', 'prompt', 'answer', 'explanation', 'hints')) {
            Require-Property $question $field "基础练习题 $($question.questionId)"
        }
        if ($questionIds.ContainsKey($question.questionId)) { throw "题目 ID 重复：$($question.questionId)" }
        $questionIds[$question.questionId] = $true
        $shapeProperty = switch ($question.type) {
            'FIELD_MAP' { 'fieldMappings'; break }
            'CALCULATION' { 'calculation'; break }
            'LEDGER_ENTRY' { 'ledgerEntries'; break }
            'RECONCILIATION' { 'reconciliation'; break }
            'SHORT_TEXT' { 'textInput'; break }
            default { $null }
        }
        if ($null -ne $shapeProperty -and
            $null -eq $question.PSObject.Properties[$shapeProperty]) {
            throw "基础练习题 $($question.questionId) 的 $($question.type) 缺少结构化题面字段 $shapeProperty。"
        }
    }

    if ($rubric.totalScore -ne 100 -or $rubric.passScore -ne 75) {
        throw "Rubric 总分或通过线无效：$($route.routeId)"
    }
    $expectedDimensions = @{ CONCEPT = 25; PROCESS = 30; RISK = 25; EXPRESSION = 20 }
    $targetIds = @{}
    foreach ($target in @($rubric.remediationTargets)) {
        $targetIds[$target.targetId] = $true
        if (-not $questionIds.ContainsKey($target.questionId)) {
            throw "补学目标引用的题目不存在：$($target.targetId)"
        }
    }
    $grandTotal = 0
    foreach ($dimension in @($rubric.dimensions)) {
        if (-not $expectedDimensions.ContainsKey($dimension.dimension)) {
            throw "评分维度枚举无效：$($dimension.dimension)"
        }
        $dimensionTotal = 0
        foreach ($criterion in @($dimension.criteria)) {
            $dimensionTotal += [int]$criterion.weight
            if (-not $targetIds.ContainsKey($criterion.remediationTargetId)) {
                throw "评分项缺少有效补学映射：$($criterion.criterionId)"
            }
        }
        if ($dimensionTotal -ne $expectedDimensions[$dimension.dimension] -or
            $dimension.maxScore -ne $dimensionTotal) {
            throw "评分维度权重无效：$($dimension.dimension)"
        }
        $grandTotal += $dimensionTotal
    }
    if ($grandTotal -ne 100) { throw "四维评分合计不为100：$($route.routeId)" }
    if (@($rubric.mandatoryRequirements).Count -lt 1 -or
        @($rubric.mandatoryRequirements).Count -gt 2) {
        throw "硬性必达项数量无效：$($route.routeId)"
    }
    foreach ($mandatory in @($rubric.mandatoryRequirements)) {
        if (-not $targetIds.ContainsKey($mandatory.remediationTargetId)) {
            throw "硬性必达项缺少有效补学映射：$($mandatory.requirementId)"
        }
    }
    if (-not $routeNodes.ContainsKey($route.routeId) -or
        $routeNodes[$route.routeId].contentAvailability -ne 'PUBLISHED') {
        throw "正式路线未被正式地图发布：$($route.routeId)"
    }
    $publishedRoutes[$route.routeId] = $true
}

$exampleFiles = @(Get-ChildItem -LiteralPath $examplesRoot -File -Filter '*.json')
foreach ($file in $exampleFiles) { $null = Read-Json $file.FullName }

$allJson = @(Get-ChildItem -LiteralPath $contentRoot, $schemaRoot, $examplesRoot -Recurse -File -Filter '*.json')
Write-Output ("正式内容与契约校验通过：{0} 个 JSON；{1} 条正式路线；4 份正式 Schema。" -f
    $allJson.Count, $publishedRoutes.Count)
