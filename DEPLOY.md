# MMTH 项目部署方案

## 架构说明

```text
mmth-analyzer/          # 主项目 (Web 展示 + 抓取)
├── mmth-etl/            # 子模块 (日志处理)
│   └── mmth_etl         # ETL 工具 - 解析日志生成统计数据
├── data/
│   ├── scrape/          # 抓取数据
│   ├── etl/             # ETL 输出（按服务器隔离）
│   └── logs/            # 日志文件
└── mmth-analyzer        # Web 服务
```

## 1. Docker 部署（推荐）

### 1.1 镜像版本

| 镜像标签 | 大小 | 功能 |
| ---------- | ------ | ------ |
| `hitazuki/mmth-analyzer:latest` | ~420MB | 完整版，支持抓取 + ETL |
| `hitazuki/mmth-analyzer:lite` | ~25MB | 轻量版，仅支持 ETL（无 Chrome） |
| `hitazuki/mmth-analyzer:1.0.0` | ~420MB | 指定版本 |
| `hitazuki/mmth-analyzer:1.0.0-lite` | ~25MB | 指定版本轻量版 |

### 1.2 快速启动

```bash
# 拉取镜像
docker pull hitazuki/mmth-analyzer:latest

# 运行容器
docker run -d \
  --name mmth-analyzer \
  -p 5391:5391 \
  -v ./data:/app/data \
  -v ./config:/app/config \
  hitazuki/mmth-analyzer:latest

# 访问
http://localhost:5391
```

### 1.3 使用 docker-compose

```bash
# 复制配置文件
cp config/app.example.json config/app.json

# 编辑配置
vim config/app.json

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 1.4 使用轻量版镜像

修改 `docker-compose.yml`：

```yaml
services:
  mmth-analyzer:
    image: hitazuki/mmth-analyzer:lite
    # ... 其他配置
```

> 轻量版不包含 Chrome，无法使用抓取功能，仅支持 ETL 日志处理。

## 2. 二进制部署

### 2.1 下载 Release 包

从 [Releases](https://github.com/hitazuki/mementomori-helper-analyzer/releases) 下载对应平台包：

- Windows: `mmth-analyzer-vX.X.X-windows-amd64.zip`
- Linux: `mmth-analyzer-vX.X.X-linux-amd64.tar.gz`

### 2.2 运行要求

| 功能 | 依赖 |
| ------ | ------ |
| Web 服务 | 无额外依赖 |
| ETL 日志处理 | 无额外依赖 |
| **MMTH 抓取** | **需要 Chrome/Chromium** |

> 如果只使用 ETL 功能，无需安装 Chrome。

### 2.3 安装 Chrome（抓取功能需要）

**Windows：**
下载 [Google Chrome](https://www.google.com/chrome/) 安装

**Linux：**

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# RHEL/CentOS
sudo dnf install chromium

# Alpine
sudo apk add chromium
```

### 2.4 启动服务

**Windows：**

```powershell
# 复制配置
copy config\app.example.json config\app.json

# 编辑配置后启动
mmth-analyzer.exe
```

**Linux：**

```bash
# 复制配置
cp config/app.example.json config/app.json

# 编辑配置后启动
./mmth-analyzer
```

## 3. 配置文件

配置文件 `config/app.json`：

```json
{
  "port": "5391",
  "data_dir": "./data",
  "scrape_interval": "6h",
  "mmth_servers": [
    {
      "name": "server1",
      "base_url": "http://YOUR_SERVER:5390",
      "accounts": ["account1", "account2"],
      "log_path": "./data/logs/server1.log"
    }
  ]
}
```

**配置项说明：**

| 配置项 | 说明 | 默认值 |
| -------- | ------ | -------- |
| `port` | Web 服务端口 | `5391` |
| `data_dir` | 数据存储目录 | `./data` |
| `scrape_interval` | 抓取间隔 | `6h` |
| `mmth_servers` | 服务器配置数组 | - |
| `mmth_servers[].name` | 服务器名称 | - |
| `mmth_servers[].base_url` | MMTH 服务地址 | - |
| `mmth_servers[].accounts` | 账号列表 | - |
| `mmth_servers[].log_path` | 该服务器日志路径 | - |

## 4. 目录结构

```text
mmth-analyzer/
├── mmth-analyzer(.exe)      # 主程序
├── mmth-etl/
│   └── mmth_etl(.exe)       # ETL 工具
├── static/                  # 前端静态文件
├── config/
│   └── app.json             # 配置文件
├── data/
│   ├── scrape/
│   │   ├── diamonds/
│   │   │   ├── mmth_diamonds.json       # 最新抓取结果
│   │   │   └── history/                  # 历史记录
│   │   └── ...
│   ├── etl/
│   │   └── {server}/                     # 按服务器隔离
│   │       ├── diamond_stats.json       # 统计数据
│   │       └── mmth_etl_state.json      # 处理状态
│   └── logs/               # 日志文件
└── docker-compose.yml
```

## 5. 数据流

```text
┌─────────────────────────────────────────────────────────────┐
│                         MMTH 服务                            │
└─────────────────┬───────────────────────────┬───────────────┘
                  │                           │
                  ▼                           ▼
           ┌──────────┐               ┌──────────────┐
           │ 抓取数据  │               │   游戏日志    │
           └────┬─────┘               └──────┬───────┘
                │                            │
                ▼                            ▼
        ┌───────────────┐            ┌─────────────┐
        │ scrape/diamonds│            │  mmth-etl   │
        └───────┬───────┘            └──────┬──────┘
                │                            │
                └──────────┬─────────────────┘
                           ▼
                    ┌─────────────┐
                    │ mmth-analyzer│
                    └──────┬──────┘
                           │
                           ▼
                      Web 展示
```

## 6. 常用操作

| 操作 | Docker | 二进制 |
| ------ | -------- | -------- |
| 启动服务 | `docker-compose up -d` | `./mmth-analyzer` |
| 停止服务 | `docker-compose down` | Ctrl+C |
| 查看日志 | `docker-compose logs -f` | 直接查看 |
| 手动抓取 | Web UI 或 API | Web UI 或 API |
| 手动 ETL | Web UI 或 API | Web UI 或 API |
| 更新版本 | 修改镜像 tag 重启 | 下载新 Release |

## 7. API 接口

| 端点 | 方法 | 说明 |
| ------ | ------ | ------ |
| `/api/health` | GET | 健康检查 |
| `/api/stats` | GET | 获取统计数据 |
| `/api/mmth-diamonds/all` | GET | 最新抓取数据 |
| `/api/mmth-diamonds/history` | GET | 历史数据 |
| `/api/scrape/all` | POST | 手动抓取 |
| `/api/etl/process` | POST | 手动 ETL |

## 8. 注意事项

1. **Chrome 依赖**：抓取功能需要 Chrome/Chromium（Docker 完整版已内置）
2. **轻量版限制**：lite 镜像不支持抓取功能
3. **日志文件**：确保 `log_path` 配置正确指向游戏日志
4. **权限**：Docker 部署注意 volume 挂载权限
5. **时区**：Docker 镜像默认 `Asia/Shanghai`
