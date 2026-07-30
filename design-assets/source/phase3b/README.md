# 阶段 3B 插画源资产

本目录保存生成正式世界场景和小托姿态所需的 11 张原始 PNG，以及可复现的后处理脚本。

运行：

```powershell
python design-assets/source/phase3b/process_illustrations.py
```

脚本会在 `frontend/src/assets/illustrations/` 生成前端实际引用的 10 张透明 WebP。`Based_on_the_character_in_the__2026-07-30T02-14-26.png` 是生成过程中的身份参考，不直接输出生产文件。

生产页面只引用 WebP；原始 PNG 不得移回 `frontend/src/`，也不得进入前端构建产物。
