# MMTH Analyzer

一个用于展示钻石统计数据和抓取 MementoMori Helper (mmth) 账号钻石信息的 Web 应用。

## 功能特点

- **数据展示**: 可视化展示 diamond_stats.json 中的统计数据
- **自动抓取**: 定时从 mmth 网页抓取角色钻石数量
- **图表分析**: 使用 ECharts 生成每日变动和来源分布图表
- **多账号支持**: 支持配置多个服务器和账号批量抓取
- **手动触发**: 支持手动触发抓取任务

## 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Go + Gin |
| 抓取 | chromedp (headless Chrome) |
| 前端 | Alpine.js + ECharts |
| 样式 | Tailwind CSS |

## 项目结构

```
mmth-analyzer/
├── main.go              # 入口文件，服务器启动和定时任务
├── config.go            # 配置定义和加载
├── handlers/
│   └── handlers.go      # API 处理函数
├── scraper/
│   └── scraper.go       # mmth 抓取逻辑
├── static/              # 前端静态文件
│   ├── index.html
│   └── js/app.js
├── scripts/             # 工具脚本
│   ├── restart.ps1      # PowerShell 重启脚本
│   └── README.md        # 脚本使用说明
├── data/                # 数据存储目录
├── config/              # 配置文件目录
│   ├── app.json         # 主配置文件（用户编辑）
│   └── app.example.json # 配置示例
└── README.md
```

## 快速开始

### 前置要求

- Go 1.21+
- Chrome/Chromium 浏览器 (用于 chromedp 抓取)

### 安装依赖

```bash
cd ~/projects/mmth-analyzer
go mod download
```

### 配置

```bash
# 复制示例配置
cp config/app.example.json config/app.json

# 编辑 config/app.json 填入你的服务器和账号信息
```

### 构建运行

```bash
# 构建
go build -o mmth-analyzer .

# 运行（自动加载 config/app.json）
./mmth-analyzer

# 或使用指定配置
./mmth-analyzer -config ./config/test_local.json
```

访问 http://localhost:5391

## 管理脚本

服务管理脚本位于 `scripts/` 目录，详见 [scripts/README.md](scripts/README.md)。

## 配置文件说明

配置文件位于 `config/app.json`：

```json
{
  "port": "5391",
  "data_dir": "./data",
  "diamond_stats_path": "../diamond_tracker/data/diamond_stats.json",
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
- `diamond_stats_path`: diamond_stats.json 文件路径
- `scrape_interval`: 抓取间隔，支持格式如 `1h`, `30m`, `6h`
- `mmth_servers`: mmth 服务器配置数组，每个服务器包含名称、URL 和账号列表

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/stats` | GET | 获取 diamond_stats.json 数据 |
| `/api/mmth-diamonds/all` | GET | 获取最新抓取的钻石数据 |
| `/api/mmth-diamonds/history` | GET | 获取所有账号历史数据 |
| `/api/mmth-diamonds/history/:server/:account` | GET | 获取指定账号历史 |
| `/api/scrape/all` | POST | 手动触发全部账号抓取 |
| `/api/scrape/account` | POST | 抓取单个账号 |

## 数据存储

抓取的数据存储在 `data/` 目录：
- `mmth_diamonds.json`: 最新抓取结果
- `history/`: 按账号存储的历史数据（格式：`{server}-{account}-diamonds.json`）

## 注意事项

- chromedp 需要系统安装 Chrome/Chromium
- 抓取功能需要 mmth 服务可访问
- 确保配置文件中的 `mmth_servers` 配置正确
