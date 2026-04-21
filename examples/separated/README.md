# 分离部署方案

将 mmth-analyzer 和 mementomori-webui 分开部署。

## 架构说明

```text
┌────────────────────┐                    ┌────────────────────┐
│   mmth-analyzer    │                    │ mementomori-webui  │
│     :5391          │ ────── HTTP ─────> │      :5290         │
│                    │   (Scraper访问)    │                    │
│                    │                    │                    │
│   (ETL处理日志)    │ <── 日志文件 ──────│                    │
│                    │   ./mmth-logs/     │                    │
└────────────────────┘                    └────────────────────┘
```

### 数据流

1. **Scraper**: 通过 HTTP 访问 webui 网页抓取钻石数据
2. **ETL**: 读取持久化日志文件进行解析

### 前置要求

- Docker 20.10+ (支持 logging path 选项)

## 目录结构

```text
separated/
├── README.md
├── analyzer/     # mmth-analyzer 部署
│   ├── docker-compose.yml
│   └── config/
│       └── app.example.json
└── mmth/         # mementomori-webui 部署
    ├── docker-compose.yml
    ├── appsettings.example.json
    └── mmth-logs/   # 日志目录
```

## 部署步骤

### 1. 部署 MementoMori WebUI

```bash
cd mmth/
# 创建配置文件
cp appsettings.example.json appsettings.user.json
# 编辑配置

docker-compose up -d
```

### 2. 部署 MMTH Analyzer

```bash
cd analyzer/
# 创建配置文件
mkdir -p config
cp config/app.json config/app.json

# 编辑 config/app.json，设置:
# - webui 访问地址 (base_url)
# - 日志文件路径 (log_path)

docker-compose up -d
```

## 配置说明

mmth-analyzer 的 `config/app.json`:

```json
{
  "mmth_servers": [{
    "name": "server1",
    "base_url": "http://host.docker.internal:5290",
    "accounts": ["account1"],  // mmth 账号名（需与 mmth 下拉菜单一致）
    "log_path": "/app/mmth-logs"
  }]
}
```

### 网络访问配置

`base_url` 配置说明：

- 同一主机: `http://host.docker.internal:5290` (已配置 extra_hosts 兼容 Linux)
- 不同主机: `http://<IP>:5290`

### 日志目录共享

分离部署需要确保 analyzer 能访问 mmth 的日志目录:

**方式 A: 相对路径 (推荐)**
```yaml
# analyzer/docker-compose.yml
volumes:
  - ../mmth/mmth-logs:/app/mmth-logs:ro
```

**方式 B: 环境变量**
```bash
export MMTH_LOGS_PATH=/path/to/mmth-logs
```

## 访问地址

| 服务 | 地址 |
|------|------|
| mementomori-webui | http://localhost:5290 |
| mmth-analyzer | http://localhost:5391 |
