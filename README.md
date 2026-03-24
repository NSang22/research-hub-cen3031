# ResearchHub

A centralized research recruitment and management platform connecting university students with faculty-led research opportunities.

## Project Structure

```
research-hub/
├── client/          # React + Vite + Tailwind CSS frontend (port 5173)
├── server/          # Node.js + Express backend API (port 3001)
├── shared/          # Shared TypeScript types (used by client & server)
├── package.json     # Root workspace config with concurrent dev scripts
└── tsconfig.base.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Development

Run both client and server concurrently:

```bash
npm run dev
```

Or run individually:

```bash
npm run dev --workspace=client   # http://localhost:5173
npm run dev --workspace=server   # http://localhost:3001
```

### Build

```bash
npm run build
```

### Environment Variables

Copy `server/.env.example` to `server/.env` and fill in the values:

```bash
cp server/.env.example server/.env
```

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18, Vite 6, Tailwind CSS 3        |
| Backend  | Node.js, Express 4, TypeScript          |
| Shared   | TypeScript interfaces and types         |
| Tooling  | npm workspaces, concurrently, tsx       |

## API

The Vite dev server proxies `/api/*` requests to `http://localhost:3001`, so the client can call `/api/health` without CORS issues in development.

Available endpoints:
- `GET /api/health` — server health check
