# MMTH Analyzer

MMTH Analyzer 是 [mementomori-helper](https://github.com/moonheart/mementomori-helper) 的旁路数据分析器，用于旁路式处理/分析/监控 mementomori-helper 的日志数据和前端数据。

## 功能特点

- **数据展示**: 可视化展示 diamond_stats.json 中的统计数据
- **自动抓取**: 定时从 mmth 网页抓取角色钻石数量
- **图表分析**: 使用 ECharts 生成每日变动和来源分布图表
- **多账号支持**: 支持配置多个服务器和账号批量抓取
- **手动触发**: 支持手动触发抓取任务
- **ETL 处理**: 集成 mmth-etl 子模块，支持日志解析和钻石统计

## 技术栈

| 组件 | 技术                         |
|------|------------------------------|
| 后端 | Go + Gin                     |
| 抓取 | chromedp (headless Chrome)   |
| 前端 | Alpine.js + ECharts          |
| 样式 | Tailwind CSS                 |
| ETL  | Go (独立子模块)              |

## 项目结构

```text
mmth-analyzer/
├── cmd/
│   └── server/
│       └── main.go              # 入口文件，服务器启动
├── internal/                    # 内部包
│   ├── config/                  # 配置定义和加载
│   ├── handlers/                # HTTP 处理器
│   ├── scheduler/               # 定时任务调度
│   ├── scraper/                 # mmth 抓取逻辑
│   └── service/                 # 业务服务层
├── mmth-etl/                    # 子模块（ETL 处理）
├── static/                      # 前端静态文件
├── scripts/                     # 管理脚本（启动/停止/重启）
├── data/                        # 数据存储目录
├── config/                      # 配置文件目录
│   ├── app.json                 # 主配置文件（用户编辑，gitignore）
│   └── app.example.json         # 配置示例
├── .github/workflows/           # GitHub Actions
│   ├── release.yml              # 自动打包发布
│   └── assets/                  # README 模板
├── web/                         # web 相关
├── README.md                    # 本文件
├── CLAUDE.md                    # 开发指南
└── go.mod                       # 模块定义
```

## 快速开始

### 方式一：下载 Release 包（推荐）

1. 访问 [Releases](https://github.com/hitazuki/mementomori-helper-analyzer/releases) 页面
2. 下载对应平台的包：
   - Windows: `mmth-analyzer-vX.X.X-windows-amd64.zip`
   - Linux: `mmth-analyzer-vX.X.X-linux-amd64.tar.gz`
3. 解压到目标目录
4. 复制 `config/app.example.json` 为 `config/app.json` 并配置
5. 运行主程序：
   - Windows: `mmth-analyzer.exe` 或 `start.ps1`
   - Linux: `./mmth-analyzer` 或 `./start.sh`
6. 访问 <http://localhost:5391>

### 方式二：从源码构建

#### 前置要求

- Go 1.26+
- Chrome/Chromium 浏览器（用于 chromedp 抓取）
- Git（用于克隆子模块）

#### 克隆仓库

```bash
git clone --recursive https://github.com/hitazuki/mementomori-helper-analyzer.git
cd mmth-analyzer
```

#### 安装依赖

```bash
go mod download
```

#### 配置

```bash
# 复制示例配置
cp config/app.example.json config/app.json

# 编辑 config/app.json 填入你的服务器和账号信息
```

#### 构建运行

```bash
# 构建 ETL 子模块
cd mmth-etl
go build -o mmth_etl.exe .
cd ..

# 构建主程序
go build -o mmth-analyzer.exe ./cmd/server

# 运行（自动加载 config/app.json）
./mmth-analyzer.exe
```

访问 <http://localhost:5391>

## 管理脚本

服务管理脚本位于 `scripts/` 目录：

| 脚本             | 说明     |
|------------------|----------|
| `start.ps1/sh`   | 启动服务 |
| `stop.ps1/sh`    | 停止服务 |
| `restart.ps1/sh` | 重启服务 |

详见 [scripts/README.md](scripts/README.md)。

## 配置文件说明

配置文件位于 `config/app.json`：

```json
{
  "port": "5391",
  "data_dir": "./data",
  "etl_binary_path": "./mmth-etl/mmth_etl.exe",
  "mmth_logs_dir": "./data/logs",
  "etl_output_dir": "./data/etl",
  "scrape_interval": "6h",
  "mmth_servers": [
    {
      "name": "server1",
      "base_url": "http://mmth-server:5390",
      "accounts": ["account1", "account2"]
    }
  ]
}
```

**配置项说明：**

- `port`: 服务端口（默认 5391）
- `data_dir`: 数据存储目录
- `etl_binary_path`: ETL 程序路径
- `mmth_logs_dir`: 待处理日志存放目录
- `etl_output_dir`: ETL 输出目录（包含 diamond_stats.json）
- `scrape_interval`: 抓取间隔，支持格式如 `1h`, `30m`, `6h`
- `mmth_servers`: mmth 服务器配置数组

## API 接口

| 端点                                          | 方法 | 说明                         |
|-----------------------------------------------|------|------------------------------|
| `/api/stats`                                  | GET  | 获取 diamond_stats.json 数据 |
| `/api/mmth-diamonds/all`                      | GET  | 获取最新抓取的钻石数据       |
| `/api/mmth-diamonds/history`                  | GET  | 获取所有账号历史数据         |
| `/api/mmth-diamonds/history/:server/:account` | GET  | 获取指定账号历史             |
| `/api/scrape/all`                             | POST | 手动触发全部账号抓取         |
| `/api/scrape/account`                         | POST | 抓取单个账号                 |
| `/api/etl/process`                            | POST | 触发 ETL 处理日志目录        |

## 数据存储

数据存储在 `data/` 目录：

- `mmth_diamonds.json`: 最新抓取结果
- `history/`: 按账号存储的历史数据（格式：`{server}-{account}-diamonds.json`）
- `etl/diamond_stats.json`: ETL 生成的钻石统计数据
- `etl/mmth_etl_state.json`: ETL 处理状态（断点续传）
- `logs/`: 待处理的日志文件目录

## GitHub Actions 自动发布

项目配置 GitHub Actions 工作流，推送 `v*` 标签时自动构建并发布：

```bash
# 创建标签
git tag v1.0.0

# 推送标签触发构建
git push origin v1.0.0
```

自动构建：
- Windows amd64 包（ZIP）
- Linux amd64 包（TAR.GZ）

## 注意事项

- chromedp 需要系统安装 Chrome/Chromium
- 抓取功能需要 mmth 服务可访问
- ETL 处理需要读取 `mmth_logs_dir` 中的日志文件
- 确保配置文件中的 `mmth_servers` 配置正确

## 开发指南

详见 [CLAUDE.md](CLAUDE.md)。

## 许可证

[MIT](LICENSE)
