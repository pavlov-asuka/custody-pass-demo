"""Independent validator for the ETF B0+B1+B2 content batch.

This validator checks the four authored routes against the current active
``CUSTODY_2026.08.12`` release.  The older ``ACCOUNTING_2026.08.10`` manifest
is retained only as a legacy snapshot existence and ETF-registration check.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, getcontext
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


getcontext().prec = 50

REPO = Path(__file__).resolve().parents[1]
PROJECT_ROOT = REPO.parent
EVIDENCE_DIR = REPO / "content/evidence/accounting/etf"
ROUTE_SCHEMA = json.loads((REPO / "contracts/schemas/route.schema.json").read_text(encoding="utf-8"))
RUBRIC_SCHEMA = json.loads((REPO / "contracts/schemas/rubric.schema.json").read_text(encoding="utf-8"))
ROUTES = {
    "R1": REPO / "content/routes/accounting/ACC-ETF-OBJECT-001.json",
    "R2": REPO / "content/routes/accounting/ACC-ETF-PCF-002.json",
    "R3": REPO / "content/routes/accounting/ACC-ETF-SETTLEMENT-003.json",
    "R4": REPO / "content/routes/accounting/ACC-ETF-CLOSE-004.json",
}
RUBRICS = {
    "R1": REPO / "content/rubrics/accounting/ACC-ETF-OBJECT-001.json",
    "R2": REPO / "content/rubrics/accounting/ACC-ETF-PCF-002.json",
    "R3": REPO / "content/rubrics/accounting/ACC-ETF-SETTLEMENT-003.json",
    "R4": REPO / "content/rubrics/accounting/ACC-ETF-CLOSE-004.json",
}
EVIDENCE = {
    "audit": EVIDENCE_DIR / "material-audit.json",
    "fields": EVIDENCE_DIR / "field-dictionary.json",
    "states": EVIDENCE_DIR / "source-state-matrix.json",
    "deid": EVIDENCE_DIR / "deidentification-boundary.json",
    "snapshot": EVIDENCE_DIR / "shared-normal-snapshot.json",
    "R1": EVIDENCE_DIR / "r1-object-evidence.json",
    "R2": EVIDENCE_DIR / "r2-pcf-evidence.json",
    "R3": EVIDENCE_DIR / "r3-settlement-evidence.json",
    "R4": EVIDENCE_DIR / "r4-close-evidence.json",
}
ACTIVE_RELEASE_ID = "CUSTODY_2026.08.12"
LEGACY_RELEASE_ID = "ACCOUNTING_2026.08.10"
ACTIVE_MAP_VERSION = "2026.08.12"
ALLOWED_RELEASE_REGISTRATIONS = {
    f"PUBLISHED_IN_{ACTIVE_RELEASE_ID}",
    f"PUBLISHED_IN_{LEGACY_RELEASE_ID}",
}
RELEASE = REPO / f"content/releases/{ACTIVE_RELEASE_ID}.json"
LEGACY_RELEASE = REPO / f"content/releases/{LEGACY_RELEASE_ID}.json"
EXPECTED_ROUTE_IDS = {"R1": "ACC-ETF-OBJECT-001", "R2": "ACC-ETF-PCF-002", "R3": "ACC-ETF-SETTLEMENT-003", "R4": "ACC-ETF-CLOSE-004"}
EXPECTED_WORK_COUNTS = {"R1": 10, "R2": 20, "R3": 18, "R4": 23}
EXPECTED_TYPE_COUNTS = {
    "R1": {"FIELD_MAP": 3, "CALCULATION": 3, "LEDGER_ENTRY": 2, "RECONCILIATION": 1, "SHORT_TEXT": 1},
    "R2": {"FIELD_MAP": 6, "CALCULATION": 9, "LEDGER_ENTRY": 2, "RECONCILIATION": 2, "SHORT_TEXT": 1},
    "R3": {"FIELD_MAP": 5, "CALCULATION": 4, "LEDGER_ENTRY": 2, "RECONCILIATION": 6, "SHORT_TEXT": 1},
    "R4": {"FIELD_MAP": 6, "CALCULATION": 7, "LEDGER_ENTRY": 3, "RECONCILIATION": 6, "SHORT_TEXT": 1},
}
EXPECTED_FIXTURES = {
    "R1": {"ETF01-FIXTURE-DEMO-A", "ETF01-FIXTURE-COMP-B"},
    "R2": {"ETF02-FIXTURE-DEMO-A", "ETF02-FIXTURE-COMP-B"},
    "R3": {"ETF03-FIXTURE-DEMO-A", "ETF03-FIXTURE-COMP-B"},
    "R4": {"ETF04-FIXTURE-DEMO-A", "ETF04-FIXTURE-COMP-B"},
}
EXPECTED_FIXTURE_SOURCE_GROUPS = {
    "R3": {
        "ETF-SRC-R3-INSTRUCTION", "ETF-SRC-R3-PCF", "ETF-SRC-R3-CONFIRMATION",
        "ETF-SRC-R3-SECURITIES", "ETF-SRC-R3-CASH", "ETF-SRC-R3-DOWNSTREAM", "ETF-SRC-R3-LEDGER",
    },
    "R4": {
        "ETF-SRC-R4-UPSTREAM", "ETF-SRC-R4-PCF", "ETF-SRC-R4-ESTIMATE", "ETF-SRC-R4-BUYIN",
        "ETF-SRC-R4-FEE", "ETF-SRC-R4-EVENT", "ETF-SRC-R4-LEDGER", "ETF-SRC-R4-MULTISOURCE",
    },
}
ANSWER_CHAIN_MATERIAL_TO_SOURCE_GROUP = {
    "ETF03-B-INSTRUCTION": "ETF-SRC-R3-INSTRUCTION",
    "ETF03-B-PCF-VALIDATION": "ETF-SRC-R3-PCF",
    "ETF03-B-CONFIRMATION": "ETF-SRC-R3-CONFIRMATION",
    "ETF03-B-SECURITIES": "ETF-SRC-R3-SECURITIES",
    "ETF03-B-CASH": "ETF-SRC-R3-CASH",
    "ETF03-B-TA-CLEARING": "ETF-SRC-R3-DOWNSTREAM",
    "ETF03-B-LEDGER": "ETF-SRC-R3-LEDGER",
    "ETF04-B-UPSTREAM": "ETF-SRC-R4-UPSTREAM",
    "ETF04-B-PCF": "ETF-SRC-R4-PCF",
    "ETF04-B-ESTIMATE": "ETF-SRC-R4-ESTIMATE",
    "ETF04-B-BUYIN": "ETF-SRC-R4-BUYIN",
    "ETF04-B-FEE": "ETF-SRC-R4-FEE",
    "ETF04-B-EVENT": "ETF-SRC-R4-EVENT",
    "ETF04-B-LEDGER": "ETF-SRC-R4-LEDGER",
    "ETF04-B-MULTISOURCE": "ETF-SRC-R4-MULTISOURCE",
}
EXPECTED_SHA256 = {
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__指数化投资下的ETF运营.pptx": "3F2F6809C11673FD664C655D1374CE9B913D7C818FDA8F81F62967233739A206",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__场内ETF清算介绍.pptx": "0152DFDA6368526D13A354CAA3F96E0DD6A6ADC9E7E7885D9AE568B72BBB9235",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__ETF-ETF核算常见问题解答V2-202606.docx": "5F226E8C7C874CCC77B0BE60E66A85521D0D88D5C77526D2A11A3713E69E0E0B",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__ETF-ETF差异化分红对现金替代的影响&简述可退估增计算.pptx": "961C5C8BA509B607F2ED4B374D7F372F7FF9D968B3D89151CBCBB847C47C7EFF",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__沪港深ETF及跨境全球ETF培训.pdf": "1DB8A8442F6377BCED45DA200B13309A4EA4F34C4323663EA55CCBA6D027A35F",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__跨沪深港ETF介绍.pdf": "33B3423B395A5CA120B1DFD6C32F32EB517E9E14B1F24C830BC20A1020334748",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__股票-ETF不用指数收益法，联接使用指数收益法的流程.docx": "DDB31D09A16C17FF39353F78751FD4D8F82C5D163DBABE2354F19F758F6B2FDB",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__ETF-ETF不用指数收益法，联接使用指数收益法的流程.docx": "560F20FEA1A612CA117BF2FB7A264E17E2C4CF810C2C41CC677F66C45B5F2101",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__ETF-ETF折算、拆分流程.docx": "1E649788CEC6EB2DBB94D5D550B58900A1EA02FC1715580AB55F370713BE4642",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__券结ETF核算介绍.pptx": "A2B9F863DAF40EC5EF4F0A28506A3561BA8E928D72363BDF10A5149B6ED69BED",
    "project_materials/新人陪练案例库/核算/05_ETF综合进阶__ETF-港交所ETF（互认基金）及集中申购业务实际运作情况介绍.pptx": "5B8CB66F95A0A5AD228034707A0C91098180DF07A7D8F1EBB65098112E55AB70",
}
EXPECTED_TYPES = {"FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION", "SHORT_TEXT"}
PUBLIC_FORBIDDEN = [
    re.compile(r"https?://", re.IGNORECASE),
    re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
    re.compile(r"(?:[A-Za-z]:\\|\\\\)"),
    re.compile(r"-----BEGIN [A-Z ]+-----"),
]
STUDENT_FORBIDDEN = [
    "ADVANCED",
    "DEFER",
    "STAGE_GATE",
    "跨境",
    "互认",
    "券结 ETF",
    "联接",
    "差异化分红",
    "折算",
    "拆分",
    "公司行为",
    "商品",
    "黄金",
    "期货",
    "异常",
    "缺失",
    "冲突",
    "迟到",
    "错配",
    "重跑",
    "回滚",
    "重估",
    "重披露",
]
PREMATURE_SETTLEMENT_DIRECTION_TOKENS = (
    "returnable",
    "refundable",
    "待退补余额",
    "待退余额",
    "待退补",
    "可退",
    "应退",
)


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise AssertionError(f"missing JSON: {path}")
    return json.loads(path.read_text(encoding="utf-8-sig"))


def strings(value: Any) -> list[str]:
    if isinstance(value, dict):
        return [text for child in value.values() for text in strings(child)]
    if isinstance(value, list):
        return [text for child in value for text in strings(child)]
    if isinstance(value, str):
        return [value]
    return []


def dec(value: Any) -> Decimal:
    if isinstance(value, bool):
        raise InvalidOperation("boolean is not numeric")
    return Decimal(str(value).replace(",", "").strip())


def q2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def close(actual: Any, expected: Any, tolerance: Any, label: str) -> None:
    difference = abs(dec(actual) - dec(expected))
    if difference > dec(tolerance):
        raise AssertionError(f"{label}: actual={actual} expected={expected} tolerance={tolerance}")


def schema_check(value: dict[str, Any], schema: dict[str, Any], label: str) -> None:
    errors = sorted(Draft202012Validator(schema).iter_errors(value), key=lambda error: list(error.path))
    if errors:
        detail = "; ".join(f"{list(error.path)}: {error.message}" for error in errors)
        raise AssertionError(f"{label} schema invalid: {detail}")
    print(f"SCHEMA PASS {label}")


def field_value(fixture: dict[str, Any], field_id: str) -> str:
    for field in fixture["fields"]:
        if field["fieldId"] == field_id:
            return field["value"]
    raise AssertionError(f"{fixture['fixtureId']} missing field {field_id}")


def field_obj(fixture: dict[str, Any], field_id: str) -> dict[str, Any]:
    for field in fixture["fields"]:
        if field["fieldId"] == field_id:
            return field
    raise AssertionError(f"{fixture['fixtureId']} missing field {field_id}")


def check_public_safety(label: str, route: dict[str, Any], rubric: dict[str, Any]) -> None:
    for source_label, value in ((f"{label} route", route), (f"{label} rubric", rubric)):
        for text in strings(value):
            for pattern in PUBLIC_FORBIDDEN:
                if pattern.search(text):
                    raise AssertionError(f"{source_label} contains sensitive pattern: {text}")
    route_text = "\n".join(strings(route))
    for topic in STUDENT_FORBIDDEN:
        if topic in route_text:
            raise AssertionError(f"{label} route leaks excluded topic: {topic}")
    print(f"SAFETY PASS {label}: no sensitive pattern or excluded student topic")


def check_integer_route_precision(label: str, route: dict[str, Any]) -> None:
    if label not in {"R1", "R3", "R4"}:
        return
    comp = route["steps"]["COMPREHENSIVE_PRACTICE"]
    for item in comp["workItems"]:
        response = item["response"]
        if response["kind"] == "NUMBER" and response.get("unit") in {"篮", "份", "股", "份/篮", "股/篮"}:
            if response.get("precision") != 0:
                raise AssertionError(f"{label} integer response precision mismatch: {item['workItemId']}")
            if "精度 0" not in item["instruction"] or "容差 0" not in item["instruction"]:
                raise AssertionError(f"{label} integer response lacks explicit zero precision/tolerance: {item['workItemId']}")
    for question in route["steps"]["BASIC_PRACTICE"]["questions"]:
        fields: list[dict[str, Any]] = []
        if question["type"] == "CALCULATION":
            fields = question["calculation"]["fields"]
        elif question["type"] == "RECONCILIATION":
            fields = [field for field in question["reconciliation"]["fields"] if field["kind"] == "NUMBER"]
        for field in fields:
            if field.get("unit") in {"篮", "份", "股", "份/篮", "股/篮"} and (field.get("precision") != 0 or dec(field.get("tolerance")) != Decimal("0")):
                raise AssertionError(f"{label} basic integer precision mismatch: {question['questionId']} {field['fieldId']}")
    print(f"INTEGER PRECISION PASS {label}: basket/share/security quantities use precision 0 and tolerance 0")


def rubric_rules(rubric: dict[str, Any]) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    for dimension in rubric["dimensions"]:
        for criterion in dimension["criteria"]:
            rules.extend(criterion["evidenceRules"])
    for mandatory in rubric["mandatoryRequirements"]:
        rules.extend(mandatory["evidenceRules"])
    return rules


def check_route_shape(label: str, route: dict[str, Any]) -> tuple[set[str], set[str]]:
    if route["routeId"] != EXPECTED_ROUTE_IDS[label] or route["line"] != "ACCOUNTING":
        raise AssertionError(f"{label} route identity/line mismatch")
    cards = route["steps"]["KNOWLEDGE_CARD"]["cards"]
    demo = route["steps"]["DEMONSTRATION"]["steps"]
    basics = route["steps"]["BASIC_PRACTICE"]["questions"]
    comp = route["steps"]["COMPREHENSIVE_PRACTICE"]
    work_items = comp["workItems"]
    if len(cards) != 3:
        raise AssertionError(f"{label} requires exactly 3 knowledge cards")
    if len(demo) != 5 or [step["order"] for step in demo] != [1, 2, 3, 4, 5]:
        raise AssertionError(f"{label} demonstration must be exactly ordered steps 1-5")
    if len(basics) != 5 or {question["type"] for question in basics} != EXPECTED_TYPES:
        raise AssertionError(f"{label} basic practice must contain exactly five heterogeneous types")
    if len(work_items) != EXPECTED_WORK_COUNTS[label]:
        raise AssertionError(f"{label} requires {EXPECTED_WORK_COUNTS[label]} atomic workItems, got {len(work_items)}")
    if {item["type"] for item in work_items} != EXPECTED_TYPES:
        raise AssertionError(f"{label} comprehensive workItems must cover all five types")
    if len({question["questionId"] for question in basics}) != 5:
        raise AssertionError(f"{label} basic question IDs are not unique")
    if len({item["workItemId"] for item in work_items}) != len(work_items):
        raise AssertionError(f"{label} workItem IDs are not unique")
    for question in basics:
        required_shape = {
            "FIELD_MAP": "fieldMappings",
            "CALCULATION": "calculation",
            "LEDGER_ENTRY": "ledgerEntries",
            "RECONCILIATION": "reconciliation",
            "SHORT_TEXT": "textInput",
        }[question["type"]]
        if required_shape not in question:
            raise AssertionError(f"{label} {question['questionId']} missing {required_shape}")
        if question["type"] == "CALCULATION":
            for field in question["calculation"]["fields"]:
                if not all(key in field for key in ("unit", "precision", "tolerance")):
                    raise AssertionError(f"{label} basic numeric field lacks unit/precision/tolerance")
        if question["type"] == "RECONCILIATION":
            for field in question["reconciliation"]["fields"]:
                if field["kind"] == "NUMBER" and not all(key in field for key in ("precision", "tolerance")):
                    raise AssertionError(f"{label} basic reconciliation number lacks precision/tolerance")
    if len(comp["sourceMaterials"]) < 2 or len({m["materialId"] for m in comp["sourceMaterials"]}) != len(comp["sourceMaterials"]):
        raise AssertionError(f"{label} source materials are missing or not unique")
    if len({m["kind"] for m in comp["sourceMaterials"]}) < 2:
        raise AssertionError(f"{label} source materials are not heterogeneous")
    short_texts = [item for item in work_items if item["type"] == "SHORT_TEXT"]
    if len(short_texts) > 1:
        raise AssertionError(f"{label} may have at most one SHORT_TEXT workItem")
    for item in work_items:
        response = item["response"]
        if response["kind"] == "NUMBER":
            if not all(key in response for key in ("unit", "precision")):
                raise AssertionError(f"{label} numeric workItem lacks unit/precision: {item['workItemId']}")
            if "容差" not in item["instruction"] and "tolerance" not in item["instruction"]:
                raise AssertionError(f"{label} numeric workItem lacks case tolerance notice: {item['workItemId']}")
    work_item_ids = {item["workItemId"] for item in work_items}
    question_ids = {question["questionId"] for question in basics}
    type_counts = {item_type: sum(item["type"] == item_type for item in work_items) for item_type in sorted(EXPECTED_TYPES)}
    if type_counts != EXPECTED_TYPE_COUNTS[label]:
        raise AssertionError(f"{label} workItem type distribution mismatch: {type_counts}")
    check_integer_route_precision(label, route)
    print(f"ROUTE SHAPE PASS {label}: 3 cards, 5 demo steps, 5 heterogeneous basics, {len(work_items)} workItems {type_counts}")
    return work_item_ids, question_ids


def check_rubric_shape(label: str, route: dict[str, Any], rubric: dict[str, Any], work_ids: set[str], question_ids: set[str]) -> None:
    expected_dimensions = {"CONCEPT": 25, "PROCESS": 30, "RISK": 25, "EXPRESSION": 20}
    actual_dimensions = {dimension["dimension"]: dimension["maxScore"] for dimension in rubric["dimensions"]}
    if actual_dimensions != expected_dimensions:
        raise AssertionError(f"{label} rubric dimensions mismatch: {actual_dimensions}")
    if len(rubric["mandatoryRequirements"]) != 2:
        raise AssertionError(f"{label} must have exactly two mandatory requirements")
    target_ids = {target["targetId"] for target in rubric["remediationTargets"]}
    referenced_fields: set[str] = set()
    rule_ids: set[str] = set()
    for dimension in rubric["dimensions"]:
        if sum(criteria["weight"] for criteria in dimension["criteria"]) != dimension["maxScore"]:
            raise AssertionError(f"{label} {dimension['dimension']} weights do not sum")
        for criterion in dimension["criteria"]:
            rule_ids.add(criterion["criterionId"])
            if criterion["remediationTargetId"] not in target_ids:
                raise AssertionError(f"{label} criterion lacks remediation target")
            for rule in criterion["evidenceRules"]:
                if rule["fieldId"] not in work_ids:
                    raise AssertionError(f"{label} rule references unknown workItem: {rule['fieldId']}")
                referenced_fields.add(rule["fieldId"])
                if rule["operator"] == "NUMBER_EQUALS" and "tolerance" not in rule:
                    raise AssertionError(f"{label} numeric rule lacks tolerance: {rule['fieldId']}")
    mandatory_ids: set[str] = set()
    for mandatory in rubric["mandatoryRequirements"]:
        mandatory_ids.add(mandatory["requirementId"])
        if mandatory["remediationTargetId"] not in target_ids:
            raise AssertionError(f"{label} mandatory lacks remediation target")
        for rule in mandatory["evidenceRules"]:
            if rule["fieldId"] not in work_ids:
                raise AssertionError(f"{label} mandatory references unknown workItem: {rule['fieldId']}")
            referenced_fields.add(rule["fieldId"])
            if rule["operator"] == "NUMBER_EQUALS" and "tolerance" not in rule:
                raise AssertionError(f"{label} numeric mandatory rule lacks tolerance")
    if referenced_fields != work_ids:
        raise AssertionError(f"{label} rubric does not cover every workItem: {sorted(work_ids - referenced_fields)}")
    for target in rubric["remediationTargets"]:
        if target["questionId"] not in question_ids or target["materialItemId"] not in work_ids:
            raise AssertionError(f"{label} remediation target is not tied to a question and workItem")
    if {target["materialItemId"] for target in rubric["remediationTargets"]} != work_ids:
        raise AssertionError(f"{label} remediation targets do not cover every workItem")
    comp_items = {item["workItemId"]: item for item in route["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]}
    reference = rubric["referenceAnswer"]
    responses = reference["responses"]
    if set(responses) != set(comp_items):
        raise AssertionError(f"{label} referenceAnswer does not cover every workItem")
    numeric_ids = {item_id for item_id, item in comp_items.items() if item["response"]["kind"] == "NUMBER"}
    if set(reference.get("responseMeta", {})) != numeric_ids:
        raise AssertionError(f"{label} numeric responseMeta does not match NUMBER workItems")
    material_ids = {material["materialId"] for material in route["steps"]["COMPREHENSIVE_PRACTICE"]["sourceMaterials"]}
    mapping = reference.get("evidenceSourceMapping", {})
    if set(mapping) != set(comp_items) or any(not set(values).issubset(material_ids) for values in mapping.values()):
        raise AssertionError(f"{label} evidenceSourceMapping does not close to route materials")
    rules_by_field: dict[str, list[dict[str, Any]]] = {}
    for rule in rubric_rules(rubric):
        rules_by_field.setdefault(rule["fieldId"], []).append(rule)
    for item_id, item in comp_items.items():
        answer = responses[item_id]
        if item["response"]["kind"] == "NUMBER":
            meta = reference["responseMeta"][item_id]
            if meta["kind"] != "NUMBER" or meta["unit"] != item["response"]["unit"] or meta["precision"] != item["response"]["precision"]:
                raise AssertionError(f"{label} numeric response metadata mismatch: {item_id}")
            if "tolerance" not in meta:
                raise AssertionError(f"{label} numeric response metadata lacks tolerance: {item_id}")
            numeric_rules = [rule for rule in rules_by_field[item_id] if rule["operator"] == "NUMBER_EQUALS"]
            if not numeric_rules or any(abs(dec(answer) - dec(rule["expected"])) > dec(rule["tolerance"]) for rule in numeric_rules):
                raise AssertionError(f"{label} numeric reference answer disagrees with rubric: {item_id}")
        elif item["response"]["kind"] == "SELECT":
            if not any(rule["operator"] == "EQUALS" and rule["expected"] == answer for rule in rules_by_field[item_id]):
                raise AssertionError(f"{label} SELECT reference answer has no deterministic rule: {item_id}")
        else:
            text_rules = [rule for rule in rules_by_field[item_id] if rule["operator"] == "CONTAINS_ALL"]
            if not text_rules or not all(token in answer for token in text_rules[0]["expected"]):
                raise AssertionError(f"{label} TEXT reference answer lacks deterministic evidence: {item_id}")
    print(f"RUBRIC PASS {label}: 25/30/25/20, pass75, exactly2 mandatory, full evidence and remediation mapping")
    return rule_ids | mandatory_ids


def check_cognitive_axes(routes: dict[str, dict[str, Any]]) -> None:
    r1_text = "\n".join(strings(routes["R1"]))
    r2_text = "\n".join(strings(routes["R2"]))
    r3_text = "\n".join(strings(routes["R3"]))
    r4_text = "\n".join(strings(routes["R4"]))
    for token in ("ETF 产品", "基金份额", "组合证券", "一级", "二级", "发行份额"):
        if token not in r1_text:
            raise AssertionError(f"R1 cognitive axis missing: {token}")
    for token in ("现金替代", "现金差额", "创设单位净值"):
        if token in r1_text:
            raise AssertionError(f"R1 leaks R2 calculation axis: {token}")
    for token in ("PCF", "现金替代", "创设单位净值", "单位现金差额", "股票篮", "申购对价"):
        if token not in r2_text:
            raise AssertionError(f"R2 cognitive axis missing: {token}")
    for token in ("二级交易", "二级成交", "基金发行份额"):
        if token in r2_text:
            raise AssertionError(f"R2 leaks R1 object axis: {token}")
    for token in ("指令", "PCF", "确认", "证券交收", "现金交收", "TA", "清算", "台账", "三腿"):
        if token not in r3_text:
            raise AssertionError(f"R3 settlement axis missing: {token}")
    for token in ("实际补券", "费用", "估计视图", "最终结算方向", "remaining", "估值", "TA", "清算", "正常封账"):
        if token not in r4_text:
            raise AssertionError(f"R4 close axis missing: {token}")
    for token in ("实际补券", "最终结算方向", "正常封账"):
        if token in r3_text:
            raise AssertionError(f"R3 leaks R4 close axis: {token}")
    print("COGNITIVE AXIS PASS: R1 object, R2 PCF, R3 three-leg settlement and R4 substitution-close axes remain isolated")


def check_hashes(audit: dict[str, Any]) -> None:
    physical_files = audit.get("physicalFiles", [])
    if len(physical_files) != 11 or audit.get("physicalFileCount") != 11:
        raise AssertionError("material audit must contain exactly eleven physical files")
    declared_paths = {item["relativePath"] for item in physical_files}
    if declared_paths != set(EXPECTED_SHA256):
        raise AssertionError("material audit path inventory is not the eleven approved materials")
    for item in physical_files:
        relative = item["relativePath"]
        actual_path = PROJECT_ROOT / Path(relative)
        declared_hash = item["sha256"]
        if not re.fullmatch(r"[0-9A-F]{64}", declared_hash):
            raise AssertionError(f"{relative} SHA-256 is not a full uppercase digest")
        if declared_hash != EXPECTED_SHA256[relative]:
            raise AssertionError(f"{relative} SHA-256 does not match the audited baseline")
        if not actual_path.is_file():
            raise AssertionError(f"physical source missing: {actual_path}")
        digest = hashlib.sha256(actual_path.read_bytes()).hexdigest().upper()
        if digest != declared_hash:
            raise AssertionError(f"{relative} SHA-256 mismatch: {digest}")
        if actual_path.stat().st_size != item["sizeBytes"]:
            raise AssertionError(f"{relative} size mismatch")
        if not item.get("physicalFileId") or not item.get("sourceMaterialCode") or not item.get("objectAudit", {}).get("stableLocators"):
            raise AssertionError(f"{relative} lacks stable object locator")
        object_audit = item["objectAudit"]
        if item["format"] == "PPTX":
            required_object_keys = ("zipEntries", "slides", "notesSlides", "slideTables", "slideImages", "mediaParts", "formulas", "oleObjects", "embeddedPackages", "embeddedObjects", "relationships")
        elif item["format"] == "DOCX":
            required_object_keys = ("zipEntries", "paragraphs", "nonEmptyParagraphs", "tables", "inlineImages", "mediaParts", "formulas", "textboxes", "oleObjects", "embeddedPackages", "embeddedObjects", "relationships", "notes")
        elif item["format"] == "PDF":
            required_object_keys = ("pages", "imageReferences", "uniqueImageObjects", "formulas", "annotations", "embeddedObjects", "relationships")
        else:
            raise AssertionError(f"unsupported audited format: {item['format']}")
        for key in required_object_keys:
            if key not in object_audit:
                raise AssertionError(f"{relative} object audit lacks {key}")
        if not item.get("readabilityLimitations"):
            raise AssertionError(f"{relative} lacks explicit readability limitations")
    relations = {relation["relationId"]: relation for relation in audit.get("sameSourceMediaRelations", [])}
    expected_relations = {
        "ETF-SM-01": {"ETF-PHY-07", "ETF-PHY-08"},
        "ETF-SM-02": {"ETF-PHY-01", "ETF-PHY-04", "ETF-PHY-10", "ETF-PHY-11"},
    }
    if set(relations) != set(expected_relations):
        raise AssertionError("same-source media relation inventory is incomplete")
    for relation_id, file_ids in expected_relations.items():
        relation = relations[relation_id]
        if set(relation["physicalFileIds"]) != file_ids or len(relation["mediaSha256"]) != 5:
            raise AssertionError(f"{relation_id} same-source media boundary mismatch")
        if not all(re.fullmatch(r"[0-9A-F]{64}", value) for value in relation["mediaSha256"]):
            raise AssertionError(f"{relation_id} media hashes are not full SHA-256")
        if not relation.get("interpretation"):
            raise AssertionError(f"{relation_id} lacks duplicate/source interpretation")
    for group in audit.get("evidenceGroups", []):
        if not group.get("physicalFileIds") or not group.get("locators") or group.get("provenance") not in {"MATERIAL_ABSTRACTION", "SYNTHETIC_EDUCATIONAL", "CASE_POLICY"}:
            raise AssertionError(f"evidence group lacks stable provenance/locator: {group.get('evidenceGroupId')}")
    print("MATERIAL PASS: eleven physical files, full SHA-256, object/relationship limits and same-source media boundaries")


def check_material_audit_boundary(audit: dict[str, Any]) -> None:
    if audit.get("version") != "1.1.0" or audit.get("scope") != "ETF-MODULE":
        raise AssertionError("material audit must be the B0-B2 ETF module audit")
    expected_activities = {"FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION", "SHORT_TEXT"}
    activity_landing = audit.get("activityLanding", {})
    if set(activity_landing) != {"ETF-01", "ETF-02", "ETF-03", "ETF-04"}:
        raise AssertionError("material audit activity landing must cover ETF-01 through ETF-04")
    for route_code, landing in activity_landing.items():
        if any(token in json.dumps(landing, ensure_ascii=False) for token in ("ADVANCED", "FUTURE", "BUILDING")):
            raise AssertionError(f"material audit active landing is outside normal B0-B2 scope: {route_code}")
        if set(landing.get("activities", [])) != expected_activities:
            raise AssertionError(f"material audit activity inventory is incomplete: {route_code}")
        if not landing.get("routeFile") or not landing.get("evidenceFile"):
            raise AssertionError(f"material audit route/evidence landing is incomplete: {route_code}")
    ledger_group = next((group for group in audit.get("evidenceGroups", []) if group.get("evidenceGroupId") == "ETF-EG-04-LEDGER-SETTLEMENT"), None)
    if ledger_group is None or set(ledger_group.get("activityLanding", [])) != {"ETF-02", "ETF-03", "ETF-04"}:
        raise AssertionError("material audit ledger/settlement group does not land on R2-R4")
    required_supports = {"证券/现金交收链", "实际补券成本与费用", "估值/TA/清算多源勾稽"}
    if not required_supports.issubset(set(ledger_group.get("supports", []))):
        raise AssertionError("material audit ledger/settlement group lacks B2 support claims")
    fixture_ids = {fixture.get("fixtureId") for fixture in audit.get("syntheticFixtures", [])}
    if fixture_ids != set().union(*EXPECTED_FIXTURES.values()):
        raise AssertionError("material audit synthetic fixture inventory is not the eight independent fixtures")
    conclusion = next((item for item in audit.get("businessConclusions", []) if item.get("conclusionId") == "ETF-CONCLUSION-03"), None)
    if conclusion is None or set(conclusion.get("supportsRoutes", [])) != {"ETF-02", "ETF-03", "ETF-04"}:
        raise AssertionError("material audit B2 business conclusion does not cover R2-R4")
    print("MATERIAL BOUNDARY PASS: audited source hashes land on four normal ETF routes and eight independent fixtures; advanced/future landings remain excluded")


def check_state_matrix_b2(states: dict[str, Any]) -> None:
    state_by_id = {item.get("stateId"): item for item in states.get("stateChain", [])}
    required = {
        "INSTRUCTION_RECEIVED": {"ETF-SRC-R3-INSTRUCTION"},
        "PCF_VALIDATED": {"ETF-SRC-R3-PCF"},
        "PRIMARY_CONFIRMED": {"ETF-SRC-R3-CONFIRMATION"},
        "SECURITIES_SETTLED": {"ETF-SRC-R3-SECURITIES"},
        "CASH_SETTLED": {"ETF-SRC-R3-CASH"},
        "PRIMARY_SETTLEMENT_RECONCILED_PENDING_SUBSTITUTION_SETTLEMENT": {"ETF-SRC-R3-DOWNSTREAM", "ETF-SRC-R3-LEDGER"},
        "ACTUAL_SUBSTITUTION_COST_CONFIRMED": {"ETF-SRC-R4-BUYIN", "ETF-SRC-R4-FEE"},
        "SUBSTITUTION_SETTLED": {"ETF-SRC-R4-EVENT", "ETF-SRC-R4-LEDGER"},
        "SUBSTITUTION_SETTLEMENT_RECONCILED_NORMAL_CLOSE": {"ETF-SRC-R4-EVENT", "ETF-SRC-R4-LEDGER", "ETF-SRC-R4-MULTISOURCE"},
    }
    for state_id, source_groups in required.items():
        state = state_by_id.get(state_id)
        if state is None or not source_groups.issubset(set(state.get("entrySourceGroups", []))):
            raise AssertionError(f"source-state matrix lacks independent B2 source for {state_id}")
    confirmed = state_by_id["PRIMARY_CONFIRMED"]
    if "ETF-03" not in confirmed.get("teachableIn", []):
        raise AssertionError("PRIMARY_CONFIRMED is not landed on ETF-03 in the source-state matrix")
    print("STATE MATRIX PASS: every R3/R4 teachable state has its independent source group and no-skip downstream boundary")


def check_b0_assets(audit: dict[str, Any], fields: dict[str, Any], states: dict[str, Any], deid: dict[str, Any], snapshot: dict[str, Any]) -> None:
    check_hashes(audit)
    check_material_audit_boundary(audit)
    check_state_matrix_b2(states)
    required_fields = {
        "product_key", "fund_share_key", "basket_security_key", "pcf_key", "basket_count", "shares_per_creation_unit",
        "primary_created_shares", "opening_issued_shares", "post_primary_issued_shares", "secondary_traded_shares",
        "post_secondary_issued_shares", "secondary_issued_delta", "security_code", "security_market", "security_quantity",
        "substitution_flag", "reference_price", "substitution_premium_rate", "row_market_value", "row_cash_substitution_amount",
        "physical_security_value", "basket_market_value", "pre_voucher_asset_nav", "pre_voucher_issued_capital",
        "basket_share_quantity", "creation_unit_nav", "unit_cash_difference", "cash_substitution_total", "refund_amount",
        "refund_status", "substitution_premium_prepayment", "initial_consideration", "unsettled_substitution_prepayment",
        "creation_consideration", "actual_consideration", "consideration_difference", "price_source_key", "final_reconciliation_state",
        "event_key", "instruction_state", "pcf_validation_state", "confirmation_state", "confirmed_basket_count",
        "confirmed_share_quantity", "security_per_basket_quantity", "expected_security_quantity", "delivered_security_quantity",
        "securities_leg_difference", "cash_substitution_per_basket", "cash_difference_per_basket", "expected_cash_substitution",
        "expected_cash_difference", "expected_cash_total", "settled_cash_substitution", "settled_cash_difference", "settled_cash_total",
        "cash_substitution_difference", "cash_difference_difference", "cash_total_difference", "ta_confirmed_shares",
        "clearing_confirmed_shares", "ledger_confirmed_shares", "ledger_security_quantity", "ledger_cash_total", "r3_final_state",
        "substitution_line_quantity", "estimate_state", "estimated_settlement_view_amount", "actual_buyin_quantity",
        "actual_buyin_price", "actual_buyin_gross", "substitution_fee", "actual_substitution_cost",
        "signed_final_settlement_amount", "final_settlement_direction", "final_settlement_amount", "estimate_adjustment_amount",
        "event_settlement_amount", "ledger_settlement_amount", "valuation_settlement_amount", "ta_settlement_amount",
        "clearing_settlement_amount", "event_remaining", "ledger_remaining", "event_ledger_difference",
        "valuation_event_difference", "ta_event_difference", "clearing_event_difference", "final_settlement_state",
    }
    field_ids = {field["fieldId"] for field in fields.get("fields", [])}
    if not required_fields.issubset(field_ids):
        raise AssertionError(f"field dictionary missing: {sorted(required_fields - field_ids)}")
    provenance_labels = {item["label"] for item in deid.get("provenanceLabels", [])}
    if provenance_labels != {"MATERIAL_ABSTRACTION", "SYNTHETIC_EDUCATIONAL", "CASE_POLICY"}:
        raise AssertionError("provenance label set is incomplete")
    if not all(rule.get("provenance") == "CASE_POLICY" for rule in deid.get("versionedCaseRules", [])):
        raise AssertionError("versioned case rules must be CASE_POLICY")
    if "ONLY_THIS_CASE" not in snapshot.get("scopeNotice", "") or snapshot.get("precisionPolicy", {}).get("binaryFloatForbidden") is not True:
        raise AssertionError("snapshot does not declare ONLY_THIS_CASE and Decimal policy")
    source_policy = states.get("dependencyPolicy", {})
    if source_policy.get("stageGate") is not False or source_policy.get("releaseRegistration") not in ALLOWED_RELEASE_REGISTRATIONS:
        raise AssertionError("source-state matrix release registration is invalid")
    if not states.get("deferBoundary") or not audit.get("exclusionBoundary"):
        raise AssertionError("B0 exclusion boundaries are incomplete")
    planned = source_policy.get("plannedMapPrerequisites")
    if planned != {
        "ACC-ETF-OBJECT-001": ["ACC-NODE-DAILY-003", "ACC-NODE-STOCK-TRADE-001"],
        "ACC-ETF-PCF-002": ["ACC-NODE-ETF-OBJECT-001"],
        "ACC-ETF-SETTLEMENT-003": ["ACC-NODE-ETF-PCF-002"],
        "ACC-ETF-CLOSE-004": ["ACC-NODE-ETF-SETTLEMENT-003"],
    }:
        raise AssertionError("source-state plannedMapPrerequisites do not match the approved dependency boundary")
    print("SHARED ASSET PASS: field dictionary, source-state matrix, provenance/deidentification and snapshot policy cover R1-R4")


def check_fixture_metadata(fixture: dict[str, Any]) -> None:
    numeric_fields = [field for field in fixture["fields"] if "precision" in field]
    for field in numeric_fields:
        if not isinstance(field["value"], str) or not isinstance(field.get("tolerance"), str):
            raise AssertionError(f"{fixture['fixtureId']} numeric value/tolerance must remain Decimal strings: {field['fieldId']}")
        dec(field["value"])
        dec(field["tolerance"])
        if field.get("provenance") not in {"MATERIAL_ABSTRACTION", "SYNTHETIC_EDUCATIONAL", "CASE_POLICY"}:
            raise AssertionError(f"{fixture['fixtureId']} numeric field lacks provenance: {field['fieldId']}")
    chain = fixture.get("answerChain", {})
    steps = chain.get("decimalSteps", [])
    if not steps:
        raise AssertionError(f"{fixture['fixtureId']} Decimal chain is empty")
    for step in steps:
        if "Decimal(" not in step.get("formula", "") or not isinstance(step.get("result"), str):
            raise AssertionError(f"{fixture['fixtureId']} has non-Decimal formula/result: {step.get('fieldId')}")
        meta = field_obj(fixture, step["fieldId"])
        if step["unit"] != meta.get("unit") or step["precision"] != meta.get("precision") or step["tolerance"] != meta.get("tolerance"):
            raise AssertionError(f"{fixture['fixtureId']} Decimal step metadata mismatch: {step['fieldId']}")


def check_fixture_source_mapping(fixture: dict[str, Any], route_label: str) -> None:
    expected_groups = EXPECTED_FIXTURE_SOURCE_GROUPS[route_label]
    declared_groups = set(fixture.get("sourceGroups", []))
    if declared_groups != expected_groups:
        raise AssertionError(f"{fixture['fixtureId']} source group inventory is incomplete")
    mapping = fixture.get("answerChain", {}).get("sourceToField", [])
    mapping_groups = [item.get("sourceGroupId") for item in mapping]
    if set(mapping_groups) != expected_groups or len(mapping_groups) != len(expected_groups):
        raise AssertionError(f"{fixture['fixtureId']} answer chain does not independently map every source group")
    field_ids = {field["fieldId"] for field in fixture.get("fields", [])}
    if any(not item.get("fields") or not set(item["fields"]).issubset(field_ids) for item in mapping):
        raise AssertionError(f"{fixture['fixtureId']} source-to-field mapping references an unknown or empty field set")
        close(step["result"], meta["value"], meta["tolerance"], f"{fixture['fixtureId']} {step['fieldId']}")


def check_r1_fixture(fixture: dict[str, Any]) -> None:
    integer_fields = (
        "basket_count",
        "shares_per_creation_unit",
        "opening_issued_shares",
        "primary_created_shares",
        "post_primary_issued_shares",
        "secondary_traded_shares",
        "post_secondary_issued_shares",
        "secondary_issued_delta",
    )
    for field_id in integer_fields:
        field = field_obj(fixture, field_id)
        if field.get("precision") != 0 or dec(field.get("tolerance")) != Decimal("0") or not re.fullmatch(r"-?\d+", field["value"]):
            raise AssertionError(f"{fixture['fixtureId']} integer precision gate failed: {field_id}")
    count = dec(field_value(fixture, "basket_count"))
    shares_per = dec(field_value(fixture, "shares_per_creation_unit"))
    opening = dec(field_value(fixture, "opening_issued_shares"))
    created = count * shares_per
    post_primary = opening + created
    post_secondary = post_primary
    close(field_value(fixture, "primary_created_shares"), created, "0", f"{fixture['fixtureId']} created shares")
    close(field_value(fixture, "post_primary_issued_shares"), post_primary, "0", f"{fixture['fixtureId']} primary issued")
    close(field_value(fixture, "post_secondary_issued_shares"), post_secondary, "0", f"{fixture['fixtureId']} secondary issued")
    close(field_value(fixture, "secondary_issued_delta"), post_secondary - post_primary, "0", f"{fixture['fixtureId']} secondary delta")
    if field_value(fixture, "primary_state") != "PRIMARY_CONFIRMED" or field_value(fixture, "secondary_state") != "SECONDARY_SETTLED":
        raise AssertionError(f"{fixture['fixtureId']} R1 state boundary is not closed")
    check_fixture_metadata(fixture)
    print(f"DECIMAL PASS {fixture['fixtureId']}: created={created} postPrimary={post_primary} postSecondary={post_secondary} delta=0")


def check_r2_fixture(fixture: dict[str, Any]) -> None:
    market_values: list[Decimal] = []
    cash_values: list[Decimal] = []
    physical_values: list[Decimal] = []
    premium_values: list[Decimal] = []
    for index in range(1, 4):
        quantity_field = field_obj(fixture, f"security_{index}_quantity")
        if quantity_field.get("precision") != 0 or dec(quantity_field.get("tolerance")) != Decimal("0") or not re.fullmatch(r"-?\d+", quantity_field["value"]):
            raise AssertionError(f"{fixture['fixtureId']} PCF integer quantity precision gate failed: row{index}")
        quantity = dec(field_value(fixture, f"security_{index}_quantity"))
        price = dec(field_value(fixture, f"security_{index}_reference_price"))
        market_value = q2(quantity * price)
        close(field_value(fixture, f"security_{index}_market_value"), market_value, "0.01", f"{fixture['fixtureId']} row{index} market value")
        market_values.append(market_value)
        flag = field_value(fixture, f"security_{index}_substitution_flag")
        if flag.startswith("0_"):
            cash = Decimal("0.00")
            physical_values.append(market_value)
        elif flag.startswith("1_") or flag.startswith("2_"):
            if flag.startswith("1_") and flag != "1_MUST_CASH_SUBSTITUTION":
                raise AssertionError(f"{fixture['fixtureId']} row{index} flag 1 must be MUST_CASH_SUBSTITUTION")
            if flag.startswith("2_"):
                if flag != "2_ALLOWED_CASH_SUBSTITUTION":
                    raise AssertionError(f"{fixture['fixtureId']} row{index} flag 2 must be ALLOWED_CASH_SUBSTITUTION")
                if field_value(fixture, f"security_{index}_delivery_choice") != "CASH_SUBSTITUTE":
                    raise AssertionError(f"{fixture['fixtureId']} row{index} allowed substitution lacks CASH_SUBSTITUTE delivery choice")
            premium = dec(field_value(fixture, f"security_{index}_premium_rate"))
            cash = q2(market_value * (Decimal("1.00") + premium))
            close(field_value(fixture, f"security_{index}_cash_substitution"), cash, "0.01", f"{fixture['fixtureId']} row{index} cash substitution")
            premium_values.append(q2(cash - market_value))
        else:
            raise AssertionError(f"{fixture['fixtureId']} row{index} has unknown substitution flag: {flag}")
        cash_values.append(cash)
    basket = q2(sum(market_values, Decimal("0.00")))
    physical = q2(sum(physical_values, Decimal("0.00")))
    cash_total = q2(sum(cash_values, Decimal("0.00")))
    pre_nav = dec(field_value(fixture, "pre_voucher_asset_nav"))
    pre_capital = dec(field_value(fixture, "pre_voucher_issued_capital"))
    basket_shares = dec(field_value(fixture, "basket_share_quantity"))
    for field_id in ("pre_voucher_issued_capital", "basket_share_quantity"):
        field = field_obj(fixture, field_id)
        if field.get("precision") != 0 or dec(field.get("tolerance")) != Decimal("0") or not re.fullmatch(r"-?\d+", field["value"]):
            raise AssertionError(f"{fixture['fixtureId']} integer valuation quantity precision gate failed: {field_id}")
    nav = q2(pre_nav / pre_capital * basket_shares)
    unit_diff = q2(nav - basket)
    refund = dec(field_value(fixture, "refund_amount"))
    premium_prepayment = q2(sum(premium_values, Decimal("0.00")))
    initial_consideration = q2(nav + premium_prepayment)
    unsettled_prepayment = q2(premium_prepayment - refund)
    consideration = q2(physical + cash_total + unit_diff - refund)
    actual = dec(field_value(fixture, "actual_consideration"))
    difference = q2(consideration - actual)
    expected = {
        "basket_market_value": basket,
        "physical_security_value": physical,
        "cash_substitution_total": cash_total,
        "creation_unit_nav": nav,
        "unit_cash_difference": unit_diff,
        "substitution_premium_prepayment": premium_prepayment,
        "initial_consideration": initial_consideration,
        "unsettled_substitution_prepayment": unsettled_prepayment,
        "creation_consideration": consideration,
        "consideration_difference": difference,
    }
    for field_id, value in expected.items():
        close(field_value(fixture, field_id), value, "0.01", f"{fixture['fixtureId']} {field_id}")
    if field_value(fixture, "refund_status") != "NOT_PROCESSED_IN_THIS_ROUTE":
        raise AssertionError(f"{fixture['fixtureId']} refund status must remain NOT_PROCESSED_IN_THIS_ROUTE")
    if field_value(fixture, "final_reconciliation_state") != "INITIAL_CONSIDERATION_RECONCILED_PENDING_SUBSTITUTION_SETTLEMENT":
        raise AssertionError(f"{fixture['fixtureId']} R2 state boundary incorrectly implies final substitution settlement")
    check_fixture_metadata(fixture)
    print(f"DECIMAL PASS {fixture['fixtureId']}: basket={basket} cash={cash_total} nav={nav} unitDiff={unit_diff} premium={premium_prepayment} initial={initial_consideration} unsettled={unsettled_prepayment} consideration={consideration} difference={difference}")


def check_r3_fixture(fixture: dict[str, Any]) -> None:
    integer_fields = (
        "basket_count", "basket_share_quantity", "confirmed_basket_count", "confirmed_share_quantity",
        "security_per_basket_quantity", "expected_security_quantity", "delivered_security_quantity",
        "securities_leg_difference", "ta_confirmed_shares", "clearing_confirmed_shares",
        "ledger_confirmed_shares", "ledger_security_quantity",
    )
    for field_id in integer_fields:
        field = field_obj(fixture, field_id)
        if field.get("precision") != 0 or dec(field.get("tolerance")) != Decimal("0") or not re.fullmatch(r"-?\d+", field["value"]):
            raise AssertionError(f"{fixture['fixtureId']} R3 integer precision gate failed: {field_id}")
    baskets = dec(field_value(fixture, "basket_count"))
    expected_security = baskets * dec(field_value(fixture, "security_per_basket_quantity"))
    expected_cash_sub = q2(baskets * dec(field_value(fixture, "cash_substitution_per_basket")))
    expected_cash_diff = q2(baskets * dec(field_value(fixture, "cash_difference_per_basket")))
    expected_cash_total = q2(expected_cash_sub + expected_cash_diff)
    expected_shares = baskets * dec(field_value(fixture, "basket_share_quantity"))
    close(field_value(fixture, "confirmed_basket_count"), baskets, "0", f"{fixture['fixtureId']} confirmed baskets")
    close(field_value(fixture, "confirmed_share_quantity"), expected_shares, "0", f"{fixture['fixtureId']} confirmed shares")
    close(dec(field_value(fixture, "confirmed_basket_count")) - baskets, "0", "0", f"{fixture['fixtureId']} instruction/confirmation basket difference")
    close(dec(field_value(fixture, "confirmed_share_quantity")) - expected_shares, "0", "0", f"{fixture['fixtureId']} instruction/confirmation share difference")
    close(field_value(fixture, "expected_security_quantity"), expected_security, "0", f"{fixture['fixtureId']} expected security")
    close(field_value(fixture, "securities_leg_difference"), dec(field_value(fixture, "delivered_security_quantity")) - expected_security, "0", f"{fixture['fixtureId']} securities leg")
    close(field_value(fixture, "expected_cash_substitution"), expected_cash_sub, "0.01", f"{fixture['fixtureId']} cash substitution")
    close(field_value(fixture, "expected_cash_difference"), expected_cash_diff, "0.01", f"{fixture['fixtureId']} cash difference")
    close(field_value(fixture, "expected_cash_total"), expected_cash_total, "0.01", f"{fixture['fixtureId']} cash total")
    for actual_id, expected_id, diff_id in (
        ("settled_cash_substitution", "expected_cash_substitution", "cash_substitution_difference"),
        ("settled_cash_difference", "expected_cash_difference", "cash_difference_difference"),
        ("settled_cash_total", "expected_cash_total", "cash_total_difference"),
    ):
        close(field_value(fixture, diff_id), dec(field_value(fixture, actual_id)) - dec(field_value(fixture, expected_id)), "0.01", f"{fixture['fixtureId']} {diff_id}")
        close(field_value(fixture, diff_id), "0.00", "0.01", f"{fixture['fixtureId']} zero {diff_id}")
    for field_id in ("ta_confirmed_shares", "clearing_confirmed_shares", "ledger_confirmed_shares"):
        close(field_value(fixture, field_id), expected_shares, "0", f"{fixture['fixtureId']} {field_id}")
    for field_id in ("ta_confirmed_shares", "clearing_confirmed_shares", "ledger_confirmed_shares"):
        close(dec(field_value(fixture, field_id)) - expected_shares, "0", "0", f"{fixture['fixtureId']} {field_id} confirmation difference")
    close(field_value(fixture, "ledger_security_quantity"), expected_security, "0", f"{fixture['fixtureId']} ledger security")
    close(field_value(fixture, "ledger_cash_total"), expected_cash_total, "0.01", f"{fixture['fixtureId']} ledger cash")
    close(dec(field_value(fixture, "ledger_security_quantity")) - expected_security, "0", "0", f"{fixture['fixtureId']} ledger/security difference")
    close(dec(field_value(fixture, "ledger_cash_total")) - expected_cash_total, "0", "0.01", f"{fixture['fixtureId']} ledger/cash difference")
    if [field_value(fixture, name) for name in ("instruction_state", "pcf_validation_state", "confirmation_state")] != ["INSTRUCTION_RECEIVED", "PCF_VALIDATED", "PRIMARY_CONFIRMED"]:
        raise AssertionError(f"{fixture['fixtureId']} R3 state sources skip a step")
    if field_value(fixture, "r3_final_state") != "PRIMARY_SETTLEMENT_RECONCILED_PENDING_SUBSTITUTION_SETTLEMENT":
        raise AssertionError(f"{fixture['fixtureId']} R3 final state boundary mismatch")
    reconciliation = fixture.get("answerChain", {}).get("reconciliation", {})
    for field_id in ("instructionConfirmationDifference", "instructionConfirmationShareDifference", "taConfirmationDifference", "clearingConfirmationDifference", "ledgerConfirmationDifference", "ledgerSecurityDifference", "ledgerCashDifference", "taClearingLedgerDifference"):
        if field_id not in reconciliation:
            raise AssertionError(f"{fixture['fixtureId']} R3 reconciliation lacks explicit zero check: {field_id}")
        close(reconciliation[field_id], "0", "0.01", f"{fixture['fixtureId']} {field_id}")
    check_fixture_source_mapping(fixture, "R3")
    check_fixture_metadata(fixture)
    print(f"DECIMAL PASS {fixture['fixtureId']}: security={expected_security} cashSub={expected_cash_sub} cashDiff={expected_cash_diff} cashTotal={expected_cash_total} threeLegDiff=0")


def check_r4_fixture(fixture: dict[str, Any]) -> None:
    for field_id in ("substitution_line_quantity", "actual_buyin_quantity"):
        field = field_obj(fixture, field_id)
        if field.get("precision") != 0 or dec(field.get("tolerance")) != Decimal("0") or not re.fullmatch(r"-?\d+", field["value"]):
            raise AssertionError(f"{fixture['fixtureId']} R4 integer precision gate failed: {field_id}")
    if field_value(fixture, "estimate_state") != "NON_FINAL_ESTIMATE_ONLY":
        raise AssertionError(f"{fixture['fixtureId']} estimate view is not explicitly non-final")
    close(field_value(fixture, "actual_buyin_quantity"), field_value(fixture, "substitution_line_quantity"), "0", f"{fixture['fixtureId']} buy-in quantity")
    gross = q2(dec(field_value(fixture, "actual_buyin_quantity")) * dec(field_value(fixture, "actual_buyin_price")))
    actual_cost = q2(gross + dec(field_value(fixture, "substitution_fee")))
    signed = q2(dec(field_value(fixture, "unsettled_substitution_prepayment")) - actual_cost)
    direction = "RETURN_TO_AP" if signed > 0 else "NO_ADDITIONAL_CASH" if signed == 0 else "ADDITIONAL_PAYMENT_FROM_AP"
    final_amount = q2(abs(signed))
    adjustment = q2(final_amount - dec(field_value(fixture, "estimated_settlement_view_amount")))
    remaining = q2(dec(field_value(fixture, "unsettled_substitution_prepayment")) - actual_cost - final_amount) if direction == "RETURN_TO_AP" else Decimal("0.00")
    expected = {
        "actual_buyin_gross": gross, "actual_substitution_cost": actual_cost,
        "signed_final_settlement_amount": signed, "final_settlement_amount": final_amount,
        "estimate_adjustment_amount": adjustment, "event_remaining": remaining, "ledger_remaining": remaining,
    }
    for field_id, value in expected.items():
        close(field_value(fixture, field_id), value, "0.01", f"{fixture['fixtureId']} {field_id}")
    if field_value(fixture, "final_settlement_direction") != direction:
        raise AssertionError(f"{fixture['fixtureId']} final direction was not derived after actual cost")
    event_amount = dec(field_value(fixture, "event_settlement_amount"))
    close(event_amount, final_amount, "0.01", f"{fixture['fixtureId']} event amount")
    for source_id, diff_id in (
        ("ledger_settlement_amount", "event_ledger_difference"),
        ("valuation_settlement_amount", "valuation_event_difference"),
        ("ta_settlement_amount", "ta_event_difference"),
        ("clearing_settlement_amount", "clearing_event_difference"),
    ):
        close(field_value(fixture, diff_id), dec(field_value(fixture, source_id)) - event_amount, "0.01", f"{fixture['fixtureId']} {diff_id}")
        close(field_value(fixture, diff_id), "0.00", "0.01", f"{fixture['fixtureId']} zero {diff_id}")
    close(remaining, "0.00", "0.01", f"{fixture['fixtureId']} remaining zero")
    if field_value(fixture, "final_settlement_state") != "SUBSTITUTION_SETTLEMENT_RECONCILED_NORMAL_CLOSE":
        raise AssertionError(f"{fixture['fixtureId']} R4 normal-close state mismatch")
    check_fixture_source_mapping(fixture, "R4")
    check_fixture_metadata(fixture)
    print(f"DECIMAL PASS {fixture['fixtureId']}: gross={gross} cost={actual_cost} signed={signed} direction={direction} final={final_amount} estimateAdjustment={adjustment} remaining=0 multiSourceDiff=0")


def check_snapshot(snapshot: dict[str, Any]) -> None:
    fixtures = snapshot.get("fixtures", [])
    if len(fixtures) != 8:
        raise AssertionError("snapshot must contain eight independent fixtures")
    by_id = {fixture["fixtureId"]: fixture for fixture in fixtures}
    if set(by_id) != set().union(*EXPECTED_FIXTURES.values()):
        raise AssertionError("snapshot fixture IDs are incomplete")
    seen_versions: set[str] = set()
    seen_keys: set[str] = set()
    for fixture in fixtures:
        if fixture["caseVersion"] in seen_versions:
            raise AssertionError("Demo A and Comprehensive B case versions are not independent")
        seen_versions.add(fixture["caseVersion"])
        for key in fixture["objectKeys"].values():
            if key in seen_keys:
                raise AssertionError(f"fixture object key reused across independent packages: {key}")
            seen_keys.add(key)
        if fixture["routeId"] == EXPECTED_ROUTE_IDS["R1"]:
            check_r1_fixture(fixture)
        elif fixture["routeId"] == EXPECTED_ROUTE_IDS["R2"]:
            check_r2_fixture(fixture)
        elif fixture["routeId"] == EXPECTED_ROUTE_IDS["R3"]:
            check_r3_fixture(fixture)
        elif fixture["routeId"] == EXPECTED_ROUTE_IDS["R4"]:
            check_r4_fixture(fixture)
        else:
            raise AssertionError(f"unknown fixture route: {fixture['routeId']}")
    print("FIXTURE PASS: eight independent Demo A/Comprehensive B packages with Decimal-only chains")


def check_evidence(label: str, evidence: dict[str, Any], route: dict[str, Any], rubric: dict[str, Any], rubric_ids: set[str]) -> None:
    if evidence["routeId"] != route["routeId"] or evidence.get("routeCode") != {"R1": "ETF-01", "R2": "ETF-02", "R3": "ETF-03", "R4": "ETF-04"}[label]:
        raise AssertionError(f"{label} evidence route identity mismatch")
    comp = route["steps"]["COMPREHENSIVE_PRACTICE"]
    comp_items = {item["workItemId"]: item for item in comp["workItems"]}
    atomic = {item["workItemId"]: item for item in evidence.get("atomicWorkItems", [])}
    if set(atomic) != set(comp_items):
        raise AssertionError(f"{label} atomic evidence/workItem inventory mismatch")
    material_ids = {material["materialId"] for material in comp["sourceMaterials"]}
    target_ids = {target["targetId"] for target in rubric["remediationTargets"]}
    for work_item_id, item in atomic.items():
        public_item = comp_items[work_item_id]
        if item["responseKind"] != public_item["response"]["kind"]:
            raise AssertionError(f"{label} response kind mismatch: {work_item_id}")
        if not item.get("sourceMaterialIds") or not set(item["sourceMaterialIds"]).issubset(material_ids):
            raise AssertionError(f"{label} source mapping missing: {work_item_id}")
        if not item.get("scoreTargets") or not set(item["scoreTargets"]).issubset(rubric_ids):
            raise AssertionError(f"{label} score mapping missing: {work_item_id}")
        if item.get("remediationTargetId") not in target_ids:
            raise AssertionError(f"{label} remediation mapping missing: {work_item_id}")
        if item["responseKind"] == "NUMBER":
            if not all(key in item for key in ("unit", "precision", "tolerance")):
                raise AssertionError(f"{label} numeric evidence lacks unit/precision/tolerance: {work_item_id}")
            if item.get("unit") in {"篮", "份", "股", "份/篮", "股/篮"} and (item["precision"] != 0 or dec(item["tolerance"]) != Decimal("0")):
                raise AssertionError(f"{label} integer numeric evidence must use precision 0/tolerance 0: {work_item_id}")
    coverage = evidence.get("coverage", {})
    for item_type in EXPECTED_TYPES:
        if not coverage.get(item_type):
            raise AssertionError(f"{label} coverage missing {item_type}")
    if set(evidence.get("answerChains", {})) != {"demonstrationA", "comprehensiveB"}:
        raise AssertionError(f"{label} answerChains must contain Demo A and Comprehensive B")
    for chain_name, chain in evidence["answerChains"].items():
        if not chain.get("fixtureId") or not chain.get("sourceToField") or not (chain.get("decimalSteps") or chain.get("decimalChain")) or not chain.get("reconciliation"):
            raise AssertionError(f"{label} {chain_name} answer chain is incomplete")
    expected_demo = {"R1": "ETF01-FIXTURE-DEMO-A", "R2": "ETF02-FIXTURE-DEMO-A", "R3": "ETF03-FIXTURE-DEMO-A", "R4": "ETF04-FIXTURE-DEMO-A"}[label]
    expected_comp = {"R1": "ETF01-FIXTURE-COMP-B", "R2": "ETF02-FIXTURE-COMP-B", "R3": "ETF03-FIXTURE-COMP-B", "R4": "ETF04-FIXTURE-COMP-B"}[label]
    if evidence["answerChains"]["demonstrationA"]["fixtureId"] != expected_demo or evidence["answerChains"]["comprehensiveB"]["fixtureId"] != expected_comp:
        raise AssertionError(f"{label} answer chain fixture mapping is not independent")
    dependency = evidence["dependencyPolicy"]
    expected_dep = {"R1": [], "R2": [EXPECTED_ROUTE_IDS["R1"]], "R3": [EXPECTED_ROUTE_IDS["R2"]], "R4": [EXPECTED_ROUTE_IDS["R3"]]}[label]
    if dependency.get("hardPrerequisiteNodeIds") != ["ACC-NODE-DAILY-003"] or dependency.get("dependsOnRouteIds") != expected_dep or dependency.get("serialOrder") != {"R1": 1, "R2": 2, "R3": 3, "R4": 4}[label] or dependency.get("stageGate") is not False:
        raise AssertionError(f"{label} serial dependency or stage gate is invalid")
    if dependency.get("releaseRegistration") not in ALLOWED_RELEASE_REGISTRATIONS or dependency.get("status") != "PUBLISHED":
        raise AssertionError(f"{label} evidence release registration is invalid")
    expected_planned = {"R1": ["ACC-NODE-DAILY-003", "ACC-NODE-STOCK-TRADE-001"], "R2": ["ACC-NODE-ETF-OBJECT-001"], "R3": [], "R4": []}[label]
    if dependency.get("plannedMapPrerequisites") != expected_planned:
        raise AssertionError(f"{label} planned map prerequisite boundary is invalid")
    if not evidence.get("materialAnchors") or not evidence.get("mappingClaims") or not evidence.get("fixturePolicy"):
        raise AssertionError(f"{label} evidence lacks anchors, mapping claims or fixture policy")
    exclusion_text = " ".join(strings(evidence.get("exclusionBoundary", {})))
    for token in ("BUILDING_DEFER", "ONLY_THIS_CASE"):
        if token not in exclusion_text and token not in " ".join(strings(evidence)):
            raise AssertionError(f"{label} evidence boundary lacks {token}")
    print(f"ATOMIC EVIDENCE PASS {label}: {len(atomic)} workItems have full source, score, remediation and answer mapping")


def check_r2_premium_bridge_gate(route: dict[str, Any], rubric: dict[str, Any], evidence: dict[str, Any]) -> None:
    required_ids = {
        "etf02-b-substitution-premium-prepayment",
        "etf02-b-initial-consideration-bridge",
        "etf02-b-unsettled-substitution-prepayment",
    }
    work_ids = {item["workItemId"] for item in route["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]}
    if not required_ids.issubset(work_ids):
        raise AssertionError("R2 premium bridge workItems are incomplete")
    expected_responses = {
        "etf02-b-substitution-premium-prepayment": "504.00",
        "etf02-b-initial-consideration-bridge": "23960.78",
        "etf02-b-unsettled-substitution-prepayment": "504.00",
        "etf02-b-consideration-recon": "ETF02_B_INITIAL_CONSIDERATION_RECONCILED_PENDING_SUBSTITUTION_SETTLEMENT",
    }
    responses = rubric["referenceAnswer"]["responses"]
    if any(responses.get(field_id) != expected for field_id, expected in expected_responses.items()):
        raise AssertionError("R2 referenceAnswer does not close the premium/initial consideration/pending bridge")
    atomic = {item["workItemId"]: item for item in evidence["atomicWorkItems"]}
    for field_id, expected in expected_responses.items():
        if atomic.get(field_id, {}).get("fixtureValue") != expected:
            raise AssertionError(f"R2 evidence premium bridge fixtureValue mismatch: {field_id}")
    all_rules = rubric_rules(rubric)
    for field_id in required_ids:
        if not any(rule["fieldId"] == field_id for rule in all_rules):
            raise AssertionError(f"R2 premium bridge field has no deterministic rubric rule: {field_id}")
    nav_mandatory = next(requirement for requirement in rubric["mandatoryRequirements"] if requirement["requirementId"] == "M-ETF02-NAV-DIFF")
    nav_fields = {rule["fieldId"] for rule in nav_mandatory["evidenceRules"]}
    if not required_ids.issubset(nav_fields):
        raise AssertionError("R2 mandatory NAV/difference requirement does not cover the full premium bridge")
    conclusion = responses.get("etf02-b-conclusion", "")
    for token in ("504.00", "23960.78", "INITIAL_CONSIDERATION_RECONCILED_PENDING_SUBSTITUTION_SETTLEMENT"):
        if token not in conclusion:
            raise AssertionError(f"R2 short conclusion omits premium bridge token: {token}")
    print("R2 PREMIUM BRIDGE PASS: premium prepayment, NAV-to-initial consideration bridge and unsettled substitution prepayment are mandatory and closed")


def check_r2_settlement_semantics(
    route: dict[str, Any],
    rubric: dict[str, Any],
    evidence: dict[str, Any],
    snapshot: dict[str, Any],
    fields: dict[str, Any],
    states: dict[str, Any],
    deid: dict[str, Any],
) -> None:
    """Keep the learner-facing R2 wording neutral until future settlement evidence exists."""
    learner_text = "\n".join(strings(route.get("steps", {}))).casefold()
    for token in PREMATURE_SETTLEMENT_DIRECTION_TOKENS:
        if token.casefold() in learner_text:
            raise AssertionError(f"R2 learner-facing content prematurely names substitution settlement direction: {token}")

    boundary_text = " ".join(
        strings(evidence.get("exclusionBoundary", {}))
        + strings(deid.get("versionedCaseRules", []))
        + strings(deid.get("safeNormalBoundary", []))
    )
    for token in ("补券成本", "费用", "可退、应退或应补"):
        if token not in boundary_text:
            raise AssertionError(f"R2 settlement boundary must defer direction until cost/fee evidence: {token}")

    synchronized = json.dumps(
        {"route": route, "rubric": rubric, "evidence": evidence, "snapshot": snapshot, "fields": fields, "states": states},
        ensure_ascii=False,
    )
    for stale in (
        "pendingReturnablePremium",
        "pending_returnable_premium",
        "etf02-b-pending-returnable-premium",
        "INITIAL_CONSIDERATION_RECONCILED_WITH_PENDING_RETURNABLE",
        "ETF02_B_INITIAL_RECONCILED_WITH_PENDING_RETURNABLE",
    ):
        if stale in synchronized:
            raise AssertionError(f"R2 settlement semantic rename is incomplete: {stale}")
    for required in (
        "unsettledSubstitutionPrepayment",
        "unsettled_substitution_prepayment",
        "INITIAL_CONSIDERATION_RECONCILED_PENDING_SUBSTITUTION_SETTLEMENT",
    ):
        if required not in synchronized:
            raise AssertionError(f"R2 settlement semantic marker is missing: {required}")
    print("R2 SETTLEMENT SEMANTICS PASS: learner wording is neutral; future refund/additional-payment direction is deferred to cost/fee evidence")


def answer_chain_source_groups(chain: dict[str, Any]) -> list[str | None]:
    return [item.get("sourceGroupId") or ANSWER_CHAIN_MATERIAL_TO_SOURCE_GROUP.get(item.get("sourceMaterialId")) for item in chain.get("sourceToField", [])]


def check_r3_three_leg_gate(route: dict[str, Any], rubric: dict[str, Any], evidence: dict[str, Any]) -> None:
    responses = rubric["referenceAnswer"]["responses"]
    expected = {
        "etf03-b-expected-security-quantity": "3600", "etf03-b-expected-cash-substitution": "47052.00",
        "etf03-b-expected-cash-difference": "-1269.66", "etf03-b-expected-cash-total": "45782.34",
        "etf03-b-securities-leg-diff": "0", "etf03-b-cash-substitution-diff": "0.00",
        "etf03-b-cash-difference-diff": "0.00", "etf03-b-cash-total-diff": "0.00",
        "etf03-b-state-chain": "ETF03_B_STATE_CHAIN_COMPLETE",
        "etf03-b-ta-clearing-ledger-recon": "ETF03_B_TA_CLEARING_LEDGER_ZERO",
    }
    if any(responses.get(field_id) != value for field_id, value in expected.items()):
        raise AssertionError("R3 referenceAnswer does not close the ordered three-leg settlement chain")
    for chain_name, chain in evidence["answerChains"].items():
        mapped_groups = answer_chain_source_groups(chain)
        if set(mapped_groups) != EXPECTED_FIXTURE_SOURCE_GROUPS["R3"] or len(mapped_groups) != len(EXPECTED_FIXTURE_SOURCE_GROUPS["R3"]):
            raise AssertionError(f"R3 {chain_name} answer chain does not independently map instruction through ledger sources")
    mandatory = {item["requirementId"]: {rule["fieldId"] for rule in item["evidenceRules"]} for item in rubric["mandatoryRequirements"]}
    if not {"etf03-b-state-chain", "etf03-b-instruction-source", "etf03-b-pcf-source", "etf03-b-confirmation-source", "etf03-b-securities-source"}.issubset(mandatory.get("M-ETF03-STATE-SOURCE", set())):
        raise AssertionError("R3 state-source mandatory does not prevent jumping steps")
    if not {"etf03-b-securities-leg-diff", "etf03-b-cash-substitution-diff", "etf03-b-cash-difference-diff", "etf03-b-cash-total-diff", "etf03-b-ta-clearing-ledger-recon"}.issubset(mandatory.get("M-ETF03-THREE-LEG-ZERO", set())):
        raise AssertionError("R3 three-leg mandatory is incomplete")
    conclusion = responses["etf03-b-conclusion"]
    for token in ("指令", "PCF", "确认", "证券", "现金替代47052.00", "单位现金差额-1269.66", "TA/清算/台账6000份", "PRIMARY_SETTLEMENT_RECONCILED_PENDING_SUBSTITUTION_SETTLEMENT"):
        if token not in conclusion:
            raise AssertionError(f"R3 short conclusion omits settlement-chain token: {token}")
    if "STAGE_GATE" in json.dumps({"route": route, "evidence": evidence}, ensure_ascii=False):
        raise AssertionError("R3 unexpectedly contains a stage gate")
    print("R3 THREE-LEG PASS: ordered state sources, securities/cash-substitution/cash-difference legs and TA/clearing/ledger all close to zero")


def check_r4_direction_order(route: dict[str, Any]) -> None:
    demo_steps = route["steps"]["DEMONSTRATION"]["steps"]
    ordered = sorted(demo_steps, key=lambda step: step["order"])
    if len(ordered) < 4 or "实际总成本" not in ordered[2]["action"] or "费用" not in ordered[2]["action"]:
        raise AssertionError("R4 demonstration does not establish actual cost plus fee before direction")
    premature_tokens = ("可退", "应退", "待退补", "应补")
    before_cost = "\n".join(f"{step['action']} {step['reason']}" for step in ordered if step["order"] < 3)
    if any(token in before_cost for token in premature_tokens):
        raise AssertionError("R4 demonstration names settlement direction before actual cost and fee are formed")
    after_cost = "\n".join(f"{step['action']} {step['reason']}" for step in ordered if step["order"] >= 4)
    if not any(token in after_cost for token in ("RETURN_TO_AP", "退回", "应补", "无需额外现金")):
        raise AssertionError("R4 demonstration does not name the final direction after actual cost")


def check_r4_close_gate(route: dict[str, Any], rubric: dict[str, Any], evidence: dict[str, Any]) -> None:
    check_r4_direction_order(route)
    route_text = "\n".join(strings(route))
    for token in ("NON_FINAL_ESTIMATE_ONLY", "实际补券", "费用", "实际总成本", "最终结算方向", "remaining", "估值", "TA", "清算", "SUBSTITUTION_SETTLEMENT_RECONCILED_NORMAL_CLOSE"):
        if token not in route_text:
            raise AssertionError(f"R4 close axis missing: {token}")
    responses = rubric["referenceAnswer"]["responses"]
    expected = {
        "etf04-b-buyin-gross": "42300.00", "etf04-b-actual-cost": "42471.00",
        "etf04-b-signed-settlement": "2187.00", "etf04-b-final-settlement-amount": "2187.00",
        "etf04-b-estimate-adjustment": "594.00", "etf04-b-event-remaining": "0.00",
        "etf04-b-ledger-remaining": "0.00", "etf04-b-final-direction": "ETF04_B_RETURN_TO_AP",
        "etf04-b-event-ledger-diff": "0.00", "etf04-b-valuation-event-diff": "0.00",
        "etf04-b-ta-event-diff": "0.00", "etf04-b-clearing-event-diff": "0.00",
        "etf04-b-normal-close-state": "ETF04_B_NORMAL_CLOSE",
    }
    if any(responses.get(field_id) != value for field_id, value in expected.items()):
        raise AssertionError("R4 referenceAnswer does not close candidate B Decimal chain")
    chains = evidence["answerChains"]
    for chain_name, chain in chains.items():
        mapped_groups = answer_chain_source_groups(chain)
        if set(mapped_groups) != EXPECTED_FIXTURE_SOURCE_GROUPS["R4"] or len(mapped_groups) != len(EXPECTED_FIXTURE_SOURCE_GROUPS["R4"]):
            raise AssertionError(f"R4 {chain_name} answer chain does not independently map upstream through multisource close")
    chain_text = json.dumps(chains, ensure_ascii=False)
    for token in ("25704.00", "24696.00", "1008.00", "864.00", "144.00", "44658.00", "42471.00", "2187.00", "1593.00", "594.00"):
        if token not in chain_text:
            raise AssertionError(f"R4 Demo A/Comp B chain omits approved Decimal token: {token}")
    mandatory = {item["requirementId"]: {rule["fieldId"] for rule in item["evidenceRules"]} for item in rubric["mandatoryRequirements"]}
    if not {"etf04-b-actual-cost", "etf04-b-final-settlement-amount", "etf04-b-final-direction", "etf04-b-event-remaining", "etf04-b-ledger-remaining"}.issubset(mandatory.get("M-ETF04-REMAINING-ZERO", set())):
        raise AssertionError("R4 remaining=0 mandatory is incomplete")
    if not {"etf04-b-event-ledger-diff", "etf04-b-valuation-event-diff", "etf04-b-ta-event-diff", "etf04-b-clearing-event-diff", "etf04-b-normal-close-state"}.issubset(mandatory.get("M-ETF04-MULTISOURCE-ZERO", set())):
        raise AssertionError("R4 multi-source zero mandatory is incomplete")
    conclusion = responses["etf04-b-conclusion"]
    for token in ("实际补券42300.00", "费用171.00", "总成本42471.00", "RETURN_TO_AP", "最终结算2187.00", "估计调整594.00", "remaining均为0.00", "事件/台账/估值/TA/清算零差"):
        if token not in conclusion:
            raise AssertionError(f"R4 short conclusion omits close token: {token}")
    if "正式科目" not in route_text or "不冻结" not in route_text:
        raise AssertionError("R4 does not preserve the non-frozen account/debit-credit boundary")
    print("R4 CLOSE PASS: actual cost precedes direction; A/B settlement, remaining=0 and five-source zero-difference chains are closed")


def check_route_evidence_consistency(routes: dict[str, dict[str, Any]], rubrics: dict[str, dict[str, Any]], evidence: dict[str, dict[str, Any]]) -> None:
    for label in routes:
        route_text = "\n".join(strings(routes[label]))
        if label == "R1" and "二级交易不改变基金发行份额" not in route_text:
            raise AssertionError("R1 explicit secondary invariant is absent")
        if label == "R2" and "ONLY_THIS_CASE" in route_text:
            raise AssertionError("R2 must not expose evidence-only provenance marker")
        rubric_ids = {criterion["criterionId"] for dimension in rubrics[label]["dimensions"] for criterion in dimension["criteria"]}
        rubric_ids.update(requirement["requirementId"] for requirement in rubrics[label]["mandatoryRequirements"])
        if label == "R2":
            check_r2_premium_bridge_gate(routes[label], rubrics[label], evidence[label])
        elif label == "R3":
            check_r3_three_leg_gate(routes[label], rubrics[label], evidence[label])
        elif label == "R4":
            check_r4_close_gate(routes[label], rubrics[label], evidence[label])
        check_evidence(label, evidence[label], routes[label], rubrics[label], rubric_ids)
    print("EVIDENCE CONSISTENCY PASS: route, rubric and evidence IDs/axes/serial dependencies are closed")


def check_reference_release() -> None:
    release = read_json(RELEASE)
    legacy_release = read_json(LEGACY_RELEASE)
    if release.get("releaseId") != ACTIVE_RELEASE_ID or len(release.get("routes", [])) != 59:
        raise AssertionError(f"active release must be {ACTIVE_RELEASE_ID} with 59 routes")
    released_route_ids = {route["routeId"] for route in release["routes"]}
    if not set(EXPECTED_ROUTE_IDS.values()).issubset(released_route_ids):
        raise AssertionError("ETF R1-R4 routes must all be registered in the active release")
    if legacy_release.get("releaseId") != LEGACY_RELEASE_ID or len(legacy_release.get("routes", [])) != 48:
        raise AssertionError(f"legacy snapshot must be {LEGACY_RELEASE_ID} with 48 routes")
    legacy_route_ids = {route["routeId"] for route in legacy_release["routes"]}
    if not set(EXPECTED_ROUTE_IDS.values()).issubset(legacy_route_ids):
        raise AssertionError("ETF R1-R4 routes must remain present in the legacy snapshot")
    map_data = read_json(REPO / "content/maps/custody-learning-map.json")
    accounting = next(line for line in map_data["lines"] if line["line"] == "ACCOUNTING")
    modules = accounting["regions"][0]["modules"]
    etf = next((module for module in modules if module["moduleId"] == "ACC-MODULE-ETF"), None)
    if etf is None or [node["routeId"] for node in etf["nodes"]] != list(EXPECTED_ROUTE_IDS.values()):
        raise AssertionError("ETF map module does not contain the four serial routes")
    expected_prerequisites = [
        ["ACC-NODE-DAILY-003", "ACC-NODE-STOCK-TRADE-001"],
        ["ACC-NODE-ETF-OBJECT-001"],
        ["ACC-NODE-ETF-PCF-002"],
        ["ACC-NODE-ETF-SETTLEMENT-003"],
    ]
    if [node["prerequisiteNodeIds"] for node in etf["nodes"]] != expected_prerequisites:
        raise AssertionError("ETF map prerequisite chain is invalid")
    if map_data.get("version") != ACTIVE_MAP_VERSION or release.get("map", {}).get("version") != ACTIVE_MAP_VERSION:
        raise AssertionError(f"active ETF map and release versions must both be {ACTIVE_MAP_VERSION}")
    if release.get("map", {}).get("path") != "maps/custody-learning-map.json":
        raise AssertionError("active release must point to the custody learning map")
    print(f"RELEASE PASS: {ACTIVE_RELEASE_ID} publishes 59 routes including four serial REQUIRED ETF routes; legacy {LEGACY_RELEASE_ID} retained")


def check_no_sensitive_content(values: dict[str, Any]) -> None:
    for label, value in values.items():
        for text in strings(value):
            for pattern in PUBLIC_FORBIDDEN:
                if pattern.search(text):
                    raise AssertionError(f"{label} contains sensitive pattern: {text}")
    print("SENSITIVE PASS: no URLs, emails, local absolute paths or credential blocks in ETF B0-B2 JSON")


def check_active_normal_boundary(routes: dict[str, dict[str, Any]], route_evidence: dict[str, dict[str, Any]]) -> None:
    excluded_active_tokens = ("ADVANCED", "STAGE_GATE", "异常", "迟到", "缺失", "冲突", "错配", "重跑", "回滚", "重估", "重披露")
    for label, route in routes.items():
        learner_text = "\n".join(strings(route.get("steps", {})))
        for token in excluded_active_tokens:
            if token in learner_text:
                raise AssertionError(f"{label} active learner content contains abnormal/advanced token: {token}")
        active_evidence = {key: route_evidence[label].get(key) for key in ("materialAnchors", "mappingClaims", "answerChains", "atomicWorkItems", "coverage")}
        evidence_text = json.dumps(active_evidence, ensure_ascii=False)
        for token in ("ADVANCED", "STAGE_GATE"):
            if token in evidence_text:
                raise AssertionError(f"{label} active evidence contains advanced/gate token: {token}")
        if route_evidence[label].get("dependencyPolicy", {}).get("stageGate") is not False:
            raise AssertionError(f"{label} evidence dependency unexpectedly defines a stage gate")
    print("NORMAL BOUNDARY PASS: R1-R4 learner/evidence content contains no abnormal scenario, ADVANCED topic or stage gate")


def main() -> int:
    routes = {label: read_json(path) for label, path in ROUTES.items()}
    rubrics = {label: read_json(path) for label, path in RUBRICS.items()}
    work_ids: dict[str, set[str]] = {}
    question_ids: dict[str, set[str]] = {}
    rubric_ids: dict[str, set[str]] = {}
    for label in routes:
        schema_check(routes[label], ROUTE_SCHEMA, f"{label} route")
        schema_check(rubrics[label], RUBRIC_SCHEMA, f"{label} rubric")
        work_ids[label], question_ids[label] = check_route_shape(label, routes[label])
        rubric_ids[label] = check_rubric_shape(label, routes[label], rubrics[label], work_ids[label], question_ids[label])
        check_public_safety(label, routes[label], rubrics[label])
    check_cognitive_axes(routes)

    audit = read_json(EVIDENCE["audit"])
    fields = read_json(EVIDENCE["fields"])
    states = read_json(EVIDENCE["states"])
    deid = read_json(EVIDENCE["deid"])
    snapshot = read_json(EVIDENCE["snapshot"])
    route_evidence = {label: read_json(EVIDENCE[label]) for label in routes}
    check_b0_assets(audit, fields, states, deid, snapshot)
    check_snapshot(snapshot)
    check_r2_settlement_semantics(routes["R2"], rubrics["R2"], route_evidence["R2"], snapshot, fields, states, deid)
    check_active_normal_boundary(routes, route_evidence)
    check_route_evidence_consistency(routes, rubrics, route_evidence)
    check_no_sensitive_content({"audit": audit, "fields": fields, "states": states, "snapshot": snapshot, **route_evidence})
    check_reference_release()
    print(f"ETF validation passed: R1-R4 routes/rubrics/evidence, eleven source hashes, eight Decimal fixtures and {ACTIVE_RELEASE_ID} registration are complete")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, InvalidOperation, ValueError, KeyError, TypeError) as error:
        print(f"ETF VALIDATION FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
