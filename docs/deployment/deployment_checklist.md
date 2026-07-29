# Linux 容器部署清单

按以下顺序执行。Fin-X-Scope 的私有 JAR 必须先在内网 Maven 环境构建，Docker 构建阶段只接收已经生成的可执行 JAR，不重新解析 Maven 依赖。

## 1. 内网构建

PowerShell：

```powershell
Set-Location <Repository目录>
mvn -f backend/pom.xml -Pfinxscope -DskipTests package
$jars = @(Get-ChildItem .\backend\target\custody-training-*.jar -File)
if ($jars.Count -ne 1) { throw "backend/target 中必须恰好有一个可执行 JAR" }
```

Linux：

```bash
cd <Repository目录>
mvn -f backend/pom.xml -Pfinxscope -DskipTests package
test "$(find backend/target -maxdepth 1 -type f -name 'custody-training-*.jar' | wc -l)" = "1"
```

## 2. 确认 JAR

确认 `backend/target/custody-training-*.jar` 是本次内网构建的可执行 JAR，大小和修改时间符合预期；不要把 `sources`、`javadoc` 或旧版本 JAR 放在匹配目录中。

## 3. 构建运行时镜像

```bash
docker build --build-arg RUNTIME_IMAGE=<内网可用的 JRE 17 基础镜像> -t <镜像名>:<版本> .
```

默认基础镜像是 `eclipse-temurin:17-jre-jammy`。比赛内网无法访问外部仓库时，使用平台已缓存或已批准的 JRE 17 镜像覆盖 `RUNTIME_IMAGE`。镜像不安装 Maven、Node、curl 或 wget。

## 4. 配置环境变量

通过比赛平台的密钥管理或容器编排配置注入，不写入镜像、代码、命令历史或仓库：

- **profiles**：启用比赛环境和正式 Fin-X-Scope 配置。
- **DB**：平台提供的关系型数据库连接、用户名和密码；生产不用 H2。
- **初始化账号**：仅首次部署时使用平台规定的初始化账号配置，完成后按平台要求收回或禁用。
- **模型**：模型网关地址、模型名、API Key 和必要的用户标识头；不要使用真实值写入清单。
- **Cookie**：HTTPS 部署必须启用 `Secure Cookie=true`，同时保持 HttpOnly 和合适的 SameSite 策略。

本方案不使用 Redis。业务数据落在平台提供的关系型数据库中；当前 `HttpSession` 只保存在单个 JVM 内存中，项目没有 Spring Session 或其他共享会话存储。因此本版必须部署为单实例、单副本，不能进行无共享会话的水平扩容。若未来改为多副本，必须新增共享会话存储并重新验证登录、隔离和失效策略。

## 5. 启动容器

```bash
docker run -d --name <容器名> -p <平台端口>:8080 --env-file <平台注入的环境文件> <镜像名>:<版本>
```

本版只启动一个容器副本。环境文件只在部署机或平台密钥系统中管理，不随邮件、镜像或代码提交。

## 6. 健康检查

```bash
curl -fsS http://<服务地址>/api/health
```

应返回成功状态；正式环境通过平台 HTTPS 地址访问。

## 7. 功能验收

使用 `scripts/run-api-smoke.ps1` 或平台等价方式依次验证真实登录/CSRF、三世界、核算地图、四环节顺序、草稿、幂等正式提交、异步评分轮询、通过后下一节点解锁、训练记录和退出登录。另用两个不同学员账号确认：不能读取对方草稿、attempt、补学计划或训练历史，不能复用对方会话或提交结果。

## 8. 停止与重启

```bash
docker stop --time 30 <容器名>
docker start <容器名>
docker logs --since 5m <容器名>
```

确认停止期间应用能在 30 秒内完成优雅退出，重启后数据库连接、登录、正式提交、评分重试和历史查询仍正常。日志只保留必要运行信息，不得出现 API Key、密码、Cookie、完整学员答案、模型原文或内部地址。

重启会清除单 JVM 内存中的 `HttpSession`，导致原有登录会话失效，这是预期行为；重启后应重新登录。重启前已落库的业务训练记录必须保留。不要把“重启后旧 Cookie 仍可用”作为验收条件。
