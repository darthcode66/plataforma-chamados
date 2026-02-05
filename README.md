<div align="center">

# 🎫 Plataforma de Chamados TI

<p><strong>Sistema de gerenciamento de tickets de TI com autenticação JWT, notificações via Telegram, WebSockets em tempo real e painel Kanban.</strong></p>

<img src="https://img.shields.io/badge/Status-Em%20Produção-22c55e?style=for-the-badge" />
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" />

</div>

---

## 📋 Overview

A production-grade IT ticket management platform built with **FastAPI** and **PostgreSQL**. The system supports two user roles (IT staff and employees), real-time updates via WebSockets, automatic notifications through Telegram, and a comprehensive statistics dashboard.

This project was developed as an internal tool for the Ramalhos company, handling day-to-day IT support requests with full lifecycle management — from ticket creation to resolution.

---

## ✨ Features

### Core
- **Ticket CRUD** — Create, read, update, and delete IT tickets with title, description, category, and priority
- **Role-Based Access Control** — `ti` (IT staff) and `funcionario` (employee) roles with distinct permissions
- **JWT Authentication** — Secure token-based auth with password hashing (bcrypt)
- **Email Verification** — Password reset flow via verification codes sent through Microsoft Graph API

### Real-Time & Notifications
- **WebSocket Updates** — Live ticket status changes, new comments, and assignments broadcast to all connected clients
- **Telegram Notifications** — Automatic alerts on new tickets, status changes, comments, and assignments with priority/category emojis

### Management
- **Kanban Board** — Visual ticket management organized by status columns
- **Comments** — Per-ticket discussion thread with real-time WebSocket broadcast
- **Bulk User Import** — Import users from CSV with automatic welcome email via Microsoft Graph
- **Statistics Dashboard** — Aggregated metrics: totals by status, category, and priority

### Categories & Priorities
| Categories | Priorities |
|:---:|:---:|
| Hardware 🖥️ | Urgent 🔴 |
| Software 💻 | High 🟠 |
| Network 🌐 | Medium 🟡 |
| Email 📧 | Low 🟢 |
| System ⚙️ | |
| New Collaborator 👤 | |
| Other 📝 | |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│   index.html  │  script.js  │  style.css    │
│         (Vanilla JS + Kanban UI)            │
└───────────────────┬─────────────────────────┘
                    │ HTTP / WebSocket
┌───────────────────▼─────────────────────────┐
│              FastAPI Backend                 │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │  auth.py │  │  api.py  │  │ schemas.py│ │
│  │  (JWT)   │  │ (Routes) │  │(Pydantic) │ │
│  └──────────┘  └──────────┘  └───────────┘ │
│                                             │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ telegram_    │  │  email_graph.py      │ │
│  │ notifier.py  │  │  (MS Graph API)      │ │
│  └──────────────┘  └──────────────────────┘ │
└───────────────────┬─────────────────────────┘
                    │ SQLAlchemy
┌───────────────────▼─────────────────────────┐
│              PostgreSQL                      │
│  usuarios │ chamados │ comentarios │ anexos  │
└─────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `api.py` | Main FastAPI application — all routes and WebSocket manager |
| `models.py` | SQLAlchemy ORM models (Usuario, Chamado, Comentario, Anexo) |
| `schemas.py` | Pydantic request/response schemas |
| `auth.py` | JWT token creation, password hashing, user authentication |
| `database.py` | SQLAlchemy engine, session factory, DB connection config |
| `telegram_notifier.py` | Telegram Bot API integration for ticket notifications |
| `email_graph.py` | Microsoft Graph API for verification emails |
| `database.sql` | Full SQL schema with indexes and triggers |
| `index.html` | Frontend entry point |
| `script.js` | Frontend logic (Kanban, AJAX calls, WebSocket client) |
| `style.css` | UI styling |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- A Telegram Bot token *(optional — for notifications)*
- Microsoft 365 tenant with Graph API access *(optional — for email)*

### 1. Clone & Install

```bash
git clone https://github.com/darthcode66/plataforma-chamados.git
cd plataforma-chamados

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Database
DB_NAME=chamados_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# JWT
SECRET_KEY=your_secret_key_here

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Microsoft Graph (optional)
MS_CLIENT_ID=your_client_id
MS_CLIENT_SECRET=your_client_secret
MS_TENANT_ID=your_tenant_id
```

### 3. Setup Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE chamados_db;"

# Apply schema
psql -U postgres -d chamados_db -f database.sql
```

### 4. Run

```bash
python api.py
# or
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

The server starts at `http://localhost:8000`. Open your browser — the frontend is served automatically.

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login and receive JWT token |
| GET | `/api/auth/me` | Get current authenticated user |
| POST | `/api/auth/send-verification-code` | Send password reset code via email |
| POST | `/api/auth/verify-code` | Verify reset code |
| POST | `/api/auth/change-password` | Change password after verification |

### Tickets (Chamados)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chamados` | Create a new ticket |
| GET | `/api/chamados` | List tickets (filtered by role) |
| GET | `/api/chamados/{id}` | Get ticket details |
| PUT | `/api/chamados/{id}` | Update ticket |
| DELETE | `/api/chamados/{id}` | Delete ticket *(IT only)* |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chamados/{id}/comentarios` | Add a comment to a ticket |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/usuarios` | Create user *(IT only)* |
| GET | `/api/usuarios` | List all users *(IT only)* |
| PUT | `/api/usuarios/{id}` | Update user *(IT only)* |
| POST | `/api/usuarios/import` | Bulk import users from CSV *(IT only)* |

### Stats & Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/estatisticas` | Dashboard statistics *(IT only)* |
| GET | `/health` | Health check |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8000/ws` | Real-time updates (ticket created/updated, comments) |

---

## 🏦 Database Schema

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   usuarios   │     │   chamados    │     │  comentarios │
├──────────────┤     ├───────────────┤     ├──────────────┤
│ id (PK)      │◄────│ usuario_id    │◄────│ chamado_id   │
│ nome         │     │ id (PK)       │     │ id (PK)      │
│ email        │     │ titulo        │     │ usuario_id   │
│ senha_hash   │     │ descricao     │     │ comentario   │
│ tipo         │     │ categoria     │     │ criado_em    │
│ ativo        │     │ prioridade    │     └──────────────┘
│ criado_em    │     │ status        │
└──────────────┘     │ atribuido_para│     ┌──────────────┐
                     │ dados_extras  │◄────│   anexos     │
                     │ criado_em     │     ├──────────────┤
                     │ fechado_em    │     │ id (PK)      │
                     └───────────────┘     │ chamado_id   │
                                           │ nome_arquivo │
                                           │ tamanho_bytes│
                                           └──────────────┘
```

---

## 🔐 Security

- Passwords hashed with **bcrypt**
- Authentication via **JWT** (JSON Web Tokens)
- Role-based permission checks on every endpoint
- Environment variables for all secrets (never hardcoded)
- `.env` is in `.gitignore`

---

## 🛑 Production Deployment

This project is designed to run on a Linux server with **Nginx** as reverse proxy and **systemd** for process management:

```bash
# Example systemd service
sudo systemctl start chamados-ti
sudo systemctl enable chamados-ti

# Example Nginx config
location /api/ {
    proxy_pass http://127.0.0.1:8000;
}
location /ws {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_upgrade websocket;
}
```

---

## 📦 Dependencies

```
fastapi        — Web framework
uvicorn        — ASGI server
sqlalchemy     — ORM
psycopg2       — PostgreSQL driver
python-jose    — JWT handling
passlib[bcrypt]— Password hashing
pydantic       — Data validation
python-dotenv  — Environment variables
requests       — HTTP client (Telegram API)
```

---

## 👨‍💻 Author

**Pedro Marcandali** — [LinkedIn](https://www.linkedin.com/in/pedro-marcandali-6a72a028a/) | [GitHub](https://github.com/darthcode66)
