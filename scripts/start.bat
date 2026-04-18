@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ============================================
echo    MMTH 项目启动器
echo ============================================
echo.

:: 检查子模块
if not exist "mmth-etl\main.go" (
    echo [1/4] 初始化子模块...
    git submodule update --init --recursive
    if errorlevel 1 (
        echo 错误: 无法初始化子模块
        pause
        exit /b 1
    )
) else (
    echo [1/4] 子模块已就绪
)

:: 创建目录
echo [2/4] 创建数据目录...
if not exist "data" mkdir "data"
if not exist "mmth-etl\data" mkdir "mmth-etl\data"
if not exist "mmth-etl\logs" mkdir "mmth-etl\logs"
echo √ 目录就绪
echo.

:: 构建
echo [3/4] 构建项目...

echo  - 构建 mmth-etl...
cd mmth-etl
go build -o mmth_etl.exe . >nul 2>&1
if errorlevel 1 (
    echo 错误: mmth-etl 构建失败
    pause
    exit /b 1
)
cd ..

echo  - 构建 mmth-analyzer...
go build -o mmth-analyzer.exe . >nul 2>&1
if errorlevel 1 (
    echo 错误: mmth-analyzer 构建失败
    pause
    exit /b 1
)
echo √ 构建完成
echo.

:: 运行 ETL
echo [4/4] 运行 ETL...
if exist "mmth-etl\logs\game.log" (
    mmth-etl\mmth_etl.exe mmth-etl\logs\game.log
    echo √ ETL 完成
) else (
    echo 警告: 未找到 mmth-etl\logs\game.log
)
echo.

:: 启动服务
echo ============================================
echo    启动 Web 服务
echo ============================================
echo.
echo 访问地址: http://localhost:5391
echo.

start mmth-analyzer.exe
