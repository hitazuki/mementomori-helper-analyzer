# CLAUDE.md

Claude Code 开发指南

## 项目简介

MMTH Analyzer - 钻石统计数据的 Web 展示服务

## 开发命令

```bash
# 构建
go build -o mmth-analyzer .

# 运行
./mmth-analyzer
# 或使用指定配置
./mmth-analyzer -config ./config/test_local.json

# 访问
http://localhost:5391
```

## 规范

### Git Commit

使用约定式提交（Conventional Commits）：

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**type 类型：**

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式（不影响代码运行的变动）
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

**示例：**

```text
feat(api): add new endpoint for account history

Add /api/mmth-diamonds/history/:server/:account endpoint.

Closes #123
```

### Go 代码规范

- 使用 `gofmt` 格式化代码
- 使用 `go vet` 静态分析
- 函数/结构体需添加文档注释
- 错误处理：优先返回错误而非 panic
- 配置变更需同步更新 `config/app.example.json`

**检查命令：**

```bash
gofmt -l .
go vet ./...
```

### 子模块规范

- mmth-etl 作为子模块位于 `mmth-etl/`
- 修改子模块代码后在子模块目录独立提交
- 更新子模块引用：`git submodule update --remote`

### 配置文件规范

- `config/app.json` - 本地配置文件（gitignore）
- `config/app.example.json` - 配置示例（同步维护）
- 新增配置项必须提供默认值

### 前端规范

- Alpine.js 用于状态管理
- ECharts 用于图表
- 使用 Tailwind CSS 类名
- 代码位于 `static/` 目录

## 目录结构

```text
├── *.go              # Go 源码
├── go.mod            # 模块定义
├── CLAUDE.md         # 本文件
├── README.md         # 项目说明
├── Dockerfile        # 容器构建
├── docker-compose.yml # 服务编排
├── mmth-etl/         # 子模块（ETL处理）
├── handlers/         # HTTP处理器
├── scraper/          # 抓取逻辑
├── static/           # 前端静态文件
├── scripts/          # 辅助脚本
├── data/             # 数据目录（gitignore）
└── config/           # 配置目录
    ├── app.json          # 本地配置（gitignore）
    └── app.example.json  # 配置示例
```
