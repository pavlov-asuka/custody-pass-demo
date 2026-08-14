"""Independent validation for the FOF B0-B3 content batch.

This validator intentionally does not register a map, release, source catalog,
or common contract. It validates only the five approved routes, their private
rubrics, the FOF evidence assets, and ten independent Decimal fixtures.
"""

from __future__ import annotations

import json
import re
import sys
from decimal import Decimal, InvalidOperation, getcontext
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


getcontext().prec = 40

REPO = Path(__file__).resolve().parents[1]
ROUTE_SCHEMA = json.loads((REPO / "contracts/schemas/route.schema.json").read_text(encoding="utf-8"))
RUBRIC_SCHEMA = json.loads((REPO / "contracts/schemas/rubric.schema.json").read_text(encoding="utf-8"))
EVIDENCE_DIR = REPO / "content/evidence/accounting/fof"
ROUTES = {
    "FOF01": REPO / "content/routes/accounting/ACC-FOF-BOUNDARY-001.json",
    "FOF02": REPO / "content/routes/accounting/ACC-FOF-SUBSCRIPTION-002.json",
    "FOF03": REPO / "content/routes/accounting/ACC-FOF-VALUATION-003.json",
    "FOF04": REPO / "content/routes/accounting/ACC-FOF-RETURN-004.json",
    "FOF05": REPO / "content/routes/accounting/ACC-FOF-REDEMPTION-005.json",
}
RUBRICS = {
    "FOF01": REPO / "content/rubrics/accounting/ACC-FOF-BOUNDARY-001.json",
    "FOF02": REPO / "content/rubrics/accounting/ACC-FOF-SUBSCRIPTION-002.json",
    "FOF03": REPO / "content/rubrics/accounting/ACC-FOF-VALUATION-003.json",
    "FOF04": REPO / "content/rubrics/accounting/ACC-FOF-RETURN-004.json",
    "FOF05": REPO / "content/rubrics/accounting/ACC-FOF-REDEMPTION-005.json",
}
EVIDENCE = {
    "snapshot": EVIDENCE_DIR / "shared-normal-snapshot.json",
    "fields": EVIDENCE_DIR / "field-dictionary.json",
    "states": EVIDENCE_DIR / "source-state-matrix.json",
    "deid": EVIDENCE_DIR / "deidentification-boundary.json",
    "audit": EVIDENCE_DIR / "material-audit.json",
    "FOF01": EVIDENCE_DIR / "r1-boundary-evidence.json",
    "FOF02": EVIDENCE_DIR / "r2-subscription-evidence.json",
    "FOF03": EVIDENCE_DIR / "r3-valuation-evidence.json",
    "FOF04": EVIDENCE_DIR / "r4-return-evidence.json",
    "FOF05": EVIDENCE_DIR / "r5-redemption-evidence.json",
}
EXPECTED_TYPES = {"FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION", "SHORT_TEXT"}
PUBLIC_FORBIDDEN_PATTERNS = [
    re.compile(r"https?://", re.IGNORECASE),
    re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
    re.compile(r"(?:password|cookie|secret|token)", re.IGNORECASE),
    re.compile(r"(?:[A-Za-z]:\\|\\\\)"),
    re.compile(r"内网路径|真实基金|真实账户|真实客户|真实员工"),
]
ROUTE_FORBIDDEN_TOPICS = [
    "互认基金",
    "非FOF",
    "转换/转托管",
    "迟到重复错配",
    "人工凭证",
    "重跑",
    "回滚",
    "重估",
    "重披露",
    "强制关闭",
    "T+0",
    "互认",
    "跨境",
    "停牌",
    "无报价",
    "历史费率",
    "税费",
]


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise AssertionError(f"missing JSON: {path}")
    return json.loads(path.read_text(encoding="utf-8-sig"))


def dec(value: Any) -> Decimal:
    if isinstance(value, bool):
        raise InvalidOperation("boolean is not numeric")
    return Decimal(str(value).replace(",", "").strip())


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


def strings(value: Any, key: str = "") -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for child_key, child_value in value.items():
            found.extend(strings(child_value, child_key))
    elif isinstance(value, list):
        for child_value in value:
            found.extend(strings(child_value, key))
    elif isinstance(value, str):
        found.append((key, value))
    return found


def check_public_safety(label: str, route: dict[str, Any], rubric: dict[str, Any]) -> None:
    for source_label, value in ((f"{label} route", route), (f"{label} rubric", rubric)):
        for key, text in strings(value):
            for pattern in PUBLIC_FORBIDDEN_PATTERNS:
                if pattern.search(text):
                    raise AssertionError(f"{source_label} contains sensitive pattern in {key}: {text}")
    route_text = "\n".join(text for _, text in strings(route))
    for topic in ROUTE_FORBIDDEN_TOPICS:
        if topic in route_text:
            raise AssertionError(f"{label} route contains a deferred topic: {topic}")
    print(f"SAFETY PASS {label}: no public sensitive pattern or deferred topic")


def check_route_shape(label: str, route: dict[str, Any]) -> tuple[set[str], set[str], dict[str, str]]:
    if route["line"] != "ACCOUNTING":
        raise AssertionError(f"{label} must stay on ACCOUNTING")
    cards = route["steps"]["KNOWLEDGE_CARD"]["cards"]
    demo = route["steps"]["DEMONSTRATION"]["steps"]
    basics = route["steps"]["BASIC_PRACTICE"]["questions"]
    comp = route["steps"]["COMPREHENSIVE_PRACTICE"]
    work_items = comp["workItems"]
    if len(cards) != 3:
        raise AssertionError(f"{label} requires exactly 3 knowledge cards")
    if len(demo) != 5 or [step["order"] for step in demo] != [1, 2, 3, 4, 5]:
        raise AssertionError(f"{label} demonstration must be exactly ordered steps 1-5")
    if len(basics) != 5:
        raise AssertionError(f"{label} requires exactly 5 basic questions")
    if {question["type"] for question in basics} != EXPECTED_TYPES:
        raise AssertionError(f"{label} basic questions do not cover all five structured types")
    count_bounds = {"FOF01": (10, 12), "FOF02": (12, 15), "FOF03": (12, 15), "FOF04": (15, 20), "FOF05": (18, 28)}
    minimum, maximum = count_bounds[label]
    if not minimum <= len(work_items) <= maximum:
        raise AssertionError(f"{label} workItems must be between {minimum} and {maximum}, got {len(work_items)}")
    if not EXPECTED_TYPES.issubset({item["type"] for item in work_items}):
        raise AssertionError(f"{label} comprehensive workItems must cover all five structured types")
    if len({question["questionId"] for question in basics}) != 5:
        raise AssertionError(f"{label} basic question IDs are not unique")
    if len({item["workItemId"] for item in work_items}) != len(work_items):
        raise AssertionError(f"{label} workItem IDs are not unique")
    for question in basics:
        shape = {
            "FIELD_MAP": "fieldMappings",
            "CALCULATION": "calculation",
            "LEDGER_ENTRY": "ledgerEntries",
            "RECONCILIATION": "reconciliation",
            "SHORT_TEXT": "textInput",
        }.get(question["type"])
        if shape not in question:
            raise AssertionError(f"{label} {question['questionId']} missing {shape}")
    if len(comp["sourceMaterials"]) < 2:
        raise AssertionError(f"{label} comprehensive practice needs at least two source materials")
    if len({material["materialId"] for material in comp["sourceMaterials"]}) != len(comp["sourceMaterials"]):
        raise AssertionError(f"{label} source material IDs are not unique")
    if len({material["kind"] for material in comp["sourceMaterials"]}) < 2:
        raise AssertionError(f"{label} source materials need heterogeneous evidence kinds")
    work_item_ids = {item["workItemId"] for item in work_items}
    question_ids = {question["questionId"] for question in basics}
    short_text_items = [item for item in work_items if item["type"] == "SHORT_TEXT"]
    if len(short_text_items) > 1:
        raise AssertionError(f"{label} may have at most one SHORT_TEXT workItem")
    for item in work_items:
        response = item["response"]
        if response["kind"] == "NUMBER":
            if "unit" not in response or "precision" not in response:
                raise AssertionError(f"{label} numeric work item lacks unit/precision: {item['workItemId']}")
        if item["type"] == "LEDGER_ENTRY" and response["kind"] == "TEXT":
            field_mentions = re.findall(r"金额|资金|份额|状态|母基金|被投基金|指令|到账|差额", item["instruction"])
            if len(set(field_mentions)) >= 3:
                raise AssertionError(f"{label} LEDGER_ENTRY TEXT bundles too many business fields: {item['workItemId']}")
    type_counts = {item_type: sum(item["type"] == item_type for item in work_items) for item_type in sorted(EXPECTED_TYPES)}
    print(f"ROUTE SHAPE PASS {label}: 3 cards, 5 demo steps, 5 heterogeneous basics, {len(work_items)} atomic workItems {type_counts}, {len(comp['sourceMaterials'])} materials")
    return work_item_ids, question_ids, type_counts


def check_rubric_shape(label: str, rubric: dict[str, Any], work_item_ids: set[str], question_ids: set[str], route: dict[str, Any]) -> None:
    expected_dimensions = {"CONCEPT": 25, "PROCESS": 30, "RISK": 25, "EXPRESSION": 20}
    actual_dimensions = {dimension["dimension"]: dimension["maxScore"] for dimension in rubric["dimensions"]}
    if actual_dimensions != expected_dimensions:
        raise AssertionError(f"{label} rubric dimensions mismatch: {actual_dimensions}")
    target_ids = {target["targetId"] for target in rubric["remediationTargets"]}
    if len(rubric["mandatoryRequirements"]) != 2:
        raise AssertionError(f"{label} must have exactly two hard requirements")
    referenced_fields: set[str] = set()
    numeric_rule_fields: set[str] = set()
    for dimension in rubric["dimensions"]:
        if sum(criteria["weight"] for criteria in dimension["criteria"]) != dimension["maxScore"]:
            raise AssertionError(f"{label} {dimension['dimension']} weights do not sum to maxScore")
        for criterion in dimension["criteria"]:
            if criterion["remediationTargetId"] not in target_ids:
                raise AssertionError(f"{label} criterion lacks remediation target: {criterion['criterionId']}")
            for rule in criterion["evidenceRules"]:
                if rule["fieldId"] not in work_item_ids:
                    raise AssertionError(f"{label} criterion references non-workItem field: {rule['fieldId']}")
                referenced_fields.add(rule["fieldId"])
                if rule["operator"] == "NUMBER_EQUALS":
                    if "tolerance" not in rule:
                        raise AssertionError(f"{label} numeric rubric rule lacks tolerance: {rule['fieldId']}")
                    numeric_rule_fields.add(rule["fieldId"])
    for mandatory in rubric["mandatoryRequirements"]:
        if mandatory["remediationTargetId"] not in target_ids:
            raise AssertionError(f"{label} mandatory lacks remediation target")
        for rule in mandatory["evidenceRules"]:
            if rule["fieldId"] not in work_item_ids:
                raise AssertionError(f"{label} mandatory references non-workItem field: {rule['fieldId']}")
            referenced_fields.add(rule["fieldId"])
            if rule["operator"] == "NUMBER_EQUALS":
                if "tolerance" not in rule:
                    raise AssertionError(f"{label} numeric mandatory rule lacks tolerance: {rule['fieldId']}")
                numeric_rule_fields.add(rule["fieldId"])
    if referenced_fields != work_item_ids:
        missing = sorted(work_item_ids - referenced_fields)
        extra = sorted(referenced_fields - work_item_ids)
        raise AssertionError(f"{label} Rubric does not cover every atomic workItem; missing={missing} extra={extra}")
    numeric_work_items = {item["workItemId"] for item in route["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"] if item["response"]["kind"] == "NUMBER"}
    if not numeric_work_items.issubset(numeric_rule_fields):
        raise AssertionError(f"{label} numeric workItems lack NUMBER_EQUALS+tolerance rules: {sorted(numeric_work_items - numeric_rule_fields)}")
    for target in rubric["remediationTargets"]:
        if target["questionId"] not in question_ids:
            raise AssertionError(f"{label} remediation target references missing question: {target['questionId']}")
        if target["materialStep"] not in {"KNOWLEDGE_CARD", "DEMONSTRATION"}:
            raise AssertionError(f"{label} remediation step invalid")
        if target["materialItemId"] not in work_item_ids:
            raise AssertionError(f"{label} remediation target is not attached to an atomic workItem: {target['materialItemId']}")
    remediation_items = {target["materialItemId"] for target in rubric["remediationTargets"]}
    if remediation_items != work_item_ids:
        raise AssertionError(f"{label} remediation mapping does not cover every atomic workItem")
    print(f"RUBRIC PASS {label}: fixed dimensions, exactly two hard requirements, every atomic workItem scored and remediable")


def fixture_field(fixture: dict[str, Any], field_id: str) -> str:
    for field in fixture["fields"]:
        if field["fieldId"] == field_id:
            return field["value"]
    raise AssertionError(f"{fixture['fixtureId']} missing field {field_id}")


def check_fixture_math(fixture: dict[str, Any], require_cash: bool) -> None:
    amount = dec(fixture_field(fixture, "ta_confirmed_amount"))
    instruction_amount = dec(fixture_field(fixture, "instruction_amount"))
    manager_amount = dec(fixture_field(fixture, "manager_confirmed_amount"))
    nav = dec(fixture_field(fixture, "subscription_nav"))
    shares = dec(fixture_field(fixture, "confirmed_shares"))
    opening = dec(fixture_field(fixture, "opening_shares"))
    closing = dec(fixture_field(fixture, "closing_shares"))
    close(amount, instruction_amount, "0.01", f"{fixture['fixtureId']} instruction/TA amount")
    close(amount, manager_amount, "0.01", f"{fixture['fixtureId']} manager/TA amount")
    close(amount / nav, shares, "0.01", f"{fixture['fixtureId']} confirmed shares")
    close(opening + shares, closing, "0.01", f"{fixture['fixtureId']} closing shares")
    if require_cash:
        cash = dec(fixture_field(fixture, "cash_received_amount"))
        cash_diff = dec(fixture_field(fixture, "cash_diff"))
        close(amount, cash, "0.01", f"{fixture['fixtureId']} cash receipt")
        close(amount - cash, cash_diff, "0.01", f"{fixture['fixtureId']} cash diff")
    shares_diff = dec(fixture_field(fixture, "shares_diff")) if "shares_diff" in {field["fieldId"] for field in fixture["fields"]} else closing - (opening + shares)
    close(closing - (opening + shares), shares_diff, "0.01", f"{fixture['fixtureId']} shares diff")
    print(f"DECIMAL PASS {fixture['fixtureId']}: amount={amount} nav={nav} shares={shares} closing={closing}")


def check_numeric_fixture_metadata(fixture: dict[str, Any], expected: dict[str, tuple[str, int, str]]) -> None:
    fields = {field["fieldId"]: field for field in fixture["fields"]}
    for field_id, (unit, precision, tolerance) in expected.items():
        if field_id not in fields:
            raise AssertionError(f"{fixture['fixtureId']} missing numeric fixture field {field_id}")
        field = fields[field_id]
        if field.get("unit") != unit or field.get("precision") != precision or field.get("tolerance") != tolerance:
            raise AssertionError(f"{fixture['fixtureId']} numeric metadata mismatch: {field_id}")
        if field.get("provenance") not in {"MATERIAL_ABSTRACTION", "SYNTHETIC_EDUCATIONAL", "CASE_POLICY"}:
            raise AssertionError(f"{fixture['fixtureId']} numeric field lacks provenance: {field_id}")


def check_valuation_fixture(fixture: dict[str, Any]) -> None:
    check_numeric_fixture_metadata(
        fixture,
        {
            "approved_nav": ("元/份", 4, "0.00005"),
            "ta_closing_shares": ("份", 2, "0.01"),
            "internal_closing_shares": ("份", 2, "0.01"),
            "calculated_market_value": ("元", 2, "0.01"),
            "valuation_result": ("元", 2, "0.01"),
            "holding_diff": ("份", 2, "0.01"),
            "valuation_diff": ("元", 2, "0.01"),
        },
    )
    for field_id in ("source_id", "source_version", "valuation_date", "available_at", "fof_fund_key", "underlying_fund_key"):
        if not fixture_field(fixture, field_id).strip():
            raise AssertionError(f"{fixture['fixtureId']} valuation source/object field is empty: {field_id}")
    nav = dec(fixture_field(fixture, "approved_nav"))
    ta_shares = dec(fixture_field(fixture, "ta_closing_shares"))
    internal_shares = dec(fixture_field(fixture, "internal_closing_shares"))
    market_value = dec(fixture_field(fixture, "calculated_market_value"))
    valuation_result = dec(fixture_field(fixture, "valuation_result"))
    holding_diff = dec(fixture_field(fixture, "holding_diff"))
    valuation_diff = dec(fixture_field(fixture, "valuation_diff"))
    close(ta_shares * nav, market_value, "0.01", f"{fixture['fixtureId']} market value")
    close(internal_shares - ta_shares, holding_diff, "0.01", f"{fixture['fixtureId']} holding diff")
    close(market_value - valuation_result, valuation_diff, "0.01", f"{fixture['fixtureId']} valuation diff")
    if fixture_field(fixture, "nav_state") != "NAV_CONFIRMED" or fixture_field(fixture, "holding_state") != "HOLDING_RECONCILED":
        raise AssertionError(f"{fixture['fixtureId']} valuation state boundary is not closed")
    print(f"DECIMAL PASS {fixture['fixtureId']}: approvedNAV={nav} marketValue={market_value} holdingDiff={holding_diff} valuationDiff={valuation_diff}")


def check_return_fixture(fixture: dict[str, Any]) -> None:
    check_numeric_fixture_metadata(
        fixture,
        {
            "approved_return_base": ("元", 2, "0.01"),
            "approved_return_rate": ("比例", 6, "0.000001"),
            "confirmed_return_amount": ("元", 2, "0.01"),
            "actual_return_cash": ("元", 2, "0.01"),
            "return_diff": ("元", 2, "0.01"),
            "confirmed_dividend_amount": ("元", 2, "0.01"),
            "approved_reinvest_nav": ("元/份", 4, "0.00005"),
            "reinvest_shares": ("份", 2, "0.01"),
            "return_opening_shares": ("份", 2, "0.01"),
            "return_closing_shares": ("份", 2, "0.01"),
            "return_shares_diff": ("份", 2, "0.01"),
        },
    )
    for field_id in ("return_event_key", "dividend_event_key", "return_event_state"):
        if not fixture_field(fixture, field_id).strip():
            raise AssertionError(f"{fixture['fixtureId']} return event field is empty: {field_id}")
    base = dec(fixture_field(fixture, "approved_return_base"))
    rate = dec(fixture_field(fixture, "approved_return_rate"))
    confirmed_return = dec(fixture_field(fixture, "confirmed_return_amount"))
    actual_cash = dec(fixture_field(fixture, "actual_return_cash"))
    return_diff = dec(fixture_field(fixture, "return_diff"))
    dividend = dec(fixture_field(fixture, "confirmed_dividend_amount"))
    reinvest_nav = dec(fixture_field(fixture, "approved_reinvest_nav"))
    reinvest_shares = dec(fixture_field(fixture, "reinvest_shares"))
    opening = dec(fixture_field(fixture, "return_opening_shares"))
    closing = dec(fixture_field(fixture, "return_closing_shares"))
    shares_diff = dec(fixture_field(fixture, "return_shares_diff"))
    close(base * rate, confirmed_return, "0.01", f"{fixture['fixtureId']} confirmed return")
    close(confirmed_return - actual_cash, return_diff, "0.01", f"{fixture['fixtureId']} return diff")
    close(dividend / reinvest_nav, reinvest_shares, "0.01", f"{fixture['fixtureId']} reinvest shares")
    close(opening + reinvest_shares, closing, "0.01", f"{fixture['fixtureId']} closing shares")
    close(closing - (opening + reinvest_shares), shares_diff, "0.01", f"{fixture['fixtureId']} shares diff")
    if fixture_field(fixture, "return_event_state") != "RETURN_AND_REINVEST_RECONCILED":
        raise AssertionError(f"{fixture['fixtureId']} return event state is not closed")
    print(f"DECIMAL PASS {fixture['fixtureId']}: return={confirmed_return} returnDiff={return_diff} reinvestShares={reinvest_shares} sharesDiff={shares_diff}")


def check_valuation_fixtures(snapshot: dict[str, Any]) -> None:
    fixtures = {fixture["fixtureId"]: fixture for fixture in snapshot["fixtures"]}
    expected = ("FOF03-FIXTURE-DEMO-A", "FOF03-FIXTURE-COMP-B")
    for fixture_id in expected:
        if fixture_id not in fixtures or fixtures[fixture_id]["routeId"] != "ACC-FOF-VALUATION-003":
            raise AssertionError(f"missing or misowned valuation fixture {fixture_id}")
        check_valuation_fixture(fixtures[fixture_id])
    demo, comp = (fixtures[fixture_id] for fixture_id in expected)
    for field_id in ("source_id", "source_version", "valuation_date", "approved_nav", "ta_closing_shares", "calculated_market_value"):
        if fixture_field(demo, field_id) == fixture_field(comp, field_id):
            raise AssertionError(f"FOF03 Demo A and Comprehensive B reuse {field_id}")
    print("FIXTURE PASS FOF03: independent valuation Demo A/Comprehensive B fixtures and Decimal answer chains")


def check_return_fixtures(snapshot: dict[str, Any]) -> None:
    fixtures = {fixture["fixtureId"]: fixture for fixture in snapshot["fixtures"]}
    expected = ("FOF04-FIXTURE-DEMO-A", "FOF04-FIXTURE-COMP-B")
    for fixture_id in expected:
        if fixture_id not in fixtures or fixtures[fixture_id]["routeId"] != "ACC-FOF-RETURN-004":
            raise AssertionError(f"missing or misowned return fixture {fixture_id}")
        check_return_fixture(fixtures[fixture_id])
    demo, comp = (fixtures[fixture_id] for fixture_id in expected)
    for field_id in ("return_event_key", "approved_return_base", "approved_return_rate", "confirmed_return_amount", "confirmed_dividend_amount", "approved_reinvest_nav", "reinvest_shares", "return_opening_shares", "return_closing_shares"):
        if fixture_field(demo, field_id) == fixture_field(comp, field_id):
            raise AssertionError(f"FOF04 Demo A and Comprehensive B reuse {field_id}")
    print("FIXTURE PASS FOF04: independent return/reinvest Demo A/Comprehensive B fixtures and Decimal answer chains")


def check_redemption_fixture(fixture: dict[str, Any]) -> None:
    check_numeric_fixture_metadata(
        fixture,
        {
            "confirmed_redemption_shares": ("份", 2, "0.01"),
            "redemption_nav": ("元/份", 4, "0.00005"),
            "redemption_gross": ("元", 2, "0.01"),
            "redemption_fee_amount": ("元", 2, "0.01"),
            "receivable_amount": ("元", 2, "0.01"),
            "actual_redemption_cash": ("元", 2, "0.01"),
            "cash_diff": ("元", 2, "0.01"),
            "redemption_opening_shares": ("份", 2, "0.01"),
            "redemption_shares_deducted": ("份", 2, "0.01"),
            "redemption_closing_shares": ("份", 2, "0.01"),
            "ta_closing_shares": ("份", 2, "0.01"),
            "internal_closing_shares": ("份", 2, "0.01"),
            "holding_diff": ("份", 2, "0.01"),
            "approved_valuation_nav": ("元/份", 4, "0.00005"),
            "post_redemption_market_value": ("元", 2, "0.01"),
            "valuation_result": ("元", 2, "0.01"),
            "valuation_diff": ("元", 2, "0.01"),
        },
    )
    for field_id in (
        "redemption_event_key", "redemption_date", "redemption_fof_fund_key", "redemption_underlying_fund_key",
        "valuation_source_id", "valuation_source_version", "archive_id", "archive_status", "normal_close_state",
    ):
        if not fixture_field(fixture, field_id).strip():
            raise AssertionError(f"{fixture['fixtureId']} redemption field is empty: {field_id}")
    if fixture_field(fixture, "fee_policy") != "NO_FEE_IN_CASE":
        raise AssertionError(f"{fixture['fixtureId']} fee policy is not NO_FEE_IN_CASE")
    if fixture_field(fixture, "archive_status") != "NORMAL_CLOSED" or fixture_field(fixture, "normal_close_state") != "RESULT_RECONCILED":
        raise AssertionError(f"{fixture['fixtureId']} redemption close boundary is not closed")
    shares = dec(fixture_field(fixture, "confirmed_redemption_shares"))
    redemption_nav = dec(fixture_field(fixture, "redemption_nav"))
    gross = dec(fixture_field(fixture, "redemption_gross"))
    fee = dec(fixture_field(fixture, "redemption_fee_amount"))
    receivable = dec(fixture_field(fixture, "receivable_amount"))
    actual_cash = dec(fixture_field(fixture, "actual_redemption_cash"))
    cash_diff = dec(fixture_field(fixture, "cash_diff"))
    opening = dec(fixture_field(fixture, "redemption_opening_shares"))
    deducted = dec(fixture_field(fixture, "redemption_shares_deducted"))
    closing_shares = dec(fixture_field(fixture, "redemption_closing_shares"))
    ta_shares = dec(fixture_field(fixture, "ta_closing_shares"))
    internal_shares = dec(fixture_field(fixture, "internal_closing_shares"))
    holding_diff = dec(fixture_field(fixture, "holding_diff"))
    approved_nav = dec(fixture_field(fixture, "approved_valuation_nav"))
    market_value = dec(fixture_field(fixture, "post_redemption_market_value"))
    valuation_result = dec(fixture_field(fixture, "valuation_result"))
    valuation_diff = dec(fixture_field(fixture, "valuation_diff"))
    close(shares * redemption_nav, gross, "0.01", f"{fixture['fixtureId']} redemption gross")
    close(gross - fee, receivable, "0.01", f"{fixture['fixtureId']} receivable")
    close(receivable - actual_cash, cash_diff, "0.01", f"{fixture['fixtureId']} cash diff")
    close(opening - deducted, closing_shares, "0.01", f"{fixture['fixtureId']} closing shares")
    close(internal_shares - ta_shares, holding_diff, "0.01", f"{fixture['fixtureId']} holding diff")
    close(closing_shares * approved_nav, market_value, "0.01", f"{fixture['fixtureId']} post-redemption market value")
    close(market_value - valuation_result, valuation_diff, "0.01", f"{fixture['fixtureId']} valuation diff")
    print(f"DECIMAL PASS {fixture['fixtureId']}: redemptionGross={gross} cashDiff={cash_diff} closingShares={closing_shares} holdingDiff={holding_diff} marketValue={market_value} valuationDiff={valuation_diff}")


def check_redemption_fixtures(snapshot: dict[str, Any]) -> None:
    fixtures = {fixture["fixtureId"]: fixture for fixture in snapshot["fixtures"]}
    expected = ("FOF05-FIXTURE-DEMO-A", "FOF05-FIXTURE-COMP-B")
    for fixture_id in expected:
        if fixture_id not in fixtures or fixtures[fixture_id]["routeId"] != "ACC-FOF-REDEMPTION-005":
            raise AssertionError(f"missing or misowned redemption fixture {fixture_id}")
        check_redemption_fixture(fixtures[fixture_id])
    demo, comp = (fixtures[fixture_id] for fixture_id in expected)
    for field_id in (
        "redemption_event_key", "redemption_date", "redemption_fof_fund_key", "redemption_underlying_fund_key",
        "confirmed_redemption_shares", "redemption_nav", "redemption_gross", "receivable_amount", "actual_redemption_cash",
        "redemption_opening_shares", "redemption_closing_shares", "valuation_source_id", "valuation_source_version",
        "approved_valuation_nav", "post_redemption_market_value", "archive_id",
    ):
        if fixture_field(demo, field_id) == fixture_field(comp, field_id):
            raise AssertionError(f"FOF05 Demo A and Comprehensive B reuse {field_id}")
    print("FIXTURE PASS FOF05: independent redemption Demo A/Comprehensive B fixtures and Decimal answer chains")


def check_fixture_inventory(snapshot: dict[str, Any]) -> None:
    expected = {
        "ACC-FOF-BOUNDARY-001": {"FOF01-FIXTURE-DEMO-A", "FOF01-FIXTURE-COMP-B"},
        "ACC-FOF-SUBSCRIPTION-002": {"FOF02-FIXTURE-DEMO-A", "FOF02-FIXTURE-COMP-B"},
        "ACC-FOF-VALUATION-003": {"FOF03-FIXTURE-DEMO-A", "FOF03-FIXTURE-COMP-B"},
        "ACC-FOF-RETURN-004": {"FOF04-FIXTURE-DEMO-A", "FOF04-FIXTURE-COMP-B"},
        "ACC-FOF-REDEMPTION-005": {"FOF05-FIXTURE-DEMO-A", "FOF05-FIXTURE-COMP-B"},
    }
    if len(snapshot["fixtures"]) != 10:
        raise AssertionError(f"FOF fixture inventory must contain exactly 10 fixtures, got {len(snapshot['fixtures'])}")
    actual_ids = {fixture["fixtureId"] for fixture in snapshot["fixtures"]}
    expected_ids = set().union(*expected.values())
    if actual_ids != expected_ids:
        raise AssertionError(f"FOF fixture inventory mismatch: missing={sorted(expected_ids - actual_ids)} extra={sorted(actual_ids - expected_ids)}")
    for route_id, fixture_ids in expected.items():
        actual_route_ids = {fixture["fixtureId"] for fixture in snapshot["fixtures"] if fixture["routeId"] == route_id}
        if actual_route_ids != fixture_ids:
            raise AssertionError(f"{route_id} must own exactly Demo A and Comprehensive B fixtures")
    print("FIXTURE INVENTORY PASS: five routes own exactly two independent fixtures each (10 total)")


def check_fixtures(routes: dict[str, dict[str, Any]], snapshot: dict[str, Any]) -> None:
    fixtures = snapshot["fixtures"]
    expected = {
        "FOF01": ("ACC-FOF-BOUNDARY-001", "FOF01-FIXTURE-DEMO-A", "FOF01-FIXTURE-COMP-B", False),
        "FOF02": ("ACC-FOF-SUBSCRIPTION-002", "FOF02-FIXTURE-DEMO-A", "FOF02-FIXTURE-COMP-B", True),
    }
    fixture_by_id = {fixture["fixtureId"]: fixture for fixture in fixtures}
    for label, (route_id, demo_id, comp_id, require_cash) in expected.items():
        if route_id != routes[label]["routeId"]:
            raise AssertionError(f"{label} route ID mismatch")
        for fixture_id in (demo_id, comp_id):
            if fixture_id not in fixture_by_id:
                raise AssertionError(f"missing fixture {fixture_id}")
            fixture = fixture_by_id[fixture_id]
            if fixture["routeId"] != route_id:
                raise AssertionError(f"{fixture_id} is owned by the wrong route")
            check_fixture_math(fixture, require_cash)
        demo = fixture_by_id[demo_id]
        comp = fixture_by_id[comp_id]
        for field_id in ("instruction_amount", "subscription_nav", "confirmed_shares", "opening_shares", "closing_shares"):
            if fixture_field(demo, field_id) == fixture_field(comp, field_id):
                raise AssertionError(f"{label} Demo A and Comprehensive B reuse {field_id}")
    if fixture_field(fixture_by_id["FOF01-FIXTURE-COMP-B"], "instruction_amount") == fixture_field(fixture_by_id["FOF02-FIXTURE-COMP-B"], "instruction_amount"):
        raise AssertionError("FOF-01 and FOF-02 comprehensive fixtures reuse the same amount")
    print("FIXTURE PASS: each route owns independent Demo A/Comprehensive B numbers and answer chains")


def check_evidence(snapshot: dict[str, Any], fields: dict[str, Any], states: dict[str, Any], deid: dict[str, Any], audit: dict[str, Any], route_evidence: dict[str, dict[str, Any]], work_item_sets: dict[str, set[str]], routes: dict[str, dict[str, Any]]) -> None:
    if audit["physicalFileCount"] != 6 or audit["independentEvidenceGroupCount"] != 5 or audit["effectiveSourceCount"] != 5:
        raise AssertionError("FOF material audit counts are not 6 physical / 5 independent / 5 effective")
    physical = audit["physicalFiles"]
    if len(physical) != 6:
        raise AssertionError("FOF material audit physical file list is incomplete")
    if physical[0]["sha256"] != physical[1]["sha256"] or physical[1]["duplicateOf"] != "FOF-PHY-01":
        raise AssertionError("duplicate DOCX hash/alias rule is not recorded")
    if len(audit["evidenceGroups"]) != 5:
        raise AssertionError("FOF must retain five independent evidence groups")
    for group in audit["evidenceGroups"]:
        if not group["locators"] or not group["physicalFileIds"]:
            raise AssertionError(f"evidence group lacks stable material locator: {group['evidenceGroupId']}")
    field_ids = {field["fieldId"] for field in fields["fields"]}
    required_fields = {
        "fof_fund_key", "underlying_fund_key", "instruction_key", "business_date", "instruction_amount", "subscription_nav", "confirmed_shares", "opening_shares", "closing_shares", "cash_diff", "shares_diff",
        "valuation_source_id", "valuation_source_version", "valuation_date", "valuation_available_at", "valuation_fof_fund_key", "valuation_underlying_fund_key", "approved_nav", "ta_closing_shares", "internal_closing_shares", "calculated_market_value", "valuation_result", "holding_diff", "valuation_diff", "nav_state", "holding_state",
        "return_event_key", "approved_return_base", "approved_return_rate", "confirmed_return_amount", "actual_return_cash", "return_diff", "dividend_event_key", "confirmed_dividend_amount", "approved_reinvest_nav", "reinvest_shares", "return_opening_shares", "return_closing_shares", "return_shares_diff", "return_event_state",
        "redemption_event_key", "redemption_date", "redemption_fof_fund_key", "redemption_underlying_fund_key", "confirmed_redemption_shares", "redemption_nav", "redemption_gross", "redemption_fee_amount", "fee_policy", "receivable_amount", "actual_redemption_cash", "cash_diff", "redemption_opening_shares", "redemption_shares_deducted", "redemption_closing_shares", "ta_closing_shares", "internal_closing_shares", "holding_diff", "valuation_source_id", "valuation_source_version", "approved_valuation_nav", "post_redemption_market_value", "valuation_result", "valuation_diff", "archive_id", "archive_status", "normal_close_state",
    }
    if not required_fields.issubset(field_ids):
        raise AssertionError(f"shared field dictionary missing: {sorted(required_fields - field_ids)}")
    state_ids = [state["stateId"] for state in states["stateChain"]]
    expected_prefix = ["INSTRUCTION_CREATED", "MANAGER_CONFIRMED", "TA_CONFIRMED", "CASH_RECEIVED", "SHARES_POSTED"]
    if state_ids[:5] != expected_prefix:
        raise AssertionError(f"state chain prefix mismatch: {state_ids}")
    if not all(state in state_ids for state in ["NAV_CONFIRMED", "HOLDING_RECONCILED", "RESULT_RECONCILED"]):
        raise AssertionError("future route state boundaries are missing")
    source_group_ids = {group["sourceGroupId"] for group in states["sourceGroups"]}
    required_source_groups = {
        "FOF-SRC-VALUATION-SNAPSHOT", "FOF-SRC-VALUATION-OBJECT", "FOF-SRC-TA-CLOSING", "FOF-SRC-INTERNAL-HOLDING", "FOF-SRC-VALUATION-RESULT",
        "FOF-SRC-RETURN-PARAMETER", "FOF-SRC-RETURN-CASH", "FOF-SRC-DIVIDEND-CONFIRMATION", "FOF-SRC-REINVEST-PARAMETER", "FOF-SRC-RETURN-LEDGER", "FOF-SRC-RETURN-RECON",
        "FOF-SRC-REDEMPTION-CONFIRM", "FOF-SRC-REDEMPTION-RECEIVABLE", "FOF-SRC-REDEMPTION-CASH", "FOF-SRC-REDEMPTION-TA-HOLDING", "FOF-SRC-REDEMPTION-INTERNAL", "FOF-SRC-REDEMPTION-VALUATION-SNAPSHOT", "FOF-SRC-REDEMPTION-RESULT", "FOF-SRC-REDEMPTION-ARCHIVE",
    }
    if not required_source_groups.issubset(source_group_ids):
        raise AssertionError(f"FOF-03/04 source-state matrix missing groups: {sorted(required_source_groups - source_group_ids)}")
    if "MATERIAL_ABSTRACTION" not in deid["provenanceLabels"] and not any(item["label"] == "MATERIAL_ABSTRACTION" for item in deid["provenanceLabels"]):
        raise AssertionError("deidentification provenance labels are incomplete")
    for label, evidence in route_evidence.items():
        if evidence["dependencyPolicy"]["hardPrerequisiteNodeIds"] != ["ACC-NODE-DAILY-003"]:
            raise AssertionError(f"{label} hard prerequisite is not ACC-NODE-DAILY-003")
        if evidence["dependencyPolicy"]["stageGate"] is not False:
            raise AssertionError(f"{label} unexpectedly introduces a stage gate")
        if label == "FOF01" and evidence["dependencyPolicy"]["dependsOnRouteIds"] != []:
            raise AssertionError("FOF-01 must not depend on a later FOF route")
        if label == "FOF02" and evidence["dependencyPolicy"]["dependsOnRouteIds"] != ["ACC-FOF-BOUNDARY-001"]:
            raise AssertionError("FOF-02 must depend serially on FOF-01")
        if label == "FOF03" and evidence["dependencyPolicy"]["dependsOnRouteIds"] != ["ACC-FOF-SUBSCRIPTION-002"]:
            raise AssertionError("FOF-03 must depend serially on FOF-02")
        if label == "FOF04" and evidence["dependencyPolicy"]["dependsOnRouteIds"] != ["ACC-FOF-VALUATION-003"]:
            raise AssertionError("FOF-04 must depend serially on FOF-03")
        if label == "FOF05" and evidence["dependencyPolicy"]["dependsOnRouteIds"] != ["ACC-FOF-RETURN-004"]:
            raise AssertionError("FOF-05 must depend serially on FOF-04")
        if len(evidence["materialAnchors"]) < 2:
            raise AssertionError(f"{label} has too few material anchors")
        if set(evidence["answerChains"]) != {"demonstrationA", "comprehensiveB"}:
            raise AssertionError(f"{label} evidence does not contain both answer chains")
        if label in {"FOF03", "FOF04", "FOF05"}:
            if not evidence.get("activityLanding") or not evidence.get("fixturePolicy") or not evidence.get("exclusionBoundary"):
                raise AssertionError(f"{label} evidence lacks activity landing, fixture policy or exclusion boundary")
            exclusion_text = " ".join(str(item) for item in evidence["exclusionBoundary"])
            required_exclusions = {
                "FOF03": ["互认", "跨境", "停牌", "无报价", "T+0"],
                "FOF04": ["ONLY_THIS_CASE", "SYNTHETIC_EDUCATIONAL", "CASE_POLICY", "正式会计科目", "税费"],
                "FOF05": ["NO_FEE_IN_CASE", "多应收合并到账", "迟到/重复/错配", "转换/转托管", "互认", "T+0", "人工凭证", "重跑/回滚/重估/重披露/强制封账"],
            }
            if not all(token in exclusion_text for token in required_exclusions[label]):
                raise AssertionError(f"{label} DEFER/scope boundary is incomplete")
            for chain_name in ("demonstrationA", "comprehensiveB"):
                chain = evidence["answerChains"][chain_name]
                if not chain.get("fixtureId") or not chain.get("sourceToField") or not chain.get("decimalSteps") or not chain.get("reconciliation"):
                    raise AssertionError(f"{label} {chain_name} answer chain is incomplete")
        atomic = evidence.get("atomicWorkItems", [])
        atomic_ids = {item["workItemId"] for item in atomic}
        if atomic_ids != work_item_sets[label]:
            raise AssertionError(f"{label} evidence atomic workItems mismatch")
        material_ids = {material["materialId"] for material in routes[label]["steps"]["COMPREHENSIVE_PRACTICE"]["sourceMaterials"]}
        for item in atomic:
            if item["responseKind"] not in {"SELECT", "NUMBER", "TEXT"}:
                raise AssertionError(f"{label} evidence response kind invalid: {item['workItemId']}")
            if not item["sourceMaterialIds"] or not set(item["sourceMaterialIds"]).issubset(material_ids):
                raise AssertionError(f"{label} atomic item lacks route source material mapping: {item['workItemId']}")
            if not item["scoreTargets"] or not item["remediationTargetId"]:
                raise AssertionError(f"{label} atomic item lacks score/remediation mapping: {item['workItemId']}")
            if item["responseKind"] == "NUMBER":
                for numeric_key in ("unit", "precision", "tolerance"):
                    if numeric_key not in item:
                        raise AssertionError(f"{label} numeric evidence lacks {numeric_key}: {item['workItemId']}")
        print(f"ATOMIC EVIDENCE PASS {label}: {len(atomic)} workItems have source, score, answer and remediation mapping")
    print("EVIDENCE PASS: six physical files, five independent groups, duplicate hash, locators, provenance and dependency boundary")


def check_evidence_safety(values: dict[str, Any]) -> None:
    for label, value in values.items():
        for key, text in strings(value):
            for pattern in PUBLIC_FORBIDDEN_PATTERNS:
                if pattern.search(text):
                    raise AssertionError(f"{label} evidence contains sensitive pattern in {key}: {text}")
    print("SENSITIVE PASS: routes, rubrics and FOF B3 evidence contain no URL, credential, local path or private identity pattern")


def rubric_rules(rubric: dict[str, Any]) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    for dimension in rubric["dimensions"]:
        for criterion in dimension["criteria"]:
            rules.extend(criterion["evidenceRules"])
    for mandatory in rubric["mandatoryRequirements"]:
        rules.extend(mandatory["evidenceRules"])
    return rules


def check_reference_answers(routes: dict[str, dict[str, Any]], rubrics: dict[str, dict[str, Any]]) -> None:
    expected_fixture = {"FOF01": "FOF01-FIXTURE-COMP-B", "FOF02": "FOF02-FIXTURE-COMP-B", "FOF03": "FOF03-FIXTURE-COMP-B", "FOF04": "FOF04-FIXTURE-COMP-B", "FOF05": "FOF05-FIXTURE-COMP-B"}
    for label, rubric in rubrics.items():
        comp = routes[label]["steps"]["COMPREHENSIVE_PRACTICE"]
        items = {item["workItemId"]: item for item in comp["workItems"]}
        responses = rubric["referenceAnswer"]["responses"]
        response_meta = rubric["referenceAnswer"].get("responseMeta", {})
        if rubric["referenceAnswer"]["fixtureId"] != expected_fixture[label]:
            raise AssertionError(f"{label} referenceAnswer fixture mismatch")
        if set(responses) != set(items):
            raise AssertionError(f"{label} referenceAnswer does not cover every workItem")
        numeric_items = {work_item_id for work_item_id, item in items.items() if item["response"]["kind"] == "NUMBER"}
        if set(response_meta) != numeric_items:
            raise AssertionError(f"{label} numeric responseMeta mismatch: expected={sorted(numeric_items)} actual={sorted(response_meta)}")
        rules_by_field: dict[str, list[dict[str, Any]]] = {}
        for rule in rubric_rules(rubric):
            rules_by_field.setdefault(rule["fieldId"], []).append(rule)
        for work_item_id, item in items.items():
            response = responses[work_item_id]
            if item["response"]["kind"] == "NUMBER":
                meta = response_meta[work_item_id]
                if meta["kind"] != "NUMBER" or meta["unit"] != item["response"]["unit"] or meta["precision"] != item["response"]["precision"]:
                    raise AssertionError(f"{label} numeric response metadata mismatch: {work_item_id}")
                numeric_rules = [rule for rule in rules_by_field[work_item_id] if rule["operator"] == "NUMBER_EQUALS" and "tolerance" in rule]
                if not numeric_rules:
                    raise AssertionError(f"{label} numeric workItem has no deterministic NUMBER_EQUALS rule: {work_item_id}")
                if any(abs(dec(response) - dec(rule["expected"])) > dec(rule["tolerance"]) for rule in numeric_rules):
                    raise AssertionError(f"{label} numeric reference answer disagrees with rubric: {work_item_id}")
            elif item["response"]["kind"] == "SELECT":
                if not any(rule["operator"] == "EQUALS" and rule["expected"] == response for rule in rules_by_field[work_item_id]):
                    raise AssertionError(f"{label} SELECT reference answer lacks matching EQUALS rule: {work_item_id}")
            elif item["response"]["kind"] == "TEXT":
                text_rules = [rule for rule in rules_by_field[work_item_id] if rule["operator"] == "CONTAINS_ALL"]
                if not text_rules or not all(token in response for token in text_rules[0]["expected"]):
                    raise AssertionError(f"{label} TEXT reference answer lacks deterministic CONTAINS_ALL evidence: {work_item_id}")
        print(f"ANSWER PASS {label}: {len(items)} reference responses, numeric metadata, deterministic rules and atomic workItems closed")


def check_cognitive_axes(routes: dict[str, dict[str, Any]]) -> None:
    fof01_items = routes["FOF01"]["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]
    fof02_items = routes["FOF02"]["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]
    fof03_items = routes["FOF03"]["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]
    fof04_items = routes["FOF04"]["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]
    fof05_items = routes["FOF05"]["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]
    fof01_ids = {item["workItemId"] for item in fof01_items if item["type"] == "FIELD_MAP"}
    fof02_ids = {item["workItemId"] for item in fof02_items if item["type"] == "FIELD_MAP"}
    fof03_ids = {item["workItemId"] for item in fof03_items if item["type"] == "FIELD_MAP"}
    fof04_ids = {item["workItemId"] for item in fof04_items if item["type"] == "FIELD_MAP"}
    fof05_ids = {item["workItemId"] for item in fof05_items if item["type"] == "FIELD_MAP"}
    expected_fof01_maps = {"fof01-b-master-key-source", "fof01-b-underlying-key-source", "fof01-b-instruction-confirmation-source"}
    expected_fof02_maps = {"fof02-b-instruction-state-source", "fof02-b-manager-state-source", "fof02-b-ta-state-source", "fof02-b-cash-state-source", "fof02-b-shares-state-source"}
    expected_fof03_maps = {"fof03-b-nav-source-id", "fof03-b-nav-source-version", "fof03-b-valuation-date", "fof03-b-object-keys"}
    expected_fof04_maps = {"fof04-b-return-parameter-source", "fof04-b-return-cash-source", "fof04-b-dividend-reinvest-source"}
    expected_fof05_maps = {"fof05-b-redemption-confirm-source", "fof05-b-receivable-source", "fof05-b-cash-source", "fof05-b-ta-holding-source", "fof05-b-internal-holding-source", "fof05-b-valuation-source", "fof05-b-archive-source"}
    if len({frozenset(fof01_ids), frozenset(fof02_ids), frozenset(fof03_ids), frozenset(fof04_ids), frozenset(fof05_ids)}) != 5:
        raise AssertionError("FOF-01/05 FIELD_MAP cognitive axes are not distinct")
    if fof01_ids != expected_fof01_maps or fof02_ids != expected_fof02_maps or fof03_ids != expected_fof03_maps or fof04_ids != expected_fof04_maps or fof05_ids != expected_fof05_maps:
        raise AssertionError("FOF-01/05 FIELD_MAP cognitive axes do not match the frozen design")
    fof01_text = "\n".join(text for _, text in strings(routes["FOF01"]))
    fof02_text = "\n".join(text for _, text in strings(routes["FOF02"]))
    fof03_text = "\n".join(text for _, text in strings(routes["FOF03"]))
    fof04_text = "\n".join(text for _, text in strings(routes["FOF04"]))
    fof05_text = "\n".join(text for _, text in strings(routes["FOF05"]))
    if "FOF母基金" not in fof01_text or "被投基金" not in fof01_text or "CASH_RECEIVED" in fof01_text:
        raise AssertionError("FOF-01 must remain an object/source/state-boundary route")
    if "CASH_RECEIVED" not in fof02_text or "MANAGER_CONFIRMED" not in fof02_text or "TA_CONFIRMED" not in fof02_text:
        raise AssertionError("FOF-02 must retain the confirmation-to-cash cognitive axis")
    if "sourceId" not in fof03_text or "marketValue" not in fof03_text or "holdingDiff" not in fof03_text or "HOLDING_RECONCILED" not in fof03_text:
        raise AssertionError("FOF-03 must retain the approved-NAV and three-way valuation axis")
    if "approved base" not in fof04_text or "reinvest shares" not in fof04_text or "returnDiff" not in fof04_text or "sharesDiff" not in fof04_text or "CASH_RECEIVED" in fof04_text:
        raise AssertionError("FOF-04 must retain the two-chain return/reinvest axis")
    if "redemptionGross" not in fof05_text or "cashDiff" not in fof05_text or "closing shares" not in fof05_text or "holdingDiff" not in fof05_text or "post-redemption" not in fof05_text or "valuationDiff" not in fof05_text or "RESULT_RECONCILED" not in fof05_text or "CASH_RECEIVED" in fof05_text:
        raise AssertionError("FOF-05 must retain the redemption-to-result closure axis")
    print("COGNITIVE AXIS PASS: FOF-01 object, FOF-02 subscription, FOF-03 valuation, FOF-04 return/reinvest and FOF-05 redemption axes are distinct")


def check_five_route_consistency(routes: dict[str, dict[str, Any]], rubrics: dict[str, dict[str, Any]], route_evidence: dict[str, dict[str, Any]]) -> None:
    expected_labels = ["FOF01", "FOF02", "FOF03", "FOF04", "FOF05"]
    if list(routes) != expected_labels or list(rubrics) != expected_labels or list(route_evidence) != expected_labels:
        raise AssertionError("FOF route/rubric/evidence inventory is not exactly FOF-01 through FOF-05")
    expected_route_ids = {
        "FOF01": "ACC-FOF-BOUNDARY-001",
        "FOF02": "ACC-FOF-SUBSCRIPTION-002",
        "FOF03": "ACC-FOF-VALUATION-003",
        "FOF04": "ACC-FOF-RETURN-004",
        "FOF05": "ACC-FOF-REDEMPTION-005",
    }
    for label in expected_labels:
        if routes[label]["routeId"] != expected_route_ids[label] or rubrics[label]["routeId"] != expected_route_ids[label] or route_evidence[label]["routeId"] != expected_route_ids[label]:
            raise AssertionError(f"{label} route/rubric/evidence IDs are not aligned")
    expected_dependencies = {
        "FOF01": [],
        "FOF02": ["ACC-FOF-BOUNDARY-001"],
        "FOF03": ["ACC-FOF-SUBSCRIPTION-002"],
        "FOF04": ["ACC-FOF-VALUATION-003"],
        "FOF05": ["ACC-FOF-RETURN-004"],
    }
    for serial_order, label in enumerate(expected_labels, start=1):
        policy = route_evidence[label]["dependencyPolicy"]
        if policy["hardPrerequisiteNodeIds"] != ["ACC-NODE-DAILY-003"] or policy["dependsOnRouteIds"] != expected_dependencies[label] or policy["serialOrder"] != serial_order or policy["stageGate"] is not False:
            raise AssertionError(f"{label} serial dependency chain is invalid")
    print("SERIAL CONSISTENCY PASS: FOF-01→FOF-02→FOF-03→FOF-04→FOF-05; DAILY-003 only hard prerequisite; no STAGE_GATE")


def main() -> int:
    routes = {label: read_json(path) for label, path in ROUTES.items()}
    rubrics = {label: read_json(path) for label, path in RUBRICS.items()}
    schema_work_items: dict[str, set[str]] = {}
    schema_questions: dict[str, set[str]] = {}
    for label in routes:
        schema_check(routes[label], ROUTE_SCHEMA, f"{label} route")
        schema_check(rubrics[label], RUBRIC_SCHEMA, f"{label} rubric")
        work_items, questions, _type_counts = check_route_shape(label, routes[label])
        schema_work_items[label] = work_items
        schema_questions[label] = questions
        check_rubric_shape(label, rubrics[label], work_items, questions, routes[label])
        check_public_safety(label, routes[label], rubrics[label])

    snapshot = read_json(EVIDENCE["snapshot"])
    fields = read_json(EVIDENCE["fields"])
    states = read_json(EVIDENCE["states"])
    deid = read_json(EVIDENCE["deid"])
    audit = read_json(EVIDENCE["audit"])
    route_evidence = {label: read_json(EVIDENCE[label]) for label in routes}
    check_fixtures(routes, snapshot)
    check_fixture_inventory(snapshot)
    check_valuation_fixtures(snapshot)
    check_return_fixtures(snapshot)
    check_redemption_fixtures(snapshot)
    check_cognitive_axes(routes)
    check_evidence(snapshot, fields, states, deid, audit, route_evidence, schema_work_items, routes)
    check_evidence_safety({"snapshot": snapshot, "fields": fields, "states": states, "audit": audit, **route_evidence})
    check_reference_answers(routes, rubrics)
    check_five_route_consistency(routes, rubrics, route_evidence)
    print("FOF validation passed: FOF-01 through FOF-05 content, rubric, evidence and Decimal chains are complete")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, InvalidOperation, ValueError, KeyError) as error:
        print(f"FOF VALIDATION FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
