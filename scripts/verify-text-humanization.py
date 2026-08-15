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
BASELINE = "65c8b0c"
ROUTE_DIR = ROOT / "content" / "routes" / "accounting"

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
}

FROZEN_PREFIXES = (
    "content/maps/",
    "content/releases/",
    "content/rubrics/",
    "contracts/",
    "frontend/public/",
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


def protected_string(path: tuple[Any, ...]) -> bool:
    string_keys = [part for part in path if isinstance(part, str)]
    if not string_keys:
        return False
    key = string_keys[-1]
    if key in PROTECTED_KEYS or key.lower().endswith("id") or key.lower().endswith("ids"):
        return True
    if key == "source" and ("sourceMaterials" in string_keys or "references" in string_keys):
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
        if isinstance(old_value, str) and protected_string(node_path) and old_value != current_value:
            failures.append(f"{path.name}:{path_label(node_path)} changed protected text")

    old_tokens = set(NUMBER_OR_DATE.findall(old_text))
    current_tokens = set(NUMBER_OR_DATE.findall(current_text))
    if old_tokens != current_tokens:
        failures.append(f"{path.name}: numbers, dates, percentages, or T+N tokens changed")
    return old_text, current_text


def main() -> int:
    failures: list[str] = []
    routes = sorted(ROUTE_DIR.glob("*.json"))
    if len(routes) != 48:
        failures.append(f"expected 48 formal route files, found {len(routes)}")

    baseline_routes: list[str] = []
    current_routes: list[str] = []
    for path in routes:
        old_text, current_text = verify_route(path, failures)
        baseline_routes.append(old_text)
        current_routes.append(current_text)

    changed_files = git("diff", "--name-only", BASELINE, "--").splitlines()
    for name in changed_files:
        normalized = name.replace("\\", "/")
        if normalized.startswith(FROZEN_PREFIXES):
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

    baseline_route_text = "\n".join(baseline_routes)
    current_route_text = "\n".join(current_routes)
    for phrase in ROUTE_PHRASES_THAT_MUST_DECREASE:
        old_count = baseline_route_text.count(phrase)
        current_count = current_route_text.count(phrase)
        if current_count >= old_count:
            failures.append(
                f"route phrase did not decrease: {phrase} {old_count} -> {current_count}"
            )
    for phrase in ROUTE_PHRASES_FORBIDDEN:
        if phrase in current_route_text:
            failures.append(f"route copy still contains templated sentence: {phrase}")

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
    print("- 48 route structures, answers, formulas, numbers, rubrics, topology, and visuals unchanged")
    return 0


if __name__ == "__main__":
    sys.exit(main())
