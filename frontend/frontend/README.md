# SplitWise — Frontend (React + Vite)

Frontend for the SplitWise Express/PostgreSQL backend. The folder structure mirrors
the backend layers (api ↔ routes/services, socket ↔ socket, context/hooks/utils).

## Stack
- React 18 + Vite
- React Router v6
- Axios (REST) + Socket.IO client (real-time expense chat)
- Plain CSS (design tokens in `src/styles/index.css`)

## Getting started

```bash
npm install
npm run dev
```

The app runs on http://localhost:5173 and talks to the API at `VITE_API_URL`.

## Configuration

Set the backend URL in `.env`:

```
VITE_API_URL=http://localhost:4000
```

Make sure the backend's `CLIENT_URL` allows this origin (CORS + Socket.IO).

## Structure

```
src/
├── api/        REST wrappers, one file per backend route group
├── context/    AuthContext (JWT session)
├── hooks/      useToast
├── socket/     Socket.IO singleton for expense chat
├── components/ common / group / expense / balance / chat
├── pages/      Auth, Dashboard, Groups, Balances
├── layouts/    MainLayout (app shell) + AuthLayout
├── routes/     AppRoutes
└── utils/      constants, helpers, formatters
```

## Features
- Email + password auth (register / login / persisted session)
- Create groups, invite members by email, accept/decline invites
- Add expenses with 4 split types: equal, unequal, percentage, shares
- Group balances + greedy "simplified debts" with one-click settle up
- Per-expense real-time chat (typing indicators, delete own messages)
- Personal balance overview across all groups
