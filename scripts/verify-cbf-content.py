"""Independent validation for the completed CBF content batch.

The validator covers the approved R1-R4 route/rubric/evidence assets, shared
case evidence, serial dependencies, and independent Decimal fixtures. It
deliberately does not register a map, release, source, or common contract.
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
ROUTE_SCHEMA_PATH = REPO / "contracts/schemas/route.schema.json"
RUBRIC_SCHEMA_PATH = REPO / "contracts/schemas/rubric.schema.json"
EVIDENCE_DIR = REPO / "content/evidence/accounting/cbf"
ROUTE_PATHS = {
    "R1": REPO / "content/routes/accounting/ACC-CBF-BOUNDARY-001.json",
    "R2": REPO / "content/routes/accounting/ACC-CBF-DATA-002.json",
    "R3": REPO / "content/routes/accounting/ACC-CBF-SETTLEMENT-003.json",
    "R4": REPO / "content/routes/accounting/ACC-CBF-CLOSE-004.json",
}
RUBRIC_PATHS = {
    "R1": REPO / "content/rubrics/accounting/ACC-CBF-BOUNDARY-001.json",
    "R2": REPO / "content/rubrics/accounting/ACC-CBF-DATA-002.json",
    "R3": REPO / "content/rubrics/accounting/ACC-CBF-SETTLEMENT-003.json",
    "R4": REPO / "content/rubrics/accounting/ACC-CBF-CLOSE-004.json",
}
EVIDENCE_PATHS = {
    "snapshot": EVIDENCE_DIR / "shared-normal-snapshot.json",
    "fields": EVIDENCE_DIR / "field-dictionary.json",
    "states": EVIDENCE_DIR / "state-table.json",
    "deid": EVIDENCE_DIR / "deidentification-boundary.json",
    "r1": EVIDENCE_DIR / "r1-boundary-evidence.json",
    "r2": EVIDENCE_DIR / "r2-data-evidence.json",
    "r3": EVIDENCE_DIR / "r3-settlement-evidence.json",
    "r4": EVIDENCE_DIR / "r4-close-evidence.json",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def dec(value: Any) -> Decimal:
    if isinstance(value, bool):
        raise InvalidOperation("boolean is not numeric")
    return Decimal(str(value).replace(",", "").strip())


def close(actual: Any, expected: Any, tolerance: Any, label: str) -> None:
    difference = abs(dec(actual) - dec(expected))
    if difference > dec(tolerance):
        raise AssertionError(f"{label}: actual={actual} expected={expected} tolerance={tolerance}")


def validate_schema(data: dict[str, Any], schema: dict[str, Any], label: str) -> None:
    errors = sorted(Draft202012Validator(schema).iter_errors(data), key=lambda error: list(error.path))
    if errors:
        detail = "; ".join(f"{list(error.path)}: {error.message}" for error in errors)
        raise AssertionError(f"{label} schema invalid: {detail}")
    print(f"SCHEMA PASS {label}")


def check_route_shape(label: str, route: dict[str, Any]) -> None:
    cards = route["steps"]["KNOWLEDGE_CARD"]["cards"]
    demo_steps = route["steps"]["DEMONSTRATION"]["steps"]
    basics = route["steps"]["BASIC_PRACTICE"]["questions"]
    work_items = route["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]
    if route["line"] != "ACCOUNTING":
        raise AssertionError(f"{label} must stay on ACCOUNTING line")
    if len(cards) != 3:
        raise AssertionError(f"{label} knowledge cards must be exactly 3, got {len(cards)}")
    if len(demo_steps) != 5 or [step["order"] for step in demo_steps] != [1, 2, 3, 4, 5]:
        raise AssertionError(f"{label} demonstration must contain ordered steps 1-5")
    if len(basics) != 5:
        raise AssertionError(f"{label} basic practice must be exactly 5, got {len(basics)}")
    expected_types = {"FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION", "SHORT_TEXT"}
    if {question["type"] for question in basics} != expected_types:
        raise AssertionError(f"{label} basic practice must cover the five heterogeneous types")
    if {item["type"] for item in work_items} != expected_types:
        raise AssertionError(f"{label} comprehensive work items must cover the five heterogeneous types")
    if len({item["workItemId"] for item in work_items}) != len(work_items):
        raise AssertionError(f"{label} workItem IDs must be unique")
    expected_date = {"R1": "2026-08-12", "R2": "2026-08-14", "R3": "2026-08-16", "R4": "2026-08-18"}[label]
    if route["steps"]["COMPREHENSIVE_PRACTICE"]["scenario"]["date"] != expected_date:
        raise AssertionError(f"{label} comprehensive date mismatch")
    print(f"ROUTE SHAPE PASS {label}: 3 cards, 5 demonstration steps, 5 heterogeneous basics, heterogeneous comprehensive")


def check_public_copy(label: str, route: dict[str, Any]) -> None:
    if label == "R1" and "R1" in route["title"]:
        raise AssertionError("R1 public title still exposes the施工编号")
    if label != "R1":
        return

    identifier_keys = {"routeId", "cardId", "questionId", "workItemId", "materialId", "referenceId", "fixture"}

    def visit(value: Any, key: str = "") -> None:
        if isinstance(value, dict):
            for child_key, child_value in value.items():
                visit(child_value, child_key)
        elif isinstance(value, list):
            for child_value in value:
                visit(child_value, key)
        elif isinstance(value, str) and key not in identifier_keys and "R1" in value:
            raise AssertionError(f"R1 public copy contains施工编号 in {key}: {value}")

    visit(route)
    print("PUBLIC COPY PASS R1: title/body no longer expose the internal R1 label; stable IDs retained")


def check_rubric_shape(label: str, rubric: dict[str, Any]) -> None:
    if rubric["totalScore"] != 100 or rubric["passScore"] != 75:
        raise AssertionError(f"{label} scoring must be 100 total and 75 pass")
    expected_dimensions = {"CONCEPT": 25, "PROCESS": 30, "RISK": 25, "EXPRESSION": 20}
    actual_dimensions = {item["dimension"]: item["maxScore"] for item in rubric["dimensions"]}
    if actual_dimensions != expected_dimensions:
        raise AssertionError(f"{label} dimensions mismatch: {actual_dimensions}")
    for dimension in rubric["dimensions"]:
        weight = sum(criteria["weight"] for criteria in dimension["criteria"])
        if weight != dimension["maxScore"]:
            raise AssertionError(f"{label} {dimension['dimension']} weights sum to {weight}, not {dimension['maxScore']}")
    if not 1 <= len(rubric["mandatoryRequirements"]) <= 2:
        raise AssertionError(f"{label} mandatory requirements must be 1-2")
    print(f"RUBRIC SHAPE PASS {label}: 25/30/25/20, pass 75, and <=2 mandatory requirements")


def check_rules(rules: list[dict[str, Any]], responses: dict[str, Any], label: str) -> None:
    for rule in rules:
        field_id = rule["fieldId"]
        if field_id not in responses:
            raise AssertionError(f"{label}: evidenceRule field not in referenceAnswer: {field_id}")
        actual = responses[field_id]
        expected = rule["expected"]
        operator = rule["operator"]
        if operator == "EQUALS":
            if str(actual) != str(expected):
                raise AssertionError(f"{label}: {field_id} actual={actual!r} expected={expected!r}")
        elif operator == "NUMBER_EQUALS":
            close(actual, expected, rule.get("tolerance", 0), f"{label} {field_id}")
        elif operator == "CONTAINS_ALL":
            actual_text = str(actual).replace(",", "")
            for token in expected:
                if str(token).replace(",", "") not in actual_text:
                    raise AssertionError(f"{label}: {field_id} does not contain {token!r}")
        else:
            raise AssertionError(f"{label}: unsupported evidence operator {operator}")


def check_answer_mappings(label: str, route: dict[str, Any], rubric: dict[str, Any]) -> None:
    if route["routeId"] != rubric["routeId"]:
        raise AssertionError(f"{label} route/rubric routeId mismatch")
    work_item_ids = {item["workItemId"] for item in route["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]}
    responses = rubric["referenceAnswer"]["responses"]
    if work_item_ids != set(responses):
        missing = work_item_ids - set(responses)
        extra = set(responses) - work_item_ids
        raise AssertionError(f"{label} referenceAnswer/workItem mismatch; missing={sorted(missing)} extra={sorted(extra)}")

    basic_question_ids = {question["questionId"] for question in route["steps"]["BASIC_PRACTICE"]["questions"]}
    target_ids = {target["targetId"] for target in rubric["remediationTargets"]}
    referenced_target_ids: set[str] = set()
    for dimension in rubric["dimensions"]:
        for criterion in dimension["criteria"]:
            referenced_target_ids.add(criterion["remediationTargetId"])
            check_rules(criterion["evidenceRules"], responses, f"{label} criterion {criterion['criterionId']}")
    for requirement in rubric["mandatoryRequirements"]:
        referenced_target_ids.add(requirement["remediationTargetId"])
        check_rules(requirement["evidenceRules"], responses, f"{label} mandatory {requirement['requirementId']}")
    if not referenced_target_ids <= target_ids:
        raise AssertionError(f"{label} unmapped remediation target IDs: {sorted(referenced_target_ids - target_ids)}")

    card_prefix = {"R1": "CBF-R1-KC-", "R2": "CBF-R2-KC-", "R3": "CBF-R3-KC-", "R4": "CBF-R4-KC-"}[label]
    for target in rubric["remediationTargets"]:
        if target["questionId"] not in basic_question_ids:
            raise AssertionError(f"{label} remediation target points to unknown question: {target['questionId']}")
        if target["materialStep"] == "KNOWLEDGE_CARD" and not target["materialItemId"].startswith(card_prefix):
            raise AssertionError(f"{label} unexpected knowledge card remediation item: {target['materialItemId']}")
        if target["materialStep"] == "DEMONSTRATION" and not re.fullmatch(r"DEMONSTRATION-STEP-0?[1-5]", target["materialItemId"]):
            raise AssertionError(f"{label} unexpected demonstration remediation item: {target['materialItemId']}")
    print(f"ANSWER MAPPING PASS {label}: {len(responses)} work items, evidenceRules, mandatoryRequirements, remediationTargets closed")


def check_r1_decimal(snapshot: dict[str, Any]) -> None:
    for fixture_name in ("demonstrationA", "comprehensiveB"):
        fixture = snapshot["fixtures"][fixture_name]
        gross = dec(fixture["quantity"]) * dec(fixture["tradePrice"])
        commission = gross * dec(fixture["commissionRate"])
        settlement = gross + commission
        reserve_closing = dec(fixture["reserveOpening"]) - settlement
        position_closing = dec(fixture["positionOpeningQuantity"]) + dec(fixture["quantity"])
        valuation_market_value = dec(fixture["valuationQuantity"]) * dec(fixture["valuationPrice"])
        close(gross, fixture["grossAmount"], "0.00", f"R1 {fixture_name} gross")
        close(commission, fixture["commissionAmount"], "0.00", f"R1 {fixture_name} commission")
        close(settlement, fixture["settlementAmount"], "0.00", f"R1 {fixture_name} settlement")
        close(reserve_closing, fixture["reserveClosing"], "0.00", f"R1 {fixture_name} reserve closing")
        close(position_closing, fixture["positionClosingQuantity"], "0", f"R1 {fixture_name} position closing")
        close(valuation_market_value, fixture["valuationMarketValue"], "0.00", f"R1 {fixture_name} valuation market value")
        cash_diff = dec(fixture["reserveClosing"]) - (dec(fixture["reserveOpening"]) - dec(fixture["settlementAmount"]))
        position_diff = dec(fixture["positionClosingQuantity"]) - (dec(fixture["positionOpeningQuantity"]) + dec(fixture["quantity"]))
        valuation_quantity_diff = dec(fixture["positionClosingQuantity"]) - dec(fixture["valuationQuantity"])
        reserve_diff = dec(fixture["reserveClosing"]) - dec(fixture["valuationReserve"])
        for name, value, tolerance in (("cashDiff", cash_diff, "0.00"), ("positionDiff", position_diff, "0"), ("valuationQuantityDiff", valuation_quantity_diff, "0"), ("reserveDiff", reserve_diff, "0.00")):
            close(value, 0, tolerance, f"R1 {fixture_name} {name}")
        if fixture["reviewConfirmed"] != "YES" or fixture["closeDecision"] != "NORMAL_CLOSE":
            raise AssertionError(f"R1 {fixture_name} does not satisfy the case normal-close facts")
        print(f"DECIMAL PASS R1 {fixture_name}: gross={gross} commission={commission} settlement={settlement}")


def check_r2_decimal(r2_evidence: dict[str, Any]) -> None:
    expected_pre_ready_states = {"RECEIVED", "PARSED", "MAPPED", "COMPLETE", "READY"}
    for fixture_name in ("demonstrationA", "comprehensiveB"):
        fixture = r2_evidence["fixtures"][fixture_name]
        if set(fixture["stateObservations"]) != expected_pre_ready_states:
            raise AssertionError(f"R2 {fixture_name} state observations do not prove exactly RECEIVED through READY")
        day = fixture["fileGroups"]["day"]
        eod = fixture["fileGroups"]["eod"]
        for side in ("day", "eod"):
            group = fixture["fileGroups"][side]
            rows = fixture["rows"][side]
            if len(rows) != int(group["recordCount"]):
                raise AssertionError(f"R2 {fixture_name} {side} row count does not match recordCount")
            quantity_total = sum((dec(row["quantity"]) for row in rows), Decimal(0))
            amount_total = sum((dec(row["amount"]) for row in rows), Decimal(0))
            close(quantity_total, group["quantityControlTotal"], "0", f"R2 {fixture_name} {side} quantity control")
            close(amount_total, group["amountControlTotal"], "0.00", f"R2 {fixture_name} {side} amount control")
            if int(group["parsedRows"]) != int(group["recordCount"]):
                raise AssertionError(f"R2 {fixture_name} {side} parsedRows does not equal recordCount")
            if int(group["mappedRows"]) != int(group["parsedRows"]):
                raise AssertionError(f"R2 {fixture_name} {side} mappedRows does not equal parsedRows")
            if group["parseStatus"] != "PASS" or group["mappingStatus"] != "PASS" or group["requiredFieldCheck"] != "PASS" or group["sameDayKeyCheck"] != "PASS":
                raise AssertionError(f"R2 {fixture_name} {side} normal completeness fields are not PASS")
        close(int(day["recordCount"]) - int(eod["recordCount"]), 0, 0, f"R2 {fixture_name} day/eod record diff")
        close(dec(day["quantityControlTotal"]) - dec(eod["quantityControlTotal"]), 0, 0, f"R2 {fixture_name} day/eod quantity diff")
        close(dec(day["amountControlTotal"]) - dec(eod["amountControlTotal"]), 0, "0.00", f"R2 {fixture_name} day/eod amount diff")
        if fixture["requiredFieldCheck"] != "PASS" or fixture["sameDayKeyCheck"] != "PASS":
            raise AssertionError(f"R2 {fixture_name} completeness/check keys are not PASS")
        if fixture["stateObservations"]["READY"]["result"] != "READY":
            raise AssertionError(f"R2 {fixture_name} does not end in READY")
        print(f"DECIMAL PASS R2 {fixture_name}: records={day['recordCount']} quantity={day['quantityControlTotal']} amount={day['amountControlTotal']}")

    demo = r2_evidence["fixtures"]["demonstrationA"]
    comp = r2_evidence["fixtures"]["comprehensiveB"]
    for key in ("businessDate", "marketKey", "portfolioKey", "securityKey"):
        if demo[key] == comp[key]:
            raise AssertionError(f"R2 Demo A and comprehensive B must differ on {key}")
    for side in ("day", "eod"):
        for key in ("fileGroupId", "fileGroupVersion", "recordCount", "quantityControlTotal", "amountControlTotal"):
            if demo["fileGroups"][side][key] == comp["fileGroups"][side][key]:
                raise AssertionError(f"R2 Demo A and comprehensive B must differ on {side}.{key}")
    print("DECIMAL CONTINUITY PASS R2: Demo A and comprehensive B have distinct keys, batches and control totals")



def check_r3_decimal(r3_evidence: dict[str, Any]) -> None:
    for fixture_name in ("demonstrationA", "comprehensiveB"):
        fixture = r3_evidence["fixtures"][fixture_name]
        gross = dec(fixture["quantity"]) * dec(fixture["tradePrice"])
        commission = gross * dec(fixture["commissionRate"])
        settlement = gross + commission
        reserve_movement = -settlement
        reserve_closing = dec(fixture["reserveOpening"]) - settlement
        formula_difference = gross + commission - settlement
        reserve_formula_difference = dec(fixture["reserveOpening"]) - settlement - dec(fixture["reserveClosing"])
        external_balance_difference = dec(fixture["externalStatementClosing"]) - dec(fixture["reserveClosing"])
        duplicate_posting_difference = dec(fixture["postingCount"]) - 1
        close(gross, fixture["grossAmount"], "0.00", f"R3 {fixture_name} gross")
        close(commission, fixture["commissionAmount"], "0.00", f"R3 {fixture_name} commission")
        close(settlement, fixture["settlementAmount"], "0.00", f"R3 {fixture_name} settlement")
        close(reserve_movement, fixture["reserveMovement"], "0.00", f"R3 {fixture_name} reserve movement")
        close(reserve_closing, fixture["reserveClosing"], "0.00", f"R3 {fixture_name} reserve closing")
        close(formula_difference, fixture["formulaDifference"], "0.00", f"R3 {fixture_name} formula difference")
        close(reserve_formula_difference, fixture["reserveFormulaDifference"], "0.00", f"R3 {fixture_name} reserve formula difference")
        close(external_balance_difference, fixture["externalBalanceDifference"], "0.00", f"R3 {fixture_name} external balance difference")
        close(duplicate_posting_difference, 0, "0", f"R3 {fixture_name} duplicate posting difference")
        if fixture["tradeResultStatus"] != "CONFIRMED":
            raise AssertionError(f"R3 {fixture_name} trade result is not confirmed")
        if fixture["commissionCashTiming"] != "SAME_CASE_DAY_IN_CASH_CHAIN":
            raise AssertionError(f"R3 {fixture_name} commission timing is not the approved case timing")
        if fixture["settlementTiming"] != "SAME_CASE_DAY_AFTER_TRADE":
            raise AssertionError(f"R3 {fixture_name} settlement timing is not the approved case timing")
        if fixture["postingCount"] != "1":
            raise AssertionError(f"R3 {fixture_name} posting count is not exactly one")
        print(f"DECIMAL PASS R3 {fixture_name}: gross={gross} commission={commission} settlement={settlement} reserveClose={reserve_closing}")

    demo = r3_evidence["fixtures"]["demonstrationA"]
    comp = r3_evidence["fixtures"]["comprehensiveB"]
    for key in ("businessDate", "marketKey", "portfolioKey", "securityKey"):
        if demo[key] == comp[key]:
            raise AssertionError(f"R3 Demo A and comprehensive B must differ on {key}")
    for key in ("quantity", "tradePrice", "commissionRate", "reserveOpening", "reserveClosing"):
        if demo[key] == comp[key]:
            raise AssertionError(f"R3 Demo A and comprehensive B must differ on {key}")
    print("DECIMAL CONTINUITY PASS R3: Demo A and comprehensive B have distinct approved settlement fixtures")


def check_r4_decimal(r4_evidence: dict[str, Any]) -> None:
    zero_amount_fields = (
        "reserveExternalLedgerDifference",
        "reserveLedgerValuationDifference",
        "reserveExternalValuationDifference",
        "valuationResultAmountDifference",
    )
    zero_quantity_fields = (
        "positionExternalLedgerDifference",
        "positionLedgerValuationDifference",
        "positionExternalValuationDifference",
    )
    for fixture_name in ("demonstrationA", "comprehensiveB"):
        fixture = r4_evidence["fixtures"][fixture_name]
        market_value = dec(fixture["valuationQuantity"]) * dec(fixture["approvedValuationPrice"])
        reserve_diffs = {
            "reserveExternalLedgerDifference": dec(fixture["externalReserveClosing"]) - dec(fixture["ledgerReserveClosing"]),
            "reserveLedgerValuationDifference": dec(fixture["ledgerReserveClosing"]) - dec(fixture["valuationReserve"]),
            "reserveExternalValuationDifference": dec(fixture["externalReserveClosing"]) - dec(fixture["valuationReserve"]),
        }
        position_diffs = {
            "positionExternalLedgerDifference": dec(fixture["externalPositionClosing"]) - dec(fixture["securitiesLedgerClosing"]),
            "positionLedgerValuationDifference": dec(fixture["securitiesLedgerClosing"]) - dec(fixture["valuationQuantity"]),
            "positionExternalValuationDifference": dec(fixture["externalPositionClosing"]) - dec(fixture["valuationQuantity"]),
        }
        valuation_difference = market_value - dec(fixture["valuationResultAmount"])
        close(market_value, fixture["valuationMarketValue"], "0.00", f"R4 {fixture_name} valuation market value")
        for field_name in zero_amount_fields[:-1]:
            close(reserve_diffs[field_name], fixture[field_name], "0.00", f"R4 {fixture_name} {field_name}")
        close(valuation_difference, fixture["valuationResultAmountDifference"], "0.00", f"R4 {fixture_name} valuation result difference")
        for field_name in zero_quantity_fields:
            close(position_diffs[field_name], fixture[field_name], "0", f"R4 {fixture_name} {field_name}")
        if fixture["dataState"] != "READY" or fixture["accountingState"] != "ACCOUNTED":
            raise AssertionError(f"R4 {fixture_name} does not satisfy READY/ACCOUNTED prerequisites")
        if fixture["sameDayDataComplete"] != "YES" or fixture["valuationStatus"] != "CONFIRMED":
            raise AssertionError(f"R4 {fixture_name} normal completeness/valuation facts are not confirmed")
        if fixture["caCompletion"] != "YES" or fixture["schedulingCompletion"] != "YES" or fixture["reviewConfirmed"] != "YES":
            raise AssertionError(f"R4 {fixture_name} completion/review confirmations are incomplete")
        if fixture["finalState"] != "RECONCILED" or fixture["closeDecision"] != "NORMAL_CLOSE" or fixture["workpaperEntryCount"] != "1":
            raise AssertionError(f"R4 {fixture_name} does not satisfy normal close facts")
        print(f"DECIMAL PASS R4 {fixture_name}: reserve={fixture['externalReserveClosing']} position={fixture['externalPositionClosing']} marketValue={market_value}")

    demo = r4_evidence["fixtures"]["demonstrationA"]
    comp = r4_evidence["fixtures"]["comprehensiveB"]
    if demo["brokerKey"] != comp["brokerKey"] or demo["brokerKey"] != r4_evidence["continuity"]["sharedBrokerKey"]:
        raise AssertionError("R4 Demo A/comprehensive B do not share the approved broker object")
    for key in ("businessDate", "marketKey", "portfolioKey", "securityKey"):
        if demo[key] == comp[key]:
            raise AssertionError(f"R4 Demo A and comprehensive B must differ on {key}")
    for key in ("externalReserveClosing", "externalPositionClosing", "valuationQuantity", "approvedValuationPrice", "valuationMarketValue"):
        if demo[key] == comp[key]:
            raise AssertionError(f"R4 Demo A and comprehensive B must differ on {key}")
    print("DECIMAL CONTINUITY PASS R4: Demo A and comprehensive B have distinct normal-close fixtures with shared broker object")


def check_r3_fixture_links(route: dict[str, Any], r3_evidence: dict[str, Any], r2_evidence: dict[str, Any]) -> None:
    demo = r3_evidence["fixtures"]["demonstrationA"]
    comp = r3_evidence["fixtures"]["comprehensiveB"]
    demo_text = json.dumps(route["steps"]["DEMONSTRATION"], ensure_ascii=False)
    for token in (demo["businessDate"], demo["marketKey"], demo["portfolioKey"], demo["securityKey"], "255600.00", "281.16", "255881.16", "444118.84", "SAME_CASE_DAY_IN_CASH_CHAIN", "formulaDiff=0.00"):
        if token not in demo_text:
            raise AssertionError(f"R3 demonstration missing evidence token {token}")
    if not re.search(r"externalBalanceDiff=.*=0\.00", demo_text):
        raise AssertionError("R3 demonstration must show externalBalanceDiff resolving to 0.00")

    all_material_fields = [field for material in route["steps"]["COMPREHENSIVE_PRACTICE"]["sourceMaterials"] for field in material["fields"]]
    values_by_id = {field["fieldId"]: field["value"] for field in all_material_fields}
    expected_values = {
        "business_date": "2026-08-16",
        "market_key": "MARKET_SETTLE_B",
        "portfolio_key": "PORTFOLIO_SETTLE_B",
        "security_key": "SECURITY_SETTLE_B",
        "trade_result_status": "CONFIRMED",
        "quantity": "14000",
        "trade_price": "31.25",
        "gross_amount": "437500.00",
        "commission_rate": "0.0009",
        "commission_cash_timing": "SAME_CASE_DAY_IN_CASH_CHAIN",
        "settlement_timing": "SAME_CASE_DAY_AFTER_TRADE",
        "reserve_opening": "1350000.00",
        "external_cash_movement": "-437893.75",
        "external_reserve_closing": "912106.25",
        "posting_count": "1"
    }
    for field_id, expected in expected_values.items():
        if values_by_id.get(field_id) != expected:
            raise AssertionError(f"R3 comprehensive source field mismatch: {field_id}={values_by_id.get(field_id)!r}, expected={expected!r}")

    comp_text = json.dumps(route["steps"]["COMPREHENSIVE_PRACTICE"], ensure_ascii=False)
    for token in (comp["businessDate"], comp["marketKey"], comp["portfolioKey"], comp["securityKey"], comp["grossAmount"], comp["externalStatementClosing"], "SAME_CASE_DAY_IN_CASH_CHAIN"):
        if token not in comp_text:
            raise AssertionError(f"R3 comprehensive route missing evidence token {token}")
    comp_lower = comp_text.lower()
    for token in ("formula", "external", "posting"):
        if token not in comp_lower:
            raise AssertionError(f"R3 comprehensive route must cover {token} validation")

    route_text = json.dumps(route, ensure_ascii=False).lower()
    if "position" in route_text or "valuation" in route_text:
        raise AssertionError("R3 route must not introduce R4 position/valuation three-way reconciliation")
    evidence_text = json.dumps(r3_evidence, ensure_ascii=False)
    for locator in ("B-P0018-B-P0019", "B-P0027-B-P0032", "B-P0077-B-P0084", "B-I01-B-I03"):
        if locator not in evidence_text:
            raise AssertionError(f"R3 evidence missing required material locator {locator}")

    r2_comp = r2_evidence["fixtures"]["comprehensiveB"]
    for key in ("businessDate", "marketKey", "portfolioKey", "securityKey"):
        if comp[key] == r2_comp[key]:
            raise AssertionError(f"R3 comprehensive B must use an independent {key} from R2")
    print("FIXTURE LINK PASS R3: approved sources, full amount/reserve chain, double reconciliation, material locators and R4 boundary closed")


def check_r4_fixture_links(route: dict[str, Any], rubric: dict[str, Any], r4_evidence: dict[str, Any], r3_evidence: dict[str, Any]) -> None:
    demo = r4_evidence["fixtures"]["demonstrationA"]
    comp = r4_evidence["fixtures"]["comprehensiveB"]
    demo_text = json.dumps(route["steps"]["DEMONSTRATION"], ensure_ascii=False)
    for token in (demo["businessDate"], demo["marketKey"], demo["portfolioKey"], demo["securityKey"], "860000.00", "16000", "48.75", "780000.00", "READY", "ACCOUNTED", "RECONCILED", "NORMAL_CLOSE"):
        if token not in demo_text:
            raise AssertionError(f"R4 demonstration missing evidence token {token}")

    all_material_fields = [field for material in route["steps"]["COMPREHENSIVE_PRACTICE"]["sourceMaterials"] for field in material["fields"]]
    values_by_id = {field["fieldId"]: field["value"] for field in all_material_fields}
    expected_values = {
        "cash_business_date": "2026-08-18",
        "cash_market_key": "MARKET_CLOSE_B",
        "cash_portfolio_key": "PORTFOLIO_CLOSE_B",
        "cash_security_key": "SECURITY_CLOSE_B",
        "external_reserve_closing": "1275000.00",
        "same_day_data_complete": "YES",
        "securities_business_date": "2026-08-18",
        "securities_market_key": "MARKET_CLOSE_B",
        "securities_portfolio_key": "PORTFOLIO_CLOSE_B",
        "securities_security_key": "SECURITY_CLOSE_B",
        "external_position_closing": "23500",
        "ledger_reserve_closing": "1275000.00",
        "securities_ledger_closing": "23500",
        "accounting_state": "ACCOUNTED",
        "approved_valuation_price": "62.40",
        "valuation_quantity": "23500",
        "valuation_reserve": "1275000.00",
        "valuation_market_value": "1466400.00",
        "valuation_result_amount": "1466400.00",
        "valuation_status": "CONFIRMED",
        "ca_completion": "YES",
        "scheduling_completion": "YES",
        "object_key_status": "PASS",
        "review_confirmed": "YES",
        "final_state": "RECONCILED",
        "close_decision": "NORMAL_CLOSE",
        "workpaper_entry_count": "1",
    }
    for field_id, expected in expected_values.items():
        if values_by_id.get(field_id) != expected:
            raise AssertionError(f"R4 comprehensive source field mismatch: {field_id}={values_by_id.get(field_id)!r}, expected={expected!r}")

    comp_text = json.dumps(route["steps"]["COMPREHENSIVE_PRACTICE"], ensure_ascii=False)
    for token in (comp["businessDate"], comp["marketKey"], comp["portfolioKey"], comp["securityKey"], "1275000.00", "23500", "62.40", "1466400.00", "READY", "ACCOUNTED", "CA", "调度", "复核"):
        if token not in comp_text:
            raise AssertionError(f"R4 comprehensive route missing evidence token {token}")

    calculation_text = json.dumps(
        [question for question in route["steps"]["BASIC_PRACTICE"]["questions"] if question["type"] == "CALCULATION"]
        + [item for item in route["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"] if item["type"] == "CALCULATION"],
        ensure_ascii=False,
    ).lower()
    for excluded in ("gross", "commission", "settlementamount", "commissionamount", "commissionrate", "tradeprice", "reservecashmovement"):
        if excluded in calculation_text:
            raise AssertionError(f"R4 calculation content must not repeat the R3 amount chain: {excluded}")

    route_text = json.dumps(route, ensure_ascii=False)
    rubric_text = json.dumps(rubric, ensure_ascii=False)
    for excluded_locator in ("B-I26", "B-P0184"):
        if excluded_locator in route_text or excluded_locator in rubric_text:
            raise AssertionError(f"R4 excluded boundary locator entered normal route/rubric: {excluded_locator}")
    evidence_text = json.dumps(r4_evidence, ensure_ascii=False)
    for locator in ("B-P0054-B-P0059", "B-P0141-B-P0181", "B-P0192-B-P0199", "B-I20", "B-I24", "B-I25"):
        if locator not in evidence_text:
            raise AssertionError(f"R4 evidence missing required material locator {locator}")
    if not all(locator in evidence_text for locator in r4_evidence["boundaryExclusions"]["materialLocators"]):
        raise AssertionError("R4 evidence boundary exclusions are not recorded")

    r3_comp = r3_evidence["fixtures"]["comprehensiveB"]
    if comp["brokerKey"] != r3_comp["brokerKey"] or r4_evidence["continuity"]["sharedBrokerKey"] != r3_evidence["continuity"]["sharedBrokerKey"]:
        raise AssertionError("R4 does not preserve the shared broker object from R3")
    for key in ("businessDate", "marketKey", "portfolioKey", "securityKey"):
        if comp[key] == r3_comp[key]:
            raise AssertionError(f"R4 comprehensive B must use an independent {key} from R3")
    print("FIXTURE LINK PASS R4: independent normal-close sources, full three-way checks, state prerequisites, material boundary and R3 calculation isolation closed")


def check_r1_fixture_links(route: dict[str, Any], snapshot: dict[str, Any], evidence: dict[str, Any]) -> None:
    demo_text = json.dumps(route["steps"]["DEMONSTRATION"], ensure_ascii=False)
    for field in ("grossAmount", "commissionAmount", "settlementAmount", "reserveClosing", "positionClosingQuantity", "valuationMarketValue"):
        if str(snapshot["fixtures"]["demonstrationA"][field]) not in demo_text:
            raise AssertionError(f"R1 demonstration value not visible: {field}")
    expected = {
        "gross_amount": "450000.00",
        "commission_amount": "360.00",
        "settlement_amount": "450360.00",
        "reserve_opening": "1200000.00",
        "reserve_closing": "749640.00",
        "position_opening_quantity": "1500",
        "position_closing_quantity": "13500",
        "valuation_price": "37.80",
        "valuation_quantity": "13500",
        "valuation_market_value": "510300.00",
        "valuation_reserve": "749640.00",
    }
    fields_by_id = {field["fieldId"]: field["value"] for material in route["steps"]["COMPREHENSIVE_PRACTICE"]["sourceMaterials"] for field in material["fields"]}
    for field_id, value in expected.items():
        if fields_by_id.get(field_id) != value:
            raise AssertionError(f"R1 comprehensive source field mismatch: {field_id}")
    evidence_text = json.dumps(evidence, ensure_ascii=False)
    for fixture_name in ("demonstrationA", "comprehensiveB"):
        for chain_value in evidence["answerChains"][fixture_name]["decimalChain"]:
            if chain_value["result"] not in evidence_text:
                raise AssertionError(f"R1 evidence chain missing {fixture_name} result {chain_value['result']}")
    print("FIXTURE LINK PASS R1: Demo A and comprehensive B answer chains remain closed")


def check_r2_fixture_links(route: dict[str, Any], r2_evidence: dict[str, Any]) -> None:
    demo = r2_evidence["fixtures"]["demonstrationA"]
    comp = r2_evidence["fixtures"]["comprehensiveB"]
    demo_text = json.dumps(route["steps"]["DEMONSTRATION"], ensure_ascii=False)
    for token in (demo["businessDate"], demo["marketKey"], demo["portfolioKey"], demo["securityKey"], "CASE-FORMAT-A-01", "recordCount=3", "parsedRows=3", "mappedRows=3", "15000", "625000.00", "READY"):
        if token not in demo_text:
            raise AssertionError(f"R2 demonstration missing evidence token {token}")

    all_material_fields = [field for material in route["steps"]["COMPREHENSIVE_PRACTICE"]["sourceMaterials"] for field in material["fields"]]
    field_ids = {field["fieldId"] for field in all_material_fields}
    required_suffixes = ("business_date", "market_key", "portfolio_key", "security_key", "file_group_version", "record_count", "quantity_control_total", "amount_control_total", "parsed_rows", "mapped_rows", "required_field_check")
    for suffix in required_suffixes:
        if not any(field_id == suffix or field_id.endswith(f"_{suffix}") for field_id in field_ids):
            raise AssertionError(f"R2 comprehensive source materials missing required field family {suffix}")
    expected_values = {
        "day_business_date": "2026-08-14",
        "day_market_key": "MARKET_DATA_B",
        "day_portfolio_key": "PORTFOLIO_DATA_B",
        "day_security_key": "SECURITY_DATA_B",
        "day_file_group_version": "CASE-FORMAT-B-02",
        "day_record_count": "4",
        "day_quantity_control_total": "22000",
        "day_amount_control_total": "995000.00",
        "day_parsed_rows": "4",
        "eod_mapped_rows": "4",
        "required_field_check": "PASS",
        "same_day_key_check": "PASS",
        "record_diff": "0",
        "quantity_diff": "0",
        "amount_diff": "0.00",
        "readiness_result": "READY",
    }
    values_by_id = {field["fieldId"]: field["value"] for field in all_material_fields}
    for field_id, expected in expected_values.items():
        if values_by_id.get(field_id) != expected:
            raise AssertionError(f"R2 comprehensive field mismatch: {field_id}={values_by_id.get(field_id)!r}, expected={expected!r}")
    comp_text = json.dumps(route["steps"]["COMPREHENSIVE_PRACTICE"], ensure_ascii=False)
    for token in (comp["businessDate"], comp["marketKey"], comp["portfolioKey"], comp["securityKey"], "CASE-FORMAT-B-02", "22000", "995000.00", "parsedRows=4", "mappedRows=4", "READY"):
        if token not in comp_text:
            raise AssertionError(f"R2 comprehensive route missing evidence token {token}")
    calculation_text = json.dumps(route["steps"]["BASIC_PRACTICE"]["questions"] + route["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"], ensure_ascii=False)
    for excluded in ("commission", "commission_amount", "reserve_opening", "reserve_closing", "settlement_amount"):
        if excluded in calculation_text:
            raise AssertionError(f"R2 calculation content overlaps R3 main chain: {excluded}")
    state_keys = set(r2_evidence["fixtures"]["comprehensiveB"]["stateObservations"])
    if state_keys != {"RECEIVED", "PARSED", "MAPPED", "COMPLETE", "READY"}:
        raise AssertionError("R2 comprehensive state observations do not prove exactly the five pre-accounting states")
    print("FIXTURE LINK PASS R2: required keys/versions/counts/totals/parsed/mapped/completeness fields and no R3 main-chain calculation overlap")


def check_common_evidence(snapshot: dict[str, Any], fields: dict[str, Any], states: dict[str, Any], deid: dict[str, Any], routes: dict[str, dict[str, Any]], evidence_docs: dict[str, dict[str, Any]]) -> None:
    for document in (snapshot, fields, states, deid, *evidence_docs.values()):
        if document.get("scope") != "ONLY_THIS_CASE":
            raise AssertionError(f"evidence scope is not ONLY_THIS_CASE: {document.get('evidenceId')}")
    if set(snapshot["provenanceLegend"]) != {"MATERIAL_ABSTRACTION", "SYNTHETIC_EDUCATIONAL", "CASE_POLICY"}:
        raise AssertionError("snapshot provenance legend is incomplete")
    expected_states = ["RECEIVED", "PARSED", "MAPPED", "COMPLETE", "READY", "ACCOUNTED", "RECONCILED"]
    if states["stateOrder"] != expected_states or snapshot["stateChain"]["stateCodes"] != expected_states:
        raise AssertionError("seven-state case chain is not frozen exactly")
    if states["readyCondition"]["result"] != "READY" or states["normalCloseCondition"]["result"] != "NORMAL_CLOSE":
        raise AssertionError("READY/normal-close case conditions are incomplete")
    shared_ids = {snapshot["evidenceId"], fields["evidenceId"], states["evidenceId"], deid["evidenceId"]}
    for label, evidence in evidence_docs.items():
        if set(evidence["sharedEvidence"]) != shared_ids:
            raise AssertionError(f"{label} evidence does not reference all four shared evidence assets")
        if evidence["routeId"] != routes[label]["routeId"]:
            raise AssertionError(f"{label} evidence routeId mismatch")
        route_ref_text = json.dumps(routes[label]["references"], ensure_ascii=False)
        required_sources = ("CBF-MAT-AUTO-PARSE", "CBF-MAT-GUIDE") if label in {"R1", "R2"} else ("CBF-MAT-GUIDE",)
        for source_code in required_sources:
            if source_code not in route_ref_text:
                raise AssertionError(f"{label} route reference missing {source_code}")
        if label in {"R1", "R2"}:
            if not re.search(r"A-P\d{4}-A-P\d{4}", route_ref_text) or not re.search(r"B-P\d{4}-B-P\d{4}", route_ref_text):
                raise AssertionError(f"{label} route references lack stable A-P/B-P material locators")
        elif label == "R3":
            if not re.search(r"B-P\d{4}-B-P\d{4}", route_ref_text) or "B-I01-B-I03" not in route_ref_text:
                raise AssertionError("R3 route references lack B-P/B-I material locators")
        else:
            for locator in ("B-P0054-B-P0059", "B-P0141-B-P0181", "B-P0192-B-P0199", "B-I20", "B-I24", "B-I25"):
                if locator not in route_ref_text:
                    raise AssertionError(f"R4 route references lack stable material locator: {locator}")
    if "CBF-EVID-NORMAL-R1" not in json.dumps(routes["R1"]["references"], ensure_ascii=False):
        raise AssertionError("R1 route reference missing shared evidence link")
    if "CBF-REF-DATA-EVIDENCE" not in json.dumps(routes["R2"]["references"], ensure_ascii=False):
        raise AssertionError("R2 route reference missing data evidence link")
    if "CBF-REF-SETTLEMENT-EVIDENCE" not in json.dumps(routes["R3"]["references"], ensure_ascii=False):
        raise AssertionError("R3 route reference missing settlement evidence link")
    if "CBF-REF-CLOSE-EVIDENCE" not in json.dumps(routes["R4"]["references"], ensure_ascii=False):
        raise AssertionError("R4 route reference missing close evidence link")
    print("EVIDENCE PASS: shared snapshot, field dictionary, seven states, de-identification, R1-R4 evidence and material locators linked")


def check_dependencies(snapshot: dict[str, Any], r2_evidence: dict[str, Any], r3_evidence: dict[str, Any], r4_evidence: dict[str, Any]) -> None:
    expected = [
        ("ACC-CBF-BOUNDARY-001", []),
        ("ACC-CBF-DATA-002", ["ACC-CBF-BOUNDARY-001"]),
        ("ACC-CBF-SETTLEMENT-003", ["ACC-CBF-DATA-002"]),
        ("ACC-CBF-RECON-004", ["ACC-CBF-SETTLEMENT-003"]),
    ]
    actual = [(item["routeId"], item["dependsOn"]) for item in snapshot["routeChain"]]
    if actual != expected:
        raise AssertionError(f"serial dependency chain mismatch: {actual}")
    if any(item["routeCode"] not in {"R1", "R2", "R3", "R4"} for item in snapshot["routeChain"]):
        raise AssertionError("unexpected route code in CBF chain")
    if any("STAGE_GATE" in json.dumps(item, ensure_ascii=False) for item in snapshot["routeChain"]):
        raise AssertionError("CBF chain must not introduce a STAGE_GATE")
    if snapshot["scopeExclusions"]["notMadeInThisBatch"] != ["A1", "A2", "DEFER"]:
        raise AssertionError("B0+B1/B2 scope exclusion changed")
    expected_focuses = {
        "ACC-CBF-BOUNDARY-001": "对象、账户角色、来源和责任映射",
        "ACC-CBF-DATA-002": "数据接收、解析、完整性与可启动判定",
        "ACC-CBF-SETTLEMENT-003": "gross、commission、settlement和reserve",
        "ACC-CBF-RECON-004": "资金、持仓、估值三方勾稽",
    }
    for item in snapshot["routeChain"]:
        if item["focus"] != expected_focuses[item["routeId"]]:
            raise AssertionError(f"route focus continuity mismatch: {item['routeId']}")
    expected_object_model = {"TRADE_OBJECT", "CLEARING_SETTLEMENT_ROLE", "BROKER_RESERVE_ROLE", "SECURITIES_LEDGER_ROLE", "VALUATION_RESULT_ROLE"}
    if set(r2_evidence["continuity"]["sharedObjectModel"]) != expected_object_model:
        raise AssertionError("R2 shared object model does not preserve the approved CBF object system")
    if r2_evidence["continuity"]["dependency"] != "ACC-CBF-BOUNDARY-001" or r2_evidence["continuity"]["nextRoute"] != "ACC-CBF-SETTLEMENT-003":
        raise AssertionError("R2 continuity dependency/next route mismatch")
    expected_r3_objects = {"TRADE_OBJECT", "CLEARING_SETTLEMENT_ROLE", "BROKER_RESERVE_ROLE", "COMMISSION_CASH_ROLE", "ROLE_SETTLEMENT_WORKPAPER"}
    if set(r3_evidence["continuity"]["sharedObjectModel"]) != expected_r3_objects:
        raise AssertionError("R3 shared object model does not preserve upstream objects and approved settlement increment")
    if r3_evidence["continuity"]["upstreamRoute"] != "ACC-CBF-DATA-002" or r3_evidence["continuity"]["nextRoute"] != "ACC-CBF-RECON-004":
        raise AssertionError("R3 continuity upstream/next route mismatch")
    if set(r3_evidence["continuity"]["notCovered"]) != {"position_reconciliation", "valuation_three_way_close"}:
        raise AssertionError("R3 must explicitly leave position/valuation three-way close to R4")
    expected_r4_objects = {
        "TRADE_OBJECT",
        "CLEARING_SETTLEMENT_ROLE",
        "BROKER_RESERVE_ROLE",
        "ROLE_SETTLEMENT_WORKPAPER",
        "SECURITIES_LEDGER_ROLE",
        "VALUATION_RESULT_ROLE",
        "CA_COMPLETION_ROLE",
        "SCHEDULE_CONFIRMATION_ROLE",
        "REVIEW_CONFIRMATION_ROLE",
        "NORMAL_CLOSE_WORKPAPER",
    }
    if set(r4_evidence["continuity"]["sharedObjectModel"]) != expected_r4_objects:
        raise AssertionError("R4 shared object model does not preserve R3 objects and add the approved close objects")
    if r4_evidence["continuity"]["sharedBrokerKey"] != r3_evidence["continuity"]["sharedBrokerKey"]:
        raise AssertionError("R4 shared broker object differs from R3")
    if r4_evidence["continuity"]["upstreamRoute"] != "ACC-CBF-SETTLEMENT-003" or r4_evidence["continuity"]["requiredUpstreamStates"] != ["READY", "ACCOUNTED"]:
        raise AssertionError("R4 upstream route/state prerequisites mismatch")
    if r4_evidence["continuity"]["finalState"] != "RECONCILED" or r4_evidence["continuity"]["nextRoute"] is not None:
        raise AssertionError("R4 must end at RECONCILED without an unapproved next route")
    if set(r4_evidence["continuity"]["notCovered"]) != {"forced_close", "exception_escalation", "historical_menu", "permission_matrix", "system_field_permanence"}:
        raise AssertionError("R4 excluded scope is not explicit")
    print("DEPENDENCY PASS: R1→R2→R3→R4 serial chain, shared object continuity, no STAGE_GATE, A1/A2/DEFER excluded")


def check_teaching_axes(routes: dict[str, dict[str, Any]]) -> None:
    route_texts = {label: json.dumps(route, ensure_ascii=False) for label, route in routes.items()}
    required_axis_tokens = {
        "R1": ("对象", "账户", "来源", "责任"),
        "R2": ("READY", "recordCount", "quantity_control_total", "amount_control_total"),
        "R3": ("gross", "commission", "settlement", "reserve"),
        "R4": ("三方", "估值", "RECONCILED", "CA"),
    }
    for label, tokens in required_axis_tokens.items():
        missing = [token for token in tokens if token not in route_texts[label]]
        if missing:
            raise AssertionError(f"{label} teaching axis is missing its independent tokens: {missing}")

    r1_text = route_texts["R1"].lower()
    r2_text = route_texts["R2"].lower()
    r3_text = route_texts["R3"].lower()
    r4_text = route_texts["R4"].lower()
    r2_calc_text = json.dumps(
        [question for question in routes["R2"]["steps"]["BASIC_PRACTICE"]["questions"] if question["type"] == "CALCULATION"]
        + [item for item in routes["R2"]["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"] if item["type"] == "CALCULATION"],
        ensure_ascii=False,
    ).lower()
    r3_calc_text = json.dumps(
        [question for question in routes["R3"]["steps"]["BASIC_PRACTICE"]["questions"] if question["type"] == "CALCULATION"]
        + [item for item in routes["R3"]["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"] if item["type"] == "CALCULATION"],
        ensure_ascii=False,
    ).lower()
    r4_calc_text = json.dumps(
        [question for question in routes["R4"]["steps"]["BASIC_PRACTICE"]["questions"] if question["type"] == "CALCULATION"]
        + [item for item in routes["R4"]["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"] if item["type"] == "CALCULATION"],
        ensure_ascii=False,
    ).lower()
    if "responsibility" in r1_text and "source" not in r1_text:
        raise AssertionError("R1 mapping axis did not retain source responsibility content")
    if any(token in r2_calc_text for token in ("commission", "settlementamount", "reserveopening")):
        raise AssertionError("R2 calculation axis repeats R3 settlement content")
    if any(token in r3_calc_text for token in ("position", "valuation")):
        raise AssertionError("R3 calculation axis repeats R4 position/valuation content")
    if any(token in r4_calc_text for token in ("gross", "commission", "settlementamount", "commissionrate", "tradeprice")):
        raise AssertionError("R4 calculation axis repeats R3 amount content")
    if not ("record" in r2_text and "ready" in r2_text and "gross" not in r2_calc_text):
        raise AssertionError("R2 does not remain a data-readiness axis")
    if not ("gross" in r3_text and "commission" in r3_text and "settlement" in r3_text):
        raise AssertionError("R3 does not remain an amount-chain axis")
    if not ("三方" in route_texts["R4"] and "reconciled" in r4_text):
        raise AssertionError("R4 does not remain a day-end three-way close axis")
    print("TEACHING AXIS PASS: R1 mapping, R2 READY, R3 settlement amount chain and R4 day-end three-way close remain distinct")


def check_sensitive_scan(paths: list[Path]) -> None:
    patterns = [
        re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
        re.compile(r"(?i)(?:password|passwd|cookie|secret|api[_-]?key|token)\s*[:=]"),
        re.compile(r"(?i)(?:https?://|file://)"),
        re.compile(r"(?i)(?:[A-Z]:\\|\\\\)"),
        re.compile(r"恒生|BZJYE|LXJSGXRQ|Microsoft_Excel|OLE-01|DBF|PACC"),
    ]
    hits: list[str] = []
    for path in paths:
        text = path.read_text(encoding="utf-8-sig")
        for pattern in patterns:
            if pattern.search(text):
                hits.append(f"{path.relative_to(REPO)}: {pattern.pattern}")
    if hits:
        raise AssertionError(f"sensitive scan matched: {hits}")
    print("SENSITIVE SCAN PASS: no personal identifiers, credentials, paths, private URLs, or audited historical system markers")


def main() -> int:
    routes = {label: read_json(path) for label, path in ROUTE_PATHS.items()}
    rubrics = {label: read_json(path) for label, path in RUBRIC_PATHS.items()}
    evidence = {label: read_json(EVIDENCE_PATHS[label.lower()]) for label in ROUTE_PATHS}
    snapshot = read_json(EVIDENCE_PATHS["snapshot"])
    fields = read_json(EVIDENCE_PATHS["fields"])
    states = read_json(EVIDENCE_PATHS["states"])
    deid = read_json(EVIDENCE_PATHS["deid"])

    route_schema = read_json(ROUTE_SCHEMA_PATH)
    rubric_schema = read_json(RUBRIC_SCHEMA_PATH)
    for label in ROUTE_PATHS:
        validate_schema(routes[label], route_schema, f"{label} route")
        validate_schema(rubrics[label], rubric_schema, f"{label} rubric")
        check_route_shape(label, routes[label])
        check_public_copy(label, routes[label])
        check_rubric_shape(label, rubrics[label])
        check_answer_mappings(label, routes[label], rubrics[label])

    check_r1_decimal(snapshot)
    check_r2_decimal(evidence["R2"])
    check_r3_decimal(evidence["R3"])
    check_r4_decimal(evidence["R4"])
    check_r1_fixture_links(routes["R1"], snapshot, evidence["R1"])
    check_r2_fixture_links(routes["R2"], evidence["R2"])
    check_r3_fixture_links(routes["R3"], evidence["R3"], evidence["R2"])
    check_r4_fixture_links(routes["R4"], rubrics["R4"], evidence["R4"], evidence["R3"])
    check_common_evidence(snapshot, fields, states, deid, routes, evidence)
    check_dependencies(snapshot, evidence["R2"], evidence["R3"], evidence["R4"])
    check_teaching_axes(routes)
    check_sensitive_scan([*ROUTE_PATHS.values(), *RUBRIC_PATHS.values(), *EVIDENCE_PATHS.values()])
    print("CBF R1-R4 MODULE CHECKS PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, InvalidOperation, OSError, KeyError, json.JSONDecodeError) as exc:
        print(f"CBF MODULE CHECKS FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
