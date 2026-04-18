# MMTH Analyzer v{VERSION}

## 快速开始

1. 复制 `config/app.example.json` 为 `config/app.json`
2. 编辑 `config/app.json` 填入你的配置
3. 运行 `./mmth-analyzer` 或使用 `./start.sh` 脚本
4. 访问 http://localhost:5391

## 目录说明

- `mmth-analyzer` - 主程序
- `mmth-etl/mmth_etl` - ETL处理程序
- `static/` - 前端静态文件
- `config/` - 配置文件目录
- `data/` - 数据存储目录

## 脚本使用

```bash
./start.sh     # 启动服务
./stop.sh      # 停止服务
./restart.sh   # 重启服务
```

## 系统要求

- Linux (amd64)
- Chrome/Chromium 浏览器（用于数据抓取）

## 版本信息

- 版本: v{VERSION}
- 构建时间: {BUILD_TIME}
- Git Commit: {GIT_COMMIT}
