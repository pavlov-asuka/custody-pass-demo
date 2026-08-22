#!/usr/bin/env python3
"""Verify the stage-6 learner-facing copy migration.

The migration is deliberately text-only.  This check compares every formal
route with the last pre-migration commit and rejects changes to data, answers,
formulas, identifiers, release topology, rubrics, or visual assets.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
BASELINE = "aed6d24"
ROUTE_RELATIVE_DIRS = (
    "content/routes/accounting",
    "content/routes/clearing",
)
ROUTE_DIRS = tuple(ROOT / relative for relative in ROUTE_RELATIVE_DIRS)
# Keep the old singular name available to callers that imported the first
# version of this script; all verification below uses both route directories.
ROUTE_DIR = ROUTE_DIRS[0]

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


def baseline_text(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    return git("show", f"{BASELINE}:{relative}")


def current_route_paths() -> set[str]:
    return {
        path.relative_to(ROOT).as_posix()
        for route_dir in ROUTE_DIRS
        for path in route_dir.glob("*.json")
    }


def baseline_route_paths() -> set[str]:
    return {
        path
        for path in git(
            "ls-tree",
            "-r",
            "--name-only",
            BASELINE,
            "--",
            *ROUTE_RELATIVE_DIRS,
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


def verify_route(path: Path, failures: list[str]) -> tuple[str, str]:
    current_text = path.read_text(encoding="utf-8")
    old_text = baseline_text(path)
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
    baseline_paths = baseline_route_paths()

    missing = sorted(baseline_paths - current_paths)
    added = sorted(current_paths - baseline_paths)
    if missing:
        failures.append(f"formal route files removed: {', '.join(missing)}")
    if added:
        failures.append(f"formal route files added: {', '.join(added)}")

    route_pairs: dict[str, tuple[str, str]] = {}
    for relative in sorted(current_paths & baseline_paths):
        path = ROOT / relative
        try:
            old_text, current_text = verify_route(path, failures)
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


def main() -> int:
    failures: list[str] = []
    route_pairs = verify_route_set(failures)

    changed_files = set(git("diff", "--name-only", BASELINE, "--").splitlines())
    changed_files.update(git("ls-files", "--others", "--exclude-standard").splitlines())
    for name in changed_files:
        normalized = name.replace("\\", "/")
        if any(
            normalized == prefix.rstrip("/") or normalized.startswith(prefix)
            for prefix in FROZEN_PREFIXES
        ):
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

    baseline_route_text = "\n".join(
        old_text for old_text, _ in route_pairs.values()
    )
    current_route_text = "\n".join(
        current_text for _, current_text in route_pairs.values()
    )
    verify_route_phrase_reduction(route_pairs, failures)
    for phrase in ROUTE_PHRASES_FORBIDDEN:
        if phrase in current_route_text:
            failures.append(f"route copy still contains templated sentence: {phrase}")
    verify_clearing_visible_copy(route_pairs, failures)

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
