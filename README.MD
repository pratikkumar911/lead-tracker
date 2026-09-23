 # Lead Tracker

Full-stack lead management application with a React/Vite frontend and an Express, TypeScript, and MongoDB backend.

## Architecture

```text
frontend/
	React + TypeScript + Vite
	src/api/leads.ts       API client and shared frontend types
	src/components/        Lead form and lead table
	src/App.tsx             Page state, filters, CRUD workflows, loading overlay

backend/
	Express + TypeScript
	src/Lead.ts             Mongoose schema and lead statuses
	src/routes.ts           Validation and CRUD route handlers
	src/server.ts           App creation, CORS, database connection, startup
	tests/leads.test.ts     Route-level integration tests
```

The frontend calls the backend through `VITE_API_URL`. The backend exposes these routes:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/leads` | List, search, filter, sort, and paginate leads |
| GET | `/leads/stats` | Aggregate counts by status |
| POST | `/leads` | Create a lead |
| GET | `/leads/:id` | Read one lead |
| PATCH | `/leads/:id` | Update lead fields |
| PATCH | `/leads/:id/status` | Update only the status |
| DELETE | `/leads/:id` | Delete a lead |

## Setup

### Requirements

- Node.js 18 or newer
- npm
- MongoDB Atlas cluster or another MongoDB instance

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
CLIENT_URL=http://localhost:5173
DNS_SERVERS=1.1.1.1,8.8.8.8
```

Start the backend:

```bash
npm run dev
```

Build or test it with:

```bash
npm run build
npm test
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

## Deployment

### Backend on Render

1. Create a Render Web Service using the `backend` directory as the root directory.
2. Install command: `npm install`.
3. Build command: `npm run build`.
4. Start command: `node dist/server.js`.
5. Add these environment variables in Render:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
CLIENT_URL=https://<your-vercel-domain>
DNS_SERVERS=1.1.1.1,8.8.8.8
```

The MongoDB Atlas network access rules must allow the deployed backend to connect.

### Frontend on Vercel

1. Create a Vercel project using the `frontend` directory as the root directory.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Add this environment variable:

```env
VITE_API_URL=https://<your-render-service>.onrender.com
```

Redeploy after changing environment variables. `VITE_API_URL` is public in a browser bundle, so it must not contain credentials.

## Trade-offs

- MongoDB and Mongoose provide flexible document storage and straightforward schema validation, but require a reachable database during deployment.
- Zod validation gives clear field-level API errors, at the cost of maintaining validation schemas alongside the Mongoose schema.
- The API uses a simple Express router and explicit async error handling, which is easy to follow but more repetitive than a shared handler abstraction.
- CORS is configured with environment variables, which keeps deployment-specific origins out of source code but requires correct Render configuration.
- The frontend refreshes leads and statistics after mutations. This keeps state consistent with the server but can require an additional round trip.
- The CRUD overlay blocks interaction during mutations, reducing accidental duplicate actions while the request is pending.

## Future Improvements

- Add authentication and authorization for users and teams.
- Add optimistic updates with rollback for faster perceived interactions.
- Add stronger automated coverage for authorization, CORS, and database failures.
- Add structured logging and request correlation IDs.
- Add server-side rate limiting and security headers.
- Add Docker and CI workflows for repeatable builds and deployments.
- Add lead activity history, ownership, and bulk actions.
