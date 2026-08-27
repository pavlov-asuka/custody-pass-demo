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

$activeReleasePath = Join-Path $contentRoot 'releases/CUSTODY_2026.08.12.json'
$legacyReleasePath = Join-Path $contentRoot 'releases/ACCOUNTING_2026.08.10.json'
$activeRelease = Read-Json $activeReleasePath
$legacyRelease = Read-Json $legacyReleasePath
Test-JsonSchema $activeRelease $schemas['release-manifest.schema.json'] '$.activeRelease'
Test-JsonSchema $legacyRelease $schemas['release-manifest.schema.json'] '$.legacyRelease'
foreach ($field in @('releaseId', 'releasedAt', 'map', 'routes')) {
    Require-Property $activeRelease $field '当前发布清单'
    Require-Property $legacyRelease $field '旧核算发布清单'
}
if ($activeRelease.releaseId -ne 'CUSTODY_2026.08.12') {
    throw '当前发布清单不是 CUSTODY_2026.08.12。'
}
if ($legacyRelease.releaseId -ne 'ACCOUNTING_2026.08.10') {
    throw '旧核算发布清单标识已改变。'
}
if (@($activeRelease.routes).Count -ne 59) { throw '当前发布清单必须包含59条正式路线。' }
if (@($legacyRelease.routes).Count -ne 48) { throw '旧核算发布清单必须保留48条路线。' }

$legacyMapPath = Join-Path $contentRoot $legacyRelease.map.path
if (-not (Test-Path -LiteralPath $legacyMapPath -PathType Leaf)) {
    throw "旧核算发布清单引用的地图不存在：$legacyMapPath"
}
$null = Read-Json $legacyMapPath
foreach ($legacyEntry in @($legacyRelease.routes)) {
    foreach ($field in @('routeId', 'contentVersion', 'rubricVersion', 'contentPath', 'rubricPath')) {
        Require-Property $legacyEntry $field "旧发布路线 $($legacyEntry.routeId)"
    }
    $legacyContentPath = Join-Path $contentRoot $legacyEntry.contentPath
    $legacyRubricPath = Join-Path $contentRoot $legacyEntry.rubricPath
    if (-not (Test-Path -LiteralPath $legacyContentPath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $legacyRubricPath -PathType Leaf)) {
        throw "旧发布路线资产不存在：$($legacyEntry.routeId)"
    }
    $legacyRouteAsset = Read-Json $legacyContentPath
    $legacyRubricAsset = Read-Json $legacyRubricPath
    Test-JsonSchema $legacyRouteAsset $schemas['route.schema.json'] "$.legacyRoutes.$($legacyEntry.routeId)"
    Test-JsonSchema $legacyRubricAsset $schemas['rubric.schema.json'] "$.legacyRubrics.$($legacyEntry.routeId)"
}

$mapPath = Join-Path $contentRoot $activeRelease.map.path
$map = Read-Json $mapPath
Test-JsonSchema $map $schemas['map.schema.json'] '$.map'
foreach ($field in @('mapId', 'version', 'lines')) {
    Require-Property $map $field '地图资产'
}
if ($map.mapId -ne $activeRelease.map.id -or $map.version -ne $activeRelease.map.version) {
    throw '当前发布清单与地图版本不一致。'
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
    $clearing.availability -ne 'OPEN' -or
    $supervision.availability -ne 'OPEN') {
    throw '三条线开放状态不符合当前产品决策。'
}
if (@($supervision[0].regions).Count -ne 1) { throw '监督地图必须登记一个核心大区。' }

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

$accountingNodes = @(
    $accounting.regions | ForEach-Object { $_.modules } |
        ForEach-Object { $_.nodes }
)
$clearingNodes = @(
    $clearing.regions | ForEach-Object { $_.modules } |
        ForEach-Object { $_.nodes }
)
$supervisionNodes = @(
    $supervision.regions | ForEach-Object { $_.modules } |
        ForEach-Object { $_.nodes }
)
if ($accountingNodes.Count -ne 48 -or
    (@($accountingNodes | Where-Object pathType -eq 'REQUIRED').Count -ne 39) -or
    (@($accountingNodes | Where-Object pathType -eq 'ADVANCED').Count -ne 9)) {
    throw 'ACCOUNTING 地图必须保持48节点（39 REQUIRED、9 ADVANCED）。'
}
if ($clearingNodes.Count -ne 7 -or
    (@($clearingNodes | Where-Object nodeType -eq 'ROUTE').Count -ne 7) -or
    (@($clearingNodes | Where-Object pathType -eq 'REQUIRED').Count -ne 7) -or
    (@($clearingNodes | Where-Object nodeType -eq 'STAGE_GATE').Count -ne 0)) {
    throw 'CLEARING 地图必须恰好包含7个 REQUIRED ROUTE 节点且不含阶段闸门。'
}
if ($supervisionNodes.Count -ne 4 -or
    (@($supervisionNodes | Where-Object nodeType -eq 'ROUTE').Count -ne 4) -or
    (@($supervisionNodes | Where-Object pathType -eq 'REQUIRED').Count -ne 4) -or
    (@($supervisionNodes | Where-Object nodeType -eq 'STAGE_GATE').Count -ne 0)) {
    throw 'SUPERVISION 地图必须恰好包含4个 REQUIRED ROUTE 节点且不含阶段闸门。'
}
$expectedSupervisionRoutes = @(
    'SPV-CONTRACT-001', 'SPV-RULE-002', 'SPV-TASK-003', 'SPV-CLOSE-004'
)
$actualSupervisionRoutes = @($supervisionNodes | Sort-Object order | ForEach-Object { $_.routeId })
if (($actualSupervisionRoutes -join '|') -ne ($expectedSupervisionRoutes -join '|')) {
    throw 'SUPERVISION 地图路线顺序必须为合同→规则→任务→闭环。'
}
$expectedSupervisionPrerequisites = @{
    'SPV-CONTRACT-001' = @()
    'SPV-RULE-002' = @('SPV-NODE-CONTRACT-001')
    'SPV-TASK-003' = @('SPV-NODE-RULE-002')
    'SPV-CLOSE-004' = @('SPV-NODE-TASK-003')
}
foreach ($supervisionNode in $supervisionNodes) {
    $expectedPrerequisites = @($expectedSupervisionPrerequisites[$supervisionNode.routeId])
    if (($supervisionNode.prerequisiteNodeIds -join '|') -ne ($expectedPrerequisites -join '|')) {
        throw "监督地图前置不符合主链：$($supervisionNode.routeId)"
    }
}
$expectedClearingPrerequisites = @{
    'CLR-BASE-001' = @()
    'CLR-FUND-PAYMENT-001' = @('CLR-NODE-BASE-001')
    'CLR-FUND-CLOSE-002' = @('CLR-NODE-FUND-PAYMENT-001')
    'CLR-EX-CORE-001' = @('CLR-NODE-BASE-001')
    'CLR-EX-FUNDS-002' = @('CLR-NODE-EX-CORE-001')
    'CLR-IB-INSTRUCTION-001' = @('CLR-NODE-BASE-001')
    'CLR-IB-DVP-CLOSE-002' = @('CLR-NODE-IB-INSTRUCTION-001')
}
foreach ($routeId in $expectedClearingPrerequisites.Keys) {
    if (-not $routeNodes.ContainsKey($routeId)) {
        throw "清算地图缺少正式路线节点：$routeId"
    }
    $actualPrerequisites = @($routeNodes[$routeId].prerequisiteNodeIds)
    $expectedPrerequisites = @($expectedClearingPrerequisites[$routeId])
    if (($actualPrerequisites -join '|') -ne ($expectedPrerequisites -join '|')) {
        throw "清算地图前置不符合主链：$routeId"
    }
}

$publishedRoutes = @{}
foreach ($routeRelease in @($activeRelease.routes)) {
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

$activeRouteIds = @($activeRelease.routes | ForEach-Object { $_.routeId })
$mapRouteIds = @($routeNodes.Keys)
if ($activeRouteIds.Count -ne $mapRouteIds.Count -or
    @($activeRouteIds | Where-Object { $mapRouteIds -notcontains $_ }).Count -ne 0 -or
    @($mapRouteIds | Where-Object { $activeRouteIds -notcontains $_ }).Count -ne 0) {
    throw '当前发布清单与地图正式路线集合不一致。'
}
$activeAccountingRoutes = @($activeRelease.routes | Where-Object { $_.contentPath -like 'routes/accounting/*.json' })
$activeClearingRoutes = @($activeRelease.routes | Where-Object { $_.contentPath -like 'routes/clearing/*.json' })
$activeSupervisionRoutes = @($activeRelease.routes | Where-Object { $_.contentPath -like 'routes/supervision/*.json' })
if ($activeAccountingRoutes.Count -ne 48 -or $activeClearingRoutes.Count -ne 7 -or $activeSupervisionRoutes.Count -ne 4) {
    throw '当前发布清单必须动态登记48条核算路线、7条清算路线和4条监督路线。'
}
if (@($activeRelease.routes | Where-Object { $_.contentPath -notlike 'routes/accounting/*.json' -and $_.contentPath -notlike 'routes/clearing/*.json' -and $_.contentPath -notlike 'routes/supervision/*.json' }).Count -ne 0) {
    throw '当前发布清单包含非 ACCOUNTING/CLEARING/SUPERVISION 正式资产。'
}

$exampleFiles = @(Get-ChildItem -LiteralPath $examplesRoot -File -Filter '*.json')
foreach ($file in $exampleFiles) { $null = Read-Json $file.FullName }

$allJson = @(Get-ChildItem -LiteralPath $contentRoot, $schemaRoot, $examplesRoot -Recurse -File -Filter '*.json')
Write-Output ("正式内容与契约校验通过：{0} 个 JSON；{1} 条正式路线；4 份正式 Schema。" -f
    $allJson.Count, $activeRelease.routes.Count)
