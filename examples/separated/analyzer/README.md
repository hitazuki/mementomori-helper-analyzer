# MMTH Analyzer 独立部署

与 mementomori-webui 分开部署，读取持久化日志文件。

## 使用方法

```bash
docker-compose up -d
```

## 访问地址

http://localhost:5391

## 配置文件

```bash
mkdir -p config
cp config/app.json config/app.json
# 编辑 config/app.json
```

**重要**: `config/app.json` 配置示例:

```json
{
  "mmth_servers": [{
    "name": "server1",
    "base_url": "http://host.docker.internal:5290",
    "accounts": ["account1", "account2"],
    "log_path": "/app/mmth-logs"
  }]
}
```

`base_url` 说明：

- 同一主机: `http://host.docker.internal:5290` (已配置 extra_hosts 兼容 Linux)
- 不同主机: `http://<IP>:5290`

## 日志目录挂载

修改 `docker-compose.yml` 中的日志卷配置:

```yaml
volumes:
  # 方式1: 相对路径 (mmth 和 analyzer 在同一父目录)
  - ../mmth/mmth-logs:/app/mmth-logs:ro

  # 方式2: 环境变量
  - ${MMTH_LOGS_PATH}:/app/mmth-logs:ro
```

## 常用命令

```bash
docker-compose ps
docker-compose logs -f
docker-compose restart
docker-compose pull && docker-compose up -d
docker-compose down
```
