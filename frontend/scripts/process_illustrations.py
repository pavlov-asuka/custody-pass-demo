# 阶段 3B-4 插画资产后处理（可复现）
#
# 输入：frontend/src/assets/illustrations/ 下的 ImageGen 生成原图（白底 PNG）
# 处理：思考姿态裁剪 → 白底去底（边缘洪水填充）→ 裁水印 → 内容 bbox 裁边 →
#       缩放 → 导出 WebP（带 alpha）
# 输出：frontend/src/assets/illustrations/<name>.webp（提交进 Git）
#
# 运行：python frontend/scripts/process_illustrations.py

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parents[1] / "src" / "assets" / "illustrations"

# 源文件 →（输出名, 目标宽度, 可选预裁剪框 left/top/right/bottom）
JOBS = [
    ("The_exact_same_character_as_th_2026-07-30T02-16-26.png", "xiaotuo-wave", 512, None),
    ("Full_body_flat_vector_illustra_2026-07-30T02-20-30.png", "xiaotuo-point", 512, None),
    ("The_exact_same_character_as_th_2026-07-30T02-18-09.png", "xiaotuo-think", 512, (330, 175, 780, 835)),
    ("Full_body_flat_vector_illustra_2026-07-30T02-33-02.png", "xiaotuo-book", 512, None),
    ("Full_body_flat_vector_illustra_2026-07-30T02-33-56.png", "xiaotuo-wait", 512, None),
    ("Full_body_flat_vector_illustra_2026-07-30T02-34-45.png", "xiaotuo-support", 512, None),
    ("Full_body_flat_vector_illustra_2026-07-30T02-35-37.png", "xiaotuo-celebrate", 512, None),
    ("Flat_vector_illustration_on_pu_2026-07-30T02-18-06.png", "world-clearing", 1100, None),
    ("Flat_vector_illustration_on_pu_2026-07-30T02-21-35.png", "world-accounting", 1100, None),
    ("Flat_vector_illustration_on_pu_2026-07-30T02-18-07.png", "world-supervision", 1100, None),
]

WHITE = 242          # 背景白阈值
WATERMARK_CUT = 0.035  # 底部水印区裁掉比例


def remove_white_background(img: Image.Image, threshold: int = WHITE) -> Image.Image:
    """从四边洪水填充近白像素并置为透明（封闭轮廓内的白色身体不受影响）。"""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        r, g, b, _ = px[x, y]
        if r >= threshold and g >= threshold and b >= threshold:
            queue.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if visited[i]:
            continue
        visited[i] = 1
        r, g, b, _ = px[x, y]
        if r >= threshold and g >= threshold and b >= threshold:
            px[x, y] = (r, g, b, 0)
            queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return img


def content_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = img.getchannel("A")
    return alpha.getbbox()


def process(src: Path, out_name: str, target_w: int, crop: tuple[int, int, int, int] | None) -> None:
    img = Image.open(src)
    if crop:
        img = img.crop(crop)
    else:
        # 裁掉底部水印区（生成平台在底部附加的小字）；预裁剪任务已避开该区域
        w, h = img.size
        img = img.crop((0, 0, w, int(h * (1 - WATERMARK_CUT))))
    img = remove_white_background(img)
    bbox = content_bbox(img)
    if bbox:
        pad = 6
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(img.size[0], bbox[2] + pad)
        bottom = min(img.size[1], bbox[3] + pad)
        img = img.crop((left, top, right, bottom))
    ratio = target_w / img.size[0]
    target_h = round(img.size[1] * ratio)
    img = img.resize((target_w, target_h), Image.LANCZOS)
    out = HERE / f"{out_name}.webp"
    img.save(out, "WEBP", quality=92, method=6)
    print(f"{out.name}: {img.size[0]}x{img.size[1]} {out.stat().st_size:,} B")


def main() -> None:
    for src_name, out_name, target_w, crop in JOBS:
        src = HERE / src_name
        if not src.exists():
            print(f"缺少源文件：{src_name}")
            continue
        process(src, out_name, target_w, crop)


if __name__ == "__main__":
    main()
