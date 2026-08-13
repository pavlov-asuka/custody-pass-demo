"""Independent content, mapping, Decimal, and boundary checks for MF routes 001-005.

This verifier deliberately does not register routes or alter release/map files.
"""

from __future__ import annotations

import json
import re
import sys
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 60

REPO = Path(__file__).resolve().parents[1]
TARGETS = {
    "ACC-MF-FRAME-001": {
        "route": REPO / "content/routes/accounting/ACC-MF-FRAME-001.json",
        "rubric": REPO / "content/rubrics/accounting/ACC-MF-FRAME-001.json",
        "evidence": REPO / "content/references/ACC-MF-FRAME-001-evidence.md",
    },
    "ACC-MF-EIR-002": {
        "route": REPO / "content/routes/accounting/ACC-MF-EIR-002.json",
        "rubric": REPO / "content/rubrics/accounting/ACC-MF-EIR-002.json",
        "evidence": REPO / "content/references/ACC-MF-EIR-002-evidence.md",
    },
    "ACC-MF-TA-003": {
        "route": REPO / "content/routes/accounting/ACC-MF-TA-003.json",
        "rubric": REPO / "content/rubrics/accounting/ACC-MF-TA-003.json",
        "evidence": REPO / "content/references/ACC-MF-TA-003-evidence.md",
    },
    "ACC-MF-CARRY-004": {
        "route": REPO / "content/routes/accounting/ACC-MF-CARRY-004.json",
        "rubric": REPO / "content/rubrics/accounting/ACC-MF-CARRY-004.json",
        "evidence": REPO / "content/references/ACC-MF-CARRY-004-evidence.md",
    },
    "ACC-MF-YIELD-005": {
        "route": REPO / "content/routes/accounting/ACC-MF-YIELD-005.json",
        "rubric": REPO / "content/rubrics/accounting/ACC-MF-YIELD-005.json",
        "evidence": REPO / "content/references/ACC-MF-YIELD-005-evidence.md",
    },
}


def dec(value: str | int | Decimal) -> Decimal:
    return Decimal(str(value).replace(",", ""))


def close(actual: Decimal, expected: Decimal, tolerance: Decimal, label: str) -> None:
    if abs(actual - expected) > tolerance:
        raise AssertionError(
            f"{label}: actual={actual} expected={expected} tolerance={tolerance}"
        )


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def npv(rate: Decimal, initial: Decimal, cashflows: list[Decimal]) -> Decimal:
    one = Decimal(1)
    return sum((cashflow / ((one + rate) ** period) for period, cashflow in enumerate(cashflows, 1)), Decimal(0)) - initial


def solve_rate(initial: Decimal, cashflows: list[Decimal]) -> Decimal:
    """Bisection IRR solve for the positive, monotonic cases used here."""
    low = Decimal("0")
    high = Decimal("0.01")
    if npv(low, initial, cashflows) < 0 or npv(high, initial, cashflows) > 0:
        raise AssertionError("fixture IRR is not bracketed in [0, 0.01]")
    for _ in range(180):
        middle = (low + high) / 2
        if npv(middle, initial, cashflows) > 0:
            low = middle
        else:
            high = middle
    return (low + high) / 2


def check_route_shapes(routes: dict[str, dict], rubrics: dict[str, dict]) -> None:
    expected_types = {"FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION", "SHORT_TEXT"}
    for route_id, route in routes.items():
        steps = route["steps"]
        if len(steps["KNOWLEDGE_CARD"]["cards"]) != 3:
            raise AssertionError(f"{route_id}: knowledge card count is not 3")
        if len(steps["DEMONSTRATION"]["steps"]) != 5:
            raise AssertionError(f"{route_id}: demonstration step count is not 5")
        if len(steps["BASIC_PRACTICE"]["questions"]) != 5:
            raise AssertionError(f"{route_id}: basic question count is not 5")
        work_items = steps["COMPREHENSIVE_PRACTICE"]["workItems"]
        work_ids = {item["workItemId"] for item in work_items}
        work_types = {item["type"] for item in work_items}
        if not expected_types.issubset(work_types):
            raise AssertionError(f"{route_id}: missing comprehensive work-item type")
        rubric = rubrics[route_id]
        response_ids = set(rubric["referenceAnswer"]["responses"])
        if response_ids != work_ids:
            raise AssertionError(f"{route_id}: referenceAnswer/workItem IDs do not close")
        evidence_ids = set()
        for dimension in rubric["dimensions"]:
            for criterion in dimension["criteria"]:
                evidence_ids.update(rule["fieldId"] for rule in criterion["evidenceRules"])
        for mandatory in rubric["mandatoryRequirements"]:
            evidence_ids.update(rule["fieldId"] for rule in mandatory["evidenceRules"])
        if evidence_ids != work_ids:
            missing = sorted(work_ids - evidence_ids)
            extra = sorted(evidence_ids - work_ids)
            raise AssertionError(f"{route_id}: evidenceRules mismatch missing={missing} extra={extra}")
        question_ids = {question["questionId"] for question in steps["BASIC_PRACTICE"]["questions"]}
        target_ids = {target["targetId"] for target in rubric["remediationTargets"]}
        if len(rubric["mandatoryRequirements"]) != 2:
            raise AssertionError(f"{route_id}: mandatory requirement count is not 2")
        if (rubric["totalScore"], rubric["passScore"]) != (100, 75):
            raise AssertionError(f"{route_id}: score threshold mismatch")
        dimensions = {d["dimension"]: sum(c["weight"] for c in d["criteria"]) for d in rubric["dimensions"]}
        if dimensions != {"CONCEPT": 25, "PROCESS": 30, "RISK": 25, "EXPRESSION": 20}:
            raise AssertionError(f"{route_id}: dimension weights mismatch: {dimensions}")
        for target in rubric["remediationTargets"]:
            if target["questionId"] not in question_ids:
                raise AssertionError(f"{route_id}: remediation target points to unknown question")
        for dimension in rubric["dimensions"]:
            for criterion in dimension["criteria"]:
                if criterion["remediationTargetId"] not in target_ids:
                    raise AssertionError(f"{route_id}: criterion remediation target is unknown")
        for mandatory in rubric["mandatoryRequirements"]:
            if mandatory["remediationTargetId"] not in target_ids:
                raise AssertionError(f"{route_id}: mandatory remediation target is unknown")
        check_reference_evidence(route_id, rubric)
        print(f"SHAPE/MAPPING PASS {route_id}: cards=3 demo=5 basic=5 workItems={len(work_items)} types={sorted(work_types)}")


def check_process_coverage(routes: dict[str, dict], rubrics: dict[str, dict]) -> None:
    """PROCESS must carry structured source, calculation, entry, and reconciliation evidence."""
    required_types = {"FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION"}
    for route_id, route in routes.items():
        work_types = {
            item["workItemId"]: item["type"]
            for item in route["steps"]["COMPREHENSIVE_PRACTICE"]["workItems"]
        }
        process_ids = set()
        for dimension in rubrics[route_id]["dimensions"]:
            if dimension["dimension"] != "PROCESS":
                continue
            for criterion in dimension["criteria"]:
                process_ids.update(rule["fieldId"] for rule in criterion["evidenceRules"])
        process_types = {work_types[field_id] for field_id in process_ids}
        missing = sorted(required_types - process_types)
        if missing:
            raise AssertionError(f"{route_id}: PROCESS is missing structured evidence types {missing}")
        if "SHORT_TEXT" in process_types:
            raise AssertionError(f"{route_id}: SHORT_TEXT cannot be the primary PROCESS evidence")
        print(f"PROCESS COVERAGE PASS {route_id}: types={sorted(process_types)}")


def check_content_continuity(routes: dict[str, dict]) -> None:
    expected_order = [
        "ACC-MF-FRAME-001",
        "ACC-MF-EIR-002",
        "ACC-MF-TA-003",
        "ACC-MF-CARRY-004",
        "ACC-MF-YIELD-005",
    ]
    if list(routes) != expected_order:
        raise AssertionError(f"MF route order mismatch: {list(routes)}")
    for route_id, route in routes.items():
        scenario = route["steps"]["COMPREHENSIVE_PRACTICE"]["scenario"]
        purpose = scenario["purpose"]
        if "独立脱敏批次" not in purpose or "不承接其他路线" not in purpose:
            raise AssertionError(f"{route_id}: independent case-scope marker is missing")
    frame_materials = routes["ACC-MF-FRAME-001"]["steps"]["COMPREHENSIVE_PRACTICE"]["sourceMaterials"]
    frame_fields = {
        field["fieldId"]: field
        for material in frame_materials
        for field in material.get("fields", [])
    }
    if frame_fields["net-subscription"].get("unit") != "元":
        raise AssertionError("ACC-MF-FRAME-001 net-subscription must be an amount in 元")
    yield_demo_date = routes["ACC-MF-YIELD-005"]["steps"]["DEMONSTRATION"]["scenario"]["date"]
    if yield_demo_date != "2026-09-04日终及2026-09-05至2026-09-06节假日期间":
        raise AssertionError(f"YIELD demonstration date order mismatch: {yield_demo_date}")
    print("CONTINUITY PASS: FRAME→EIR→TA→CARRY→YIELD order, independent case scope, and amount/unit boundary")


def check_direct_source_links(routes: dict[str, dict], rubrics: dict[str, dict]) -> None:
    """Compare reference answers with same-named numeric source fields when present."""
    numeric_links = 0
    for route_id, route in routes.items():
        source_values = {
            field["fieldId"]: field["value"]
            for material in route["steps"]["COMPREHENSIVE_PRACTICE"]["sourceMaterials"]
            for field in material.get("fields", [])
        }
        responses = rubrics[route_id]["referenceAnswer"]["responses"]
        for field_id, source_value in source_values.items():
            if field_id not in responses:
                continue
            try:
                source_number = dec(source_value)
                answer_number = dec(responses[field_id])
            except (ArithmeticError, ValueError):
                continue
            close(answer_number, source_number, dec("0.000001"), f"{route_id} source/reference {field_id}")
            numeric_links += 1
    if numeric_links < 20:
        raise AssertionError(f"too few direct source/reference numeric links: {numeric_links}")
    print(f"SOURCE/REFERENCE LINK PASS: {numeric_links} same-named numeric fields independently compared")


def check_demo_evidence_links(routes: dict[str, dict]) -> None:
    required_tokens = {
        "ACC-MF-FRAME-001": ["10,068,000", "10,000,000", "10,030,000", "9,962,000", "1.000000", "0.996200"],
        "ACC-MF-EIR-002": ["0.000600", "24.474953", "1,999,400.719281", "1,999,600.359712", "1,999,800.119928", "2,000,000.000000"],
        "ACC-MF-TA-003": ["260,000", "90,000", "170,000", "8,570,000", "2,770,000", "1.000000"],
        "ACC-MF-CARRY-004": ["8,400.00", "1,500.00", "6,900.00", "8,100.00", "5,001,200", "2232"],
        "ACC-MF-YIELD-005": ["26,000.00", "0.260521%", "184,000,000", "27.462687", "4.531548%", "3,612.00"],
    }
    for route_id, tokens in required_tokens.items():
        demo_text = json.dumps(routes[route_id]["steps"]["DEMONSTRATION"], ensure_ascii=False)
        evidence_text = TARGETS[route_id]["evidence"].read_text(encoding="utf-8-sig")
        for token in tokens:
            if token not in demo_text or token not in evidence_text:
                raise AssertionError(f"{route_id}: demonstration/evidence token is not closed: {token}")
    print("DEMO/EVIDENCE LINK PASS: key demonstration numbers are present in evidence chains")


def check_reference_evidence(route_id: str, rubric: dict) -> None:
    """Evaluate every evidence rule against the route's reference answers."""
    responses = rubric["referenceAnswer"]["responses"]
    rules = []
    for dimension in rubric["dimensions"]:
        for criterion in dimension["criteria"]:
            rules.extend(criterion["evidenceRules"])
    for mandatory in rubric["mandatoryRequirements"]:
        rules.extend(mandatory["evidenceRules"])
    for rule in rules:
        field_id = rule["fieldId"]
        actual = responses[field_id]
        operator = rule["operator"]
        expected = rule["expected"]
        if operator == "EQUALS":
            if str(actual) != str(expected):
                raise AssertionError(f"{route_id}: reference answer fails EQUALS for {field_id}")
        elif operator == "NUMBER_EQUALS":
            close(dec(actual), dec(expected), dec(rule.get("tolerance", 0)), f"{route_id} {field_id}")
        elif operator == "CONTAINS_ALL":
            actual_text = str(actual).replace(",", "")
            for item in expected:
                if str(item).replace(",", "") not in actual_text:
                    raise AssertionError(f"{route_id}: reference answer fails CONTAINS_ALL for {field_id}: {item}")
        else:
            raise AssertionError(f"{route_id}: unsupported evidence operator {operator}")
    print(f"REFERENCE/RUBRIC PASS {route_id}: {len(rules)} evidence rules evaluate against referenceAnswer")


def check_decimal_fixtures(rubrics: dict[str, dict]) -> None:
    fixtures = [
        {
            "name": "FRAME demonstration",
            "cost_assets": dec("10068000"),
            "liabilities": dec("68000"),
            "units": dec("10000000"),
            "shadow_assets": dec("10030000"),
            "shadow_liabilities": dec("68000"),
            "expected_cost_nav": dec("10000000"),
            "expected_shadow_nav": dec("9962000"),
            "expected_cost_unit": dec("1.000000"),
            "expected_shadow_unit": dec("0.996200"),
        },
        {
            "name": "FRAME comprehensive",
            "cost_assets": dec("9116000"),
            "liabilities": dec("116000"),
            "units": dec("9000000"),
            "shadow_assets": dec("9168000"),
            "shadow_liabilities": dec("116000"),
            "expected_cost_nav": dec("9000000"),
            "expected_shadow_nav": dec("9052000"),
            "expected_cost_unit": dec("1.000000"),
            "expected_shadow_unit": dec("1.0057777777777777777777777777777777777777777777777778"),
        },
    ]
    for fixture in fixtures:
        cost_nav = fixture["cost_assets"] - fixture["liabilities"]
        shadow_nav = fixture["shadow_assets"] - fixture["shadow_liabilities"]
        close(cost_nav, fixture["expected_cost_nav"], dec("0.000001"), f'{fixture["name"]} cost NAV')
        close(shadow_nav, fixture["expected_shadow_nav"], dec("0.000001"), f'{fixture["name"]} shadow NAV')
        close(cost_nav / fixture["units"], fixture["expected_cost_unit"], dec("0.000001"), f'{fixture["name"]} cost unit NAV')
        close(shadow_nav / fixture["units"], fixture["expected_shadow_unit"], dec("0.000001"), f'{fixture["name"]} shadow unit NAV')
        close((shadow_nav - cost_nav), fixture["expected_shadow_nav"] - fixture["expected_cost_nav"], dec("0.000001"), f'{fixture["name"]} shadow gap')
        print(f'DECIMAL PASS {fixture["name"]}: cost NAV={cost_nav} shadow NAV={shadow_nav}')

    eir_fixtures = [
        {
            "name": "EIR demonstration",
            "initial": dec("1999201.198562"),
            "cashflows": [dec("1000"), dec("1000"), dec("1000"), dec("2001000")],
            "rate": dec("0.000600"),
            "receivable": dec("1000"),
            "principal": dec("2000000"),
            "expected_annual": dec("24.474953"),
            "expected_endings": [dec("1999400.719281"), dec("1999600.359712"), dec("1999800.119928"), dec("2000000.000000")],
        },
        {
            "name": "EIR comprehensive",
            "initial": dec("999700.479361"),
            "cashflows": [dec("700"), dec("700"), dec("1000700")],
            "rate": dec("0.000800"),
            "receivable": dec("700"),
            "principal": dec("1000000"),
            "expected_annual": dec("33.894670"),
            "expected_endings": [dec("999800.239744"), dec("999900.079936"), dec("1000000.000000")],
        },
    ]
    for fixture in eir_fixtures:
        solved = solve_rate(fixture["initial"], fixture["cashflows"])
        close(solved, fixture["rate"], dec("0.0000000001"), f'{fixture["name"]} IRR')
        annual = ((Decimal(1) + fixture["rate"]) ** 365 - Decimal(1)) * 100
        close(annual, fixture["expected_annual"], dec("0.000001"), f'{fixture["name"]} annualized rate')
        balance = fixture["initial"]
        for index, expected_end in enumerate(fixture["expected_endings"], start=1):
            income = balance * fixture["rate"]
            amortization = income - fixture["receivable"]
            balance += amortization
            close(balance, expected_end, dec("0.01"), f'{fixture["name"]} day{index} ending carrying')
        close(balance - fixture["principal"], Decimal(0), dec("0.01"), f'{fixture["name"]} terminal carrying')
        print(f'DECIMAL PASS {fixture["name"]}: solved IRR={solved} annualized={annual}')

    # Confirm that the rubric's independent answers stay within the same fixture tolerances.
    eir_answers = rubrics["ACC-MF-EIR-002"]["referenceAnswer"]["responses"]
    close(dec(eir_answers["actual-daily-rate"]), dec("0.000800"), dec("0.0000000001"), "rubric EIR rate")
    close(dec(eir_answers["annualized-rate-percent"]), dec("33.894670"), dec("0.000001"), "rubric EIR annualized rate")


def check_ta_carry_fixtures(rubrics: dict[str, dict]) -> None:
    ta_demo_net_cash = dec("260000") - dec("90000")
    ta_demo_net_units = ta_demo_net_cash / dec("1.000000")
    ta_demo_end_units = dec("8400000") + ta_demo_net_units
    ta_demo_end_cash = dec("2600000") + ta_demo_net_cash
    close(ta_demo_net_cash, dec("170000"), dec("0.01"), "TA demonstration net cash")
    close(ta_demo_net_units, dec("170000"), dec("0"), "TA demonstration net units")
    close(ta_demo_end_units, dec("8570000"), dec("0"), "TA demonstration ending units")
    close(ta_demo_end_cash, dec("2770000"), dec("0.01"), "TA demonstration ending cash")

    ta_answers = rubrics["ACC-MF-TA-003"]["referenceAnswer"]["responses"]
    close(dec(ta_answers["net-confirmed-cash"]), dec("250000"), dec("0.01"), "TA rubric net cash")
    close(dec(ta_answers["net-confirmed-units"]), dec("250000"), dec("0"), "TA rubric net units")
    close(dec(ta_answers["ending-units"]), dec("12850000"), dec("0"), "TA rubric ending units")
    close(dec(ta_answers["ending-cash"]), dec("4570000"), dec("0.01"), "TA rubric ending cash")
    for field in ("t-day-unit-delta", "management-ta-unit-diff", "ta-cash-diff", "management-cash-diff"):
        close(dec(ta_answers[field]), dec("0"), dec("0"), f"TA rubric {field}")
    print(f"DECIMAL PASS TA: demo net cash={ta_demo_net_cash} comp net cash={ta_answers['net-confirmed-cash']}")

    carry_demo_income = dec("7800") + dec("600")
    carry_demo_fees = dec("1000") + dec("240") + dec("180") + dec("60") + dec("20")
    carry_demo_profit = carry_demo_income - carry_demo_fees
    carry_demo_payable_before = dec("1200") + carry_demo_profit
    carry_demo_ending_payable = carry_demo_payable_before - dec("1200")
    carry_demo_ending_units = dec("5000000") + dec("1200") / dec("1.000000")
    close(carry_demo_income, dec("8400"), dec("0.01"), "CARRY demonstration income")
    close(carry_demo_fees, dec("1500"), dec("0.01"), "CARRY demonstration operating fees")
    close(carry_demo_profit, dec("6900"), dec("0.01"), "CARRY demonstration profit")
    close(carry_demo_payable_before, dec("8100"), dec("0.01"), "CARRY demonstration payable before distribution")
    close(carry_demo_ending_payable, dec("6900"), dec("0.01"), "CARRY demonstration ending payable")
    close(carry_demo_ending_units, dec("5001200"), dec("0"), "CARRY demonstration ending units")

    daily_profits = [
        (dec("4800") + dec("400")) - dec("1100"),
        (dec("4500") + dec("400")) - dec("1000"),
        (dec("4700") + dec("400")) - dec("1100"),
    ]
    carry_income = dec("4800") + dec("400") + dec("4500") + dec("400") + dec("4700") + dec("400")
    carry_fees = dec("1800") + dec("600") + dec("500") + dec("200") + dec("100")
    carry_profit = sum(daily_profits, Decimal(0))
    close(daily_profits[0], dec("4100"), dec("0.01"), "CARRY day1 profit")
    close(daily_profits[1], dec("3900"), dec("0.01"), "CARRY day2 profit")
    close(daily_profits[2], dec("4000"), dec("0.01"), "CARRY day3 profit")
    close(carry_income, dec("15200"), dec("0.01"), "CARRY comprehensive income")
    close(carry_fees, dec("3200"), dec("0.01"), "CARRY comprehensive operating fees")
    close(carry_profit, carry_income - carry_fees, dec("0.01"), "CARRY comprehensive profit")
    distribution_total = dec("7000") + dec("5000")
    close(distribution_total, carry_profit, dec("0.01"), "CARRY distribution total")
    close(dec("6800000") + dec("7000") / dec("1.000000"), dec("6807000"), dec("0"), "CARRY ending units")
    close(dec("3750000") - dec("5000"), dec("3745000"), dec("0.01"), "CARRY ending cash")
    carry_answers = rubrics["ACC-MF-CARRY-004"]["referenceAnswer"]["responses"]
    for field, expected, tolerance in (
        ("income-total", dec("15200"), dec("0.01")),
        ("operating-fee-total", dec("3200"), dec("0.01")),
        ("realized-profit", dec("12000"), dec("0.01")),
        ("payable-before-distribution", dec("12000"), dec("0.01")),
        ("ending-units", dec("6807000"), dec("0")),
        ("ending-cash", dec("3745000"), dec("0.01")),
        ("payable-after-distribution", dec("0"), dec("0.01")),
    ):
        close(dec(carry_answers[field]), expected, tolerance, f"CARRY rubric {field}")
    print(f"DECIMAL PASS CARRY: demo profit={carry_demo_profit} comp profit={carry_profit} distribution={distribution_total}")


def check_yield_fixtures(rubrics: dict[str, dict]) -> None:
    """Recalculate both YIELD cases without reading the route's answer values."""
    daily_values = [dec(value) for value in ("1.20", "1.25", "1.15", "1.30", "1.10", "1.28", "1.22")]
    daily_product = Decimal(1)
    for value in daily_values:
        daily_product *= Decimal(1) + value / dec("10000")
    daily_annual = (daily_product ** (dec("365") / dec("7")) - Decimal(1)) * dec("100")
    demo_deviation = dec("10006000") - dec("9980000")
    demo_deviation_rate = demo_deviation / dec("9980000") * dec("100")
    demo_term_numerator = dec("3200000") * dec("45") + dec("2000000") * dec("20")
    demo_duration_numerator = dec("3200000") * dec("50") + dec("2000000") * dec("80")
    demo_term_denominator = dec("3200000") + dec("2000000") + dec("1500000")
    demo_holiday_per10k = dec("2.10") + dec("2.20")
    demo_holiday_income = demo_holiday_per10k * dec("8400000") / dec("10000")
    close(demo_deviation, dec("26000"), dec("0.01"), "YIELD demonstration deviation")
    close(demo_deviation_rate, dec("0.260521"), dec("0.000001"), "YIELD demonstration deviation rate")
    close(demo_term_numerator, dec("184000000"), dec("0.01"), "YIELD demonstration term numerator")
    close(demo_term_numerator / demo_term_denominator, dec("27.462687"), dec("0.000001"), "YIELD demonstration average term")
    close(demo_duration_numerator, dec("320000000"), dec("0.01"), "YIELD demonstration duration numerator")
    close(demo_duration_numerator / demo_term_denominator, dec("47.761194"), dec("0.000001"), "YIELD demonstration average duration")
    close(sum(daily_values, Decimal(0)), dec("8.50"), dec("0.01"), "YIELD demonstration seven-day sum")
    close(daily_values[-1], dec("1.22"), dec("0.01"), "YIELD demonstration current per10k")
    close(daily_annual, dec("4.531548"), dec("0.000001"), "YIELD demonstration compound annualized")
    close(demo_holiday_per10k, dec("4.30"), dec("0.01"), "YIELD demonstration holiday per10k")
    close(demo_holiday_income, dec("3612"), dec("0.01"), "YIELD demonstration holiday income")

    monthly_values = [dec(value) for value in ("0.98", "1.02", "1.01", "0.99", "1.05", "1.03", "1.04")]
    monthly_sum = sum(monthly_values, Decimal(0))
    monthly_annual = (monthly_sum / dec("7") * dec("365") / dec("10000")) * dec("100")
    comp_deviation = dec("12401000") - dec("12450000")
    comp_deviation_rate = comp_deviation / dec("12450000") * dec("100")
    comp_term_numerator = dec("4800000") * dec("90") + dec("2700000") * dec("30")
    comp_duration_numerator = dec("4800000") * dec("110") + dec("2700000") * dec("150")
    comp_term_denominator = dec("4800000") + dec("2700000") + dec("2000000")
    comp_holiday_per10k = dec("1.10") + dec("1.20") + dec("1.15") + dec("1.05")
    comp_holiday_income = comp_holiday_per10k * dec("9600000") / dec("10000")
    close(comp_deviation, dec("-49000"), dec("0.01"), "YIELD comprehensive deviation")
    close(comp_deviation_rate, dec("-0.393574"), dec("0.000001"), "YIELD comprehensive deviation rate")
    close(comp_term_numerator, dec("513000000"), dec("0.01"), "YIELD comprehensive term numerator")
    close(comp_term_numerator / comp_term_denominator, dec("54"), dec("0.000001"), "YIELD comprehensive average term")
    close(comp_duration_numerator, dec("933000000"), dec("0.01"), "YIELD comprehensive duration numerator")
    close(comp_duration_numerator / comp_term_denominator, dec("98.210526"), dec("0.000001"), "YIELD comprehensive average duration")
    close(monthly_sum, dec("7.12"), dec("0.01"), "YIELD comprehensive seven-day sum")
    close(monthly_values[-1], dec("1.04"), dec("0.01"), "YIELD comprehensive current per10k")
    close(monthly_annual, dec("3.712571"), dec("0.000001"), "YIELD comprehensive simple annualized")
    close(comp_holiday_per10k, dec("4.50"), dec("0.01"), "YIELD comprehensive holiday per10k")
    close(comp_holiday_income, dec("4320"), dec("0.01"), "YIELD comprehensive holiday income")

    answers = rubrics["ACC-MF-YIELD-005"]["referenceAnswer"]["responses"]
    for field, expected, tolerance in (
        ("cost-nav", dec("12450000"), dec("0.01")),
        ("shadow-nav", dec("12401000"), dec("0.01")),
        ("deviation-amount", dec("-49000"), dec("0.01")),
        ("deviation-rate-percent", dec("-0.393574"), dec("0.000001")),
        ("eligible-asset-total", dec("9500000"), dec("0.01")),
        ("weighted-term-numerator", dec("513000000"), dec("0.01")),
        ("average-remaining-term", dec("54"), dec("0.000001")),
        ("weighted-duration-numerator", dec("933000000"), dec("0.01")),
        ("average-remaining-duration", dec("98.210526"), dec("0.000001")),
        ("per10k-current", dec("1.04"), dec("0.01")),
        ("seven-day-sum", dec("7.12"), dec("0.01")),
        ("annualized-percent", dec("3.712571"), dec("0.000001")),
        ("holiday-per10k-total", dec("4.50"), dec("0.01")),
        ("holiday-units", dec("9600000"), dec("0")),
        ("holiday-income-total", dec("4320"), dec("0.01")),
        ("holiday-income-diff", dec("0"), dec("0.01")),
    ):
        close(dec(answers[field]), expected, tolerance, f"YIELD rubric {field}")
    print(f"DECIMAL PASS YIELD: demo annualized={daily_annual} holiday income={demo_holiday_income}; comp annualized={monthly_annual} holiday income={comp_holiday_income}")


def check_sensitive_scan() -> None:
    patterns = [
        re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
        re.compile(r"(?i)(?:password|passwd|cookie|secret|api[_-]?key|token)\s*[:=]"),
        re.compile(r"(?i)(?:https?://)(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)"),
        re.compile(r"(?:身份证|手机号|真实账号|邮箱地址)\s*[:：=]"),
    ]
    hits: list[str] = []
    for target in TARGETS.values():
        for path in (target["route"], target["rubric"], target["evidence"]):
            text = path.read_text(encoding="utf-8-sig")
            for pattern in patterns:
                if pattern.search(text):
                    hits.append(str(path.relative_to(REPO)))
    if hits:
        raise AssertionError(f"sensitive scan matched: {sorted(set(hits))}")
    print("SENSITIVE SCAN PASS: no email, credential, private-network, or personal-identifier pattern")


def main() -> int:
    routes = {route_id: read_json(target["route"]) for route_id, target in TARGETS.items()}
    rubrics = {route_id: read_json(target["rubric"]) for route_id, target in TARGETS.items()}
    check_route_shapes(routes, rubrics)
    check_process_coverage(routes, rubrics)
    check_content_continuity(routes)
    check_direct_source_links(routes, rubrics)
    check_demo_evidence_links(routes)
    check_decimal_fixtures(rubrics)
    check_ta_carry_fixtures(rubrics)
    check_yield_fixtures(rubrics)
    check_sensitive_scan()
    print("MF CONTENT 001-005 INDEPENDENT CHECKS PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, KeyError, OSError, json.JSONDecodeError) as exc:
        print(f"MF CONTENT 001-005 CHECK FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
