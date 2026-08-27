"""Pure-local deterministic validator for the seven W5 clearing routes."""

from __future__ import annotations

import json
import re
import sys
from collections import OrderedDict
from decimal import Decimal, InvalidOperation, getcontext
from pathlib import Path
from typing import Any, Callable, Iterable

from jsonschema import Draft202012Validator


getcontext().prec = 60

REPO = Path(__file__).resolve().parents[1]
PROJECT = REPO.parent
CONTENT = REPO / "content"
SCHEMAS = REPO / "contracts" / "schemas"

ROUTE_IDS = [
    "CLR-BASE-001",
    "CLR-FUND-PAYMENT-001",
    "CLR-FUND-CLOSE-002",
    "CLR-EX-CORE-001",
    "CLR-EX-FUNDS-002",
    "CLR-IB-INSTRUCTION-001",
    "CLR-IB-DVP-CLOSE-002",
]

ROUTE_KEYS = OrderedDict(
    [
        ("CLR-BASE-001", "base"),
        ("CLR-FUND-PAYMENT-001", "fund-payment"),
        ("CLR-FUND-CLOSE-002", "fund-close"),
        ("CLR-EX-CORE-001", "ex-core"),
        ("CLR-EX-FUNDS-002", "ex-funds"),
        ("CLR-IB-INSTRUCTION-001", "ib-instruction"),
        ("CLR-IB-DVP-CLOSE-002", "ib-dvp-close"),
    ]
)

EXPECTED_DEPENDENCIES = {
    "CLR-BASE-001": [],
    "CLR-FUND-PAYMENT-001": ["CLR-BASE-001"],
    "CLR-FUND-CLOSE-002": ["CLR-FUND-PAYMENT-001"],
    "CLR-EX-CORE-001": ["CLR-BASE-001"],
    "CLR-EX-FUNDS-002": ["CLR-EX-CORE-001"],
    "CLR-IB-INSTRUCTION-001": ["CLR-BASE-001"],
    "CLR-IB-DVP-CLOSE-002": ["CLR-IB-INSTRUCTION-001"],
}

EXPECTED_ROUTE_CODES = {
    "CLR-BASE-001": "BASE",
    "CLR-FUND-PAYMENT-001": "FUND-PAYMENT",
    "CLR-FUND-CLOSE-002": "FUND-CLOSE",
    # The exchange pair keeps its route-id as the private evidence routeCode.
    "CLR-EX-CORE-001": "CLR-EX-CORE-001",
    "CLR-EX-FUNDS-002": "CLR-EX-FUNDS-002",
    "CLR-IB-INSTRUCTION-001": "IB-INSTRUCTION",
    "CLR-IB-DVP-CLOSE-002": "IB-DVP-CLOSE",
}

EXPECTED_DIMENSIONS = {"CONCEPT": 25, "PROCESS": 30, "RISK": 25, "EXPRESSION": 20}
EXPECTED_BASIC_TYPES = {"FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION", "SHORT_TEXT"}
BOUNDARY_REFERENCE_HINTS = ("BOUNDARY", "边界", "DEFER", "BUILDING", "排除")

# This scan deliberately excludes route.references and rubric.referenceAnswer:
# reference/evidence assets may state exclusion boundaries, while learner-facing
# route/rubric material may not introduce those topics.
FORBIDDEN_ACTIVE_PATTERNS = [
    (re.compile(r"STAGE_GATE|EXCEPTION_CASE", re.IGNORECASE), "阶段闸门或旧异常题型"),
    (re.compile(r"(?<![A-Za-z0-9])DEFER(?![A-Za-z0-9])", re.IGNORECASE), "DEFER 主题/留痕"),
    (re.compile(r"\b(?:QFII|RQFII)\b", re.IGNORECASE), "QFII/RQFII 主题"),
    (re.compile(r"港股通|回购|公司行为|改革参考|测试版|货银对付改革", re.IGNORECASE), "BUILDING/DEFER 主题"),
    (re.compile(r"异常|失败|重付|缺券|部分交收|未达成|系统故障|接口中断|文件损坏|重复文件|迟到文件|应急", re.IGNORECASE), "异常案例或技术故障"),
    (re.compile(r"历史(?:时点|规则|比例|答案)?|固定时点|截止时点|阈值|费率|厂商菜单|旧题库", re.IGNORECASE), "历史时点/阈值/费率/旧口径"),
    (re.compile(r"真实(?:账户|客户|机构)|身份证|手机号|银行卡|邮箱|Cookie|密码|密钥|令牌", re.IGNORECASE), "真实账户/PII/凭证"),
    (re.compile(r"(?:sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{16,})"), "密钥或授权凭证"),
    (re.compile(r"升级|回滚|重跑|人工介入|评测器|提示词|智能助手|模型", re.IGNORECASE), "升级留痕或 AI 模板"),
    (re.compile(r"(?<![A-Za-z0-9])(?:AI|GPT|assistant|prompt|template)(?![A-Za-z0-9])", re.IGNORECASE), "AI 模板/接口话术"),
    (re.compile(r"(?:https?://|file://|^[A-Za-z]:[\\/]|^\\\\)"), "外部地址或本地绝对路径"),
]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def as_path(path: Iterable[Any]) -> str:
    result = "$"
    for part in path:
        result += f"[{part}]" if isinstance(part, int) else f".{part}"
    return result


def walk_strings(value: Any, path: str = "$") -> Iterable[tuple[str, str]]:
    if isinstance(value, dict):
        for key, child in value.items():
            yield from walk_strings(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_strings(child, f"{path}[{index}]")
    elif isinstance(value, str):
        yield path, value


def dec(value: Any) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise InvalidOperation("not numeric")
    return Decimal(str(value).replace(",", "").strip())


def close(actual: Any, expected: Any, tolerance: Any) -> bool:
    return abs(dec(actual) - dec(expected)) <= dec(tolerance)


def decimal_places(value: str) -> int:
    text = str(value).strip()
    return len(text.partition(".")[2]) if "." in text else 0


def normalize_ab(value: str) -> str:
    return re.sub(r"(?i)(?<=-)(?:A|B)(?=-|$)", "X", value)


def normalize_formula(value: str) -> str:
    text = str(value).replace("×", "*").replace("−", "-").replace("–", "-").replace("—", "-")
    return re.sub(r"\d+(?:\.\d+)?", "N", re.sub(r"\s+", "", text))


class FormulaParser:
    """Small Decimal-only parser for the arithmetic grammar used by evidence."""

    TOKEN = re.compile(r"\s*(?:(\d+(?:\.\d+)?)|([()+\-*/]))")

    def __init__(self, expression: str):
        normalized = expression.replace("×", "*").replace("−", "-").replace("–", "-").replace("—", "-")
        self.tokens: list[tuple[str, str]] = []
        position = 0
        while position < len(normalized):
            match = self.TOKEN.match(normalized, position)
            if not match:
                raise ValueError(f"unsupported token near {normalized[position:]!r}")
            self.tokens.append(("number", match.group(1)) if match.group(1) else ("operator", match.group(2)))
            position = match.end()
        self.index = 0

    def peek(self, symbol: str | None = None) -> bool:
        return self.index < len(self.tokens) and (symbol is None or self.tokens[self.index][1] == symbol)

    def consume(self) -> tuple[str, str]:
        if self.index >= len(self.tokens):
            raise ValueError("unexpected end of formula")
        token = self.tokens[self.index]
        self.index += 1
        return token

    def parse(self) -> Decimal:
        if not self.tokens:
            raise ValueError("empty formula")
        value = self.additive()
        if self.index != len(self.tokens):
            raise ValueError("trailing formula tokens")
        return value

    def additive(self) -> Decimal:
        value = self.multiplicative()
        while self.peek("+") or self.peek("-"):
            operator = self.consume()[1]
            right = self.multiplicative()
            value = value + right if operator == "+" else value - right
        return value

    def multiplicative(self) -> Decimal:
        value = self.factor()
        while self.peek("*") or self.peek("/"):
            operator = self.consume()[1]
            right = self.factor()
            value = value * right if operator == "*" else value / right
        return value

    def factor(self) -> Decimal:
        if self.peek("+") or self.peek("-"):
            operator = self.consume()[1]
            value = self.factor()
            return value if operator == "+" else -value
        if self.peek("("):
            self.consume()
            value = self.additive()
            if not self.peek(")"):
                raise ValueError("unclosed parenthesis")
            self.consume()
            return value
        kind, value = self.consume()
        if kind != "number":
            raise ValueError("number expected")
        return Decimal(value)


def evaluate_formula(formula: Any) -> Decimal | None:
    if not isinstance(formula, str) or "=" in formula:
        return None
    try:
        return FormulaParser(formula).parse()
    except (InvalidOperation, ValueError, ZeroDivisionError):
        return None


class Validation:
    def __init__(self) -> None:
        self.checks = 0
        self.passes = 0
        self.failures: list[str] = []

    def section(self, name: str) -> None:
        print(f"CHECK {name}")

    def check(self, label: str, condition: bool, detail: str = "") -> bool:
        self.checks += 1
        if condition:
            self.passes += 1
            return True
        self.failures.append(f"FAIL {label}: {detail}" if detail else f"FAIL {label}")
        return False

    def guarded(self, label: str, function: Callable[[], None]) -> None:
        try:
            function()
        except (AssertionError, KeyError, TypeError, ValueError, InvalidOperation) as error:
            self.check(label, False, str(error))


def route_path(route_id: str) -> Path:
    return CONTENT / "routes" / "clearing" / f"{route_id}.json"


def rubric_path(route_id: str) -> Path:
    return CONTENT / "rubrics" / "clearing" / f"{route_id}.json"


def evidence_path(route_id: str) -> Path:
    return CONTENT / "evidence" / "clearing" / ROUTE_KEYS[route_id] / f"{route_id}-evidence.json"


def validate_schema(value: Any, schema: dict[str, Any], label: str, validation: Validation) -> None:
    errors = sorted(Draft202012Validator(schema).iter_errors(value), key=lambda error: list(error.path))
    validation.check(
        f"{label}.schema",
        not errors,
        "; ".join(f"{as_path(error.path)}: {error.message}" for error in errors[:8]),
    )


def check_inventory(validation: Validation) -> None:
    validation.section("资产清单与唯一身份")
    route_files = {item.stem for item in (CONTENT / "routes" / "clearing").glob("*.json")}
    rubric_files = {item.stem for item in (CONTENT / "rubrics" / "clearing").glob("*.json")}
    reference_files = {item.stem.removesuffix("-evidence") for item in (CONTENT / "references" / "clearing").glob("*.md")}
    evidence_files = {item.stem.removesuffix("-evidence") for item in (CONTENT / "evidence" / "clearing").glob("*/*.json")}
    expected = set(ROUTE_IDS)
    validation.check("routes.inventory", route_files == expected, f"expected={sorted(expected)} actual={sorted(route_files)}")
    validation.check("rubrics.inventory", rubric_files == expected, f"expected={sorted(expected)} actual={sorted(rubric_files)}")
    validation.check("references.inventory", reference_files == expected, f"expected={sorted(expected)} actual={sorted(reference_files)}")
    validation.check("evidence.inventory", evidence_files == expected, f"expected={sorted(expected)} actual={sorted(evidence_files)}")
    validation.check("clearing.asset-count", sum(map(len, (route_files, rubric_files, reference_files, evidence_files))) == 28)


def check_identity(
    route_id: str,
    route: dict[str, Any],
    rubric: dict[str, Any],
    evidence: dict[str, Any],
    validation: Validation,
) -> None:
    validation.check(f"{route_id}.routeId", route.get("routeId") == route_id)
    validation.check(f"{route_id}.line", route.get("line") == "CLEARING")
    validation.check(f"{route_id}.contentVersion", route.get("contentVersion") == "1.0.0")
    validation.check(f"{route_id}.rubric.identity", rubric.get("routeId") == route_id and rubric.get("rubricVersion") == route.get("contentVersion"))
    validation.check(f"{route_id}.evidence.identity", evidence.get("routeId") == route_id and evidence.get("version") == route.get("contentVersion"))
    validation.check(f"{route_id}.evidence.routeCode", evidence.get("routeCode") == EXPECTED_ROUTE_CODES[route_id])
    validation.check(f"{route_id}.evidence.evidenceId", bool(evidence.get("evidenceId")))
    private_exchange_evidence = route_id in {"CLR-EX-CORE-001", "CLR-EX-FUNDS-002"}
    valid_scope = evidence.get("scope") == "ONLY_THIS_CASE" or (
        private_exchange_evidence and evidence.get("scope") == "ROUTE_PRIVATE_EVIDENCE"
    )
    valid_provenance = evidence.get("provenance") == "SYNTHETIC_EDUCATIONAL" or (
        private_exchange_evidence
        and evidence.get("provenance") == "MATERIAL_ABSTRACTION_WITH_SYNTHETIC_EDUCATIONAL_FIXTURES"
    )
    validation.check(f"{route_id}.evidence.scope", valid_scope)
    validation.check(f"{route_id}.evidence.provenance", valid_provenance)
    policy = evidence.get("dependencyPolicy", {})
    dependency = policy.get("dependsOnRouteIds")
    if dependency is None:
        dependency = policy.get("requiredRouteIds")
    validation.check(f"{route_id}.dependency", dependency == EXPECTED_DEPENDENCIES[route_id], f"expected={EXPECTED_DEPENDENCIES[route_id]} actual={dependency}")
    validation.check(f"{route_id}.dependency-boundary", isinstance(policy.get("worldBoundary"), str) or isinstance(policy.get("note"), str))
    validation.check(f"{route_id}.no-stage-gate", policy.get("stageGate", False) is False)


def check_route_shape(route_id: str, route: dict[str, Any], validation: Validation) -> tuple[set[str], set[str]]:
    prefix = route_id
    steps = route.get("steps", {})
    cards = steps.get("KNOWLEDGE_CARD", {}).get("cards", [])
    demonstrations = steps.get("DEMONSTRATION", {}).get("steps", [])
    basics = steps.get("BASIC_PRACTICE", {}).get("questions", [])
    comprehensive = steps.get("COMPREHENSIVE_PRACTICE", {})
    work_items = comprehensive.get("workItems", [])
    materials = comprehensive.get("sourceMaterials", [])
    question_ids = {item.get("questionId") for item in basics}
    work_ids = {item.get("workItemId") for item in work_items}
    validation.check(f"{prefix}.cards.count", len(cards) == 3, str(len(cards)))
    validation.check(f"{prefix}.demonstration.count", len(demonstrations) == 5, str(len(demonstrations)))
    validation.check(f"{prefix}.demonstration.order", [item.get("order") for item in demonstrations] == [1, 2, 3, 4, 5])
    validation.check(f"{prefix}.basic.count", len(basics) == 5, str(len(basics)))
    validation.check(f"{prefix}.basic.heterogeneous", {item.get("type") for item in basics} == EXPECTED_BASIC_TYPES)
    validation.check(f"{prefix}.basic.short-text", sum(item.get("type") == "SHORT_TEXT" for item in basics) == 1)
    validation.check(f"{prefix}.comprehensive.sources", len(materials) >= 2, str(len(materials)))
    validation.check(f"{prefix}.comprehensive.work-items", len(work_items) >= 3, str(len(work_items)))
    validation.check(f"{prefix}.comprehensive.short-text", sum(item.get("type") == "SHORT_TEXT" for item in work_items) == 1)
    validation.check(
        f"{prefix}.short-text.total",
        sum(item.get("type") == "SHORT_TEXT" for item in basics) + sum(item.get("type") == "SHORT_TEXT" for item in work_items) == 2,
    )
    validation.check(f"{prefix}.question-ids.unique", None not in question_ids and len(question_ids) == len(basics))
    validation.check(f"{prefix}.work-item-ids.unique", None not in work_ids and len(work_ids) == len(work_items))
    material_ids = [item.get("materialId") for item in materials]
    card_ids = [item.get("cardId") for item in cards]
    validation.check(f"{prefix}.material-ids.unique", None not in material_ids and len(set(material_ids)) == len(material_ids))
    validation.check(f"{prefix}.card-ids.unique", None not in card_ids and len(set(card_ids)) == len(card_ids))
    for index, question in enumerate(basics):
        qid = question.get("questionId", f"[{index}]")
        if question.get("type") == "SHORT_TEXT":
            validation.check(f"{prefix}.basic[{qid}].short-text-shape", isinstance(question.get("textInput"), dict))
        if question.get("type") == "CALCULATION":
            fields = question.get("calculation", {}).get("fields", [])
            for field_index, field in enumerate(fields):
                validation.check(
                    f"{prefix}.basic[{qid}].calculation[{field_index}].number-meta",
                    isinstance(field.get("unit"), str) and isinstance(field.get("precision"), int) and field.get("precision", -1) >= 0 and field.get("tolerance") is not None,
                )
        if question.get("type") == "RECONCILIATION":
            fields = question.get("reconciliation", {}).get("fields", [])
            for field_index, field in enumerate(fields):
                if field.get("kind") == "NUMBER":
                    validation.check(
                        f"{prefix}.basic[{qid}].reconciliation[{field_index}].number-meta",
                        isinstance(field.get("precision"), int) and field.get("precision", -1) >= 0 and field.get("tolerance") is not None,
                    )
    return {item for item in work_ids if item}, {item for item in question_ids if item}


def rubric_rules(rubric: dict[str, Any]) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    for dimension in rubric.get("dimensions", []):
        for criterion in dimension.get("criteria", []):
            rules.extend(criterion.get("evidenceRules", []))
    for mandatory in rubric.get("mandatoryRequirements", []):
        rules.extend(mandatory.get("evidenceRules", []))
    return rules


def check_rubric(
    route_id: str,
    route: dict[str, Any],
    rubric: dict[str, Any],
    work_ids: set[str],
    question_ids: set[str],
    validation: Validation,
) -> tuple[set[str], set[str]]:
    prefix = route_id
    validation.check(f"{prefix}.rubric.total-pass", rubric.get("totalScore") == 100 and rubric.get("passScore") == 75)
    dimensions = rubric.get("dimensions", [])
    actual = {item.get("dimension"): item.get("maxScore") for item in dimensions}
    validation.check(f"{prefix}.rubric.dimensions", actual == EXPECTED_DIMENSIONS, f"actual={actual}")
    criterion_ids: set[str] = set()
    mandatory_ids: set[str] = set()
    targets = {item.get("targetId"): item for item in rubric.get("remediationTargets", [])}
    target_ids = list(targets)
    validation.check(f"{prefix}.rubric.target-ids.unique", None not in target_ids and len(target_ids) == len(rubric.get("remediationTargets", [])))
    validation.check(f"{prefix}.rubric.mandatory-count", 1 <= len(rubric.get("mandatoryRequirements", [])) <= 2)
    for dimension in dimensions:
        dimension_id = dimension.get("dimension")
        criteria = dimension.get("criteria", [])
        weight = sum(item.get("weight", 0) for item in criteria)
        validation.check(f"{prefix}.rubric.{dimension_id}.weights", weight == EXPECTED_DIMENSIONS.get(dimension_id) and dimension.get("maxScore") == weight, f"sum={weight}")
        for criterion in criteria:
            criterion_id = criterion.get("criterionId")
            criterion_ids.add(criterion_id)
            validation.check(f"{prefix}.rubric.criterion[{criterion_id}].target", criterion.get("remediationTargetId") in targets)
    validation.check(f"{prefix}.rubric.criterion-ids.unique", None not in criterion_ids and len(criterion_ids) == sum(len(item.get("criteria", [])) for item in dimensions))
    for mandatory in rubric.get("mandatoryRequirements", []):
        requirement_id = mandatory.get("requirementId")
        mandatory_ids.add(requirement_id)
        validation.check(f"{prefix}.rubric.mandatory[{requirement_id}].target", mandatory.get("remediationTargetId") in targets)
    validation.check(f"{prefix}.rubric.mandatory-ids.unique", None not in mandatory_ids and len(mandatory_ids) == len(rubric.get("mandatoryRequirements", [])))

    basic_short_text_ids = {
        item.get("questionId")
        for item in route.get("steps", {}).get("BASIC_PRACTICE", {}).get("questions", [])
        if item.get("type") == "SHORT_TEXT"
    }
    for target_id, target in targets.items():
        question_id = target.get("questionId")
        validation.check(f"{prefix}.remediation[{target_id}].question", question_id in question_ids, f"questionId={question_id!r}")
        validation.check(f"{prefix}.remediation[{target_id}].material-step", target.get("materialStep") in {"KNOWLEDGE_CARD", "DEMONSTRATION"})
    expression_target_ids = {
        criterion.get("remediationTargetId")
        for dimension in dimensions
        if dimension.get("dimension") == "EXPRESSION"
        for criterion in dimension.get("criteria", [])
    }
    for target_id in expression_target_ids:
        validation.check(
            f"{prefix}.expression-remediation[{target_id}].basic-short-text",
            targets.get(target_id, {}).get("questionId") in basic_short_text_ids,
        )

    target_use = {
        criterion.get("remediationTargetId")
        for dimension in dimensions
        for criterion in dimension.get("criteria", [])
    }
    target_use |= {item.get("remediationTargetId") for item in rubric.get("mandatoryRequirements", [])}
    validation.check(f"{prefix}.rubric.targets.no-orphans", set(targets) == target_use, f"orphan={sorted(set(targets) - target_use)}")

    reference_answer = rubric.get("referenceAnswer", {})
    responses = reference_answer.get("responses", {})
    comp_items = {item.get("workItemId"): item for item in route.get("steps", {}).get("COMPREHENSIVE_PRACTICE", {}).get("workItems", [])}
    validation.check(f"{prefix}.reference-answer.fixture", str(reference_answer.get("fixtureId", "")).endswith("COMP-B"))
    validation.check(f"{prefix}.reference-answer.work-items", set(responses) == work_ids, f"missing={sorted(work_ids - set(responses))} orphan={sorted(set(responses) - work_ids)}")

    field_use: set[str] = set()
    rules_by_field: dict[str, list[dict[str, Any]]] = {}
    for index, rule in enumerate(rubric_rules(rubric)):
        field_id = rule.get("fieldId")
        field_use.add(field_id)
        rules_by_field.setdefault(field_id, []).append(rule)
        validation.check(f"{prefix}.rubric.evidenceRules[{index}].work-item", field_id in work_ids)
        operator = rule.get("operator")
        kind = comp_items.get(field_id, {}).get("response", {}).get("kind")
        shape = (
            operator == "NUMBER_EQUALS" and kind == "NUMBER"
            or operator == "EQUALS" and kind in {"SELECT", "NUMBER", "TEXT"}
            or operator == "CONTAINS_ALL" and kind == "TEXT"
        )
        validation.check(f"{prefix}.rubric.evidenceRules[{index}].operator-shape", shape, f"field={field_id!r} operator={operator!r} response={kind!r}")
        if operator == "NUMBER_EQUALS":
            try:
                valid_tolerance = rule.get("tolerance") is not None and dec(rule.get("tolerance")) >= 0
            except InvalidOperation:
                valid_tolerance = False
            validation.check(f"{prefix}.rubric.evidenceRules[{index}].tolerance", valid_tolerance)
    validation.check(f"{prefix}.rubric.evidenceRules.cover-all", field_use == work_ids, f"missing={sorted(work_ids - field_use)} orphan={sorted(field_use - work_ids)}")

    for work_id, item in comp_items.items():
        response = item.get("response", {})
        answer = responses.get(work_id)
        rules = rules_by_field.get(work_id, [])
        kind = response.get("kind")
        if kind == "NUMBER":
            validation.check(f"{prefix}.number[{work_id}].unit", isinstance(response.get("unit"), str) and bool(response.get("unit")))
            validation.check(f"{prefix}.number[{work_id}].precision", isinstance(response.get("precision"), int) and response.get("precision", -1) >= 0)
            number_rules = [rule for rule in rules if rule.get("operator") == "NUMBER_EQUALS"]
            validation.check(f"{prefix}.number[{work_id}].scoring-rule", bool(number_rules))
            if number_rules:
                try:
                    answer_matches = all(close(answer, rule.get("expected"), rule.get("tolerance")) for rule in number_rules)
                except (InvalidOperation, TypeError):
                    answer_matches = False
                validation.check(f"{prefix}.number[{work_id}].answer", answer_matches, f"answer={answer!r}")
        elif kind == "SELECT":
            validation.check(f"{prefix}.select[{work_id}].answer", any(rule.get("operator") == "EQUALS" and rule.get("expected") == answer for rule in rules))
        elif kind == "TEXT":
            contains = [rule for rule in rules if rule.get("operator") == "CONTAINS_ALL"]
            validation.check(
                f"{prefix}.text[{work_id}].answer",
                bool(contains) and all(
                    all(str(token) in str(answer) for token in rule.get("expected", []))
                    for rule in contains
                ),
            )
    return criterion_ids, mandatory_ids


def check_evidence_mapping(
    route_id: str,
    route: dict[str, Any],
    rubric: dict[str, Any],
    evidence: dict[str, Any],
    work_ids: set[str],
    criterion_ids: set[str],
    mandatory_ids: set[str],
    validation: Validation,
) -> None:
    prefix = route_id
    comprehensive = route.get("steps", {}).get("COMPREHENSIVE_PRACTICE", {})
    materials = {item.get("materialId"): item for item in comprehensive.get("sourceMaterials", [])}
    fields = {field.get("fieldId") for item in materials.values() for field in item.get("fields", [])}
    reference_ids = {item.get("referenceId") for item in route.get("references", [])}
    rule_catalog = {item.get("ruleId"): item for item in evidence.get("ruleCatalog", [])}
    targets = {item.get("targetId") for item in rubric.get("remediationTargets", [])}
    atomic = evidence.get("atomicWorkItems", [])
    atomic_ids = [item.get("workItemId") for item in atomic]
    validation.check(f"{prefix}.atomic.ids", set(atomic_ids) == work_ids and len(atomic_ids) == len(set(atomic_ids)), f"missing={sorted(work_ids - set(atomic_ids))} orphan={sorted(set(atomic_ids) - work_ids)}")
    used_references: set[str] = set()
    used_rules: set[str] = set()
    for index, item in enumerate(atomic):
        work_id = item.get("workItemId", f"[{index}]")
        source = item.get("source", {})
        reference = item.get("reference", {})
        rule = item.get("rule", {})
        remediation = item.get("remediation", {})
        material_ids = set(source.get("materialIds", []))
        field_ids = set(source.get("fieldIds", []))
        validation.check(f"{prefix}.atomic[{work_id}].source", bool(material_ids) and bool(field_ids))
        validation.check(f"{prefix}.atomic[{work_id}].source.scope", source.get("provenance") == "SYNTHETIC_EDUCATIONAL" and source.get("scope") == "ONLY_THIS_CASE")
        validation.check(f"{prefix}.atomic[{work_id}].source.closure", material_ids <= set(materials) and field_ids <= fields, f"materials={sorted(material_ids - set(materials))} fields={sorted(field_ids - fields)}")
        current_references = set(reference.get("referenceIds", []))
        used_references |= current_references
        validation.check(f"{prefix}.atomic[{work_id}].reference", bool(current_references) and current_references <= reference_ids, f"missing={sorted(current_references - reference_ids)}")
        rule_id = rule.get("ruleId")
        if rule_id:
            used_rules.add(rule_id)
        validation.check(f"{prefix}.atomic[{work_id}].rule", rule_id in rule_catalog and rule.get("scope") == "ONLY_THIS_CASE", f"ruleId={rule_id!r}")
        remediation_target = remediation.get("remediationTargetId")
        validation.check(f"{prefix}.atomic[{work_id}].remediation.target", remediation_target in targets)
        question_ids = {question.get("questionId") for question in route.get("steps", {}).get("BASIC_PRACTICE", {}).get("questions", [])}
        validation.check(f"{prefix}.atomic[{work_id}].remediation.question", remediation.get("questionId") in question_ids)
        validation.check(f"{prefix}.atomic[{work_id}].remediation.criteria", set(remediation.get("criterionIds", [])) <= criterion_ids | mandatory_ids)
        material_step = remediation.get("materialStep")
        if material_step == "KNOWLEDGE_CARD":
            card_ids = {card.get("cardId") for card in route.get("steps", {}).get("KNOWLEDGE_CARD", {}).get("cards", [])}
            valid_material = remediation.get("materialItemId") in card_ids
        elif material_step == "DEMONSTRATION":
            valid_material = bool(
                re.fullmatch(
                    r"(?:[A-Z0-9-]+-)?(?:DEMONSTRATION|DEMO)-STEP-0?[1-5]",
                    str(remediation.get("materialItemId", "")),
                )
            )
        else:
            valid_material = False
        validation.check(f"{prefix}.atomic[{work_id}].remediation.material", valid_material)
    boundary_orphans = {
        item for item in reference_ids - used_references
        if any(hint.lower() in str(item).lower() for hint in BOUNDARY_REFERENCE_HINTS)
    }
    validation.check(f"{prefix}.references.no-orphans", (reference_ids - used_references) <= boundary_orphans, f"orphan={sorted((reference_ids - used_references) - boundary_orphans)}")
    validation.check(f"{prefix}.ruleCatalog.no-orphans", used_rules == set(rule_catalog), f"orphan={sorted(set(rule_catalog) - used_rules)}")
    coverage = evidence.get("coverage", {})
    covered = set().union(*(set(value) for value in coverage.values() if isinstance(value, list))) if isinstance(coverage, dict) else set()
    validation.check(f"{prefix}.coverage.work-items", covered == work_ids, f"missing={sorted(work_ids - covered)} orphan={sorted(covered - work_ids)}")


def check_materials(route_id: str, route: dict[str, Any], evidence: dict[str, Any], validation: Validation) -> None:
    prefix = route_id
    references = route.get("references", [])
    reference_ids = [item.get("referenceId") for item in references]
    validation.check(f"{prefix}.references.fields", all(all(isinstance(item.get(key), str) and item.get(key).strip() for key in ("referenceId", "title", "source", "usage")) for item in references))
    validation.check(f"{prefix}.references.unique", None not in reference_ids and len(reference_ids) == len(set(reference_ids)))
    markdown = REPO / "content" / "references" / "clearing" / f"{route_id}-evidence.md"
    validation.check(f"{prefix}.reference-file.exists", markdown.is_file())
    anchors = evidence.get("materialAnchors", [])
    validation.check(f"{prefix}.materialAnchors.nonempty", bool(anchors))
    for index, anchor in enumerate(anchors):
        physical = anchor.get("physicalFile")
        locators = anchor.get("locators")
        validation.check(f"{prefix}.materialAnchors[{index}].physical-format", isinstance(physical, str) and physical.startswith(("project_materials/", "Repository/")) and not re.search(r"https?://|^[A-Za-z]:[\\/]", physical))
        if isinstance(physical, str):
            physical_paths = [item.strip() for item in re.split(r"[；;]", physical) if item.strip()]
            validation.check(
                f"{prefix}.materialAnchors[{index}].physical-exists",
                bool(physical_paths) and all((PROJECT / Path(item.replace("/", "\\"))).is_file() for item in physical_paths),
                physical,
            )
        validation.check(f"{prefix}.materialAnchors[{index}].locators", isinstance(locators, list) and bool(locators) and all(isinstance(item, str) and item.strip() and "\n" not in item for item in locators))
        validation.check(f"{prefix}.materialAnchors[{index}].provenance", anchor.get("provenance") in {"MATERIAL_ABSTRACTION", "BOUNDARY_ONLY", "DIRECT", "DIRECT_WITH_BOUNDARY", "DIRECT_WITH_VERSION_BOUNDARY"})


def check_metadata(route_id: str, evidence: dict[str, Any], validation: Validation) -> None:
    policy = evidence.get("fixturePolicy", {})
    validation.check(f"{route_id}.fixturePolicy.provenance", policy.get("provenance") == "SYNTHETIC_EDUCATIONAL")
    validation.check(f"{route_id}.fixturePolicy.scope", policy.get("scope") == "ONLY_THIS_CASE")
    parameters = evidence.get("caseParameters", [])
    validation.check(f"{route_id}.caseParameters.nonempty", bool(parameters))
    for index, parameter in enumerate(parameters):
        validation.check(f"{route_id}.caseParameters[{index}].scope", parameter.get("scope") == "ONLY_THIS_CASE")
        validation.check(f"{route_id}.caseParameters[{index}].provenance", parameter.get("provenance", "SYNTHETIC_EDUCATIONAL") == "SYNTHETIC_EDUCATIONAL")
    for index, rule in enumerate(evidence.get("ruleCatalog", [])):
        validation.check(f"{route_id}.ruleCatalog[{index}].scope", rule.get("scope") == "ONLY_THIS_CASE")


def check_decimal_chain(route_id: str, fixture: str, chain: dict[str, Any], validation: Validation) -> None:
    decimal_chain = chain.get("decimalChain", [])
    validation.check(f"{route_id}.{fixture}.decimalChain.nonempty", bool(decimal_chain))
    for index, step in enumerate(decimal_chain):
        prefix = f"{route_id}.{fixture}.decimalChain[{index}]"
        formula = step.get("formula")
        result = step.get("result")
        precision = step.get("precision")
        tolerance = step.get("tolerance")
        validation.check(f"{prefix}.result-string", isinstance(result, str))
        if step.get("unit") == "status":
            validation.check(
                f"{prefix}.status-row",
                isinstance(step.get("formula"), str)
                and bool(step.get("formula"))
                and isinstance(result, str)
                and result == "IDENTITY_MATCHED"
                and str(tolerance) == "0",
            )
            continue
        validation.check(f"{prefix}.numeric-meta", isinstance(step.get("unit"), str) and bool(step.get("unit")) and isinstance(precision, int) and precision >= 0 and tolerance is not None)
        try:
            result_value = dec(result)
            tolerance_value = dec(tolerance)
            valid_numeric = tolerance_value >= 0 and decimal_places(result) <= precision
        except (InvalidOperation, TypeError):
            result_value = Decimal(0)
            tolerance_value = Decimal(0)
            valid_numeric = False
        validation.check(f"{prefix}.numeric-result", valid_numeric, f"result={result!r} tolerance={tolerance!r}")
        calculated = evaluate_formula(formula)
        if calculated is None:
            # The IB identity-match row is an explicit status assertion, not arithmetic.
            validation.check(f"{prefix}.status-formula", isinstance(formula, str) and bool(formula) and "=" not in formula and step.get("unit") == "status")
        else:
            validation.check(f"{prefix}.recompute", abs(calculated - result_value) <= tolerance_value, f"formula={formula!r} result={result!r} calculated={calculated}")


def chain_common(
    route_id: str,
    evidence: dict[str, Any],
    validation: Validation,
    identity_keys: set[str],
    result_keys: set[str] | None,
    reconciliation_keys: set[str],
    decimal_fields: list[str],
) -> tuple[dict[str, Any], dict[str, Any]]:
    chains = evidence.get("answerChains", {})
    validation.check(f"{route_id}.answerChains.keys", set(chains) == {"demonstrationA", "comprehensiveB"}, f"actual={sorted(chains)}")
    demo = chains.get("demonstrationA", {})
    comp = chains.get("comprehensiveB", {})
    validation.check(f"{route_id}.fixture.ids", demo.get("fixtureId") != comp.get("fixtureId") and bool(demo.get("fixtureId")) and bool(comp.get("fixtureId")))
    for fixture, chain in (("demonstrationA", demo), ("comprehensiveB", comp)):
        validation.check(f"{route_id}.{fixture}.identity.keys", identity_keys <= set(chain.get("identity", {})), f"missing={sorted(identity_keys - set(chain.get('identity', {})))}")
        source_to_role = chain.get("sourceToRole", [])
        validation.check(f"{route_id}.{fixture}.sourceToRole.nonempty", bool(source_to_role))
        validation.check(f"{route_id}.{fixture}.sourceToRole.fields", all(bool(item.get("fields")) and bool(item.get("roleIds")) for item in source_to_role))
        validation.check(f"{route_id}.{fixture}.reconciliation.keys", reconciliation_keys <= set(chain.get("reconciliation", {})), f"missing={sorted(reconciliation_keys - set(chain.get('reconciliation', {})))}")
        if result_keys is None:
            validation.check(f"{route_id}.{fixture}.result.absent", chain.get("result") is None)
        else:
            validation.check(f"{route_id}.{fixture}.result.keys", result_keys <= set(chain.get("result", {})), f"missing={sorted(result_keys - set(chain.get('result', {})))}")
        validation.check(f"{route_id}.{fixture}.decimal.fields", [item.get("fieldId") for item in chain.get("decimalChain", [])] == decimal_fields)
        check_decimal_chain(route_id, fixture, chain, validation)
        if fixture == "demonstrationA":
            demo_source_shape = [
                (frozenset(item.get("roleIds", [])), frozenset(item.get("fields", [])))
                for item in source_to_role
            ]
            demo_decimal_shape = [
                (item.get("fieldId"), item.get("unit"), item.get("precision"), str(item.get("tolerance")), normalize_formula(item.get("formula", "")))
                for item in chain.get("decimalChain", [])
            ]
            demo_result_shape = set(chain.get("result", {})) if isinstance(chain.get("result"), dict) else None
            demo_reconciliation_shape = set(chain.get("reconciliation", {}))
        else:
            comp_source_shape = [
                (frozenset(item.get("roleIds", [])), frozenset(item.get("fields", [])))
                for item in source_to_role
            ]
            comp_decimal_shape = [
                (item.get("fieldId"), item.get("unit"), item.get("precision"), str(item.get("tolerance")), normalize_formula(item.get("formula", "")))
                for item in chain.get("decimalChain", [])
            ]
            comp_result_shape = set(chain.get("result", {})) if isinstance(chain.get("result"), dict) else None
            comp_reconciliation_shape = set(chain.get("reconciliation", {}))
    validation.check(f"{route_id}.A-B.sourceToRole-isomorphic", demo_source_shape == comp_source_shape)
    validation.check(f"{route_id}.A-B.decimal-structure-isomorphic", demo_decimal_shape == comp_decimal_shape)
    validation.check(f"{route_id}.A-B.result-structure-isomorphic", demo_result_shape == comp_result_shape)
    validation.check(f"{route_id}.A-B.reconciliation-structure-isomorphic", demo_reconciliation_shape == comp_reconciliation_shape)
    validation.check(f"{route_id}.A-B.identity-diff", any(demo.get("identity", {}).get(key) != comp.get("identity", {}).get(key) for key in identity_keys))
    date_keys = {key for key in identity_keys if "date" in key.lower()}
    validation.check(f"{route_id}.A-B.date-diff", bool(date_keys) and any(demo.get("identity", {}).get(key) != comp.get("identity", {}).get(key) for key in date_keys))
    demo_numbers = set(
        re.findall(
            r"\d+(?:\.\d+)?",
            json.dumps({"identity": demo.get("identity"), "result": demo.get("result"), "decimal": demo.get("decimalChain")}, ensure_ascii=False),
        )
    )
    comp_numbers = set(
        re.findall(
            r"\d+(?:\.\d+)?",
            json.dumps({"identity": comp.get("identity"), "result": comp.get("result"), "decimal": comp.get("decimalChain")}, ensure_ascii=False),
        )
    )
    validation.check(f"{route_id}.A-B.number-diff", demo_numbers != comp_numbers, f"demo={sorted(demo_numbers)} comp={sorted(comp_numbers)}")
    return demo, comp


def check_base(evidence: dict[str, Any], validation: Validation) -> None:
    demo, comp = chain_common("CLR-BASE-001", evidence, validation, {"businessKey", "businessDate", "assetType", "direction"}, {"businessKey", "businessDate", "direction", "quantity", "amount", "status"}, {"quantityDifference", "amountDifference", "status"}, ["quantity", "amount", "quantity_difference", "amount_difference"])
    for label, chain in (("A", demo), ("B", comp)):
        result = chain.get("result", {})
        recon = chain.get("reconciliation", {})
        validation.check(f"CLR-BASE-{label}.zero-difference", recon.get("quantityDifference") == "0" and recon.get("amountDifference") == "0.00")
        validation.check(f"CLR-BASE-{label}.normal-status", result.get("status") == "SETTLED" and recon.get("status") == "RECONCILED")


def check_fund_payment(evidence: dict[str, Any], validation: Validation) -> None:
    demo, comp = chain_common("CLR-FUND-PAYMENT-001", evidence, validation, {"paymentKey", "businessDate", "paymentDate", "businessBasisId", "payerAccount", "payeeAccount"}, {"paymentKey", "businessDate", "businessBasisId", "payerAccount", "payeeAccount", "approvedChannel", "paymentAmount", "executedAmount", "ledgerPaymentAmount", "openingCash", "closingCash", "executionStatus", "ledgerStatus", "duplicateControl"}, {"accountMatch", "basisMatch", "dateMatch", "channelMatch", "statusMatch", "approvedExecutedDifference", "executedLedgerDifference", "cashBalanceDifference", "status"}, ["closing_cash", "approved_executed_difference", "executed_ledger_difference", "cash_balance_difference"])
    for label, chain in (("A", demo), ("B", comp)):
        result = chain.get("result", {})
        recon = chain.get("reconciliation", {})
        validation.check(f"CLR-FUND-PAYMENT-{label}.amount-chain", result.get("paymentAmount") == result.get("executedAmount") == result.get("ledgerPaymentAmount"))
        validation.check(f"CLR-FUND-PAYMENT-{label}.normal-status", result.get("executionStatus") == "EXECUTED" and result.get("ledgerStatus") == "POSTED" and result.get("duplicateControl") == "UNIQUE_EXECUTION" and recon.get("status") == "RECONCILED")
        validation.check(f"CLR-FUND-PAYMENT-{label}.zero-difference", all(recon.get(key) == "0.00" for key in ("approvedExecutedDifference", "executedLedgerDifference", "cashBalanceDifference")))


def check_fund_close(evidence: dict[str, Any], validation: Validation) -> None:
    demo, comp = chain_common("CLR-FUND-CLOSE-002", evidence, validation, {"closeKey", "paymentResultKey", "businessDate", "accountId"}, {"closeKey", "paymentResultKey", "businessDate", "accountId", "openingBalance", "inflow", "outflow", "closingBalance", "executionStatus", "ledgerPostStatus", "resultRegisterStatus", "fundAccountClosing", "internalLedgerClosing", "ccbsClosing", "ccdcDvpClosing", "shanghaiDvpClosing", "closeStatus", "reportStatus"}, {"accountMatch", "dateMatch", "executionResultMatch", "internalLedgerMatch", "ccbsMatch", "ccdcDvpMatch", "shanghaiDvpMatch", "fundAccountDifference", "internalLedgerDifference", "ccbsDifference", "ccdcDvpDifference", "shanghaiDvpDifference", "allExternalSources", "totalDifference", "status", "reportStatus"}, ["closing_balance", "fund_account_difference", "internal_ledger_difference", "ccbs_difference", "ccdc_dvp_difference", "shanghai_dvp_difference", "total_difference"])
    for label, chain in (("A", demo), ("B", comp)):
        result = chain.get("result", {})
        recon = chain.get("reconciliation", {})
        validation.check(f"CLR-FUND-CLOSE-{label}.payment-handoff", str(chain.get("identity", {}).get("paymentResultKey", "")).startswith("FUND-PAY-"))
        validation.check(f"CLR-FUND-CLOSE-{label}.normal-status", result.get("executionStatus") == "EXECUTED" and result.get("ledgerPostStatus") == "POSTED" and result.get("closeStatus") == "NORMAL_CLOSED" and result.get("reportStatus") == "SENT")
        validation.check(f"CLR-FUND-CLOSE-{label}.zero-difference", all(recon.get(key) == "0.00" for key in ("fundAccountDifference", "internalLedgerDifference", "ccbsDifference", "ccdcDvpDifference", "shanghaiDvpDifference", "totalDifference")))


def check_ex_core(evidence: dict[str, Any], validation: Validation) -> None:
    demo, comp = chain_common("CLR-EX-CORE-001", evidence, validation, {"businessKey", "businessDate", "securityCode"}, None, {"securityCode", "buySecurityDifference", "buyCashDifference", "sellSecurityDifference", "sellCashDifference", "status"}, ["buy_security_quantity", "buy_cash_amount", "sell_security_quantity", "sell_cash_amount", "buy_security_difference", "buy_cash_difference", "sell_security_difference", "sell_cash_difference"])
    for label, chain in (("A", demo), ("B", comp)):
        recon = chain.get("reconciliation", {})
        validation.check(f"CLR-EX-CORE-{label}.zero-difference", all(recon.get(key) in {"0", "0.00"} for key in ("buySecurityDifference", "buyCashDifference", "sellSecurityDifference", "sellCashDifference")))
        validation.check(f"CLR-EX-CORE-{label}.normal-status", recon.get("status") == "RECONCILED")


def check_ex_funds(evidence: dict[str, Any], validation: Validation) -> None:
    demo, comp = chain_common("CLR-EX-FUNDS-002", evidence, validation, {"businessKey", "businessDate", "securityCode"}, None, {"obligationResultMatch", "securitiesDifference", "cashDifference", "status", "closeStatus"}, ["closing_securities", "closing_cash", "security_receive_difference", "security_deliver_difference", "cash_in_difference", "cash_out_difference", "securities_difference", "cash_difference", "securities_balance_difference", "cash_balance_difference"])
    for label, chain in (("A", demo), ("B", comp)):
        recon = chain.get("reconciliation", {})
        validation.check(f"CLR-EX-FUNDS-{label}.normal-status", recon.get("obligationResultMatch") == "MATCHED" and recon.get("status") == "RECONCILED" and recon.get("closeStatus") == "NORMAL_CLOSED")
        validation.check(f"CLR-EX-FUNDS-{label}.zero-difference", recon.get("securitiesDifference") == "0" and recon.get("cashDifference") == "0.00")


def check_ib_instruction(evidence: dict[str, Any], validation: Validation) -> None:
    demo, comp = chain_common("CLR-IB-INSTRUCTION-001", evidence, validation, {"businessKey", "businessDate", "settlementDate", "bondCode", "direction", "settlementInstitution", "settlementMethod", "channel", "faceValue", "settlementAmount"}, {"businessKey", "businessDate", "settlementDate", "bondCode", "direction", "settlementInstitution", "settlementMethod", "channel", "faceValue", "settlementAmount", "approvalStatus", "confirmationStatus", "deliveryScope"}, {"identityStatus", "faceValueDifference", "settlementAmountDifference", "accountRoleStatus", "methodChannelStatus", "status"}, ["face_value_difference", "settlement_amount_difference", "identity_match"])
    for label, chain in (("A", demo), ("B", comp)):
        identity = chain.get("identity", {})
        result = chain.get("result", {})
        recon = chain.get("reconciliation", {})
        validation.check(f"CLR-IB-INSTRUCTION-{label}.identity-result", all(result.get(key) == identity.get(key) for key in ("businessKey", "businessDate", "settlementDate", "bondCode", "direction", "settlementInstitution", "settlementMethod", "channel", "faceValue", "settlementAmount")))
        validation.check(f"CLR-IB-INSTRUCTION-{label}.normal-status", recon.get("identityStatus") == "IDENTITY_MATCHED" and recon.get("faceValueDifference") == "0.0000" and recon.get("settlementAmountDifference") == "0.00" and recon.get("status") == "RECONCILED_FOR_CONFIRMATION")


def check_ib_dvp(evidence: dict[str, Any], validation: Validation) -> None:
    demo, comp = chain_common("CLR-IB-DVP-CLOSE-002", evidence, validation, {"contractId", "businessKey", "businessDate", "settlementDate", "bondCode", "direction", "settlementInstitution", "settlementProcessingSystem", "faceValue", "settlementAmount", "settlementMethod", "channel"}, {"contractId", "businessKey", "businessDate", "settlementDate", "bondCode", "direction", "settlementInstitution", "settlementProcessingSystem", "faceValue", "settlementAmount", "settlementMethod", "channel", "externalDvpResult", "internalLedgerResult", "bondDifference", "cashDifference", "eodCloseResult"}, {"contractResultStatus", "ledgerStatus", "externalFaceDifference", "externalAmountDifference", "bondBalanceDifference", "cashBalanceDifference", "status"}, ["bond_closing_face", "cash_closing_balance", "external_face_difference", "external_amount_difference", "bond_balance_difference", "cash_balance_difference"])
    for label, chain in (("A", demo), ("B", comp)):
        identity = chain.get("identity", {})
        result = chain.get("result", {})
        recon = chain.get("reconciliation", {})
        validation.check(f"CLR-IB-DVP-{label}.contract-key", isinstance(identity.get("contractId"), str) and identity.get("contractId") != identity.get("businessKey") and identity.get("contractId", "").startswith("SETTLE-CONTRACT-"))
        validation.check(f"CLR-IB-DVP-{label}.identity-result", all(result.get(key) == identity.get(key) for key in ("contractId", "businessKey", "businessDate", "settlementDate", "bondCode", "direction", "settlementInstitution", "settlementProcessingSystem", "faceValue", "settlementAmount", "settlementMethod", "channel")))
        validation.check(f"CLR-IB-DVP-{label}.normal-status", result.get("externalDvpResult") == "DVP_SETTLED" and result.get("internalLedgerResult") == "DVP_SETTLED" and result.get("eodCloseResult") == "EOD_CLOSED" and recon.get("status") == "RECONCILED_AND_CLOSED_FOR_CASE")
        validation.check(f"CLR-IB-DVP-{label}.zero-difference", all(recon.get(key) in {"0.0000", "0.00"} for key in ("externalFaceDifference", "externalAmountDifference", "bondBalanceDifference", "cashBalanceDifference")))


FIXTURE_CHECKERS: dict[str, Callable[[dict[str, Any], Validation], None]] = {
    "CLR-BASE-001": check_base,
    "CLR-FUND-PAYMENT-001": check_fund_payment,
    "CLR-FUND-CLOSE-002": check_fund_close,
    "CLR-EX-CORE-001": check_ex_core,
    "CLR-EX-FUNDS-002": check_ex_funds,
    "CLR-IB-INSTRUCTION-001": check_ib_instruction,
    "CLR-IB-DVP-CLOSE-002": check_ib_dvp,
}


def check_public_safety(route_id: str, route: dict[str, Any], rubric: dict[str, Any], validation: Validation) -> None:
    active_route = {key: value for key, value in route.items() if key != "references"}
    active_rubric = {key: value for key, value in rubric.items() if key != "referenceAnswer"}
    for label, value in (("route", active_route), ("rubric", active_rubric)):
        for path, text in walk_strings(value, f"$.{label}"):
            for pattern, description in FORBIDDEN_ACTIVE_PATTERNS:
                if pattern.search(text):
                    validation.check(f"{route_id}.boundary{path}", False, f"{description}: {text}")
                    break
    serialized = json.dumps({"route": active_route, "rubric": active_rubric}, ensure_ascii=False)
    validation.check(f"{route_id}.no-stage-or-exception", "STAGE_GATE" not in serialized and "EXCEPTION_CASE" not in serialized)


def check_continuity(
    routes: dict[str, dict[str, Any]],
    evidence: dict[str, dict[str, Any]],
    validation: Validation,
) -> None:
    validation.section("跨路线连续性")
    for route_id, dependency in EXPECTED_DEPENDENCIES.items():
        policy = evidence[route_id].get("dependencyPolicy", {})
        actual = policy.get("dependsOnRouteIds")
        if actual is None:
            actual = policy.get("requiredRouteIds")
        validation.check(f"continuity.dependency[{route_id}]", actual == dependency)

    payment = evidence["CLR-FUND-PAYMENT-001"]["answerChains"]
    close_evidence = evidence["CLR-FUND-CLOSE-002"]["answerChains"]
    for fixture in ("demonstrationA", "comprehensiveB"):
        payment_result = payment[fixture].get("result", {})
        close_chain = close_evidence[fixture]
        close_result = close_chain.get("result", {})
        validation.check(f"continuity.fund.{fixture}.payment-key", str(close_chain.get("identity", {}).get("paymentResultKey", "")).startswith("FUND-PAY-"))
        validation.check(f"continuity.fund.{fixture}.status", payment_result.get("executionStatus") == close_result.get("executionStatus") == "EXECUTED" and payment_result.get("ledgerStatus") == close_result.get("ledgerPostStatus") == "POSTED")
        validation.check(f"continuity.fund.{fixture}.source-role", any(item.get("roleIds") == ["EXECUTED_PAYMENT_RESULT"] and {"payment_result_key", "execution_status", "ledger_post_status"} <= set(item.get("fields", [])) for item in close_chain.get("sourceToRole", [])))

    core = evidence["CLR-EX-CORE-001"]["answerChains"]
    funds = evidence["CLR-EX-FUNDS-002"]["answerChains"]
    obligation_fields = {"buy_security_receivable_quantity", "buy_cash_payable_amount", "sell_security_payable_quantity", "sell_cash_receivable_amount"}
    for fixture in ("demonstrationA", "comprehensiveB"):
        core_identity = core[fixture].get("identity", {})
        funds_identity = funds[fixture].get("identity", {})
        validation.check(f"continuity.ex.{fixture}.identity", all(core_identity.get(key) == funds_identity.get(key) for key in ("businessKey", "businessDate", "securityCode")))
        core_fields = set().union(*(set(item.get("fields", [])) for item in core[fixture].get("sourceToRole", [])))
        funds_fields = set().union(*(set(item.get("fields", [])) for item in funds[fixture].get("sourceToRole", [])))
        validation.check(f"continuity.ex.{fixture}.obligation-fields", obligation_fields <= core_fields and obligation_fields <= funds_fields)

    instruction = evidence["CLR-IB-INSTRUCTION-001"]["answerChains"]
    dvp = evidence["CLR-IB-DVP-CLOSE-002"]["answerChains"]
    handoff_keys = ("businessKey", "businessDate", "bondCode", "direction", "faceValue", "settlementAmount", "settlementMethod", "channel")
    contract_ids: set[str] = set()
    for fixture in ("demonstrationA", "comprehensiveB"):
        source = instruction[fixture].get("identity", {})
        target = dvp[fixture].get("identity", {})
        validation.check(f"continuity.ib.{fixture}.identity", all(source.get(key) == target.get(key) for key in handoff_keys))
        contract_id = target.get("contractId")
        contract_ids.add(contract_id)
        validation.check(f"continuity.ib.{fixture}.contract-independent", isinstance(contract_id, str) and contract_id != target.get("businessKey") and contract_id.startswith("SETTLE-CONTRACT-"))
    validation.check("continuity.ib.contract-keys.unique", len(contract_ids) == 2)


def check_registration(validation: Validation) -> None:
    validation.section("W6 正式登记边界")
    map_path = CONTENT / "maps" / "custody-learning-map.json"
    active_release_path = CONTENT / "releases" / "CUSTODY_2026.08.12.json"
    old_release_path = CONTENT / "releases" / "ACCOUNTING_2026.08.10.json"
    try:
        learning_map = read_json(map_path)
        active_release = read_json(active_release_path)
        old_release = read_json(old_release_path)
        map_schema = read_json(SCHEMAS / "map.schema.json")
        release_schema = read_json(SCHEMAS / "release-manifest.schema.json")
    except (OSError, json.JSONDecodeError) as error:
        validation.check("registration.read", False, str(error))
        return
    validate_schema(learning_map, map_schema, "registration.map", validation)
    validate_schema(active_release, release_schema, "registration.active-release", validation)
    validate_schema(old_release, release_schema, "registration.old-release", validation)

    lines = {line.get("line"): line for line in learning_map.get("lines", [])}
    clearing_line = lines.get("CLEARING", {})
    accounting_line = lines.get("ACCOUNTING", {})
    supervision_line = lines.get("SUPERVISION", {})
    clearing_nodes = [
        node
        for region in clearing_line.get("regions", [])
        for module in region.get("modules", [])
        for node in module.get("nodes", [])
    ]
    node_by_route = {node.get("routeId"): node for node in clearing_nodes}
    node_id_to_route = {node.get("nodeId"): node.get("routeId") for node in clearing_nodes}
    expected = set(ROUTE_IDS)

    validation.check("registration.map.clearing-open", clearing_line.get("availability") == "OPEN")
    validation.check("registration.map.clearing-routes", len(clearing_nodes) == 7 and set(node_by_route) == expected)
    validation.check(
        "registration.map.clearing-required-routes",
        all(node.get("nodeType") == "ROUTE" and node.get("pathType") == "REQUIRED" for node in clearing_nodes),
    )
    validation.check(
        "registration.map.clearing-published",
        all(node.get("contentAvailability") == "PUBLISHED" for node in clearing_nodes),
    )
    validation.check(
        "registration.map.clearing-no-stage-gate",
        sum(
            1
            for node in clearing_nodes
            if node.get("stageGate") is True
            or any("STAGE_GATE" in text for _, text in walk_strings(node))
        )
        == 0,
    )
    actual_dependencies = {
        route_id: [node_id_to_route.get(node_id) for node_id in node_by_route[route_id].get("prerequisiteNodeIds", [])]
        for route_id in node_by_route
    }
    validation.check("registration.map.clearing-dependencies", actual_dependencies == EXPECTED_DEPENDENCIES, f"actual={actual_dependencies}")
    supervision_nodes = [
        node
        for region in supervision_line.get("regions", [])
        for module in region.get("modules", [])
        for node in module.get("nodes", [])
    ]
    supervision_routes = [node.get("routeId") for node in sorted(supervision_nodes, key=lambda node: node.get("order", 0))]
    validation.check("registration.map.supervision-open", supervision_line.get("availability") == "OPEN")
    validation.check(
        "registration.map.supervision-core-chain",
        supervision_line.get("regions", [{}])[0].get("regionId") == "SPV-REGION-CORE"
        and supervision_line.get("regions", [{}])[0].get("modules", [{}])[0].get("moduleId") == "SPV-MODULE-LIFECYCLE"
        and supervision_routes == ["SPV-CONTRACT-001", "SPV-RULE-002", "SPV-TASK-003", "SPV-CLOSE-004"]
        and all(node.get("pathType") == "REQUIRED" and node.get("nodeType") == "ROUTE" for node in supervision_nodes),
    )
    validation.check("registration.map.accounting-open", accounting_line.get("availability") == "OPEN")

    all_nodes = [
        node
        for line in learning_map.get("lines", [])
        for region in line.get("regions", [])
        for module in region.get("modules", [])
        for node in module.get("nodes", [])
    ]
    validation.check("registration.map.total-counts", len(all_nodes) == 59 and sum(node.get("pathType") == "REQUIRED" for node in all_nodes) == 50 and sum(node.get("pathType") == "ADVANCED" for node in all_nodes) == 9)

    active_entries = [item for item in active_release.get("routes", []) if item.get("routeId") in expected]
    active_ids = [item.get("routeId") for item in active_entries]
    validation.check("registration.active-release.identity", active_release.get("releaseId") == "CUSTODY_2026.08.12")
    validation.check("registration.active-release.map-pointer", active_release.get("map", {}).get("path") == "maps/custody-learning-map.json" and active_release.get("map", {}).get("version") == learning_map.get("version") == "2026.08.12")
    validation.check("registration.active-release.total-routes", len(active_release.get("routes", [])) == 59)
    validation.check("registration.active-release.clearing-seven", len(active_entries) == 7 and set(active_ids) == expected and len(active_ids) == len(set(active_ids)))
    validation.check(
        "registration.active-release.clearing-route-rubric-pairs",
        all(
            item.get("contentPath") == f"routes/clearing/{item.get('routeId')}.json"
            and item.get("rubricPath") == f"rubrics/clearing/{item.get('routeId')}.json"
            and item.get("contentVersion") == "1.0.0"
            and item.get("rubricVersion") == "1.0.0"
            for item in active_entries
        ),
    )
    active_supervision_entries = [item for item in active_release.get("routes", []) if item.get("routeId", "").startswith("SPV-")]
    validation.check(
        "registration.active-release.supervision-four",
        len(active_supervision_entries) == 4
        and {item.get("routeId") for item in active_supervision_entries} == {"SPV-CONTRACT-001", "SPV-RULE-002", "SPV-TASK-003", "SPV-CLOSE-004"}
        and all(
            item.get("contentPath") == f"routes/supervision/{item.get('routeId')}.json"
            and item.get("rubricPath") == f"rubrics/supervision/{item.get('routeId')}.json"
            and item.get("contentVersion") == "1.0.0"
            and item.get("rubricVersion") == "1.0.0"
            for item in active_supervision_entries
        ),
    )

    old_ids = {item.get("routeId") for item in old_release.get("routes", [])}
    validation.check("registration.old-release.identity", old_release.get("releaseId") == "ACCOUNTING_2026.08.10")
    validation.check("registration.old-release.no-clearing", not (old_ids & expected), f"registered={sorted(old_ids & expected)}")


def load_assets(validation: Validation) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    routes: dict[str, dict[str, Any]] = {}
    rubrics: dict[str, dict[str, Any]] = {}
    evidence: dict[str, dict[str, Any]] = {}
    try:
        route_schema = read_json(SCHEMAS / "route.schema.json")
        rubric_schema = read_json(SCHEMAS / "rubric.schema.json")
    except (OSError, json.JSONDecodeError) as error:
        validation.check("schemas.route-rubric.read", False, str(error))
        return routes, rubrics, evidence
    for route_id in ROUTE_IDS:
        try:
            route = read_json(route_path(route_id))
            rubric = read_json(rubric_path(route_id))
            ev = read_json(evidence_path(route_id))
        except (OSError, json.JSONDecodeError) as error:
            validation.check(f"{route_id}.assets.read", False, str(error))
            continue
        routes[route_id] = route
        rubrics[route_id] = rubric
        evidence[route_id] = ev
        validate_schema(route, route_schema, f"{route_id}.route", validation)
        validate_schema(rubric, rubric_schema, f"{route_id}.rubric", validation)
    return routes, rubrics, evidence


def main() -> int:
    validation = Validation()
    check_inventory(validation)
    routes, rubrics, evidence = load_assets(validation)
    work_by_route: dict[str, set[str]] = {}
    question_by_route: dict[str, set[str]] = {}
    all_work_ids: list[str] = []
    validation.section("七条路线与 Rubric")
    for route_id in ROUTE_IDS:
        if route_id not in routes or route_id not in rubrics or route_id not in evidence:
            continue
        route = routes[route_id]
        rubric = rubrics[route_id]
        ev = evidence[route_id]
        check_identity(route_id, route, rubric, ev, validation)
        work_by_route[route_id], question_by_route[route_id] = check_route_shape(route_id, route, validation)
        all_work_ids.extend(work_by_route[route_id])
        criteria, mandatory = check_rubric(route_id, route, rubric, work_by_route[route_id], question_by_route[route_id], validation)
        check_evidence_mapping(route_id, route, rubric, ev, work_by_route[route_id], criteria, mandatory, validation)
        check_materials(route_id, route, ev, validation)
        check_metadata(route_id, ev, validation)
        validation.guarded(f"{route_id}.fixture-checker", lambda route_id=route_id, ev=ev: FIXTURE_CHECKERS[route_id](ev, validation))
        check_public_safety(route_id, route, rubric, validation)
    validation.check("all-work-item-ids.global-unique", len(all_work_ids) == len(set(all_work_ids)), f"duplicates={sorted({item for item in all_work_ids if all_work_ids.count(item) > 1})}")
    if len(evidence) == len(ROUTE_IDS):
        check_continuity(routes, evidence, validation)
    check_registration(validation)
    print(f"CLEARING CHECKS: {validation.passes}/{validation.checks} checks passed")
    if validation.failures:
        print("CLEARING VALIDATION FAILED", file=sys.stderr)
        for failure in validation.failures:
            print(failure, file=sys.stderr)
        return 1
    print("CLEARING VALIDATION PASSED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError, InvalidOperation) as error:
        print(f"CLEARING VALIDATION FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
