# MMTH Analyzer + ETL Unified Dockerfile
# 构建 analyzer 和 etl 两个二进制文件

# ==================== 构建阶段 ====================
FROM golang:1.26-alpine AS builder

WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache git gcc musl-dev

# 复制主项目模块文件
COPY go.mod go.sum ./
RUN go mod download

# 复制 mmth-etl 子模块
COPY mmth-etl/ ./mmth-etl/

# 构建 ETL（独立模块）
WORKDIR /app/mmth-etl
RUN go mod download && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o mmth_etl .

# 构建主程序
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o mmth-analyzer ./cmd/server

# ==================== 运行阶段 ====================
FROM alpine:3.20

WORKDIR /app

# 安装运行时依赖（chromedp 需要 chromium）
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tzdata

# 设置 chromedp 环境变量
ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/ \
    TZ=Asia/Shanghai

# 复制二进制文件
COPY --from=builder /app/mmth-analyzer .
COPY --from=builder /app/mmth-etl/mmth_etl ./mmth-etl/mmth_etl

# 复制静态文件
COPY --from=builder /app/static ./static

# 创建必要目录
RUN mkdir -p /app/data/scrape/diamonds/history \
             /app/data/etl \
             /app/data/logs \
             /app/config

# 暴露端口
EXPOSE 5391

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:5391/api/health || exit 1

# 默认启动 analyzer
CMD ["./mmth-analyzer", "-config", "/app/config/app.json"]
