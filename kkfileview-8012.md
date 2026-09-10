# kkFileView 同源路径更新

`kkfileview` 只在 Docker 网络中暴露 8012，不向公网映射端口。主站 gateway 将
`/api/kkfileview/` 原样转发到 `http://kkfileview:8012`。

部署前需先在现网 `docker/nginx/gateway.conf` 的通用 `location /api/` 之前加入：

```nginx
location = /api/kkfileview {
    return 308 /api/kkfileview/;
}

location ^~ /api/kkfileview/ {
    proxy_pass http://kkfileview:8012;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect off;
}
```

`proxy_pass` 末尾不能加 `/`。不要在防火墙或云安全组开放 8012/tcp 和
MinIO 9000/tcp。

更新配置后执行：

```bash
cd /opt/internship/Internship-NewBack && git fetch origin && git pull --rebase origin main
cd /opt/internship/Internship-Front && git fetch origin && git pull --rebase origin main
cd /opt/internship/server_directory && docker compose config
cd /opt/internship/server_directory && docker compose up -d --build
docker compose restart nginx
```
