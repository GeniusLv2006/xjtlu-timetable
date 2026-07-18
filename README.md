# Timetable Toolkit for XJTLU Students

面向西交利物浦大学（XJTLU）学生的独立课表工具，支持从
e-Bridge 导入课表、好友课表对比和 iCal 订阅。

> 本项目与西交利物浦大学官方无任何隶属、授权或合作关系。
> Independent and unofficial. Not affiliated with Xi'an Jiaotong-Liverpool
> University.

项目运营实例：[timetable.xjtlu.uk](https://timetable.xjtlu.uk)

## 功能

- 通过书签工具从 e-Bridge 提取课表 HASH 并导入
- 周视图、课表同步和可见范围控制
- 好友课表对比与共同空闲时间
- Apple Calendar、Google Calendar 等客户端的 iCal 订阅
- 邀请码、邮箱后缀、封禁、公告和学期管理
- iCal 访问记录、限流和异常令牌处置

## 自托管

正式自托管版本使用预构建的 GHCR 镜像，支持 `linux/amd64` 和
`linux/arm64`。部署主机不需要、也不应构建源码。

```bash
cp .env.example .env
./self-host.sh init
```

初始化工具会拉取精确版本镜像、启动安全基线、创建首位管理员，并引导完成
实例信息、注册策略、当前学期和首个邀请码。默认只监听
`127.0.0.1:8091`，公开服务前必须配置 HTTPS 反向代理。

完整步骤、升级、备份、Caddy/Nginx Proxy Manager 示例和故障排查见
[`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)。

不要使用不存在的 `latest` 标签；生产实例应始终选择明确的
`vMAJOR.MINOR.PATCH` 版本。

## 文档导航

文档按使用者角色划分：

- 自托管部署者：[`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)
- 希望了解组件和数据流的开发者：
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- 项目贡献者：[`CONTRIBUTING.md`](CONTRIBUTING.md)
- 项目运营实例维护者：[`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- 版本发布维护者：[`docs/RELEASE.md`](docs/RELEASE.md)
- 安全问题报告者：[`.github/SECURITY.md`](.github/SECURITY.md)
- 全部文档入口：[`docs/README.md`](docs/README.md)

README 面向中文用户；除 README 外，仓库维护的技术文档使用英文。

## 普通用户导入课表

1. 登录部署实例并打开“导入课表”。
2. 将页面提供的书签工具添加到浏览器书签栏。
3. 登录 e-Bridge 并进入课表页面，点击该书签提取 HASH。
4. 将 HASH 粘贴到导入页面并同步。

`reference/xjtlu_timetable_importer.html` 是独立的参考/预览工具，不是网站的
必需部署组件。

## 本地开发

Node.js 和 pnpm 版本由 `frontend/package.json` 固定。后端建议复用正式
预构建镜像，避免安装错误版本的 PocketBase：

```bash
cp .env.example .env
./self-host.sh init

cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

验证命令：

```bash
node --test backend/tests/*.test.mjs
cd frontend
pnpm test
pnpm build
pnpm audit --prod
```

## 运维与发布

- 第三方实例：使用 [正式 Release](https://github.com/GeniusLv2006/xjtlu-timetable/releases)
  和 [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)。
- 项目运营实例维护者：使用 [`docs/OPERATIONS.md`](docs/OPERATIONS.md)，部署
  `main` 的精确提交镜像。
- 发布流程：见 [`docs/RELEASE.md`](docs/RELEASE.md)。
- 变更记录：见 [`CHANGELOG.md`](CHANGELOG.md)。
- 贡献代码或文档：见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
- 安全漏洞：请遵循 [Security Policy](.github/SECURITY.md)，不要在公开
  Issue 中提交令牌、个人数据或可利用细节。

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | Vue 3 · Vite · Pinia · Vue Router · PocketBase JS SDK |
| 后端 | PocketBase 0.39.7 · SQLite · JavaScript hooks/migrations |
| 运行 | Docker Compose · 非 root 只读容器 |
| 发布 | GitHub Actions · GHCR · SBOM/provenance |

## 协议

GNU AGPLv3，详见 [LICENSE](LICENSE)。运行修改版本的网络服务时，请向用户
提供与该实例对应的源码地址。
