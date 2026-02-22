# EC2 Production Setup (Django + Daphne + Nginx + Vercel)

## 1) EC2 prerequisites

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx
```

## 2) Clone and prepare project

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone <YOUR_REPO_URL> avtoborsa
sudo chown -R $USER:$USER /opt/avtoborsa
cd /opt/avtoborsa/backend
python3 -m venv /opt/avtoborsa/.venv
source /opt/avtoborsa/.venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 3) Backend env

```bash
cp /opt/avtoborsa/backend/.env.example /opt/avtoborsa/backend/.env
```

Set at least:
- `DEBUG=False`
- `SECRET_KEY=...`
- `ALLOWED_HOSTS=api.your-domain.com`
- `FRONTEND_BASE_URL=https://your-frontend.vercel.app`
- `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app`
- `CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app`

Then run:

```bash
cd /opt/avtoborsa/backend
source /opt/avtoborsa/.venv/bin/activate
./build.sh
```

## 4) Systemd service

Copy service file:

```bash
sudo cp /opt/avtoborsa/backend/deploy/ec2/karbg-backend.service /etc/systemd/system/karbg-backend.service
```

If your Linux user is not `ubuntu`, edit:

```bash
sudo nano /etc/systemd/system/karbg-backend.service
```

Change both:
- `User=...`
- `Group=...`

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable karbg-backend
sudo systemctl start karbg-backend
sudo systemctl status karbg-backend
```

## 5) Nginx reverse proxy

Copy nginx config:

```bash
sudo cp /opt/avtoborsa/backend/deploy/ec2/nginx/karbg-api.conf /etc/nginx/sites-available/karbg-api
```

Edit domain:

```bash
sudo nano /etc/nginx/sites-available/karbg-api
```

Change:
- `server_name api.example.com;`

Enable config:

```bash
sudo ln -s /etc/nginx/sites-available/karbg-api /etc/nginx/sites-enabled/karbg-api
sudo nginx -t
sudo systemctl reload nginx
```

## 6) SSL certificate

```bash
sudo certbot --nginx -d api.your-domain.com
```

## 7) Vercel proxy setup

File: `avtoborsa/vercel.json`

Replace `https://api.example.com` with your real API domain, e.g.:
- `https://api.your-domain.com`

Also set Vercel env:
- `VITE_API_BASE_URL=https://your-frontend.vercel.app`
- Optional fallback for WS direct: `VITE_WS_BASE_URL=wss://api.your-domain.com`

Why this setup:
- Frontend calls same-origin `/api/...` on Vercel.
- Vercel rewrites to EC2 nginx.
- Nginx proxies to Daphne (`127.0.0.1:8000`).

## 8) Release after new git pull

```bash
cd /opt/avtoborsa
git pull
chmod +x backend/deploy/ec2/release.sh backend/build.sh backend/start.sh
PROJECT_ROOT=/opt/avtoborsa backend/deploy/ec2/release.sh
```
