# 统一部署方案

单一 `docker-compose.yml` 同时部署 mmth-analyzer 和 mementomori-webui。

## 架构说明

```text
┌──────────────────────────────────────────────────────────────┐
│                      Docker Network                           │
│                                                               │
│  ┌──────────────────┐                     ┌────────────────┐ │
│  │  mmth-analyzer   │ ──── HTTP ────────> │ mementomori-   │ │
│  │   :5391          │   (Scraper抓取)     │    webui       │ │
│  │                  │                      │   :5290        │ │
│  │                  │ <── 日志文件 ────────┤                │ │
│  │   (ETL处理日志)  │   ./mmth-logs/      │                │ │
│  └──────────────────┘                     └────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 数据流

1. **Scraper**: 通过 HTTP 访问 webui 网页抓取钻石数据
2. **ETL**: 读取持久化日志文件进行解析

## 使用方法

```bash
# 启动所有服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 访问地址

| 服务 | 地址 |
|------|------|
| mmth-analyzer | http://localhost:5391 |
| mementomori-webui | http://localhost:5290 |

## 目录结构

```text
./
├── docker-compose.yml
├── mmth-data/           # mementomori 数据
│   └── Master/
├── mmth-config/         # mementomori 配置
│   └── appsettings.user.json
├── mmth-logs/           # mmth 日志 (Docker logging path)
│   └── app.log
├── analyzer-data/       # analyzer 数据
│   └── ...
└── analyzer-config/     # analyzer 配置
    └── app.json
```

## 配置文件

首次使用需要创建配置文件:

```bash
# mementomori-webui 配置
mkdir -p mmth-config
cp mmth-config/appsettings.example.json mmth-config/appsettings.user.json
# 编辑 appsettings.user.json 并填写账号信息

# mmth-analyzer 配置
mkdir -p analyzer-config
cp analyzer-config/app.json analyzer-config/app.json
# 编辑 app.json 修改 accounts
```

**重要**: `analyzer-config/app.json` 配置示例:

```json
{
  "mmth_servers": [{
    "name": "local",
    "base_url": "http://mementomori-webui:8080",
    "accounts": ["account1"],  // mmth 账号名（需与 mmth 下拉菜单一致）
    "log_path": "/app/mmth-logs"
  }]
}
```

## 日志格式

日志通过 stdout 重定向到 `/app/Logs/app.log`，格式为纯文本。

ETL 直接解析日志内容。

## 常用命令

```bash
# 重启服务
docker-compose restart

# 更新镜像
docker-compose pull && docker-compose up -d

# 停止并清理
docker-compose down
```
