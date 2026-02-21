#!/bin/bash
# =============================================================
# KPI Portal — полная установка на чистый Ubuntu 24.04
#
# Использование:
#   git clone git@github.com:AlexeyAleynikov/KPI-Portal.git /opt/kpi-portal
#   cd /opt/kpi-portal
#   nano setup.sh        # заполнить DB_PASS, REDIS_PASS, DOMAIN
#   bash setup.sh
# =============================================================
set -e

# ─── Конфигурация — заполните перед запуском ──────────────
DOMAIN="kpi.finitin.us"
DB_USER="portal_user"
DB_PASS=""                     # заполните
DB_NAME="portal_db"
REDIS_PASS=""                  # заполните

# ─── Автоопределение директории скрипта ───────────────────
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Цвета ────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}  $1"; }
warn() { echo -e "${YELLOW}[!!]${NC}  $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
step() { echo -e "\n${YELLOW}===${NC} $1 ${YELLOW}===${NC}"; }

# ─── Проверки ─────────────────────────────────────────────
[ -z "$DB_PASS" ]    && err "Заполните DB_PASS в начале скрипта"
[ -z "$REDIS_PASS" ] && err "Заполните REDIS_PASS в начале скрипта"
[ "$(id -u)" != "0" ] && err "Запустите от root: sudo bash setup.sh"

echo ""
echo -e "${GREEN}Установка KPI Portal${NC}"
echo -e "Директория: ${INSTALL_DIR}"
echo -e "Домен:      ${DOMAIN}"
echo ""

# ═══════════════════════════════════════════════════════════
# 1. Системные пакеты
# ═══════════════════════════════════════════════════════════
step "Системные пакеты"
# ═══════════════════════════════════════════════════════════
apt update && apt upgrade -y
apt install -y \
    curl wget git unzip build-essential \
    software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release \
    ufw fail2ban htop nano
ok "Системные пакеты установлены"

# ═══════════════════════════════════════════════════════════
# 2. Python 3.12
# ═══════════════════════════════════════════════════════════
step "Python 3.12"
# ═══════════════════════════════════════════════════════════
if python3.12 --version &>/dev/null; then
    ok "Уже установлен: $(python3.12 --version)"
else
    apt install -y python3.12 python3.12-venv python3.12-dev python3-pip
    ok "Установлен: $(python3.12 --version)"
fi

# ═══════════════════════════════════════════════════════════
# 3. Node.js 20
# ═══════════════════════════════════════════════════════════
step "Node.js 20 LTS"
# ═══════════════════════════════════════════════════════════
if node --version &>/dev/null; then
    ok "Уже установлен: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    ok "Установлен: $(node --version)"
fi

# ═══════════════════════════════════════════════════════════
# 4. PostgreSQL 16
# ═══════════════════════════════════════════════════════════
step "PostgreSQL 16"
# ═══════════════════════════════════════════════════════════
if systemctl is-active --quiet postgresql; then
    ok "Уже запущен"
else
    sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget -qO - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt update && apt install -y postgresql-16 postgresql-contrib-16
    systemctl enable postgresql && systemctl start postgresql
    ok "PostgreSQL установлен"
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
ok "База данных готова"

# ═══════════════════════════════════════════════════════════
# 5. Redis 7
# ═══════════════════════════════════════════════════════════
step "Redis 7"
# ═══════════════════════════════════════════════════════════
if systemctl is-active --quiet redis-server; then
    ok "Уже запущен"
else
    apt install -y redis-server
    sed -i "s/# requirepass foobared/requirepass ${REDIS_PASS}/" /etc/redis/redis.conf
    systemctl enable redis-server && systemctl restart redis-server
    ok "Redis установлен"
fi

# ═══════════════════════════════════════════════════════════
# 6. Nginx
# ═══════════════════════════════════════════════════════════
step "Nginx"
# ═══════════════════════════════════════════════════════════
if systemctl is-active --quiet nginx; then
    ok "Уже запущен"
else
    apt install -y nginx
    systemctl enable nginx && systemctl start nginx
    ok "Nginx установлен"
fi

# ═══════════════════════════════════════════════════════════
# 7. Backend
# ═══════════════════════════════════════════════════════════
step "Backend"
# ═══════════════════════════════════════════════════════════
cd "${INSTALL_DIR}/backend"

[ ! -d "venv" ] && python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q
pip install pydantic[email] -q

if [ ! -f ".env" ]; then
    cp .env.example .env
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s|SECRET_KEY=.*|SECRET_KEY=${SECRET_KEY}|" .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}|" .env
    sed -i "s|REDIS_URL=.*|REDIS_URL=redis://:${REDIS_PASS}@localhost:6379/0|" .env
    sed -i "s|SMTP_HOST=.*|SMTP_HOST=|" .env
    sed -i "s|SMTP_USER=.*|SMTP_USER=|" .env
    sed -i "s|SMTP_PASSWORD=.*|SMTP_PASSWORD=|" .env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" .env
    ok ".env создан"
fi

# Миграции
mkdir -p migrations/versions
if [ ! -f "migrations/script.py.mako" ]; then
cat > migrations/script.py.mako << 'MAKO'
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}

def upgrade() -> None:
    ${upgrades if upgrades else "pass"}

def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
MAKO
fi

alembic upgrade head
ok "Миграции применены"
deactivate

# ═══════════════════════════════════════════════════════════
# 8. Frontend
# ═══════════════════════════════════════════════════════════
step "Frontend"
# ═══════════════════════════════════════════════════════════
cd "${INSTALL_DIR}/frontend"

if [ ! -f ".env.local" ]; then
    echo "NEXT_PUBLIC_API_URL=https://${DOMAIN}/api" > .env.local
    echo "NEXT_PUBLIC_APP_NAME=Corporate Portal"    >> .env.local
    ok ".env.local создан"
fi

npm install --silent
npm install next@latest lucide-react@latest --silent
npm run build
ok "Frontend собран"

# ═══════════════════════════════════════════════════════════
# 9. Systemd сервисы
# ═══════════════════════════════════════════════════════════
step "Systemd сервисы"
# ═══════════════════════════════════════════════════════════

cat > /etc/systemd/system/kpi-backend.service << EOF
[Unit]
Description=KPI Portal Backend
After=network.target postgresql.service redis.service

[Service]
Type=exec
User=root
WorkingDirectory=${INSTALL_DIR}/backend
ExecStart=${INSTALL_DIR}/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/kpi-frontend.service << EOF
[Unit]
Description=KPI Portal Frontend
After=network.target

[Service]
Type=exec
User=root
WorkingDirectory=${INSTALL_DIR}/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable kpi-backend kpi-frontend
systemctl restart kpi-backend kpi-frontend
ok "Сервисы запущены"

# ═══════════════════════════════════════════════════════════
# 10. Nginx конфиг
# ═══════════════════════════════════════════════════════════
step "Nginx конфиг"
# ═══════════════════════════════════════════════════════════
# Безопасное добавление limit_req_zone через отдельный конф. файл
echo "limit_req_zone \$binary_remote_addr zone=otp_prod:10m rate=5r/m;" > /etc/nginx/conf.d/kpi-limits.conf

cat > /etc/nginx/sites-available/kpi-portal << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /api/auth/otp {
        limit_req zone=otp_prod burst=5 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/kpi-portal /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
ok "Nginx настроен"

# ═══════════════════════════════════════════════════════════
# 11. Создание первого пользователя (админа)
# ═══════════════════════════════════════════════════════════
step "Создание администратора"

read -p "Введите Email администратора: " ADMIN_EMAIL
read -s -p "Введите пароль: " ADMIN_PASS
echo ""
read -s -p "Повторите пароль: " ADMIN_PASS_CONFIRM
echo ""

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASS" ]; then
    warn "Email или пароль пустые. Пользователь не создан."
elif [ "$ADMIN_PASS" != "$ADMIN_PASS_CONFIRM" ]; then
    warn "Пароли не совпадают! Пользователь не создан."
else
    echo "Добавление пользователя в базу данных..."
    
    # Включаем расширение pgcrypto для хеширования пароля силами самой БД
    sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null 2>&1
    
    # Выполняем SQL запрос. 
    # ВАЖНО: Ниже предполагаются стандартные имена колонок (email, hashed_password, is_superuser, is_active). 
    # Если в твоих моделях SQLAlchemy они называются иначе, измени SQL запрос.
    SQL_QUERY="
    INSERT INTO users (email, hashed_password, is_superuser, is_active)
    VALUES (
        '${ADMIN_EMAIL}',
        crypt('${ADMIN_PASS}', gen_salt('bf')),
        true,
        true
    ) ON CONFLICT (email) DO UPDATE 
      SET hashed_password = crypt('${ADMIN_PASS}', gen_salt('bf')),
          is_superuser = true;
    "
    
    if sudo -u postgres psql -d "${DB_NAME}" -c "$SQL_QUERY" >/dev/null 2>&1; then
        ok "Администратор ${ADMIN_EMAIL} успешно создан/обновлен!"
    else
        warn "Ошибка добавления пользователя в БД. Возможно таблица называется не 'users' или структура колонок отличается."
    fi
fi

# ═══════════════════════════════════════════════════════════
# Итог
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Установка завершена!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Сайт:  http://${DOMAIN}"
echo "  Папка: ${INSTALL_DIR}"
echo ""
echo "  Статус сервисов:"
systemctl status kpi-backend kpi-frontend --no-pager | grep -E "●|Active"
echo ""
warn "Следующие шаги:"
echo "  1. SSL:  certbot --nginx -d ${DOMAIN}"
echo ""
