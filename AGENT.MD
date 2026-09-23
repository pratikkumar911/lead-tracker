 # AI Development Notes

## Tools Used

- VS Code with GitHub Copilot for code exploration, implementation, refactoring, and documentation.
- TypeScript compiler for backend and frontend type checking.
- Jest, ts-jest, Supertest, and MongoDB Memory Server for backend route tests.
- Vite for frontend development and production builds.
- npm for dependency and script management.
- MongoDB Atlas for deployed persistence.

## Prompts and AI-Generated Work

The project was developed with prompts covering:

- backend environment setup and MongoDB connection handling
- Jest and TypeScript configuration
- Express server simplification
- removal of unused dependencies and route prefixes
- deployment CORS troubleshooting
- frontend CRUD loading feedback
- unit test repair
- project documentation

AI-generated or AI-assisted sections include all implementation files and configuration except the manual sections listed below. This includes the Express server bootstrap, frontend components, styling, configuration files, tests, and deployment documentation.

## Manually Written Sections

The following sections were manually written:

- `backend/src/Lead.ts`: the lead model, allowed statuses, timestamps, JSON representation, and unique email index.
- `backend/src/routes.ts`: lead route logic, request validation, CRUD behavior, pagination, search, status aggregation, and error responses.
- `frontend/src/api/leads.ts`: the frontend API client, request functions, frontend data types, and API error mapping.

All other code and documentation sections were AI-generated or AI-assisted.

## Key Engineering Decisions

- Keep the Express app factory separate from database startup so Jest can import and test the app without opening a port or connecting to production MongoDB.
- Use MongoDB Atlas through `MONGODB_URI`; do not fall back to an in-memory database in production startup.
- Keep deployment-specific CORS origins in `CLIENT_URL` rather than hardcoding them in source code.
- Use `/leads` routes without an `/api` prefix.
- Validate request bodies and query parameters with Zod before database operations.
- Enforce unique lead email addresses at both the application and database levels.
- Use explicit `try/catch` blocks in async Express handlers so failures reach the shared error middleware under Express 4.
- Show a blocking frontend loading overlay during create, update, status-change, and delete operations.
- Keep the frontend API base URL in `VITE_API_URL`; this value is public by design because browser code can be inspected.
