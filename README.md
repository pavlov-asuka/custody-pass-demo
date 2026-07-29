# 托管智训营

“托管智训营”当前是可本地运行的桌面端 Demo：Spring Boot 后端提供登录、案例训练、四维评分、训练记录和知识问答，Vite + React 前端通过 Cookie 会话与动态 CSRF Header 调用同源 API。默认 Mock 模式不需要真实数据库、模型或内网凭据。

本仓库目前只完成目录隔离，尚未实施新学习地图、数据库模型或内容 Schema。

## 仓库入口

```text
backend/       Spring Boot Maven 工程
frontend/      Vite + React 桌面端
contracts/     当前 OpenAPI 契约
content/       与 Java resources 分离的内容源资产
design-assets/ 视觉源资产入口
docs/          架构交接与部署文档
tests/e2e/     完整系统端到端验证
scripts/       根目录统一构建与验证脚本
.local/        本地数据库、日志和测试结果（Git 忽略）
```

当前 Demo 内容保存在 `content/demo/`。Maven 构建会把这些资产复制到 JAR classpath，运行行为与重构前一致；它们不是阶段 2 的正式学习地图内容或新 Schema。

## 统一命令

在仓库根目录使用 PowerShell：

```powershell
.\scripts\test-backend.ps1
.\scripts\build-frontend.ps1
.\scripts\validate-content.ps1
.\scripts\build-app.ps1
.\scripts\run-mock.ps1
.\scripts\verify-all.ps1
```

- `test-backend.ps1`：执行后端测试。
- `build-frontend.ps1`：执行前端 typecheck 和正式构建。
- `validate-content.ps1`：校验当前 Demo JSON 资产可解析且所需文件齐全。
- `build-app.ps1`：校验内容、构建前端并生成同源 JAR。
- `run-mock.ps1`：使用 `.local/data/` 下的 H2 数据库启动 Mock 应用。
- `verify-all.ps1`：执行测试、组合构建，并在隔离端口运行系统 E2E。

组合构建产物位于 `backend/target/custody-training-0.1.0-SNAPSHOT.jar`。启动后访问 `http://localhost:8080/api/health`；前端页面由同一个 8080 服务提供。

## 子目录开发

后端：

```powershell
cd backend
mvn test
mvn package
mvn spring-boot:run -Dspring-boot.run.profiles=mock
```

前端（后端已启动在 8080）：

```powershell
cd frontend
npm install
npm run dev
npm run typecheck
npm run build
```

系统 E2E 位于仓库根目录，不属于前端内部测试：

```powershell
$env:VERIFY_BASE = 'http://localhost:8080'
node tests/e2e/verify.mjs
```

截图输出到 `.local/test-results/e2e/`。

## Mock 登录

| 员工号 | 显示名 | Mock 密码 |
| --- | --- | --- |
| `10000001` | 清算学员 | `Demo@1234` |
| `10000002` | 核算学员 | `Demo@1234` |

Mock 固定密码只用于本地演示。internal 环境的数据库、初始化账号和模型配置必须通过环境变量或平台密钥注入，不得写入源码、日志或 Git。

## API 与文档

- API 契约：[contracts/openapi.yaml](contracts/openapi.yaml)
- 前端接口交接：[docs/handoffs/frontend_handoff.md](docs/handoffs/frontend_handoff.md)
- 当前前端交付记录：[docs/handoffs/frontend_delivery.md](docs/handoffs/frontend_delivery.md)
- Linux 容器部署：[docs/deployment/deployment_checklist.md](docs/deployment/deployment_checklist.md)
- Fin-X-Scope 内网验证：[docs/deployment/finxscope_internal_checklist.md](docs/deployment/finxscope_internal_checklist.md)

默认构建不引入 Fin-X-Scope 私有依赖。只有在可访问内网 Maven 仓库时，才在 `backend/` 中显式执行 `mvn -Pfinxscope ...`；本地默认构建通过不代表官方框架验收完成。
