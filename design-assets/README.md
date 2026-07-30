# 视觉源资产

- `xiaotuo/`：小托身份基准、颜色、轮廓、动作和验收规范。
- `source/phase3b/`：三世界与小托生产插画的原始 PNG 和可复现后处理脚本。
- 前端实际发布的 10 张透明 WebP 位于 `frontend/src/assets/illustrations/`。

源资产与运行时资产必须分离。前端不得直接加载本目录的原始 PNG，生产构建也不得包含源文件或处理脚本。
