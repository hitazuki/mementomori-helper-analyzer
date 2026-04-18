# MMTH Analyzer Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# 安装依赖
RUN apk add --no-cache git

# 复制模块文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建
RUN CGO_ENABLED=0 GOOS=linux go build -o mmth-analyzer ./cmd/server

# 运行阶段
FROM alpine:latest

WORKDIR /app

# 安装 chromium 和依赖（用于 chromedp）
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 设置 chromedp 环境变量
ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

# 复制二进制文件
COPY --from=builder /app/mmth-analyzer .
COPY --from=builder /app/static ./static

# 创建数据目录
RUN mkdir -p /app/data /app/config

# 暴露端口
EXPOSE 5391

# 启动命令
CMD ["./mmth-analyzer", "-config", "/app/config/app.json"]
