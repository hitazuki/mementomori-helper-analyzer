# MMTH 项目部署方案

## 架构说明

```text
mmth-analyzer/          # 主项目 (Web 展示)
├── mmth-etl/            # 子模块 (日志处理)
│   ├── mmth_etl         # ETL 工具 - 解析日志生成 diamond_stats.json
│   └── data/
│       └── diamond_stats.json
├── data/
│   └── (通过 volume 共享 ETL 输出)
└── mmth-analyzer        # Web 服务 - 读取 JSON 展示图表
```

## 1. 初始化子模块

```bash
# 克隆主项目
git clone git@github.com:hitazuki/mmth-analyzer.git
cd mmth-analyzer

# 添加 mmth-etl 为子模块
git submodule add git@github.com:hitazuki/mmth-etl.git mmth-etl
git submodule update --init --recursive

# 后续更新子模块
git submodule update --remote
```

## 2. Linux Docker 部署

### 2.1 准备配置

```bash
# 创建配置目录
mkdir -p config data mmth-etl/logs

# 复制配置示例
cp config/app.example.json config/app.json

# 编辑 config/app.json，设置数据路径
{
  "diamond_stats_path": "./data/diamond_stats.json"
}
```

### 2.2 启动服务

```bash
# 构建并启动
docker-compose up --build -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 2.3 定时 ETL 处理

添加 crontab 定期处理日志：

```bash
# 每小时执行一次 ETL
0 * * * * cd /path/to/mmth-analyzer && docker-compose run --rm mmth-etl \
    ./mmth_etl /app/logs/game.log
```

## 3. Windows 直接运行

### 3.1 初始化

```powershell
# 在项目目录执行
git submodule update --init --recursive
```

### 3.2 构建

```powershell
# 构建 ETL
cd mmth-etl
go build -o mmth_etl.exe .

# 构建 Analyzer
cd ..
go build -o mmth-analyzer.exe .
```

### 3.3 启动

```powershell
# 1. 先运行 ETL 生成数据
.\mmth-etl\mmth_etl.exe .\mmth-etl\logs\game.log

# 2. 启动 Web 服务
.\mmth-analyzer.exe

# 3. 访问 http://localhost:5391
```

### 3.4 批处理脚本

创建 `start.bat`：

```batch
@echo off
cd /d "%~dp0"

:: 运行 ETL
if exist "mmth-etl\logs\game.log" (
    echo Running ETL...
    mmth-etl\mmth_etl.exe mmth-etl\logs\game.log
)

:: 启动服务
echo Starting server...
start mmth-analyzer.exe

echo.
echo Access: http://localhost:5391
pause
```

## 4. 目录结构

部署后的完整结构：

```text
mmth-analyzer/
├── mmth-etl/                 # 子模块
│   ├── mmth_etl(.exe)       # ETL 二进制
│   ├── logs/                # 游戏日志目录
│   └── data/
│       └── diamond_stats.json   # ETL 输出
├── mmth-analyzer(.exe)      # Web 服务二进制
├── data/                    # 共享数据目录
├── config/
│   └── app.json             # 配置文件
└── docker-compose.yml       # Docker 配置
```

## 5. 数据流

```text
游戏日志 → mmth-etl → diamond_stats.json → mmth-analyzer → Web 展示
              ↑                                    ↑
         定时/手动触发                        定时读取/实时抓取
```

## 6. 常用操作

|操作|Linux (Docker)|Windows|
|---|---|---|
|启动服务|`docker-compose up -d`|`start.bat`|
|停止服务|`docker-compose down`|关闭窗口|
|查看日志|`docker-compose logs -f`|直接查看|
|手动 ETL|`docker-compose run mmth-etl ...`|`mmth_etl.exe logs/game.log`|
|更新代码|`git pull && git submodule update`|相同|

## 7. 注意事项

1. **路径配置**: 确保 `config/app.json` 中的 `diamond_stats_path` 指向正确位置
2. **日志文件**: 将游戏日志放入 `mmth-etl/logs/` 目录
3. **Chrome**: Windows 需要安装 Chrome 才能使用抓取功能
4. **权限**: Docker 部署时注意 volume 挂载权限
