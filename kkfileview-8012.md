# 系统更新（含 kkFileView 8012）

`docker-compose.yml` 里的 `kkfileview` 已加上端口映射：

```yaml
ports:
  - "8012:8012"
```

把这份文件放到 `/opt/internship/server_directory/docker-compose.yml` 后，仍在该目录用原来的四条命令更新即可，compose 会按新配置把 8012 映射出来。不用再查容器 ID，也不用手搓 `docker run`。

```bash
cd /opt/internship/Internship-NewBack && git fetch origin && git pull --rebase origin main
cd /opt/internship/Internship-Front && git fetch origin && git pull --rebase origin main
cd /opt/internship/server_directory && docker compose up -d --build
docker compose restart nginx
```

若外网仍打不开 `http://公网IP:8012/`，再在防火墙和云安全组放行一次 **8012/tcp**。不要开放 MinIO 的 9000 端口。
