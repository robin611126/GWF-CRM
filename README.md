# GWF CRM — Production-Ready CRM for Website Development Agency

A full-stack CRM web application for managing leads, clients, projects, tasks, invoices, payments, and analytics.

## 🛠 Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Backend   | Node.js + Express + TypeScript      |
| Database  | PostgreSQL + Prisma ORM             |
| Frontend  | React (Vite) + TailwindCSS          |
| Auth      | JWT + Role-Based Access Control     |
| Testing   | Jest + Supertest                    |
| Deploy    | Docker + Docker Compose             |

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js ≥ 18
- PostgreSQL running on `localhost:5432`
- Create a database: `createdb gwf_crm`

### Backend Setup
```bash
cd backend
cp .env.example .env        # Configure environment variables
npm install
npx prisma db push          # Create tables
npx prisma generate         # Generate Prisma client
npm run db:seed             # Seed sample data
npm run dev                 # Starts on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev                 # Starts on http://localhost:3000
```

### 🐳 Docker (Full Stack)
```bash
docker-compose up --build
```
App will be available at `http://localhost:3000`

## 👤 Demo Credentials

| Role            | Email                | Password     |
| --------------- | -------------------- | ------------ |
| Admin           | admin@gwfcrm.com     | admin123     |
| Sales           | sales@gwfcrm.com     | password123  |
| Project Manager | pm@gwfcrm.com        | password123  |
| Developer       | dev@gwfcrm.com       | password123  |
| Billing         | billing@gwfcrm.com   | password123  |

## 📡 API Endpoints

| Module    | Base Path       | Auth Required |
| --------- | --------------- | ------------- |
| Auth      | `/api/auth`     | Partial       |
| Leads     | `/api/leads`    | ✅            |
| Clients   | `/api/clients`  | ✅            |
| Projects  | `/api/projects` | ✅            |
| Tasks     | `/api/tasks`    | ✅            |
| Invoices  | `/api/invoices` | ✅            |
| Payments  | `/api/payments` | ✅            |
| Reports   | `/api/reports`  | ✅            |
| Admin     | `/api/admin`    | ✅ (Admin)    |

## 🔐 Role-Based Access

| Module   | Admin | Sales | PM    | Dev        | Billing |
| -------- | ----- | ----- | ----- | ---------- | ------- |
| Leads    | CRUD  | CRUD  | —     | —          | —       |
| Clients  | CRUD  | R/W   | Read  | —          | Read    |
| Projects | CRUD  | —     | CRUD  | Read (own) | —       |
| Tasks    | CRUD  | —     | CRUD  | Status     | —       |
| Invoices | CRUD  | Read  | —     | —          | R/W     |
| Payments | CRUD  | —     | —     | —          | R/W     |
| Admin    | Full  | —     | —     | —          | —       |

## 🧪 Testing
```bash
cd backend
npm test
```

## 📋 Key Features

- **Lead Pipeline**: Drag-and-drop Kanban board with auto-conversion (Won → Client + Project)
- **Client Management**: Encrypted credentials, soft delete, invoice protection
- **Project Tracking**: Status rules, revision history, task dependencies
- **Invoice System**: Auto-numbering (INV-0001), PDF generation, partial payments
- **Analytics**: Revenue trends, conversion rates, lead source charts
- **Admin Panel**: Plans, coupons, tax, currency, user management, CSV export
- **Security**: JWT auth, RBAC middleware, encrypted sensitive data

## 📁 Project Structure
```
gwf-crm/
├── backend/
│   ├── prisma/schema.prisma     # Database schema
│   ├── src/
│   │   ├── config/              # DB, env config
│   │   ├── middleware/           # Auth, RBAC, validation
│   │   ├── modules/             # Feature modules
│   │   │   ├── auth/
│   │   │   ├── leads/
│   │   │   ├── clients/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── invoices/
│   │   │   ├── payments/
│   │   │   ├── reports/
│   │   │   └── admin/
│   │   └── utils/
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/          # Layout, shared UI
│   │   ├── context/             # Auth, Toast
│   │   ├── pages/               # Route pages
│   │   └── services/            # API client
├── docker-compose.yml
└── README.md
```
