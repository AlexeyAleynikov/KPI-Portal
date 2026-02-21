# Корпоративный портал — MVP Boilerplate

## Стек
- **Backend**: Python 3.12 + FastAPI + PostgreSQL 16 + Redis 7 + Celery
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Recharts

## Быстрый старт (локальная разработка)

### 1. Бэкенд
```bash
cd backend
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # заполните значения
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Фронтенд
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Откройте http://localhost:3000

## Структура

```
portal/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry
│   │   ├── config.py        # Настройки (pydantic-settings)
│   │   ├── database.py      # SQLAlchemy async engine
│   │   ├── redis_client.py
│   │   ├── celery_app.py    # Celery + Beat
│   │   ├── models/          # SQLAlchemy модели
│   │   │   ├── user.py      # User, UserRole, AccessLevel
│   │   │   ├── kpi.py       # KpiIndicator, KpiValue, KpiTarget, KpiDataSource
│   │   │   ├── links.py     # LinkSection, Link, RoleLinkSection
│   │   │   ├── role.py      # Role, RoleIndicator
│   │   │   └── audit.py     # AuditLog
│   │   ├── routers/
│   │   │   ├── auth.py      # OTP send/verify, JWT, /me
│   │   │   ├── kpi.py       # Dashboard, history, adjust
│   │   │   ├── links.py     # Ссылки по роли
│   │   │   ├── users.py     # CRUD команды (менеджер)
│   │   │   └── admin.py     # Полный CRUD (администратор)
│   │   ├── auth/
│   │   │   ├── service.py   # OTP-логика + JWT
│   │   │   ├── email.py     # SMTP-отправка OTP
│   │   │   └── deps.py      # get_current_user, require_manager, require_admin
│   │   └── tasks/
│   │       └── kpi_sync.py  # Celery-задача синхронизации KPI
│   ├── migrations/          # Alembic
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    └── src/
        ├── app/
        │   ├── auth/login/  # Страница входа (Email OTP)
        │   └── dashboard/   # Дашборд сотрудника
        ├── components/
        │   └── dashboard/
        │       ├── KpiCard.tsx      # Карточка показателя
        │       ├── RatingChart.tsx  # График динамики (Recharts)
        │       ├── LinksSection.tsx # Рабочие инструменты
        │       ├── Sidebar.tsx
        │       └── Header.tsx
        ├── lib/api.ts        # Axios + все API-методы
        └── store/auth.ts     # Zustand store
```

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/otp/send | Отправить OTP на email |
| POST | /api/auth/otp/verify | Проверить OTP, получить JWT |
| POST | /api/auth/refresh | Обновить access token |
| POST | /api/auth/logout | Выйти |
| GET  | /api/auth/me | Текущий пользователь |
| GET  | /api/kpi/dashboard | KPI дашборд |
| GET  | /api/kpi/history | История значений |
| POST | /api/kpi/adjust | Корректировка (менеджер) |
| GET  | /api/links/ | Ссылки пользователя |
| GET  | /api/users/team | Команда (менеджер) |
| POST | /api/users/ | Добавить сотрудника |
| GET  | /api/admin/users | Все пользователи (admin) |
| POST | /api/admin/roles | Создать роль |
| POST | /api/admin/indicators | Создать KPI-показатель |
| POST | /api/admin/sections | Создать секцию ссылок |
| PATCH| /api/admin/users/{id}/delegation | Настроить делегирование |

## Переменные окружения

См. `backend/.env.example` и `frontend/.env.local.example`.

## Что нужно доделать под продакшн
1. Заполнить `.env` реальными значениями (SECRET_KEY, SMTP, DB)
2. Создать первого admin-пользователя напрямую в БД
3. Настроить systemd-сервисы (см. инструкцию по деплою)
4. Закрыть `/docs` и `/redoc` в production (APP_ENV=production)
5. Добавить реальные источники данных KPI в admin-панели
