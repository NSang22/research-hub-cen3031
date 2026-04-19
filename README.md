# ResearchHub

A dual-portal web platform connecting undergraduate students with research lab Principal Investigators (PIs). Students browse and apply to research positions; PIs post openings, review applications, and manage their research teams.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (via Supabase) |
| Auth | JWT + bcrypt |
| UI | Framer Motion, Lucide React, Radix UI |

## Project Structure

```
research-hub-cen3031/
├── client/                          # React frontend (Vite)
│   └── src/
│       ├── components/              # Shared UI components
│       ├── context/                 # Auth and theme context
│       ├── lib/                     # API client
│       ├── pages/
│       │   ├── auth/                # Landing, Login, Register
│       │   ├── student/             # Student-facing pages
│       │   └── pi/                  # PI-facing pages
│       └── types/                   # Shared TypeScript types
├── server/                          # Express backend
│   └── src/
│       ├── db/
│       │   └── migrations/          # SQL migration files
│       ├── middleware/              # Auth middleware
│       └── routes/                  # API route handlers
├── .env.example
└── package.json                     # Root scripts (dev, migrate, build)
```

## Features

**Students**
- Browse and filter open research positions
- Apply with a cover letter
- Track application status (pending, reviewed, accepted, rejected, withdrawn)
- Build an academic profile (major, GPA, skills, resume)

**Principal Investigators**
- Post and manage research positions
- Review applications and update statuses
- Close positions (automatically notifies applicants)
- Browse student profiles

## Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (or any PostgreSQL 14+ instance)

### 1. Install dependencies

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
JWT_SECRET=your-secret-key
PORT=3000
```

### 3. Run migrations

```bash
npm run migrate
```

### 4. Start development servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register student or PI | — |
| POST | `/api/auth/login` | Login | — |
| POST | `/api/auth/demo` | Instant demo login | — |
| GET | `/api/auth/me` | Current user | Required |
| GET/PUT | `/api/students/profile` | Student profile | Student |
| GET | `/api/students` | List students | PI |
| GET | `/api/students/:id` | Student detail | PI |
| GET/PUT | `/api/pis/profile` | PI profile | PI |
| GET | `/api/positions` | List open positions | — |
| POST | `/api/positions` | Create position | PI |
| GET | `/api/positions/mine` | PI's own positions | PI |
| GET | `/api/positions/:id` | Position detail | — |
| PUT | `/api/positions/:id` | Update position | PI |
| DELETE | `/api/positions/:id` | Close position | PI |
| POST | `/api/applications` | Apply to position | Student |
| GET | `/api/applications/mine` | Student's applications | Student |
| GET | `/api/applications/position/:id` | Applications for position | PI |
| PATCH | `/api/applications/:id/status` | Update application status | PI |

## Database Migrations

Migrations run in order from `server/src/db/migrations/`:

| File | Description |
|---|---|
| `001_initial.sql` | Core schema: users, profiles, positions, applications |
| `002_add_withdrawn_status.sql` | Adds `withdrawn` to application status enum |
| `003_participant_profiles.sql` | Study participant profile table (removed in 005) |
| `004_direct_messaging.sql` | Direct messaging between students and PIs |
| `005_drop_participant_profiles.sql` | Drops study participant recruitment tables |
