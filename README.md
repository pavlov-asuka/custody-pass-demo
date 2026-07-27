# custody-pass-demo

麒麟操作系统 x86_64 环境使用的 Custody Pass AI 完整部署包。

## 文件

- `custody-pass-kylin-ai.zip`：完整部署包（未拆分）
- `custody-pass-kylin-ai.zip.sha256`：SHA-256 校验文件

## 校验

Linux：

```bash
sha256sum -c custody-pass-kylin-ai.zip.sha256
```

macOS：

```bash
shasum -a 256 custody-pass-kylin-ai.zip
```

预期 SHA-256：

```text
b874b3f754816b477743fe50caeb8ee3edf1f99060cd91585050aa0d7c0928a2
```
