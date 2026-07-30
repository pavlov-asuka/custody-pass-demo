# 正式字体子集构建脚本（可复现）
#
# 输入（不进 Git，见 .gitignore 的 frontend/.font-src/）：
#   Nunito-var.ttf      https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf
#   NotoSansSC-var.ttf  https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf
# 两款字体均为 SIL Open Font License 1.1。
#
# 输出（提交进 Git，随生产构建发布）：
#   public/fonts/nunito-{400,500,700}.woff2
#   public/fonts/noto-sans-sc-{400,500,700}.woff2
#
# 字符集口径：ASCII 可打印字符 + 中文标点 + GB2312 一级字库（3755 常用字，
#   覆盖界面文案、业务术语、用户姓名与自由作答的绝大多数用字）+
#   frontend/src、frontend/tests、Repository/content、Repository/contracts、
#   backend/src/main/java 中实际出现的全部字符（覆盖学习内容、契约示例与
#   后端下发消息）。新增内容后必须重跑本脚本。
#
# 运行：python frontend/scripts/build_fonts.py（仓库根目录或任意目录均可）

from __future__ import annotations

import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND = REPO_ROOT / "frontend"
FONT_SRC = FRONTEND / ".font-src"
FONT_OUT = FRONTEND / "public" / "fonts"

WEIGHTS = (400, 500, 700)

# 中文标点与界面符号补充（提取字符之外的显式兜底）
EXTRA_CHARS = (
    "，。、；：？！……—–·“”‘’《》〈〉【】〔〕（）「」『』"
    "％‰℃℉×÷±≈≠≤≥→←↑↓↔↗↘✓★☆●○◆◇■□▲△▼▽"
    "①②③④⑤⑥⑦⑧⑨⑩"
    "￥＄€£¥₩©®™°′″"
    "　﹑﹒﹔﹖﹗﹙﹚﹛﹜﹝﹞"
)

SCAN_GLOBS = [
    (FRONTEND / "src", ("*.ts", "*.tsx", "*.css")),
    (FRONTEND / "tests", ("*.mjs", "*.js")),
    (REPO_ROOT / "content", ("*.json",)),
    (REPO_ROOT / "contracts", ("*.json", "*.yaml", "*.yml")),
    (REPO_ROOT / "backend" / "src" / "main" / "java", ("*.java",)),
]


def collect_text() -> str:
    chunks: list[str] = []
    for base, patterns in SCAN_GLOBS:
        if not base.exists():
            continue
        for pattern in patterns:
            for path in sorted(base.rglob(pattern)):
                try:
                    chunks.append(path.read_text(encoding="utf-8", errors="ignore"))
                except OSError:
                    pass
    return "\n".join(chunks)


def gb2312_level1() -> set[str]:
    """GB2312 一级字库（16—55 区，3755 个常用汉字，按拼音排序）。

    通过 Python 内建 gb2312 解码器可复现生成，不依赖外部字表文件。
    """
    chars: set[str] = set()
    for hi in range(0xB0, 0xD8):  # 0xB0 = 16 区 … 0xD7 = 55 区
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                continue
    return chars


def build_charset(text: str) -> str:
    chars = {chr(code) for code in range(0x20, 0x7F)}  # ASCII 可打印
    chars.update(gb2312_level1())
    chars.update(text)
    chars.update(EXTRA_CHARS)
    # 排除控制字符与明显无用字符
    chars = {c for c in chars if not c.isspace() or c == " "}
    chars = {c for c in chars if ord(c) >= 0x20 and not (0x7F <= ord(c) < 0xA0)}
    return "".join(sorted(chars))


def subset_one(src: Path, weight: int, charset: str, out: Path, family: str) -> int:
    font = TTFont(src)
    instantiateVariableFont(font, {"wght": weight}, updateFontNames=True)

    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.name_IDs = [0, 1, 2, 4, 6, 13, 14, 16, 17]
    options.notdef_outline = True
    options.recalc_bounds = True
    options.recalc_average_width = True
    options.layout_features = ["kern", "liga", "ccmp", "locl", "mark", "mkmk"]
    options.hinting = False

    subsetter = subset.Subsetter(options)
    subsetter.populate(text=charset)
    subsetter.subset(font)

    # 修正家族名，保证三个字重共享同一 font-family
    name_table = font["name"]
    for platform in ((3, 1, 0x409), (1, 0, 0)):
        plat, enc, lang = platform
        name_table.setName(family, 1, plat, enc, lang)
        subfamily = "Bold" if weight == 700 else "Regular"
        name_table.setName(subfamily, 2, plat, enc, lang)
        name_table.setName(f"{family} {subfamily}", 4, plat, enc, lang)
        name_table.setName(f"{family}-{subfamily}", 6, plat, enc, lang)
        # 清除 typographic family/subfamily，避免与 family 分裂
        name_table.setName(family, 16, plat, enc, lang)
        name_table.setName(subfamily, 17, plat, enc, lang)

    font.flavor = "woff2"
    font.save(out)
    return out.stat().st_size


def main() -> int:
    nunito = FONT_SRC / "Nunito-var.ttf"
    noto = FONT_SRC / "NotoSansSC-var.ttf"
    for path in (nunito, noto):
        if not path.exists():
            print(f"缺少字体源文件：{path}", file=sys.stderr)
            print("请先下载（见本文件顶部注释中的 URL）。", file=sys.stderr)
            return 1

    text = collect_text()
    charset = build_charset(text)
    han = [c for c in charset if "一" <= c <= "鿿"]
    print(f"字符集总量 {len(charset)}，其中 CJK 汉字 {len(han)}")

    FONT_OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for weight in WEIGHTS:
        nunito_out = FONT_OUT / f"nunito-{weight}.woff2"
        noto_out = FONT_OUT / f"noto-sans-sc-{weight}.woff2"
        size_n = subset_one(nunito, weight, charset, nunito_out, "Nunito")
        size_c = subset_one(noto, weight, charset, noto_out, "Noto Sans SC")
        total += size_n + size_c
        print(f"wght={weight}: nunito {size_n:,} B | noto-sans-sc {size_c:,} B")

    print(f"全部自托管字体原始字节合计：{total:,} B（上限 10,000,000 B）")
    if total >= 10_000_000:
        print("超过 10 MB 硬上限，必须缩减字符集或回退系统字体栈。", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
