# XJTLU Timetable

面向西交利物浦大学（XJTLU）学生的课表可视化与对比工具。支持从 e-Bridge 导入课表、好友课表对比、iCal 订阅导出。

> **注意**：原 timetable.xjtlu.uk 服务已停止运营。本仓库作为开源参考，欢迎自行部署。
>
> **PocketBase 版本锁定**：本项目的 `backend/pb_hooks/` 基于 PocketBase **v0.22.x** 的 JS hooks API 编写。v0.23 起 API 有较大变化（如 `$app.dao()` → `$app.db()`），直接使用更新版本会导致 hooks 报错。请使用 [v0.22.x](https://github.com/pocketbase/pocketbase/releases/tag/v0.22.0) 或自行迁移 hooks 代码。

## 功能

- 课表可视化（周视图）
- 从 e-Bridge 一键导入课表（通过 `reference/xjtlu_timetable_importer.html`）
- 好友系统与课表对比（找共同空闲时间）
- iCal 订阅链接导出（可导入 Apple/Google 日历）
- 邀请码注册机制
- 管理员后台（封禁用户、公告、更新日志）

## 技术栈

- **前端**：Vue 3 + Vite + Pinia + Vue Router + PocketBase JS SDK
- **后端**：[PocketBase](https://pocketbase.io/) v0.22.0（单二进制，SQLite）
- **部署**：Docker + Nginx Proxy Manager

## 部署

### 前置条件

- Docker & Docker Compose
- PocketBase v0.22.0 二进制（[下载](https://github.com/pocketbase/pocketbase/releases/tag/v0.22.0)），放至 `backend/pocketbase`

### 启动

```bash
docker compose up -d --build
```

服务默认监听 `0.0.0.0:8080`，可通过 `docker-compose.yml` 修改端口绑定。

### 初始化数据库

首次启动后，访问 `http://localhost:8080/_/` 创建管理员账号，PocketBase 会自动执行 `backend/pb_migrations/` 中的 migration。

然后运行以下脚本完成初始配置：

```bash
# 初始化 site_config（站点开关、邮箱白名单等）
bash backend/setup-site-config.sh <admin_email> <admin_password>

# 初始化邀请码系统
bash backend/setup-invite-codes.sh <admin_email> <admin_password>
```

### 配置邮箱后缀白名单

在 PocketBase Admin UI → site_config 记录中设置 `allowed_email_suffixes`，例如 `@student.xjtlu.edu.cn`。

### 课表导入

用浏览器打开 `reference/xjtlu_timetable_importer.html`，登录 e-Bridge 后一键提取课表 JSON，粘贴至网站导入页面。

## 开发

```bash
cd frontend
pnpm install
pnpm dev        # 前端开发服务器，需本地同时运行 PocketBase
```

本地运行 PocketBase：

```bash
./backend/pocketbase serve --http=127.0.0.1:8091 \
  --dir=./backend/pb_data \
  --hooksDir=./backend/pb_hooks
```

## 协议

MIT License — 详见 [LICENSE](LICENSE)。

本项目与西交利物浦大学官方无任何隶属或授权关系。
