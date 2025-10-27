## Nizzia City – Developer Guide

This repo contains a Node.js/Express backend and a static frontend. The backend has been refactored for maintainability with centralized routing, error handling, and configurable environment settings. Existing functionality and endpoint paths are preserved.

### Quick start

1) Create a `.env` (optional; sensible defaults exist):

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nizziacity
JWT_SECRET=devsecret
# To disable cron jobs (useful in tests):
# DISABLE_CRON=true
```

2) Install dependencies (Node 18+ recommended):

```
npm install
```

3) Run the server:

```
npm start
```

For auto-reload in development:

```
npm run dev
```

### Notable backend improvements

- Centralized route mounting in `backend/routes/index.js` keeps `backend/app.js` lean
- Global 404 and error middleware for consistent responses
- Optional HTTP request logging via `morgan` (no-op if not installed)
- Configurable MongoDB URI with fallback to the previous default
- Basic linting/formatting setup (ESLint flat config + Prettier) and npm scripts

### Scripts

- `npm start` – start API (`backend/app.js`)
- `npm run dev` – start with autoreload (nodemon)
- `npm run lint` – run ESLint

### Backend entrypoints and layout

- `backend/app.js` – Express app and bootstrapping
- `backend/routes/index.js` – mounts all existing route modules on their base paths
- `backend/middleware/` – request logger, 404 handler, and error handler
- `backend/config/db.js` – MongoDB connection (uses `MONGODB_URI` if set)
- `backend/cronjobs/` – scheduled jobs; can be disabled with `DISABLE_CRON=true`

---
`
torn-city-clone/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── gymController.js
│   │   └── userController.js
│   ├── cronjobs/
│   │   ├── regenEnergy.js
│   │   └── dailyReset.js
│   ├── middlewares/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   └── Crime.js
│   ├── routes/
│   │   ├── gymRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   ├── gymService.js
│   │   └── crimeService.js
│   ├── utils/
│   │   ├── calculateDamage.js
│   │   └── formatTime.js
│   └── app.js
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── assets/
│   │   │   └── logo.png
│   │   ├── components/
│   │   │   ├── StatBar.js
│   │   │   └── Sidebar.js
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Gym.js
│   │   │   └── Crimes.js
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.js
│   └── index.html
│
├── database/
│   └── init.js
│
├── .env
├── .gitignore
├── package.json
├── README.md
└── server.js
`





Math: 

https://www.overleaf.com/project/68166c89029ccf318880d825

## Frontend structure (refactor, October 2025)

- All inline scripts/styles have been moved to external files under `frontend/assets`.
- Shared utilities
	- `frontend/assets/js/api.js` – base API client (auto-injects token)
	- `frontend/assets/js/utils.js` – formatting + session helpers
- Page scripts
	- `frontend/assets/js/pages/game.js`
	- `frontend/assets/js/pages/gym.js`
	- `frontend/assets/js/pages/city.js`
	- `frontend/assets/js/pages/inventory.js`
	- `frontend/assets/js/pages/money.js`
	- `frontend/assets/js/pages/casino.js`
	- `frontend/assets/js/pages/job.js`
	- Auth: `frontend/assets/js/auth/login.js`, `auth/register.js`, `auth/create-player.js`
- Styles
	- `frontend/assets/style/game.css` – base layout
	- `frontend/assets/style/topbar.css` – top bar + utilities
	- `frontend/assets/style/gym.css`, `city.css`, `inventory.css`, `auth-pages.css`

New/updated pages:
- `frontend/game.html` – main app shell with navigation
- `frontend/gym.html`, `frontend/city.html`, `frontend/inventory.html`
- `frontend/money.html` – uses `/api/money/*`
- `frontend/casino.html` – uses `/api/casino/spin`
- `frontend/job.html` – hire/promote/leave job
- `frontend/crimes.html` – placeholder (backend route currently disabled)

Notes
- Base API URL defaults to `http://localhost:5000/api`. You can override via `localStorage.setItem('nc_api', 'http://your-api/api')`.
- The backend already enables CORS; open HTML files from disk or serve them statically with any simple server.
