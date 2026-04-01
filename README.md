# XJTLU Timetable

面向西交利物浦大学（XJTLU）学生的课表可视化与管理工具。支持从 e-Bridge 导入课表、好友课表对比、iCal 订阅导出。

> 本项目与西交利物浦大学官方无任何隶属或授权关系。

## 功能

- **课表可视化**：周视图展示所有课程
- **e-Bridge 导入**：通过 `reference/xjtlu_timetable_importer.html` 一键提取课表
- **好友系统**：与好友对比课表，快速找到共同空闲时间
- **iCal 订阅**：生成订阅链接，导入 Apple 日历 / Google Calendar
- **邀请码注册**：限制注册范围，防止滥用
- **管理员后台**：用户管理（封禁）、公告发布、更新日志

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 · Vite · Pinia · Vue Router · PocketBase JS SDK |
| 后端 | [PocketBase](https://pocketbase.io/) v0.23+（单二进制，SQLite） |
| 部署 | Docker · Docker Compose · Nginx Proxy Manager |

## 部署

### 前置条件

- Docker & Docker Compose
- PocketBase 二进制（v0.23+，[下载](https://github.com/pocketbase/pocketbase/releases)），放至 `backend/pocketbase`

### 启动

```bash
docker compose up -d --build
```

容器对外监听 `172.17.0.1:8091`（Docker 宿主机接口），可在 `docker-compose.yml` 中修改端口绑定。

### 初始化数据库

首次启动后访问 `http://localhost:8091/_/`，创建管理员账号。PocketBase 会自动执行 `backend/pb_migrations/` 中的所有 migration。

然后运行初始化脚本：

```bash
# 初始化站点配置（邮箱白名单、注册开关等）
bash backend/setup-site-config.sh <admin_email> <admin_password>

# 初始化邀请码
bash backend/setup-invite-codes.sh <admin_email> <admin_password>
```

### 用户协议与隐私政策

`frontend/src/views/TermsView.vue` 中的条款内容是针对原部署（timetable.xjtlu.uk）编写的，含原作者联系邮箱。自行部署时请替换为你自己的条款与联系方式。

### 邮箱白名单

在 PocketBase Admin UI → `site_config` → `allowed_email_suffixes` 中填写允许注册的邮箱后缀，例如 `@student.xjtlu.edu.cn`。

### 课表导入

用浏览器打开 `reference/xjtlu_timetable_importer.html`，登录 e-Bridge 后一键提取课表 JSON，粘贴至网站的导入页面。

## 本地开发

```bash
# 前端开发服务器（需同时运行 PocketBase）
cd frontend
pnpm install
pnpm dev
```

```bash
# 本地运行 PocketBase 后端
./backend/pocketbase serve \
  --http=127.0.0.1:8091 \
  --dir=./backend/pb_data \
  --hooksDir=./backend/pb_hooks
```

## 协议

MIT License — 详见 [LICENSE](LICENSE)。
