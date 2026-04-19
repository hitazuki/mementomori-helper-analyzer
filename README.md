# MMTH Analyzer

[![Docker Build](https://github.com/hitazuki/mementomori-helper-analyzer/actions/workflows/docker.yml/badge.svg)](https://github.com/hitazuki/mementomori-helper-analyzer/actions/workflows/docker.yml)
[![Release](https://github.com/hitazuki/mementomori-helper-analyzer/actions/workflows/release.yml/badge.svg)](https://github.com/hitazuki/mementomori-helper-analyzer/releases)

MMTH Analyzer 是 [mementomori-helper](https://github.com/moonheart/mementomori-helper) 的旁路数据分析器，用于旁路式处理/分析/监控 mementomori-helper 的日志数据和前端数据。

## 功能特点

- **数据展示**: 可视化展示 diamond_stats.json 中的统计数据
- **自动抓取**: 定时从 mmth 网页抓取角色钻石数量
- **图表分析**: 使用 ECharts 生成每日变动和来源分布图表
- **多账号支持**: 支持配置多个服务器和账号批量抓取
- **ETL 处理**: 集成 mmth-etl 子模块，支持日志解析和钻石统计

## 快速开始

### 方式一：Docker 部署（推荐）

提供两个版本的镜像：

| 镜像标签 | 大小 | 功能 |
|----------|------|------|
| `latest` | ~420MB | 完整版，支持抓取 + ETL |
| `lite` | ~25MB | 轻量版，仅支持 ETL（无 Chrome） |

```bash
# 完整版（支持抓取）
docker pull hitazuki/mmth-analyzer:latest

# 轻量版（仅 ETL，体积小）
docker pull hitazuki/mmth-analyzer:lite

# 运行容器
docker run -d \
  --name mmth-analyzer \
  -p 5391:5391 \
  -v ./data:/app/data \
  -v ./config:/app/config \
  hitazuki/mmth-analyzer:latest
```

或使用 docker-compose：

```bash
# 复制配置文件
cp config/app.example.json config/app.json

# 编辑配置后启动
docker-compose up -d
```

访问 <http://localhost:5391>

### 方式二：下载 Release 包

1. 访问 [Releases](https://github.com/hitazuki/mementomori-helper-analyzer/releases) 页面
2. 下载对应平台的包：
   - Windows: `mmth-analyzer-vX.X.X-windows-amd64.zip`
   - Linux: `mmth-analyzer-vX.X.X-linux-amd64.tar.gz`
3. 解压到目标目录
4. **安装 Chrome/Chromium**（使用抓取功能必须）
   - Windows: 下载 [Google Chrome](https://www.google.com/chrome/) 安装
   - Linux: `sudo apt install chromium-browser` 或 `sudo dnf install chromium`
5. 复制 `config/app.example.json` 为 `config/app.json` 并配置
6. 运行主程序：
   - Windows: `mmth-analyzer.exe`
   - Linux: `./mmth-analyzer`
7. 访问 <http://localhost:5391>

> **说明**：抓取功能依赖 Chrome/Chromium 浏览器渲染页面。如果仅使用 ETL 日志解析功能，无需安装 Chrome。

## 配置文件

配置文件位于 `config/app.json`：

```json
{
  "port": "5391",
  "data_dir": "./data",
  "scrape_interval": "6h",
  "mmth_servers": [
    {
      "name": "server1",
      "base_url": "http://mmth-server:5390",
      "accounts": ["account1", "account2"],
      "log_path": "./data/logs/server1.log"
    }
  ]
}
```

**主要配置项：**

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `port` | 服务端口 | `5391` |
| `data_dir` | 数据存储目录 | `./data` |
| `scrape_interval` | 抓取间隔 | `6h` |
| `mmth_servers` | 服务器配置数组 | - |

## 注意事项

- **抓取功能**：需要安装 Chrome/Chromium（Docker 镜像已内置，Release 包需手动安装）
- **ETL 功能**：无需 Chrome，仅需配置日志文件路径
- 抓取功能需要 mmth 服务可访问

---

## 开发指南

详见 [CLAUDE.md](CLAUDE.md)。

### 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Go + Gin |
| 抓取 | chromedp (headless Chrome) |
| 前端 | Alpine.js + ECharts |
| 样式 | Tailwind CSS |
| ETL | Go (独立子模块) |

### 从源码构建

```bash
# 克隆仓库
git clone --recursive https://github.com/hitazuki/mementomori-helper-analyzer.git
cd mmth-analyzer

# 构建 ETL 子模块
cd mmth-etl && go build -o mmth_etl . && cd ..

# 构建主程序
go build -o mmth-analyzer ./cmd/server

# 运行
./mmth-analyzer
```

### API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/stats` | GET | 获取 diamond_stats.json 数据 |
| `/api/mmth-diamonds/all` | GET | 获取最新抓取的钻石数据 |
| `/api/mmth-diamonds/history` | GET | 获取所有账号历史数据 |
| `/api/scrape/all` | POST | 手动触发全部账号抓取 |
| `/api/etl/process` | POST | 触发 ETL 处理日志 |

### 项目结构

```text
mmth-analyzer/
├── cmd/server/          # 入口文件
├── internal/            # 内部包
│   ├── config/          # 配置
│   ├── handlers/        # HTTP 处理器
│   ├── scheduler/       # 定时任务
│   ├── scraper/         # 抓取逻辑
│   └── service/         # 业务服务
├── mmth-etl/            # ETL 子模块
├── static/              # 前端静态文件
├── config/              # 配置文件
├── data/                # 数据目录
└── scripts/             # 管理脚本
```

## 许可证

[LGPL-2.1](LICENSE)
