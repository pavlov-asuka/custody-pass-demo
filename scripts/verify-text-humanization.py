#!/usr/bin/env python3
"""Verify the stage-6 learner-facing copy migration.

The migration is deliberately text-only.  ACCOUNTING/CLEARING routes use the
pre-migration commit as their copy baseline.  SUPERVISION routes use the
    merged product commit as their exact baseline, while their current visible
    copy is scanned absolutely for learner-facing residue.  The supervision
    scan permits only an explicit set of business field names that learners
    must read and submit; unknown raw tokens remain failures.  Frozen product
    assets are always compared with the merged product commit, so a later map,
    release, rubric, contract, or visual change cannot hide behind the older
    copy baseline.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
MIGRATION_BASELINE = "aed6d24"
PRODUCT_BASELINE = "4eaf87e"
# Keep the old singular name available to callers that imported the first
# version of this script.  New checks use the explicit baselines above.
BASELINE = MIGRATION_BASELINE
ROUTE_RELATIVE_DIRS = (
    "content/routes/accounting",
    "content/routes/clearing",
    "content/routes/supervision",
)
ROUTE_DIRS = tuple(ROOT / relative for relative in ROUTE_RELATIVE_DIRS)
# Keep the old singular name available to callers that imported the first
# version of this script; all verification below uses both route directories.
ROUTE_DIR = ROUTE_DIRS[0]
ROUTE_BASELINES = {
    "content/routes/accounting": MIGRATION_BASELINE,
    "content/routes/clearing": MIGRATION_BASELINE,
    "content/routes/supervision": PRODUCT_BASELINE,
}

PROTECTED_KEYS = {
    "routeId",
    "contentVersion",
    "line",
    "type",
    "activityType",
    "kind",
    "inputType",
    "answer",
    "formula",
    "value",
    "unit",
    "optionId",
    "fieldId",
    "questionId",
    "cardId",
    "workItemId",
    "materialId",
    "dependsOnRouteIds",
    "fixture",
}

FROZEN_PREFIXES = (
    "content/maps/",
    "content/releases/",
    "content/rubrics/",
    "contracts/",
    "design-assets/",
    "frontend/DESIGN.md",
    "frontend/public/",
    "frontend/screenshots/",
    "frontend/src/assets/",
    "frontend/src/styles/",
)

# The final product closeout is allowed to correct the stale "only accounting
# is open" statements in the visual source of truth.  Keep that exception as
# an exact baseline-to-current transformation; any other DESIGN.md edit still
# fails the frozen-product gate.
ALLOWED_PRODUCT_DOC_EDITS = {
    "frontend/DESIGN.md": (
        (
            "- 首版只有核算可进入，清算和监督显示建设中；\n"
            "- 核算世界采用连续纵向长地图；",
            "- 首版清算、核算、监督三个世界均可进入，并分别承载各自的连续纵向长地图；",
        ),
        (
            "- 只有核算显示推进绿可行动按钮；\n"
            "- 清算和监督显示明确“建设中”，无按压深度，不做假按钮；",
            "- 三个已开放世界均显示推进绿可行动按钮；尚未发布的路线节点仍以灰色锁定态呈现，不做假按钮；",
        ),
        (
            "| 三世界入口 | 三座世界场景 | 三线等权、仅核算可进入 | 企业门户卡、假按钮 |",
            "| 三世界入口 | 三座世界场景 | 三线等权、三世界均可进入 | 企业门户卡、假按钮 |",
        ),
        (
            "- [ ] **三世界**：三世界同级可辨；仅核算可进入；建设中不可误点。",
            "- [ ] **三世界**：三世界同级可辨；三个已开放世界均可进入；未发布节点不可误点。",
        ),
    ),
}

FORBIDDEN_PUBLIC_PHRASES = (
    "再想一步",
    "一步一步来",
    "更容易进步",
    "尚未充分体现",
    "未充分体现",
    "能力已体现",
    "能力未体现",
    "小托正在整理",
    "页面暂时开小差",
    "我们就出发",
    "及时看见每一步成长",
    "关键能力检验",
    "结构化作答",
    "结构化工作纸",
    "对应状态",
    "对应数值",
)

ROUTE_PHRASES_THAT_MUST_DECREASE = (
    "本案例",
    "本路线",
    "题面",
    "可追溯",
    "闭环",
    "结构化",
)

ROUTE_PHRASES_FORBIDDEN = (
    "请用一句可追溯的正常业务结论",
    "本案例资料完整且业务正常",
    "本次作答尚未充分体现",
)

# Clearing copy is reviewed against the learner-visible JSON fields only.
# Keep this list explicit: IDs, answer/value/formula/source payloads and
# reference metadata are data or audit evidence, not page copy.
CLEARING_VISIBLE_COPY_KEYS = frozenset(
    {
        "action",
        "conclusion",
        "description",
        "explanation",
        "facts",
        "hints",
        "instruction",
        "label",
        "objectives",
        "placeholder",
        "product",
        "prompt",
        "purpose",
        "reason",
        "role",
        "submissionNote",
        "summary",
        "text",
        "title",
    }
)

CLEARING_COPY_FORBIDDEN_PHRASES = (
    "本案例",
    "本路线",
    "题面",
    "可追溯",
    "微结论",
    "结构化",
    "教学案例",
    "教育案例",
    "迁移案例",
    "Demo A",
    "Comprehensive B",
)

# These are internal workflow/status labels, not business terms.  The
# snake-case detector below catches the compound forms; this list is for
# single-word statuses that otherwise look like harmless abbreviations.
CLEARING_RAW_STATUS_CODES = frozenset(
    {
        "ACCEPTED",
        "APPROVED",
        "CANCELED",
        "CANCELLED",
        "CLOSED",
        "COMPLETED",
        "CONFIRMED",
        "ERROR",
        "EXECUTED",
        "FAILED",
        "MATCHED",
        "PENDING",
        "POSTED",
        "PROCESSING",
        "QUEUED",
        "READY",
        "RECEIVED",
        "RECONCILED",
        "REJECTED",
        "SENT",
        "SETTLED",
        "SUBMITTED",
    }
)

CLEARING_RAW_CAMEL_CASE = re.compile(
    r"(?<![A-Za-z0-9_])[a-z]+(?:[A-Z][A-Za-z0-9]+)+(?![A-Za-z0-9_])"
)
CLEARING_RAW_SNAKE_CASE = re.compile(
    r"(?<![A-Za-z0-9_])[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+(?![A-Za-z0-9_])"
)
CLEARING_RAW_STATUS = re.compile(
    r"(?<![A-Za-z0-9_])(?:"
    + "|".join(sorted(CLEARING_RAW_STATUS_CODES, key=len, reverse=True))
    + r")(?![A-Za-z0-9_])"
)

# Only deterministic, high-signal spacing patterns are rejected.  Spaces
# around established abbreviations such as `DVP 资金账户` and `Decimal 复算`
# are intentional business typography and must remain valid.
CLEARING_BAD_MIXED_SPACING = (
    (
        re.compile(r"[\u4e00-\u9fff]\s+[a-z][A-Za-z0-9]+"),
        "Chinese text followed by lowercase English without a business separator",
    ),
    (
        re.compile(r"(?<![A-Za-z0-9])[a-z][A-Za-z0-9]*\s+[\u4e00-\u9fff]"),
        "lowercase English followed by Chinese without a business separator",
    ),
)
CLEARING_REPEATED_WORD = re.compile(
    r"(?P<word>[\u4e00-\u9fff]{2,6})(?P=word)"
)
CLEARING_REPEATED_LATIN_WORD = re.compile(
    r"\b(?P<word>[a-z]{2,})\s+(?P=word)\b"
)

NUMBER_OR_DATE = re.compile(
    r"(?<![A-Za-z0-9])(?:T\+\d+|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|[-+]?\d[\d,]*(?:\.\d+)?%?)(?![A-Za-z0-9])"
)


def git(*args: str) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=ROOT, text=True, encoding="utf-8", errors="strict"
    )


def baseline_text(path: Path, revision: str = BASELINE) -> str:
    relative = path.relative_to(ROOT).as_posix()
    return git("show", f"{revision}:{relative}")


def current_route_paths() -> set[str]:
    return {
        path.relative_to(ROOT).as_posix()
        for route_dir in ROUTE_DIRS
        for path in route_dir.glob("*.json")
    }


def baseline_route_paths(relative_dir: str, revision: str) -> set[str]:
    return {
        path
        for path in git(
            "ls-tree",
            "-r",
            "--name-only",
            revision,
            "--",
            relative_dir,
        ).splitlines()
        if path.endswith(".json")
    }


def walk(value: Any, path: tuple[Any, ...] = ()) -> Iterable[tuple[tuple[Any, ...], Any]]:
    yield path, value
    if isinstance(value, dict):
        for key, child in value.items():
            yield from walk(child, (*path, key))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk(child, (*path, index))


def path_label(path: tuple[Any, ...]) -> str:
    return ".".join(str(part) for part in path)


def clearing_visible_copy_path(path: tuple[Any, ...]) -> bool:
    """Return whether a route value is rendered as learner-facing copy.

    Lists such as ``facts`` and ``hints`` end in a numeric path component, so
    use the nearest object key as the field name.  A protected ancestor wins:
    answer/value/formula/source (and machine identifiers) are intentionally
    excluded from the humanization scan.
    """

    string_keys = [part for part in path if isinstance(part, str)]
    if not string_keys or "references" in string_keys:
        return False
    nearest_key = next(
        (part for part in reversed(string_keys) if not part.isdigit()), None
    )
    if nearest_key not in CLEARING_VISIBLE_COPY_KEYS:
        return False
    for key in string_keys:
        normalized_key = key.lower()
        if key in {"answer", "value", "formula", "source"}:
            return False
        if key in PROTECTED_KEYS or normalized_key.endswith(
            ("id", "ids", "key", "keys", "version", "versions")
        ):
            return False
    return True


def iter_clearing_visible_copy(
    route_text: str,
) -> Iterable[tuple[tuple[Any, ...], str]]:
    """Yield only current clearing strings that can reach the learner UI."""

    route = json.loads(route_text)
    for node_path, value in walk(route):
        if isinstance(value, str) and clearing_visible_copy_path(node_path):
            yield node_path, value


def verify_clearing_visible_copy(
    route_pairs: dict[str, tuple[str, str]], failures: list[str]
) -> None:
    """Apply zero-residue copy gates to the seven clearing routes.

    This is deliberately absolute rather than a baseline reduction check: a
    newly edited clearing route must not retain course-authoring phrases or
    raw implementation labels in any learner-visible field.
    """

    for relative, (_, current_text) in route_pairs.items():
        if not relative.startswith("content/routes/clearing/"):
            continue
        try:
            visible_copy = tuple(iter_clearing_visible_copy(current_text))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            failures.append(f"{relative}: unable to scan visible copy ({error})")
            continue
        for node_path, value in visible_copy:
            location = f"{relative}:{path_label(node_path)}"
            for phrase in CLEARING_COPY_FORBIDDEN_PHRASES:
                if phrase in value:
                    failures.append(
                        f"clearing visible copy still contains {phrase}: {location}"
                    )
            for pattern, label in (
                (CLEARING_RAW_CAMEL_CASE, "raw camelCase label"),
                (CLEARING_RAW_SNAKE_CASE, "raw snake_case label"),
                (CLEARING_RAW_STATUS, "raw status code"),
            ):
                for match in pattern.finditer(value):
                    failures.append(
                        f"clearing visible copy still contains {label} "
                        f"{match.group(0)}: {location}"
                    )
            if re.search(r"\s{2,}", value):
                failures.append(
                    f"clearing visible copy contains repeated whitespace: {location}"
                )
            for pattern, label in CLEARING_BAD_MIXED_SPACING:
                if pattern.search(value):
                    failures.append(
                        f"clearing visible copy contains unnatural mixed spacing "
                        f"({label}): {location}"
                    )
            repeated = CLEARING_REPEATED_WORD.search(value)
            if repeated:
                failures.append(
                    f"clearing visible copy contains repeated Chinese word "
                    f"{repeated.group('word')}: {location}"
                )
            repeated_latin = CLEARING_REPEATED_LATIN_WORD.search(value)
            if repeated_latin:
                failures.append(
                    f"clearing visible copy contains repeated English word "
                    f"{repeated_latin.group('word')}: {location}"
                )


SUPERVISION_COPY_FORBIDDEN_MARKERS = (
    "SYNTHETIC_EDUCATIONAL",
    "ONLY_THIS_CASE",
)
SUPERVISION_COPY_FORBIDDEN_PHRASES = tuple(
    dict.fromkeys(
        (
            *FORBIDDEN_PUBLIC_PHRASES,
            *CLEARING_COPY_FORBIDDEN_PHRASES,
            *SUPERVISION_COPY_FORBIDDEN_MARKERS,
        )
    )
)

# These field names are part of the supervision learner workflow: the route,
# rubric, and reference answer use them as evidence keys.  Keep the exception
# exact and small; status values and any unknown raw token remain forbidden.
SUPERVISION_BUSINESS_FIELD_TOKENS = frozenset(
    {
        "INVESTMENT_RATIO",
        "CS_BLXX",
        "B0100001",
        "B0100002",
        "B0100003",
        "subjectType",
        "teachingKey",
        "enableDate",
        "dataDate",
        "stopDate",
        "ruleStatus",
        "importStatus",
        "taskStatus",
        "businessResult",
        "confirmationStatus",
    }
)


def supervision_spacing_probe(value: str) -> str:
    """Hide only approved evidence tokens before checking mixed spacing."""

    probe = value
    for token in SUPERVISION_BUSINESS_FIELD_TOKENS:
        probe = re.sub(
            rf"(?<![A-Za-z0-9_]){re.escape(token)}(?![A-Za-z0-9_])",
            "FIELD_TOKEN",
            probe,
        )
    return probe


def verify_supervision_visible_copy(
    route_pairs: dict[str, tuple[str, str]], failures: list[str]
) -> None:
    """Scan supervision copy without treating its merged product baseline as a migration.

    The supervision routes were published before the stage-6 copy migration
    closed.  Their exact product-baseline values are therefore trusted as the
    frozen starting point, not admitted through a broad phrase allowlist.
    Every current learner-visible value is scanned absolutely: any AI-style
    phrase, raw camelCase/snake_case/status token, spacing residue, or repeated
    word fails the gate.
    """

    for relative, (_, current_text) in route_pairs.items():
        if not relative.startswith("content/routes/supervision/"):
            continue
        try:
            visible_copy = tuple(iter_clearing_visible_copy(current_text))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            failures.append(f"{relative}: unable to scan visible copy ({error})")
            continue

        for node_path, value in visible_copy:
            location = f"{relative}:{path_label(node_path)}"
            for phrase in SUPERVISION_COPY_FORBIDDEN_PHRASES:
                if phrase in value:
                    failures.append(
                        f"supervision visible copy still contains {phrase}: {location}"
                    )
            for pattern, label in (
                (CLEARING_RAW_CAMEL_CASE, "raw camelCase label"),
                (CLEARING_RAW_SNAKE_CASE, "raw snake_case label"),
                (CLEARING_RAW_STATUS, "raw status code"),
            ):
                for match in pattern.finditer(value):
                    if match.group(0) in SUPERVISION_COPY_FORBIDDEN_MARKERS:
                        continue
                    if match.group(0) in SUPERVISION_BUSINESS_FIELD_TOKENS:
                        continue
                    failures.append(
                        f"supervision visible copy still contains {label} "
                        f"{match.group(0)}: {location}"
                    )
            if re.search(r"\s{2,}", value):
                failures.append(
                    f"supervision visible copy contains repeated whitespace: {location}"
                )
            spacing_probe = supervision_spacing_probe(value)
            for pattern, label in CLEARING_BAD_MIXED_SPACING:
                if pattern.search(spacing_probe):
                    failures.append(
                        f"supervision visible copy contains unnatural mixed spacing "
                        f"({label}): {location}"
                    )
            repeated = CLEARING_REPEATED_WORD.search(value)
            if repeated:
                failures.append(
                    f"supervision visible copy contains repeated Chinese word "
                    f"{repeated.group('word')}: {location}"
                )
            repeated_latin = CLEARING_REPEATED_LATIN_WORD.search(value)
            if repeated_latin:
                failures.append(
                    f"supervision visible copy contains repeated English word "
                    f"{repeated_latin.group('word')}: {location}"
                )


def protected_string(path: tuple[Any, ...], value: str | None = None) -> bool:
    string_keys = [part for part in path if isinstance(part, str)]
    if not string_keys:
        return False
    key = string_keys[-1]
    normalized_key = key.lower()
    if key in PROTECTED_KEYS or normalized_key.endswith(
        ("id", "ids", "key", "keys", "version", "versions")
    ):
        return True
    if key == "source" and "sourceMaterials" in string_keys:
        return True
    if key == "source" and "references" in string_keys and value:
        # A citation path or a bare machine source key is protected.  Human
        # descriptions in the reference list remain editable copy.
        if "/" in value or "\\" in value or re.fullmatch(r"[A-Z][A-Z0-9_-]+", value):
            return True
    return False


def verify_route(path: Path, revision: str, failures: list[str]) -> tuple[str, str]:
    current_text = path.read_text(encoding="utf-8")
    old_text = baseline_text(path, revision)
    current = json.loads(current_text)
    old = json.loads(old_text)

    current_nodes = list(walk(current))
    old_nodes = list(walk(old))
    current_paths = [node_path for node_path, _ in current_nodes]
    old_paths = [node_path for node_path, _ in old_nodes]
    if current_paths != old_paths:
        failures.append(f"{path.name}: JSON structure or key order changed")
        return old_text, current_text

    for (node_path, old_value), (_, current_value) in zip(old_nodes, current_nodes):
        if type(old_value) is not type(current_value):
            failures.append(f"{path.name}:{path_label(node_path)} changed type")
            continue
        if not isinstance(old_value, (str, dict, list)) and old_value != current_value:
            failures.append(f"{path.name}:{path_label(node_path)} changed non-text data")
        if (
            isinstance(old_value, str)
            and protected_string(node_path, old_value)
            and old_value != current_value
        ):
            failures.append(f"{path.name}:{path_label(node_path)} changed protected text")

    old_tokens = NUMBER_OR_DATE.findall(old_text)
    current_tokens = NUMBER_OR_DATE.findall(current_text)
    if old_tokens != current_tokens:
        failures.append(
            f"{path.name}: numbers, dates, percentages, or T+N tokens changed"
        )
    return old_text, current_text


def verify_route_set(failures: list[str]) -> dict[str, tuple[str, str]]:
    current_paths = current_route_paths()
    route_pairs: dict[str, tuple[str, str]] = {}
    for relative_dir in ROUTE_RELATIVE_DIRS:
        baseline_paths = baseline_route_paths(relative_dir, ROUTE_BASELINES[relative_dir])
        scoped_current_paths = {path for path in current_paths if path.startswith(f"{relative_dir}/")}
        missing = sorted(baseline_paths - scoped_current_paths)
        added = sorted(scoped_current_paths - baseline_paths)
        if missing:
            failures.append(f"formal route files removed: {', '.join(missing)}")
        if added:
            failures.append(f"formal route files added: {', '.join(added)}")

        for relative in sorted(scoped_current_paths & baseline_paths):
            path = ROOT / relative
            try:
                old_text, current_text = verify_route(
                    path, ROUTE_BASELINES[relative_dir], failures
                )
            except (
                OSError,
                UnicodeError,
                json.JSONDecodeError,
                subprocess.CalledProcessError,
            ) as error:
                failures.append(f"{relative}: unable to verify route ({error})")
                continue
            route_pairs[relative] = (old_text, current_text)
    return route_pairs


def verify_route_phrase_reduction(
    route_pairs: dict[str, tuple[str, str]], failures: list[str]
) -> None:
    """Require reductions only on routes changed in this migration.

    The baseline already contains accepted accounting copy.  Comparing total
    phrase counts across all routes would therefore make an unchanged route
    mask a real clearing reduction (or make a newly published route look like
    a regression).  A changed route must reduce every targeted phrase it had;
    introducing or retaining one on that route is still a failure.
    """

    for relative, (old_text, current_text) in route_pairs.items():
        if not relative.startswith(("content/routes/accounting/", "content/routes/clearing/")):
            continue
        if old_text == current_text:
            continue
        for phrase in ROUTE_PHRASES_THAT_MUST_DECREASE:
            old_count = old_text.count(phrase)
            current_count = current_text.count(phrase)
            if current_count > old_count or (
                old_count > 0 and current_count >= old_count
            ):
                failures.append(
                    f"route phrase did not decrease in {relative}: "
                    f"{phrase} {old_count} -> {current_count}"
                )


def verify_allowed_product_doc_edit(relative: str, failures: list[str]) -> None:
    """Allow only the explicitly approved final documentation correction."""

    path = ROOT / relative
    try:
        expected = baseline_text(path, PRODUCT_BASELINE)
        for old, new in ALLOWED_PRODUCT_DOC_EDITS[relative]:
            if expected.count(old) != 1:
                failures.append(
                    f"approved product-doc baseline text is not unique: {relative}"
                )
                return
            expected = expected.replace(old, new, 1)
        current = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError, subprocess.CalledProcessError) as error:
        failures.append(f"unable to verify approved product-doc edit {relative}: {error}")
        return
    if current != expected:
        failures.append(
            f"unexpected change outside approved product-doc edit: {relative}"
        )


def main() -> int:
    failures: list[str] = []
    route_pairs = verify_route_set(failures)

    changed_files = set(git("diff", "--name-only", PRODUCT_BASELINE, "--").splitlines())
    changed_files.update(git("ls-files", "--others", "--exclude-standard").splitlines())
    for name in changed_files:
        normalized = name.replace("\\", "/")
        if any(
            normalized == prefix.rstrip("/") or normalized.startswith(prefix)
            for prefix in FROZEN_PREFIXES
        ):
            if normalized in ALLOWED_PRODUCT_DOC_EDITS:
                verify_allowed_product_doc_edit(normalized, failures)
            else:
                failures.append(f"frozen product or visual path changed: {normalized}")

    frontend_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (ROOT / "frontend" / "src").rglob("*")
        if path.suffix in {".ts", ".tsx", ".html"}
    )
    for phrase in FORBIDDEN_PUBLIC_PHRASES:
        if phrase in frontend_text:
            failures.append(f"frontend learner-facing copy still contains: {phrase}")

    direct_internal_renders = {
        "{material.kind}": "material kind",
        "{item.type}": "work item type",
        ">{option.optionId}<": "option id",
        ">{fieldId}<": "field id",
        "<dd>{field.value}": "raw material value",
        ">{option.text}</": "raw option text",
        "{content.submissionNote}": "raw submission note",
        ">{route.title}</": "raw route title",
        ">{route.summary}</": "raw route summary",
        ">{entry.direction}</": "raw ledger direction",
        ">{field.unit}</": "raw technical unit",
        ">{item.response.unit}</": "raw work-item unit",
    }
    compact_frontend = frontend_text.replace("\n", "").replace(" ", "")
    for needle, label in direct_internal_renders.items():
        if needle.replace(" ", "") in compact_frontend:
            failures.append(f"frontend still renders raw {label}")

    feedback_source = (ROOT / "backend" / "src" / "main" / "java" / "com" / "ccb"
                       / "custodytraining" / "learning" / "HumanFeedbackText.java").read_text(encoding="utf-8")
    for unsafe_rewrite in ('replace("形成",', 'replace("完成",', 'replace("闭合",'):
        if unsafe_rewrite in feedback_source:
            failures.append(f"feedback sanitizer still rewrites business verbs globally: {unsafe_rewrite}")
    if 'known ? String.join("·", labels) : "业务状态"' in feedback_source:
        failures.append("feedback sanitizer still collapses unknown values to a generic business state")

    format_test = ROOT / "frontend" / "tests" / "text-format-test.mjs"
    if not format_test.exists():
        failures.append("missing frontend dynamic text mapping regression test")

    migration_route_pairs = {
        relative: pair
        for relative, pair in route_pairs.items()
        if relative.startswith(("content/routes/accounting/", "content/routes/clearing/"))
    }
    baseline_route_text = "\n".join(
        old_text for old_text, _ in migration_route_pairs.values()
    )
    current_route_text = "\n".join(
        current_text for _, current_text in migration_route_pairs.values()
    )
    verify_route_phrase_reduction(route_pairs, failures)
    for phrase in ROUTE_PHRASES_FORBIDDEN:
        if phrase in current_route_text:
            failures.append(f"route copy still contains templated sentence: {phrase}")
    verify_clearing_visible_copy(route_pairs, failures)
    verify_supervision_visible_copy(route_pairs, failures)

    if failures:
        print("Learner-facing copy verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Learner-facing copy verification passed.")
    for phrase in ROUTE_PHRASES_THAT_MUST_DECREASE:
        print(
            f"- {phrase}: {baseline_route_text.count(phrase)} -> "
            f"{current_route_text.count(phrase)}"
        )
    print(
        f"- {len(route_pairs)} route structures, answers, formulas, numbers, "
        "rubrics, topology, and visuals unchanged"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
