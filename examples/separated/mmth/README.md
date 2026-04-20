# MementoMori WebUI 独立部署

独立运行 mementomori-webui，日志持久化供 ETL 处理。

## 使用方法

```bash
# 创建配置文件
cp appsettings.example.json appsettings.user.json
# 编辑 appsettings.user.json 设置账号信息

docker-compose up -d
```

## 访问地址

http://localhost:5290

## 日志配置

日志通过 stdout 重定向持久化到 `./mmth-logs/app.log`：

```yaml
command: /bin/sh -c "mkdir -p /app/Logs && exec dotnet MementoMori.WebUI.dll 2>&1 | tee /app/Logs/app.log"
volumes:
  - ./mmth-logs:/app/Logs
```

容器重建后日志保留。

## 常用命令

```bash
docker-compose ps
docker-compose logs -f
docker-compose restart
docker-compose pull && docker-compose up -d
docker-compose down
```
