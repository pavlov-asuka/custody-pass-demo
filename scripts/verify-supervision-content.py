#!/usr/bin/env python3
"""Deterministic, dependency-free checks for supervision content.

``--shared-only`` validates the five B0 files.  ``--route`` validates the
shared foundation plus one complete route/rubric/evidence/reference bundle;
``--full`` validates all four frozen bundles.  The verifier deliberately uses
only the Python standard library so it can run before content dependencies are
installed.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, getcontext
from pathlib import Path
from typing import Any, Iterable


getcontext().prec = 60

REPO = Path(__file__).resolve().parents[1]
FOUNDATION_PATH = REPO / "content" / "evidence" / "supervision" / "SPV-FOUNDATION-001.json"
REFERENCE_PATH = REPO / "content" / "references" / "supervision" / "SPV-FOUNDATION-001-evidence.md"
FIXTURE_PATHS = {
    "A": REPO / "tests" / "fixtures" / "supervision" / "SPV-A.json",
    "B": REPO / "tests" / "fixtures" / "supervision" / "SPV-B.json",
}

ROUTE_ASSET_DIRS = {
    "SPV-CONTRACT-001": "contract",
    "SPV-RULE-002": "rule",
    "SPV-TASK-003": "task",
    "SPV-CLOSE-004": "close",
}

ROUTE_IDS = [
    "SPV-CONTRACT-001",
    "SPV-RULE-002",
    "SPV-TASK-003",
    "SPV-CLOSE-004",
]
EXPECTED_RELEASE_ID = "CUSTODY_2026.08.12"
EXPECTED_MAP_VERSION = "2026.08.12"
SOURCE_IDS = {f"M{index:02d}" for index in range(1, 12)}
EXPECTED_FIXTURE_IDS = {"A": "EDU-SPV-A-001", "B": "EDU-SPV-B-002"}
EXPECTED_FOUNDATION_FIXTURE_ROLE = "FOUNDATION_NORMAL_REFERENCE"
EXPECTED_FOUNDATION_FIXTURE_USAGE = "FOUNDATION_SHARED_ONLY"
EXPECTED_RATIO_NUMERATOR = {"A": "4", "B": "3"}
EXPECTED_RATIO = {"A": Decimal("0.0400"), "B": Decimal("0.0300")}
EXPECTED_RATIO_DISPLAY = {"A": "4%", "B": "3%"}
EXPECTED_TIMELINE = [
    "CONTRACT_REVIEWED",
    "INTRADAY_ENABLED",
    "POSTTRADE_ENABLED",
    "RULE_CONFIGURED",
    "DATA_IMPORT_SUCCESS",
    "SYSTEM_SETTINGS_NORMAL",
    "TASK_EXECUTED",
    "RESULT_CONFIRMED",
    "NOTICE_GENERATED",
    "NOTICE_SENT",
    "REPLY_RECORDED",
    "ARCHIVED",
]
EXPECTED_VALUE_KEYS = [
    "teachingKey",
    "contractReviewDate",
    "enableDate",
    "dataDate",
    "stopDate",
    "contractReviewStatus",
    "intradayStatus",
    "posttradeStatus",
    "ruleStatus",
    "ruleType",
    "numeratorCode",
    "denominatorCode",
    "B0100001",
    "B0100002",
    "B0100003",
    "CS_BLXX",
    "adjustmentDaysN",
    "adjustmentDaysNMinus1",
    "dataImportStatus",
    "systemSettingsStatus",
    "taskStatus",
    "resultStatus",
    "noticeGenerationStatus",
    "noticeSendStatus",
    "managerReplyStatus",
    "archiveStatus",
]
STATUS_FIELD_EXPECTATIONS = {
    "contractReviewStatus": "CONTRACT_REVIEWED",
    "intradayStatus": "INTRADAY_ENABLED",
    "posttradeStatus": "POSTTRADE_ENABLED",
    "ruleStatus": "RULE_CONFIGURED",
    "dataImportStatus": "DATA_IMPORT_SUCCESS",
    "systemSettingsStatus": "SYSTEM_SETTINGS_NORMAL",
    "taskStatus": "TASK_EXECUTED",
    "resultStatus": "RESULT_CONFIRMED",
    "noticeGenerationStatus": "NOTICE_GENERATED",
    "noticeSendStatus": "NOTICE_SENT",
    "managerReplyStatus": "REPLY_RECORDED",
    "archiveStatus": "ARCHIVED",
}

# These expressions are intentionally narrow.  They catch source paths and
# actual sensitive values while allowing the evidence asset to state that such
# material is excluded.
ABSOLUTE_PATH_PATTERNS = [
    re.compile(r"(?:^|[\s\"'`])/(?:Users|private|tmp|var|System|Volumes)(?:[/\s\"'`]|$)"),
    re.compile(r"(?:^|[\s\"'`])[A-Za-z]:[\\/](?:[^\s\"'`]+)"),
    re.compile(r"(?:^|[\s\"'`])\\\\[^\s\"'`]+"),
    re.compile(r"(?i)(?:file|https?)://[^\s\"'`]+"),
]
IMAGE_PATH_PATTERN = re.compile(
    r"(?i)(?:^|[\s\"'`])[^\s\"'`]+\.(?:png|jpe?g|gif|bmp|webp|svg|emf|wmf|vsd|vsdx|tif|tiff|heic)(?:$|[\s\"'`])"
)
EMAIL_PATTERN = re.compile(r"(?i)(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z0-9.-])")
PHONE_PATTERN = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
CREDENTIAL_PATTERN = re.compile(r"(?i)(?:sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{16,})")
REAL_ENTITY_PATTERN = re.compile(r"建设银行|中国建设银行|建行")


class Validation:
    def __init__(self) -> None:
        self.checks = 0
        self.passes = 0
        self.failures: list[str] = []

    def check(self, label: str, condition: bool, detail: str = "") -> None:
        self.checks += 1
        if condition:
            self.passes += 1
            return
        self.failures.append(f"FAIL {label}: {detail}" if detail else f"FAIL {label}")

    def section(self, title: str) -> None:
        print(f"CHECK {title}")


def read_json(path: Path, validation: Validation) -> Any:
    if not path.is_file():
        validation.check(f"file.exists.{path.relative_to(REPO)}", False)
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as error:
        validation.check(f"file.json.{path.relative_to(REPO)}", False, str(error))
        return None


def walk_strings(value: Any, path: str = "$") -> Iterable[tuple[str, str]]:
    if isinstance(value, dict):
        for key, child in value.items():
            yield from walk_strings(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_strings(child, f"{path}[{index}]")
    elif isinstance(value, str):
        yield path, value


def walk_keys(value: Any, path: str = "$") -> Iterable[tuple[str, str]]:
    """Yield every object key and its JSON path for private-field scans."""
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            yield child_path, str(key)
            yield from walk_keys(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_keys(child, f"{path}[{index}]")


def read_text(path: Path, validation: Validation) -> str:
    if not path.is_file():
        validation.check(f"file.exists.{path.relative_to(REPO)}", False)
        return ""
    try:
        return path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeError) as error:
        validation.check(f"file.text.{path.relative_to(REPO)}", False, str(error))
        return ""


def parse_date(value: Any) -> date:
    text = str(value).strip()
    if re.fullmatch(r"\d{8}", text):
        return datetime.strptime(text, "%Y%m%d").date()
    return date.fromisoformat(text)


def decimal(value: Any) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise InvalidOperation("boolean/null is not a Decimal")
    if not isinstance(value, str):
        raise InvalidOperation("Decimal fixture values must be JSON strings")
    return Decimal(value.strip())


def decimal_places(value: str) -> int:
    text = str(value).strip().lstrip("+-")
    if "." not in text:
        return 0
    return len(text.split(".", 1)[1])


class FormulaParser:
    """Small Decimal-only parser for the B0 arithmetic grammar."""

    TOKEN = re.compile(r"\s*(?:(\d+(?:\.\d+)?)|([A-Za-z][A-Za-z0-9_]*)|([()+\-*/]))")

    def __init__(self, expression: str, names: dict[str, Decimal]):
        self.names = names
        self.tokens: list[tuple[str, str]] = []
        position = 0
        while position < len(expression):
            match = self.TOKEN.match(expression, position)
            if not match:
                raise ValueError(f"unsupported formula token near {expression[position:]!r}")
            if match.group(1):
                self.tokens.append(("number", match.group(1)))
            elif match.group(2):
                self.tokens.append(("name", match.group(2)))
            else:
                self.tokens.append(("operator", match.group(3)))
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
        result = self.additive()
        if self.index != len(self.tokens):
            raise ValueError("trailing formula tokens")
        return result

    def additive(self) -> Decimal:
        result = self.multiplicative()
        while self.peek("+") or self.peek("-"):
            operator = self.consume()[1]
            right = self.multiplicative()
            result = result + right if operator == "+" else result - right
        return result

    def multiplicative(self) -> Decimal:
        result = self.factor()
        while self.peek("*") or self.peek("/"):
            operator = self.consume()[1]
            right = self.factor()
            if operator == "*":
                result *= right
            else:
                result /= right
        return result

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
        if kind == "number":
            return Decimal(value)
        if kind == "name" and value in self.names:
            return self.names[value]
        raise ValueError(f"unknown formula name {value!r}")


def evaluate_formula(expression: str, names: dict[str, Decimal]) -> Decimal:
    return FormulaParser(expression, names).parse()


def shape(value: Any) -> Any:
    if isinstance(value, dict):
        return ("dict", tuple((key, shape(child)) for key, child in sorted(value.items())))
    if isinstance(value, list):
        return ("list", len(value), tuple(shape(child) for child in value))
    if value is None:
        return ("null",)
    if isinstance(value, bool):
        return ("bool",)
    if isinstance(value, (int, float)):
        return ("number",)
    return ("string",)


def source_ids_from_foundation(foundation: dict[str, Any]) -> set[str]:
    materials = foundation.get("sourceMaterials", [])
    if not isinstance(materials, list):
        return set()
    return {item.get("sourceId") for item in materials if isinstance(item, dict)}


def check_foundation(foundation: Any, validation: Validation) -> tuple[set[str], set[str], set[str]]:
    validation.section("foundation identity and source index")
    validation.check("foundation.object", isinstance(foundation, dict))
    if not isinstance(foundation, dict):
        return set(), set(), set()

    validation.check("foundation.evidenceId", foundation.get("evidenceId") == "SPV-FOUNDATION-001")
    validation.check("foundation.version", foundation.get("version") == "1.0.0")
    validation.check("foundation.line", foundation.get("line") == "SUPERVISION")
    validation.check("foundation.scope", foundation.get("scope") == "ONLY_THIS_CASE")
    validation.check("foundation.provenance", foundation.get("provenance") == "SYNTHETIC_EDUCATIONAL")

    materials = foundation.get("sourceMaterials")
    source_ids = source_ids_from_foundation(foundation)
    validation.check("foundation.sourceMaterials.list", isinstance(materials, list))
    validation.check("foundation.sourceMaterials.ids", source_ids == SOURCE_IDS, f"actual={sorted(source_ids)}")
    if isinstance(materials, list):
        for index, material in enumerate(materials):
            label = f"foundation.sourceMaterials[{index}]"
            validation.check(f"{label}.object", isinstance(material, dict))
            if isinstance(material, dict):
                validation.check(f"{label}.locator", bool(material.get("locator")))
                validation.check(f"{label}.objectType", material.get("objectType") in {"DOCX", "PDF"})
                validation.check(f"{label}.image-policy", "imageHandling" in material)

    topology = foundation.get("topology", {})
    validation.check("foundation.topology.availability", topology.get("availability") == "OPEN")
    validation.check("foundation.topology.publication-status", topology.get("publicationStatus") == "PUBLISHED")
    validation.check("foundation.topology.release-registration", topology.get("releaseRegistration") == f"PUBLISHED_IN_{EXPECTED_RELEASE_ID}")
    validation.check("foundation.topology.registration-stage", topology.get("registrationStage") == "C1")
    validation.check("foundation.topology.release-id", topology.get("releaseId") == EXPECTED_RELEASE_ID)
    validation.check("foundation.topology.map-version", topology.get("mapVersion") == EXPECTED_MAP_VERSION)
    validation.check("foundation.topology.order", topology.get("routeOrder") == ROUTE_IDS)
    routes = topology.get("routes", [])
    validation.check("foundation.topology.routes", isinstance(routes, list) and len(routes) == 4)
    route_ids: set[str] = set()
    if isinstance(routes, list):
        for route in routes:
            if not isinstance(route, dict):
                continue
            route_id = route.get("routeId")
            route_ids.add(route_id)
            validation.check(f"topology.route.{route_id}.pathType", route.get("pathType") == "REQUIRED")
            validation.check(f"topology.route.{route_id}.stageGate", route.get("stageGate") is False)
            validation.check(f"topology.route.{route_id}.availability", route.get("availability") == "OPEN")
    validation.check("foundation.topology.routeIds", route_ids == set(ROUTE_IDS), f"actual={sorted(route_ids)}")

    field_items = foundation.get("fieldDictionary")
    field_ids: set[str] = set()
    validation.check("foundation.fieldDictionary.list", isinstance(field_items, list))
    if isinstance(field_items, list):
        for item in field_items:
            if not isinstance(item, dict):
                continue
            field_id = item.get("fieldId")
            field_ids.add(field_id)
            refs = item.get("sourceMaterialIds", [])
            validation.check(f"field.{field_id}.sourceIds", isinstance(refs, list) and set(refs) <= source_ids)
            validation.check(f"field.{field_id}.kind", item.get("kind") in {"IDENTIFIER", "DATE", "STATUS", "ENUM", "DECIMAL"})
    validation.check("foundation.required.fields", set(EXPECTED_VALUE_KEYS) <= field_ids, f"missing={sorted(set(EXPECTED_VALUE_KEYS) - field_ids)}")

    formula_rules = foundation.get("formulaRules", [])
    expressions = {item.get("expression") for item in formula_rules if isinstance(item, dict)}
    validation.check("foundation.formulas.list", isinstance(formula_rules, list))
    validation.check(
        "foundation.formulas.required",
        {
            "B0100001 = B0100002 / B0100003",
            "B0100001 < CS_BLXX",
            "CS_BLXX = 5%",
            "adjustmentDaysNMinus1 = adjustmentDaysN - 1",
        } <= expressions,
        f"actual={sorted(expressions)}",
    )
    if isinstance(formula_rules, list):
        for index, rule in enumerate(formula_rules):
            if isinstance(rule, dict):
                validation.check(f"formula[{index}].scope", rule.get("scope") == "ONLY_THIS_CASE")
                validation.check(f"formula[{index}].provenance", "SYNTHETIC_EDUCATIONAL" in str(rule.get("provenance")))

    date_rules = foundation.get("dateRules", [])
    date_expressions = {item.get("expression") for item in date_rules if isinstance(item, dict)}
    validation.check("foundation.dateRules.required", "enableDate <= dataDate < stopDate" in date_expressions)
    validation.check("foundation.dateRules.default", any(item.get("defaultStopDate") == "29991231" for item in date_rules if isinstance(item, dict)))

    status_model = foundation.get("statusModel", {})
    allowed_statuses = {item.get("code") for item in status_model.get("allowedStatuses", []) if isinstance(item, dict)}
    validation.check("foundation.status.scope", status_model.get("scope") == "ONLY_THIS_CASE")
    validation.check("foundation.status.provenance", "SYNTHETIC_EDUCATIONAL" in str(status_model.get("provenance")))
    validation.check("foundation.status.required", set(EXPECTED_TIMELINE) <= allowed_statuses)
    allowed_transitions = {
        (item.get("from"), item.get("to"))
        for item in status_model.get("allowedTransitions", [])
        if isinstance(item, dict)
    }
    validation.check("foundation.status.normal-transitions", all(pair in allowed_transitions for pair in zip(EXPECTED_TIMELINE, EXPECTED_TIMELINE[1:])))
    validation.check("foundation.status.notice-separation", ("NOTICE_GENERATED", "NOTICE_SENT") in allowed_transitions)

    evidence_items = foundation.get("evidenceIndex", [])
    evidence_refs: set[str] = set()
    validation.check("foundation.evidenceIndex.list", isinstance(evidence_items, list))
    for item in evidence_items if isinstance(evidence_items, list) else []:
        if not isinstance(item, dict):
            continue
        evidence_ref = item.get("evidenceRef")
        evidence_refs.add(evidence_ref)
        validation.check(f"evidence.{evidence_ref}.sources", set(item.get("sourceMaterialIds", [])) <= source_ids)
        validation.check(f"evidence.{evidence_ref}.locator", bool(item.get("locators")))
        validation.check(f"evidence.{evidence_ref}.images", item.get("allowImages") is False)
        validation.check(f"evidence.{evidence_ref}.scope", item.get("scope") == "ONLY_THIS_CASE")
        validation.check(f"evidence.{evidence_ref}.provenance", item.get("provenance") == "SYNTHETIC_EDUCATIONAL")

    boundaries = foundation.get("routeEvidenceBoundaries", [])
    boundary_route_ids = {item.get("routeId") for item in boundaries if isinstance(item, dict)}
    validation.check("foundation.routeEvidenceBoundaries.routes", boundary_route_ids == set(ROUTE_IDS))
    for item in boundaries if isinstance(boundaries, list) else []:
        if not isinstance(item, dict):
            continue
        route_id = item.get("routeId")
        validation.check(f"boundary.{route_id}.evidenceRefs", set(item.get("evidenceRefs", [])) <= evidence_refs)
        validation.check(f"boundary.{route_id}.sources", set(item.get("allowedSourceMaterialIds", [])) <= source_ids)
        validation.check(f"boundary.{route_id}.scope", item.get("scope") == "ONLY_THIS_CASE")
        validation.check(f"boundary.{route_id}.provenance", item.get("provenance") == "SYNTHETIC_EDUCATIONAL")
        validation.check(f"boundary.{route_id}.status", item.get("status") == "PUBLISHED")
        validation.check(f"boundary.{route_id}.availability", item.get("availability") == "OPEN")
        validation.check(f"boundary.{route_id}.release-registration", item.get("releaseRegistration") == f"PUBLISHED_IN_{EXPECTED_RELEASE_ID}")
        validation.check(f"boundary.{route_id}.registration-stage", item.get("registrationStage") == "C1")
        validation.check(f"boundary.{route_id}.release-id", item.get("releaseId") == EXPECTED_RELEASE_ID)
        validation.check(f"boundary.{route_id}.map-version", item.get("mapVersion") == EXPECTED_MAP_VERSION)

    defer_items = foundation.get("deferRegister", [])
    validation.check("foundation.deferRegister.list", isinstance(defer_items, list) and len(defer_items) >= 4)
    for index, item in enumerate(defer_items if isinstance(defer_items, list) else []):
        if isinstance(item, dict):
            refs = item.get("sourceMaterialIds", [])
            if item.get("sourceMaterialId"):
                refs = [item["sourceMaterialId"]]
            validation.check(f"defer[{index}].status", item.get("status") == "DEFER")
            validation.check(f"defer[{index}].sourceIds", set(refs) <= source_ids)
            validation.check(f"defer[{index}].reason", bool(item.get("reason")))

    policy = foundation.get("deidentificationPolicy", {})
    validation.check("foundation.deidentification.scope", policy.get("scope") == "ONLY_THIS_CASE")
    validation.check("foundation.deidentification.provenance", policy.get("provenance") == "SYNTHETIC_EDUCATIONAL")
    validation.check("foundation.deidentification.excluded", len(policy.get("excludedData", [])) >= 4)
    validation.check("foundation.deidentification.replacements", len(policy.get("replacementPolicy", [])) >= 4)

    fixture_contract = foundation.get("fixtureContract", {})
    validation.check("foundation.fixtureContract.scope", fixture_contract.get("scope") == "ONLY_THIS_CASE")
    validation.check("foundation.fixtureContract.provenance", fixture_contract.get("provenance") == "SYNTHETIC_EDUCATIONAL")
    validation.check("foundation.fixtureContract.ids", set(fixture_contract.get("fixtureIds", [])) == set(EXPECTED_FIXTURE_IDS.values()))
    validation.check("foundation.fixtureContract.role", fixture_contract.get("fixtureRole") == EXPECTED_FOUNDATION_FIXTURE_ROLE)
    validation.check("foundation.fixtureContract.usage", fixture_contract.get("fixtureUsage") == EXPECTED_FOUNDATION_FIXTURE_USAGE)
    validation.check("foundation.fixtureContract.shared-boundary", isinstance(fixture_contract.get("sharedFixtureBoundary"), str) and "不是任何路线的私有综合实务 fixture" in fixture_contract.get("sharedFixtureBoundary", ""))
    practice_policy = fixture_contract.get("routeSpecificPracticePolicy", {})
    validation.check("foundation.fixtureContract.practice-policy", isinstance(practice_policy, dict) and practice_policy.get("required") is True)
    validation.check("foundation.fixtureContract.practice-ownership", isinstance(practice_policy, dict) and practice_policy.get("ownership") == "EACH_ROUTE_INDEPENDENT")
    validation.check("foundation.fixtureContract.practice-routes", isinstance(practice_policy, dict) and practice_policy.get("routeIds") == ROUTE_IDS)
    validation.check("foundation.fixtureContract.practice-not-shared", isinstance(practice_policy, dict) and practice_policy.get("sharedFixturesAreNotRoutePractice") is True)
    validation.check("foundation.fixtureContract.isomorphic", fixture_contract.get("isomorphic") is True)
    validation.check("foundation.fixtureContract.keys", fixture_contract.get("requiredValueKeys") == EXPECTED_VALUE_KEYS)
    validation.check("foundation.fixtureContract.sequence", fixture_contract.get("requiredNormalStatusSequence") == EXPECTED_TIMELINE)
    return source_ids, field_ids, evidence_refs


def check_fixture(
    label: str,
    fixture: Any,
    source_ids: set[str],
    field_ids: set[str],
    evidence_refs: set[str],
    allowed_statuses: set[str],
    allowed_transitions: set[tuple[str, str]],
    validation: Validation,
) -> None:
    validation.section(f"fixture {label}")
    validation.check(f"fixture.{label}.object", isinstance(fixture, dict))
    if not isinstance(fixture, dict):
        return
    validation.check(f"fixture.{label}.id", fixture.get("fixtureId") == EXPECTED_FIXTURE_IDS[label])
    validation.check(f"fixture.{label}.caseLabel", fixture.get("caseLabel") == label)
    validation.check(f"fixture.{label}.provenance", fixture.get("provenance") == "SYNTHETIC_EDUCATIONAL")
    validation.check(f"fixture.{label}.scope", fixture.get("scope") == "ONLY_THIS_CASE")
    validation.check(f"fixture.{label}.role", fixture.get("fixtureRole") == EXPECTED_FOUNDATION_FIXTURE_ROLE)
    validation.check(f"fixture.{label}.usage", fixture.get("fixtureUsage") == EXPECTED_FOUNDATION_FIXTURE_USAGE)
    fixture_boundary = fixture.get("routeSpecificPracticePolicy", {})
    validation.check(f"fixture.{label}.foundation-only", isinstance(fixture_boundary, dict) and fixture_boundary.get("isFoundationOnly") is True)
    validation.check(f"fixture.{label}.not-route-private", isinstance(fixture_boundary, dict) and fixture_boundary.get("isRoutePrivatePractice") is False)
    validation.check(f"fixture.{label}.independent-practice", isinstance(fixture_boundary, dict) and fixture_boundary.get("independentRoutePracticeRequired") is True)
    validation.check(f"fixture.{label}.practice-owner", isinstance(fixture_boundary, dict) and fixture_boundary.get("routePracticeOwner") == "ROUTE_EVIDENCE_BUNDLES")
    validation.check(f"fixture.{label}.shared-closure-boundary", isinstance(fixture_boundary, dict) and "不代表任一路线私有综合实务已发送、回函或归档" in fixture_boundary.get("sharedStatusTimelineInterpretation", ""))
    validation.check(f"fixture.{label}.routes", fixture.get("routeIds") == ROUTE_IDS)
    validation.check(f"fixture.{label}.sources", set(fixture.get("sourceMaterialIds", [])) <= source_ids)
    validation.check(f"fixture.{label}.evidenceRefs", set(fixture.get("evidenceRefs", [])) == evidence_refs)

    values = fixture.get("values")
    validation.check(f"fixture.{label}.values.object", isinstance(values, dict))
    if not isinstance(values, dict):
        return
    validation.check(f"fixture.{label}.value-keys", list(values.keys()) == EXPECTED_VALUE_KEYS)
    validation.check(f"fixture.{label}.field-dictionary-keys", set(values) <= field_ids)
    for field_id, field in values.items():
        field_label = f"fixture.{label}.value.{field_id}"
        validation.check(f"{field_label}.object", isinstance(field, dict))
        if not isinstance(field, dict):
            continue
        validation.check(f"{field_label}.provenance", field.get("provenance") == "SYNTHETIC_EDUCATIONAL")
        validation.check(f"{field_label}.scope", field.get("scope") == "ONLY_THIS_CASE")
        validation.check(f"{field_label}.sources", set(field.get("sourceMaterialIds", [])) <= source_ids)

    # Numeric values remain strings so Decimal precision cannot be lost through
    # JSON float conversion.
    decimal_fields = {
        "B0100001": 4,
        "B0100002": 0,
        "B0100003": 0,
        "CS_BLXX": 4,
        "adjustmentDaysN": 0,
        "adjustmentDaysNMinus1": 0,
    }
    decimals: dict[str, Decimal] = {}
    for field_id, expected_scale in decimal_fields.items():
        field = values.get(field_id, {})
        raw = field.get("value") if isinstance(field, dict) else None
        try:
            parsed = decimal(raw)
            decimals[field_id] = parsed
            validation.check(f"fixture.{label}.value.{field_id}.decimal-string", isinstance(raw, str))
            validation.check(f"fixture.{label}.decimal.{field_id}.scale", decimal_places(raw) == expected_scale, f"value={raw!r}")
            validation.check(f"fixture.{label}.decimal.{field_id}.metadata", field.get("kind") == "DECIMAL" and field.get("scale") == expected_scale)
        except (InvalidOperation, ValueError) as error:
            validation.check(f"fixture.{label}.decimal.{field_id}", False, str(error))

    if len(decimals) == len(decimal_fields):
        try:
            ratio = decimals["B0100002"] / decimals["B0100003"]
            validation.check(f"fixture.{label}.formula.ratio", ratio == decimals["B0100001"], f"expected={ratio} actual={decimals['B0100001']}")
            validation.check(f"fixture.{label}.formula.lower-bound", decimals["B0100001"] < decimals["CS_BLXX"])
            validation.check(f"fixture.{label}.formula.limit", decimals["CS_BLXX"] == Decimal("0.0500"))
            validation.check(f"fixture.{label}.formula.n-minus-1", decimals["adjustmentDaysNMinus1"] == decimals["adjustmentDaysN"] - Decimal(1))
        except (InvalidOperation, ZeroDivisionError) as error:
            validation.check(f"fixture.{label}.formula.evaluate", False, str(error))

    validation.check(f"fixture.{label}.ratio.numerator", values.get("B0100002", {}).get("value") == EXPECTED_RATIO_NUMERATOR[label])
    validation.check(f"fixture.{label}.ratio.denominator", values.get("B0100003", {}).get("value") == "100")
    validation.check(f"fixture.{label}.ratio.value", decimals.get("B0100001") == EXPECTED_RATIO[label])
    validation.check(f"fixture.{label}.ratio.display", values.get("B0100001", {}).get("displayValue") == EXPECTED_RATIO_DISPLAY[label])
    validation.check(f"fixture.{label}.limit.display", values.get("CS_BLXX", {}).get("displayValue") == "5%")
    validation.check(f"fixture.{label}.n-minus-1.display", values.get("adjustmentDaysNMinus1", {}).get("displayValue") == "9")

    date_fields = ["contractReviewDate", "enableDate", "dataDate", "stopDate"]
    parsed_dates: dict[str, date] = {}
    for field_id in date_fields:
        field = values.get(field_id, {})
        raw = field.get("value") if isinstance(field, dict) else None
        try:
            parsed_dates[field_id] = parse_date(raw)
            validation.check(f"fixture.{label}.date.{field_id}.kind", field.get("kind") == "DATE")
        except (TypeError, ValueError):
            validation.check(f"fixture.{label}.date.{field_id}", False, f"invalid={raw!r}")
    if len(parsed_dates) == len(date_fields):
        validation.check(f"fixture.{label}.date.review-before-enable", parsed_dates["contractReviewDate"] <= parsed_dates["enableDate"])
        validation.check(f"fixture.{label}.date.active-window", parsed_dates["enableDate"] <= parsed_dates["dataDate"] < parsed_dates["stopDate"])
        validation.check(f"fixture.{label}.date.default-stop", values["stopDate"].get("value") == "29991231")

    timeline = fixture.get("statusTimeline")
    validation.check(f"fixture.{label}.timeline.list", isinstance(timeline, list))
    timeline_codes = [item.get("status") for item in timeline if isinstance(item, dict)] if isinstance(timeline, list) else []
    validation.check(f"fixture.{label}.timeline.sequence", timeline_codes == EXPECTED_TIMELINE, f"actual={timeline_codes}")
    validation.check(f"fixture.{label}.timeline.allowed", set(timeline_codes) <= allowed_statuses)
    for index, item in enumerate(timeline if isinstance(timeline, list) else []):
        if not isinstance(item, dict):
            validation.check(f"fixture.{label}.timeline[{index}].object", False)
            continue
        validation.check(f"fixture.{label}.timeline[{index}].markers", item.get("provenance") == "SYNTHETIC_EDUCATIONAL" and item.get("scope") == "ONLY_THIS_CASE")
        try:
            parse_date(item.get("date"))
        except (TypeError, ValueError):
            validation.check(f"fixture.{label}.timeline[{index}].date", False)
    validation.check(
        f"fixture.{label}.timeline.transitions",
        all(pair in allowed_transitions for pair in zip(timeline_codes, timeline_codes[1:])),
    )
    timeline_dates = []
    for item in timeline if isinstance(timeline, list) else []:
        if isinstance(item, dict):
            try:
                timeline_dates.append(parse_date(item.get("date")))
            except (TypeError, ValueError):
                pass
    validation.check(f"fixture.{label}.timeline.date-order", timeline_dates == sorted(timeline_dates))

    for field_id, expected_status in STATUS_FIELD_EXPECTATIONS.items():
        validation.check(f"fixture.{label}.status-field.{field_id}", values.get(field_id, {}).get("value") == expected_status)
    generated_index = timeline_codes.index("NOTICE_GENERATED") if "NOTICE_GENERATED" in timeline_codes else -1
    sent_index = timeline_codes.index("NOTICE_SENT") if "NOTICE_SENT" in timeline_codes else -1
    validation.check(f"fixture.{label}.notice.generated-before-sent", generated_index >= 0 and sent_index > generated_index)
    validation.check(f"fixture.{label}.notice.generated-not-sent", values.get("noticeGenerationStatus", {}).get("value") != values.get("noticeSendStatus", {}).get("value"))


def check_isomorphism(fixture_a: Any, fixture_b: Any, validation: Validation) -> None:
    validation.section("fixture A/B isomorphism")
    validation.check("fixture.isomorphic.shape", shape(fixture_a) == shape(fixture_b))
    if isinstance(fixture_a, dict) and isinstance(fixture_b, dict):
        validation.check("fixture.isomorphic.teaching-keys", fixture_a.get("fixtureId") != fixture_b.get("fixtureId"))
        validation.check("fixture.isomorphic.value-teaching-keys", fixture_a.get("values", {}).get("teachingKey", {}).get("value") != fixture_b.get("values", {}).get("teachingKey", {}).get("value"))
        validation.check("fixture.isomorphic.dates", fixture_a.get("values", {}).get("dataDate", {}).get("value") != fixture_b.get("values", {}).get("dataDate", {}).get("value"))
        validation.check("fixture.isomorphic.numerics", fixture_a.get("values", {}).get("B0100002", {}).get("value") != fixture_b.get("values", {}).get("B0100002", {}).get("value"))
        validation.check("fixture.isomorphic.same-route-order", fixture_a.get("routeIds") == fixture_b.get("routeIds") == ROUTE_IDS)


def check_safety(paths: Iterable[Path], values: Iterable[Any], validation: Validation) -> None:
    validation.section("safety and synthetic markers")
    for path, value in zip(paths, values):
        if path.is_file():
            text = path.read_text(encoding="utf-8-sig")
        else:
            text = ""
        for pattern, label in [(pattern, "absolute-path") for pattern in ABSOLUTE_PATH_PATTERNS]:
            validation.check(f"safety.{path.name}.{label}", pattern.search(text) is None)
        validation.check(f"safety.{path.name}.image-path", IMAGE_PATH_PATTERN.search(text) is None)
        validation.check(f"safety.{path.name}.email", EMAIL_PATTERN.search(text) is None)
        validation.check(f"safety.{path.name}.phone", PHONE_PATTERN.search(text) is None)
        validation.check(f"safety.{path.name}.credential", CREDENTIAL_PATTERN.search(text) is None)
        validation.check(f"safety.{path.name}.real-entity", REAL_ENTITY_PATTERN.search(text) is None)

        # Every concrete synthetic object in JSON carries both markers.  The
        # source catalog itself is material reference data and is checked by
        # source IDs/locators instead.
        # The B0 foundation/fixtures have a root marker contract.  Route and
        # rubric JSON use different top-level schemas; their marker contract
        # is checked by check_route_bundle instead of treating their root
        # objects as concrete evidence objects.
        if isinstance(value, dict) and path.suffix == ".json" and path.name in {
            "SPV-FOUNDATION-001.json",
            "SPV-A.json",
            "SPV-B.json",
        }:
            validation.check(f"safety.{path.name}.root-provenance", "SYNTHETIC_EDUCATIONAL" in str(value.get("provenance", "")))
            validation.check(f"safety.{path.name}.root-scope", value.get("scope") == "ONLY_THIS_CASE")
            if path.name in {"SPV-A.json", "SPV-B.json"}:
                for index, item in enumerate(value.get("statusTimeline", [])):
                    if isinstance(item, dict):
                        validation.check(f"safety.{path.name}.timeline-marker[{index}]", item.get("provenance") == "SYNTHETIC_EDUCATIONAL" and item.get("scope") == "ONLY_THIS_CASE")
                for field_id, item in value.get("values", {}).items():
                    if isinstance(item, dict):
                        validation.check(f"safety.{path.name}.value-marker.{field_id}", item.get("provenance") == "SYNTHETIC_EDUCATIONAL" and item.get("scope") == "ONLY_THIS_CASE")


def check_reference_markdown(path: Path, validation: Validation) -> None:
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8-sig")
    validation.check("reference.markers.provenance", "SYNTHETIC_EDUCATIONAL" in text)
    validation.check("reference.markers.scope", "ONLY_THIS_CASE" in text)
    validation.check("reference.all-sources", all(f"| M{index:02d} |" in text for index in range(1, 12)))
    validation.check("reference.formula.ratio", "B0100001 = B0100002 / B0100003" in text)
    validation.check("reference.formula.lower-bound", "B0100001 < CS_BLXX" in text)
    validation.check("reference.formula.limit", "CS_BLXX = 5%" in text)
    validation.check("reference.formula.n-minus-1", "N=10" in text and "N-1=9" in text)
    validation.check("reference.date-rule", "enableDate ≤ dataDate < stopDate" in text)
    validation.check("reference.notice-separation", "NOTICE_GENERATED" in text and "NOTICE_SENT" in text)
    validation.check("reference.four-routes", all(route_id in text for route_id in ROUTE_IDS))
    validation.check("reference.defer-m11-topics", all(topic in text for topic in ["年金", "保险", "理财", "QFII-WFOE"]))


def route_asset_paths(route_id: str) -> tuple[Path, Path, Path, Path]:
    """Return the frozen public/rubric/evidence/reference bundle paths."""
    asset_dir = ROUTE_ASSET_DIRS[route_id]
    return (
        REPO / "content" / "routes" / "supervision" / f"{route_id}.json",
        REPO / "content" / "rubrics" / "supervision" / f"{route_id}.json",
        REPO / "content" / "evidence" / "supervision" / asset_dir / f"{route_id}-evidence.json",
        REPO / "content" / "references" / "supervision" / f"{route_id}-evidence.md",
    )


def route_field_values(comp: dict[str, Any], validation: Validation, route_id: str) -> dict[str, dict[str, str]]:
    """Index comprehensive-practice fields and reject duplicate field IDs."""
    result: dict[str, dict[str, str]] = {}
    materials = comp.get("sourceMaterials", []) if isinstance(comp, dict) else []
    for material_index, material in enumerate(materials if isinstance(materials, list) else []):
        if not isinstance(material, dict):
            continue
        material_id = material.get("materialId")
        fields = material.get("fields", [])
        validation.check(
            f"route.{route_id}.sourceMaterial[{material_index}].fields.list",
            isinstance(fields, list) and bool(fields),
        )
        local_ids: set[str] = set()
        for field_index, field in enumerate(fields if isinstance(fields, list) else []):
            label = f"route.{route_id}.sourceMaterial[{material_index}].field[{field_index}]"
            validation.check(f"{label}.object", isinstance(field, dict))
            if not isinstance(field, dict):
                continue
            field_id = field.get("fieldId")
            validation.check(f"{label}.id", isinstance(field_id, str) and bool(field_id))
            validation.check(f"{label}.label", isinstance(field.get("label"), str) and bool(field.get("label")))
            validation.check(f"{label}.value", "value" in field and isinstance(field.get("value"), str))
            if not isinstance(field_id, str) or not field_id:
                continue
            validation.check(f"{label}.unique-in-material", field_id not in local_ids)
            validation.check(f"{label}.unique-global", field_id not in result or material_id not in result[field_id].get("materialIds", []))
            local_ids.add(field_id)
            entry = result.setdefault(field_id, {"value": str(field.get("value", "")), "materialIds": []})
            if material_id not in entry["materialIds"]:
                entry["materialIds"].append(material_id)
    return result


def joined_strings(*values: Any) -> str:
    return "\n".join(text for value in values for _, text in walk_strings(value))


PRIVATE_ROUTE_KEYS = {
    "referenceanswer",
    "rubric",
    "rubricversion",
    "dimensions",
    "totalscore",
    "passscore",
    "mandatoryrequirements",
    "evidencerules",
    "remediationtargets",
    "responsemeta",
    "statuschecks",
}


def check_route_public_shape(route_id: str, route: Any, validation: Validation) -> tuple[dict[str, Any], set[str], set[str]]:
    validation.section(f"route {route_id} public content")
    validation.check(f"route.{route_id}.object", isinstance(route, dict))
    if not isinstance(route, dict):
        return {}, set(), set()
    validation.check(f"route.{route_id}.routeId", route.get("routeId") == route_id)
    validation.check(f"route.{route_id}.line", route.get("line") == "SUPERVISION")
    validation.check(f"route.{route_id}.contentVersion", route.get("contentVersion") == "1.0.0")
    validation.check(
        f"route.{route_id}.markers",
        "SYNTHETIC_EDUCATIONAL" in joined_strings(route) and "ONLY_THIS_CASE" in joined_strings(route),
    )

    steps = route.get("steps")
    step_names = set(steps) if isinstance(steps, dict) else set()
    validation.check(
        f"route.{route_id}.steps.exact",
        step_names == {"KNOWLEDGE_CARD", "DEMONSTRATION", "BASIC_PRACTICE", "COMPREHENSIVE_PRACTICE"},
        f"actual={sorted(step_names)}",
    )
    if not isinstance(steps, dict):
        return {}, set(), set()

    cards = steps.get("KNOWLEDGE_CARD", {}).get("cards", []) if isinstance(steps.get("KNOWLEDGE_CARD"), dict) else []
    validation.check(f"route.{route_id}.knowledgeCards.count", isinstance(cards, list) and 1 <= len(cards) <= 3)
    card_ids: set[str] = set()
    for index, card in enumerate(cards if isinstance(cards, list) else []):
        label = f"route.{route_id}.knowledgeCards[{index}]"
        validation.check(f"{label}.object", isinstance(card, dict))
        if not isinstance(card, dict):
            continue
        card_id = card.get("cardId")
        validation.check(f"{label}.id", isinstance(card_id, str) and bool(card_id) and card_id not in card_ids)
        if isinstance(card_id, str):
            card_ids.add(card_id)
        validation.check(f"{label}.conclusion", isinstance(card.get("conclusion"), str) and bool(card.get("conclusion")))
        validation.check(f"{label}.items", isinstance(card.get("items"), list) and bool(card.get("items")))

    demo = steps.get("DEMONSTRATION", {}) if isinstance(steps.get("DEMONSTRATION"), dict) else {}
    demo_steps = demo.get("steps", [])
    validation.check(f"route.{route_id}.demonstration.count", isinstance(demo_steps, list) and 3 <= len(demo_steps) <= 5)
    demo_orders: list[int] = []
    for index, item in enumerate(demo_steps if isinstance(demo_steps, list) else []):
        label = f"route.{route_id}.demonstration[{index}]"
        validation.check(f"{label}.object", isinstance(item, dict))
        if not isinstance(item, dict):
            continue
        order = item.get("order")
        validation.check(f"{label}.order", isinstance(order, int))
        if isinstance(order, int):
            demo_orders.append(order)
        validation.check(f"{label}.action", isinstance(item.get("action"), str) and bool(item.get("action")))
        validation.check(f"{label}.reason", isinstance(item.get("reason"), str) and bool(item.get("reason")))
    validation.check(f"route.{route_id}.demonstration.order", demo_orders == list(range(1, len(demo_orders) + 1)))

    basic = steps.get("BASIC_PRACTICE", {}) if isinstance(steps.get("BASIC_PRACTICE"), dict) else {}
    questions = basic.get("questions", [])
    validation.check(f"route.{route_id}.basicPractice.count", isinstance(questions, list) and 1 <= len(questions) <= 5)
    question_ids: set[str] = set()
    for index, question in enumerate(questions if isinstance(questions, list) else []):
        label = f"route.{route_id}.basicPractice[{index}]"
        validation.check(f"{label}.object", isinstance(question, dict))
        if not isinstance(question, dict):
            continue
        question_id = question.get("questionId")
        validation.check(f"{label}.id", isinstance(question_id, str) and bool(question_id) and question_id not in question_ids)
        if isinstance(question_id, str):
            question_ids.add(question_id)
        validation.check(f"{label}.answer", isinstance(question.get("answer"), list) and bool(question.get("answer")))
        validation.check(f"{label}.explanation", isinstance(question.get("explanation"), str) and bool(question.get("explanation")))
        validation.check(f"{label}.hints", isinstance(question.get("hints"), list) and bool(question.get("hints")))

    comp = steps.get("COMPREHENSIVE_PRACTICE") if isinstance(steps.get("COMPREHENSIVE_PRACTICE"), dict) else {}
    source_materials = comp.get("sourceMaterials", []) if isinstance(comp, dict) else []
    validation.check(f"route.{route_id}.comprehensive.sourceMaterials", isinstance(source_materials, list) and len(source_materials) >= 2)
    material_ids: set[str] = set()
    for index, material in enumerate(source_materials if isinstance(source_materials, list) else []):
        label = f"route.{route_id}.comprehensive.sourceMaterials[{index}]"
        validation.check(f"{label}.object", isinstance(material, dict))
        if not isinstance(material, dict):
            continue
        material_id = material.get("materialId")
        validation.check(f"{label}.id", isinstance(material_id, str) and bool(material_id) and material_id not in material_ids)
        if isinstance(material_id, str):
            material_ids.add(material_id)
        validation.check(f"{label}.title", isinstance(material.get("title"), str) and bool(material.get("title")))

    work_items = comp.get("workItems", []) if isinstance(comp, dict) else []
    validation.check(f"route.{route_id}.comprehensive.workItems", isinstance(work_items, list) and len(work_items) >= 3)
    work_ids: set[str] = set()
    for index, work_item in enumerate(work_items if isinstance(work_items, list) else []):
        label = f"route.{route_id}.comprehensive.workItems[{index}]"
        validation.check(f"{label}.object", isinstance(work_item, dict))
        if not isinstance(work_item, dict):
            continue
        work_id = work_item.get("workItemId")
        validation.check(f"{label}.id", isinstance(work_id, str) and bool(work_id) and work_id not in work_ids)
        if isinstance(work_id, str):
            work_ids.add(work_id)
        validation.check(f"{label}.type", work_item.get("type") in {"FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION", "SHORT_TEXT"})
        response = work_item.get("response")
        validation.check(f"{label}.response", isinstance(response, dict) and bool(response.get("kind")))
    validation.check(
        f"route.{route_id}.public.private-structures",
        all(key.lower() not in PRIVATE_ROUTE_KEYS for _, key in walk_keys(comp)),
    )
    route_field_values(comp, validation, route_id)
    return comp, work_ids, question_ids


def check_rubric(
    route_id: str,
    rubric: Any,
    work_ids: set[str],
    card_ids: set[str],
    demo_steps: list[Any],
    question_ids: set[str],
    validation: Validation,
) -> set[str]:
    validation.section(f"rubric {route_id}")
    validation.check(f"rubric.{route_id}.object", isinstance(rubric, dict))
    if not isinstance(rubric, dict):
        return set()
    validation.check(f"rubric.{route_id}.routeId", rubric.get("routeId") == route_id)
    validation.check(f"rubric.{route_id}.version", rubric.get("rubricVersion") == "1.0.0")
    validation.check(f"rubric.{route_id}.totalScore", rubric.get("totalScore") == 100)
    validation.check(f"rubric.{route_id}.passScore", rubric.get("passScore") == 75)

    expected_dimensions = {"CONCEPT": 25, "PROCESS": 30, "RISK": 25, "EXPRESSION": 20}
    dimensions = rubric.get("dimensions", [])
    validation.check(f"rubric.{route_id}.dimensions.count", isinstance(dimensions, list) and len(dimensions) == 4)
    seen_dimensions: set[str] = set()
    criterion_ids: set[str] = set()
    criterion_fields: set[str] = set()
    criterion_targets: set[str] = set()
    for index, dimension in enumerate(dimensions if isinstance(dimensions, list) else []):
        label = f"rubric.{route_id}.dimension[{index}]"
        validation.check(f"{label}.object", isinstance(dimension, dict))
        if not isinstance(dimension, dict):
            continue
        name = dimension.get("dimension")
        max_score = expected_dimensions.get(name)
        validation.check(f"{label}.name", name in expected_dimensions and name not in seen_dimensions)
        if isinstance(name, str):
            seen_dimensions.add(name)
        validation.check(f"{label}.maxScore", max_score is not None and dimension.get("maxScore") == max_score)
        criteria = dimension.get("criteria", [])
        validation.check(f"{label}.criteria.list", isinstance(criteria, list) and bool(criteria))
        weights = 0
        for criterion_index, criterion in enumerate(criteria if isinstance(criteria, list) else []):
            criterion_label = f"{label}.criteria[{criterion_index}]"
            validation.check(f"{criterion_label}.object", isinstance(criterion, dict))
            if not isinstance(criterion, dict):
                continue
            criterion_id = criterion.get("criterionId")
            validation.check(f"{criterion_label}.id", isinstance(criterion_id, str) and bool(criterion_id) and criterion_id not in criterion_ids)
            if isinstance(criterion_id, str):
                criterion_ids.add(criterion_id)
            weight = criterion.get("weight")
            validation.check(f"{criterion_label}.weight", isinstance(weight, int) and weight > 0)
            if isinstance(weight, int):
                weights += weight
            criterion_targets.add(criterion.get("remediationTargetId"))
            evidence_rules = criterion.get("evidenceRules", [])
            validation.check(f"{criterion_label}.evidenceRules.list", isinstance(evidence_rules, list) and bool(evidence_rules))
            for rule_index, rule in enumerate(evidence_rules if isinstance(evidence_rules, list) else []):
                rule_label = f"{criterion_label}.evidenceRules[{rule_index}]"
                validation.check(f"{rule_label}.object", isinstance(rule, dict))
                if isinstance(rule, dict):
                    field_id = rule.get("fieldId")
                    criterion_fields.add(field_id)
                    validation.check(f"{rule_label}.fieldId.in-work", field_id in work_ids)
        validation.check(f"{label}.weights-close", max_score is not None and weights == max_score, f"weights={weights} expected={max_score}")
    validation.check(f"rubric.{route_id}.dimensions.exact", seen_dimensions == set(expected_dimensions))

    mandatory = rubric.get("mandatoryRequirements", [])
    validation.check(f"rubric.{route_id}.mandatory.count", isinstance(mandatory, list) and 1 <= len(mandatory) <= 2)
    mandatory_ids: set[str] = set()
    mandatory_fields: set[str] = set()
    mandatory_targets: set[str] = set()
    for index, requirement in enumerate(mandatory if isinstance(mandatory, list) else []):
        label = f"rubric.{route_id}.mandatory[{index}]"
        validation.check(f"{label}.object", isinstance(requirement, dict))
        if not isinstance(requirement, dict):
            continue
        requirement_id = requirement.get("requirementId")
        validation.check(f"{label}.id", isinstance(requirement_id, str) and bool(requirement_id) and requirement_id not in mandatory_ids)
        if isinstance(requirement_id, str):
            mandatory_ids.add(requirement_id)
        mandatory_targets.add(requirement.get("remediationTargetId"))
        rules = requirement.get("evidenceRules", [])
        validation.check(f"{label}.evidenceRules.list", isinstance(rules, list) and bool(rules))
        for rule_index, rule in enumerate(rules if isinstance(rules, list) else []):
            rule_label = f"{label}.evidenceRules[{rule_index}]"
            validation.check(f"{rule_label}.object", isinstance(rule, dict))
            if isinstance(rule, dict):
                field_id = rule.get("fieldId")
                mandatory_fields.add(field_id)
                validation.check(f"{rule_label}.fieldId.in-work", field_id in work_ids)
    validation.check(
        f"rubric.{route_id}.evidence.fieldId-coverage",
        criterion_fields | mandatory_fields == work_ids,
        f"missing={sorted(work_ids - (criterion_fields | mandatory_fields))} extra={sorted((criterion_fields | mandatory_fields) - work_ids)}",
    )

    reference_answer = rubric.get("referenceAnswer")
    validation.check(f"rubric.{route_id}.referenceAnswer.object", isinstance(reference_answer, dict))
    responses = reference_answer.get("responses", {}) if isinstance(reference_answer, dict) else {}
    validation.check(f"rubric.{route_id}.referenceAnswer.responses", isinstance(responses, dict) and set(responses) == work_ids)
    if isinstance(responses, dict):
        for work_id in work_ids:
            validation.check(
                f"rubric.{route_id}.referenceAnswer.{work_id}",
                isinstance(responses.get(work_id), (str, int, float, dict, list)) and responses.get(work_id) not in ("", [], {}),
            )

    remediation_targets = rubric.get("remediationTargets", [])
    validation.check(f"rubric.{route_id}.remediationTargets.list", isinstance(remediation_targets, list) and bool(remediation_targets))
    remediation_ids: set[str] = set()
    for index, target in enumerate(remediation_targets if isinstance(remediation_targets, list) else []):
        label = f"rubric.{route_id}.remediation[{index}]"
        validation.check(f"{label}.object", isinstance(target, dict))
        if not isinstance(target, dict):
            continue
        target_id = target.get("targetId")
        validation.check(f"{label}.id", isinstance(target_id, str) and bool(target_id) and target_id not in remediation_ids)
        if isinstance(target_id, str):
            remediation_ids.add(target_id)
        step_type = target.get("materialStep")
        material_item_id = target.get("materialItemId")
        question_id = target.get("questionId")
        validation.check(f"{label}.step", step_type in {"KNOWLEDGE_CARD", "DEMONSTRATION"})
        if step_type == "KNOWLEDGE_CARD":
            validation.check(f"{label}.card", material_item_id in card_ids)
        elif step_type == "DEMONSTRATION":
            match = re.fullmatch(r"DEMONSTRATION-STEP-(\d+)", str(material_item_id))
            order = int(match.group(1)) if match else -1
            demo_orders = {item.get("order") for item in demo_steps if isinstance(item, dict)}
            validation.check(f"{label}.demo-step", match is not None and order in demo_orders)
        validation.check(f"{label}.question", question_id in question_ids)
    validation.check(
        f"rubric.{route_id}.criterion-targets",
        criterion_targets <= remediation_ids and mandatory_targets <= remediation_ids,
        f"missing={sorted((criterion_targets | mandatory_targets) - remediation_ids)}",
    )
    return remediation_ids


def check_evidence_json(
    route_id: str,
    evidence: Any,
    work_ids: set[str],
    material_ids: set[str],
    remediation_ids: set[str],
    validation: Validation,
) -> tuple[str, dict[str, Any]]:
    validation.section(f"evidence {route_id}")
    validation.check(f"evidence.{route_id}.object", isinstance(evidence, dict))
    if not isinstance(evidence, dict):
        return "", {}
    validation.check(f"evidence.{route_id}.routeId", evidence.get("routeId") == route_id)
    validation.check(f"evidence.{route_id}.routeCode", evidence.get("routeCode") == route_id)
    validation.check(f"evidence.{route_id}.version", evidence.get("version") == "1.0.0")
    validation.check(f"evidence.{route_id}.scope", evidence.get("scope") == "ONLY_THIS_CASE")
    validation.check(f"evidence.{route_id}.provenance", evidence.get("provenance") == "SYNTHETIC_EDUCATIONAL")
    validation.check(f"evidence.{route_id}.shared-foundation", "SPV-FOUNDATION-001" in evidence.get("sharedEvidence", []))
    dependency = evidence.get("dependencyPolicy", {})
    validation.check(f"evidence.{route_id}.dependency-policy", isinstance(dependency, dict))
    validation.check(f"evidence.{route_id}.release-registration", isinstance(dependency, dict) and dependency.get("releaseRegistration") == f"PUBLISHED_IN_{EXPECTED_RELEASE_ID}")
    validation.check(f"evidence.{route_id}.registration-stage", isinstance(dependency, dict) and dependency.get("registrationStage") == "C1")
    validation.check(f"evidence.{route_id}.status", isinstance(dependency, dict) and dependency.get("status") == "PUBLISHED")
    validation.check(f"evidence.{route_id}.availability", isinstance(dependency, dict) and dependency.get("availability") == "OPEN")
    validation.check(f"evidence.{route_id}.release-id", isinstance(dependency, dict) and dependency.get("releaseId") == EXPECTED_RELEASE_ID)
    validation.check(f"evidence.{route_id}.map-version", isinstance(dependency, dict) and dependency.get("mapVersion") == EXPECTED_MAP_VERSION)
    validation.check(
        f"evidence.{route_id}.markers",
        "SYNTHETIC_EDUCATIONAL" in joined_strings(evidence) and "ONLY_THIS_CASE" in joined_strings(evidence),
    )
    anchors = evidence.get("materialAnchors", [])
    validation.check(f"evidence.{route_id}.materialAnchors", isinstance(anchors, list) and len(anchors) >= 2)
    anchor_sources: set[str] = set()
    for index, anchor in enumerate(anchors if isinstance(anchors, list) else []):
        label = f"evidence.{route_id}.materialAnchor[{index}]"
        validation.check(f"{label}.object", isinstance(anchor, dict))
        if not isinstance(anchor, dict):
            continue
        source_code = anchor.get("sourceMaterialCode")
        anchor_sources.add(source_code)
        validation.check(f"{label}.sourceId", source_code in SOURCE_IDS)
        validation.check(f"{label}.locators", isinstance(anchor.get("locators"), list) and bool(anchor.get("locators")))
    validation.check(f"evidence.{route_id}.materialAnchors.source-count", len(anchor_sources) >= 2)

    claims = evidence.get("mappingClaims", [])
    validation.check(f"evidence.{route_id}.mappingClaims", isinstance(claims, list) and bool(claims))
    for index, claim in enumerate(claims if isinstance(claims, list) else []):
        label = f"evidence.{route_id}.mappingClaim[{index}]"
        validation.check(f"{label}.object", isinstance(claim, dict))
        if not isinstance(claim, dict):
            continue
        validation.check(f"{label}.activity", isinstance(claim.get("activity"), str) and bool(claim.get("activity")))
        validation.check(f"{label}.sourceGroups", isinstance(claim.get("sourceGroups"), list) and bool(claim.get("sourceGroups")))

    atomic = evidence.get("atomicWorkItems", [])
    atomic_ids = {item.get("workItemId") for item in atomic if isinstance(item, dict)} if isinstance(atomic, list) else set()
    validation.check(f"evidence.{route_id}.atomicWorkItems", isinstance(atomic, list) and atomic_ids == work_ids)
    for index, item in enumerate(atomic if isinstance(atomic, list) else []):
        label = f"evidence.{route_id}.atomic[{index}]"
        validation.check(f"{label}.object", isinstance(item, dict))
        if not isinstance(item, dict):
            continue
        work_id = item.get("workItemId")
        validation.check(f"{label}.workItemId", work_id in work_ids)
        source = item.get("source")
        reference = item.get("reference")
        rule = item.get("rule")
        remediation = item.get("remediation")
        validation.check(f"{label}.source", isinstance(source, dict))
        validation.check(f"{label}.reference", isinstance(reference, dict))
        validation.check(f"{label}.rule", isinstance(rule, dict))
        validation.check(f"{label}.remediation", isinstance(remediation, dict))
        if isinstance(source, dict):
            validation.check(f"{label}.source.materialIds", isinstance(source.get("materialIds"), list) and bool(source.get("materialIds")))
            validation.check(f"{label}.source.scope", source.get("scope") == "ONLY_THIS_CASE")
            validation.check(f"{label}.source.provenance", source.get("provenance") == "SYNTHETIC_EDUCATIONAL")
        if isinstance(rule, dict):
            validation.check(f"{label}.rule.scope", rule.get("scope") == "ONLY_THIS_CASE")
        if isinstance(remediation, dict):
            validation.check(f"{label}.remediation.target", remediation.get("remediationTargetId") in remediation_ids)
        validation.check(f"{label}.markers", "SYNTHETIC_EDUCATIONAL" in joined_strings(item) and "ONLY_THIS_CASE" in joined_strings(item))
    coverage = evidence.get("coverage", {})
    covered_ids = {work_id for ids in coverage.values() if isinstance(ids, list) for work_id in ids} if isinstance(coverage, dict) else set()
    validation.check(f"evidence.{route_id}.coverage", isinstance(coverage, dict) and covered_ids == work_ids)
    integrity = evidence.get("integrity", {})
    validation.check(f"evidence.{route_id}.integrity.map-release", isinstance(integrity, dict) and integrity.get("mapAndReleaseRegistration") is True)
    if isinstance(integrity, dict) and "workItemMappingCount" in integrity:
        validation.check(f"evidence.{route_id}.integrity.mapping-count", integrity.get("workItemMappingCount") == len(work_ids))
    if isinstance(integrity, dict) and "uniqueWorkItemMappings" in integrity:
        validation.check(f"evidence.{route_id}.integrity.unique", integrity.get("uniqueWorkItemMappings") is True)
    fixture_policy = evidence.get("fixturePolicy", {})
    validation.check(f"evidence.{route_id}.fixture-policy", isinstance(fixture_policy, dict))
    if isinstance(fixture_policy, dict):
        shared_fixture_ids = set(EXPECTED_FIXTURE_IDS.values())
        demo_fixture_id = fixture_policy.get("routeOwnsIndependentDemoA")
        comprehensive_fixture_id = fixture_policy.get("routeOwnsIndependentComprehensiveB")
        route_fixture_ids = fixture_policy.get("routePracticeFixtureIds")
        validation.check(f"evidence.{route_id}.fixture-policy.shared-boundary", fixture_policy.get("sharedWithOtherRoute") is False and fixture_policy.get("usesFoundationSharedFixtures") is False)
        validation.check(f"evidence.{route_id}.fixture-policy.private-scope", fixture_policy.get("routePracticeScope") == "ROUTE_PRIVATE_INDEPENDENT")
        validation.check(f"evidence.{route_id}.fixture-policy.private-ids", isinstance(demo_fixture_id, str) and isinstance(comprehensive_fixture_id, str) and demo_fixture_id not in shared_fixture_ids and comprehensive_fixture_id not in shared_fixture_ids and demo_fixture_id != comprehensive_fixture_id)
        validation.check(f"evidence.{route_id}.fixture-policy.ids-match", isinstance(route_fixture_ids, list) and route_fixture_ids == [demo_fixture_id, comprehensive_fixture_id])
    return str(evidence.get("evidenceId", "")), evidence


def check_route_reference(
    route_id: str,
    reference: str,
    evidence_id: str,
    work_ids: set[str],
    validation: Validation,
) -> None:
    validation.section(f"reference {route_id}")
    validation.check(f"reference.{route_id}.routeId", route_id in reference)
    validation.check(f"reference.{route_id}.evidenceId", evidence_id in reference)
    validation.check(f"reference.{route_id}.markers", "SYNTHETIC_EDUCATIONAL" in reference and "ONLY_THIS_CASE" in reference)
    validation.check(f"reference.{route_id}.material-locator", "M01" in reference and ("§" in reference or "p." in reference))
    for work_id in sorted(work_ids):
        validation.check(f"reference.{route_id}.workItem.{work_id}", work_id in reference)


def material_field_map(comp: dict[str, Any]) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    for material in comp.get("sourceMaterials", []) if isinstance(comp, dict) else []:
        if not isinstance(material, dict):
            continue
        fields = {}
        for field in material.get("fields", []) if isinstance(material.get("fields"), list) else []:
            if isinstance(field, dict) and isinstance(field.get("fieldId"), str):
                fields[field["fieldId"]] = str(field.get("value", ""))
        result[str(material.get("materialId"))] = fields
    return result


def field_value(field_map: dict[str, dict[str, str]], material_id: str, field_id: str) -> str:
    return field_map.get(material_id, {}).get(field_id, "")


def normalized_chain(value: str) -> str:
    return re.sub(r"\s+", "", value).replace("→", "->")


def check_route_specific(route_id: str, comp: dict[str, Any], rubric: Any, evidence: Any, validation: Validation) -> None:
    values = material_field_map(comp)
    text = joined_strings(comp, rubric, evidence)
    validation.section(f"route-specific {route_id}")
    if route_id == "SPV-CONTRACT-001":
        clause = "SPV-CONTRACT-B-CLAUSE"
        param = "SPV-CONTRACT-B-PARAM"
        validation.check("contract.clause.version", field_value(values, clause, "contract_version") == "EDU-CONTRACT-B-2026-07")
        validation.check("contract.param.version", field_value(values, param, "contract_version") == "EDU-CONTRACT-B-2026-07")
        validation.check("contract.codes", field_value(values, clause, "numerator_code") == "B0100002" and field_value(values, clause, "denominator_code") == "B0100003" and field_value(values, param, "numerator_code") == "B0100002" and field_value(values, param, "denominator_code") == "B0100003")
        validation.check("contract.clause.relation", field_value(values, clause, "clause_relation") == "B0100001 < CS_BLXX")
        validation.check("contract.rule-type", field_value(values, clause, "rule_type") == "INVESTMENT_RATIO")
        try:
            numerator = Decimal(field_value(values, param, "numerator_value"))
            denominator = Decimal(field_value(values, param, "denominator_value"))
            ratio = numerator / denominator
            validation.check("contract.ratio.decimal", ratio == Decimal("0.0300"))
            validation.check("contract.ratio.below-bound", ratio < Decimal("0.0500"))
        except (InvalidOperation, ZeroDivisionError):
            validation.check("contract.ratio.decimal", False)
            validation.check("contract.ratio.below-bound", False)
        validation.check("contract.ratio-scale", "0.0300" in text and "3/100" in text)
        validation.check("contract.lower-bound", "CS_BLXX=5%" in text or "CS_BLXX = 5%" in text)
        validation.check("contract.formula", "B0100001 = B0100002 / B0100003" in text)
        validation.check("contract.cross-source", "跨来源一致" in text)
        validation.check("contract.field-sources", all(field_value(values, material, field) for material, field in [(clause, "contract_version"), (clause, "rule_type"), (clause, "numerator_code"), (clause, "denominator_code"), (param, "numerator_value"), (param, "denominator_value"), (param, "lower_bound_value")]))
    elif route_id == "SPV-RULE-002":
        basis = "SPV-RULE-B-BASIS"
        effective = "SPV-RULE-B-EFFECTIVE"
        validation.check("rule.subjectType", field_value(values, basis, "subject_type") == "资产组合" and field_value(values, effective, "subject_type") == "资产组合")
        validation.check("rule.dates.literal", field_value(values, basis, "enable_date") == "2026-02-05" and field_value(values, basis, "data_date") == "2026-02-06" and field_value(values, basis, "stop_date") == "29991231")
        try:
            enable = parse_date(field_value(values, basis, "enable_date"))
            data = parse_date(field_value(values, basis, "data_date"))
            stop = parse_date(field_value(values, basis, "stop_date"))
            validation.check("rule.date-window", enable <= data < stop)
        except (TypeError, ValueError):
            validation.check("rule.date-window", False)
        try:
            n = Decimal(field_value(values, effective, "adjustment_days_n"))
            n_minus_1 = Decimal(field_value(values, effective, "adjustment_days_n_minus_1"))
            validation.check("rule.n-minus-1", n == Decimal("10") and n - Decimal(1) == n_minus_1 and n_minus_1 == Decimal("9"))
        except InvalidOperation:
            validation.check("rule.n-minus-1", False)
        validation.check("rule.window-expression", "enableDate <= dataDate < stopDate" in text)
        validation.check("rule.n-text", "N=10" in text and "N-1=9" in text)
    elif route_id == "SPV-TASK-003":
        import_log = "SPV-TASK-B-IMPORT-LOG"
        result = "SPV-TASK-B-RESULT-SUMMARY"
        validation.check("task.import-success", field_value(values, import_log, "import_status") == "成功")
        validation.check("task.execution-query", field_value(values, result, "execution_query") == "正在执行")
        validation.check("task.completed", field_value(values, result, "task_status") == "已执行完成")
        validation.check("task.business-anomaly", field_value(values, result, "business_result") == "异常")
        validation.check("task.pending-confirmation", field_value(values, result, "confirmation_status") == "待确认")
        try:
            ratio = Decimal(field_value(values, result, "numerator")) / Decimal(field_value(values, result, "denominator"))
            validation.check("task.ratio.decimal", ratio == Decimal("0.0300") and ratio < Decimal("0.0500"))
        except (InvalidOperation, ZeroDivisionError):
            validation.check("task.ratio.decimal", False)
        validation.check("task.ratio-scale", "0.0300" in text and "3/100" in text)
        validation.check("task.business-boundary", "业务性异常不等同技术故障" in text or "业务异常不是技术故障" in text)
        validation.check("task.no-error-code", re.search(r"SPVS\d{4}|EXCEPTION_CASE", text) is None)
        integrity = evidence.get("integrity", {}) if isinstance(evidence, dict) else {}
        validation.check("task.integrity.business-boundary", isinstance(integrity, dict) and integrity.get("businessAnomalyNotTechnicalFailure") is True)
        reference_answer = rubric.get("referenceAnswer", {}) if isinstance(rubric, dict) else {}
        rule_check = reference_answer.get("ruleCheck", {}) if isinstance(reference_answer, dict) else {}
        validation.check("task.ruleCheck.technicalFailure", isinstance(rule_check, dict) and rule_check.get("technicalFailure") == "NOT_CONSTRUCTED")
    elif route_id == "SPV-CLOSE-004":
        worksheet = "SPV-CLOSE-B-WORKSHEET"
        register = "SPV-CLOSE-B-REGISTER"
        validation.check("close.keys", field_value(values, worksheet, "result_key") == "EDU-RESULT-B-002" and field_value(values, worksheet, "rule_key") == "EDU-RULE-B-002")
        validation.check("close.dates", field_value(values, worksheet, "data_date") == "2026-02-06" and field_value(values, worksheet, "anomaly_start_date") == "2026-02-06")
        confirmation_chain = normalized_chain(field_value(values, worksheet, "confirmation_branch_chain"))
        exemption_chain = normalized_chain(field_value(values, worksheet, "exemption_branch_chain"))
        expected_confirmation = normalized_chain("待确认 → 确认异常 → 待生成/待记录 → B复核 → A生成 → 已生成 → 次日上午检查发送状态 → 记录管理人反馈/附件 → 归档")
        expected_exemption = normalized_chain("待确认 → 本轮豁免 → 合成豁免截止日=2026-02-12 → 不生成提示函 → 归档")
        validation.check("close.confirmation-chain", confirmation_chain == expected_confirmation)
        validation.check("close.exemption-chain", exemption_chain == expected_exemption)
        validation.check("close.confirmation-register", all(field_value(values, register, field) == expected for field, expected in [("confirmation_status", "确认异常"), ("generated_status", "已生成"), ("reply_record", "回函记录=已记录"), ("attachment_flag", "附件标记=已标记"), ("confirmation_archive_category", "归档类别=确认分支")]))
        validation.check("close.exemption-register", all(field_value(values, register, field) == expected for field, expected in [("exemption_status", "本轮豁免"), ("exemption_deadline", "合成豁免截止日=2026-02-12"), ("exemption_notice", "不生成提示函"), ("exemption_archive_category", "归档类别=豁免分支")]))
        validation.check("close.generated-not-sent", field_value(values, register, "generated_boundary") == "已生成 != 已发送" and "已生成 != 已发送" in text)
        validation.check("close.send-check", field_value(values, register, "send_status_check") == "次日上午检查发送状态")
        status_checks = rubric.get("referenceAnswer", {}).get("statusChecks", {}) if isinstance(rubric, dict) else {}
        validation.check("close.status-confirmation", isinstance(status_checks, dict) and status_checks.get("confirmationBranch") == "B_CONFIRMATION_BRANCH_COMPLETE")
        validation.check("close.status-exemption", isinstance(status_checks, dict) and status_checks.get("exemptionBranch") == "B_EXEMPTION_BRANCH_COMPLETE")
        validation.check("close.status-boundary", isinstance(status_checks, dict) and status_checks.get("generatedBoundary") == "B_GENERATED_NOT_SENT")
        integrity = evidence.get("integrity", {}) if isinstance(evidence, dict) else {}
        validation.check("close.integrity-confirmation", isinstance(integrity, dict) and integrity.get("confirmationBranchHasReplyAttachmentArchive") is True)
        validation.check("close.integrity-exemption", isinstance(integrity, dict) and integrity.get("exemptionBranchHasDeadlineAndNoNotice") is True)
        validation.check("close.integrity-boundary", isinstance(integrity, dict) and integrity.get("generatedNotSentBoundary") is True)
        validation.check("close.no-error-code", re.search(r"SPVS\d{4}|EXCEPTION_CASE", text) is None)


def check_route_bundle(route_id: str, route: Any, rubric: Any, evidence: Any, reference: str, validation: Validation) -> None:
    comp, work_ids, question_ids = check_route_public_shape(route_id, route, validation)
    if not isinstance(route, dict):
        return
    steps = route.get("steps", {})
    cards = steps.get("KNOWLEDGE_CARD", {}).get("cards", []) if isinstance(steps.get("KNOWLEDGE_CARD"), dict) else []
    card_ids = {card.get("cardId") for card in cards if isinstance(card, dict)}
    demo = steps.get("DEMONSTRATION", {}) if isinstance(steps.get("DEMONSTRATION"), dict) else {}
    demo_steps = demo.get("steps", []) if isinstance(demo.get("steps", []), list) else []
    remediation_ids = check_rubric(route_id, rubric, work_ids, card_ids, demo_steps, question_ids, validation)
    material_ids = {material.get("materialId") for material in comp.get("sourceMaterials", []) if isinstance(material, dict)}
    evidence_id, _ = check_evidence_json(route_id, evidence, work_ids, material_ids, remediation_ids, validation)
    check_route_reference(route_id, reference, evidence_id, work_ids, validation)
    check_route_specific(route_id, comp, rubric, evidence, validation)


def check_route_mode(mode: str, route_id: str | None, validation: Validation) -> None:
    if route_id is not None and route_id not in ROUTE_IDS:
        validation.check("cli.route.known", False, f"unknown route: {route_id}")
        return
    selected = [route_id] if route_id is not None else ROUTE_IDS if mode == "full" else []
    if not selected:
        return
    validation.check("cli.route.known", True)
    for selected_route in selected:
        route_path, rubric_path, evidence_path, reference_path = route_asset_paths(selected_route)
        route = read_json(route_path, validation)
        rubric = read_json(rubric_path, validation)
        evidence = read_json(evidence_path, validation)
        reference = read_text(reference_path, validation)
        check_route_bundle(selected_route, route, rubric, evidence, reference, validation)
        check_safety([route_path, rubric_path, evidence_path, reference_path], [route, rubric, evidence, None], validation)
        print(f"INFO validated route bundle {selected_route}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--shared-only", action="store_true", help="validate only the shared B0 foundation")
    group.add_argument("--route", metavar="ROUTE_ID", help="validate shared foundation and one frozen route bundle")
    group.add_argument("--full", action="store_true", help="validate shared foundation and all four frozen route bundles")
    args = parser.parse_args(argv)
    if not (args.shared_only or args.route or args.full):
        parser.error("choose --shared-only, --route ROUTE_ID, or --full")

    validation = Validation()
    foundation = read_json(FOUNDATION_PATH, validation)
    fixture_a = read_json(FIXTURE_PATHS["A"], validation)
    fixture_b = read_json(FIXTURE_PATHS["B"], validation)
    source_ids, field_ids, evidence_refs = check_foundation(foundation, validation)

    status_model = foundation.get("statusModel", {}) if isinstance(foundation, dict) else {}
    allowed_statuses = {item.get("code") for item in status_model.get("allowedStatuses", []) if isinstance(item, dict)}
    allowed_transitions = {
        (item.get("from"), item.get("to"))
        for item in status_model.get("allowedTransitions", [])
        if isinstance(item, dict)
    }
    check_fixture("A", fixture_a, source_ids, field_ids, evidence_refs, allowed_statuses, allowed_transitions, validation)
    check_fixture("B", fixture_b, source_ids, field_ids, evidence_refs, allowed_statuses, allowed_transitions, validation)
    check_isomorphism(fixture_a, fixture_b, validation)
    check_reference_markdown(REFERENCE_PATH, validation)
    check_safety([FOUNDATION_PATH, REFERENCE_PATH, *FIXTURE_PATHS.values()], [foundation, None, fixture_a, fixture_b], validation)
    check_route_mode("full" if args.full else "route" if args.route else "shared", args.route, validation)

    print(f"RESULT checks={validation.checks} passed={validation.passes} failed={len(validation.failures)}")
    for failure in validation.failures:
        print(failure)
    return 1 if validation.failures else 0


if __name__ == "__main__":
    sys.exit(main())
