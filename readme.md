# Nizzia City

A browser-based crime RPG inspired by Torn.com. Build your criminal empire, trade on the stock market, train at the gym, grow and sell contraband, spin the casino wheel, and climb the ranks in a persistent online world.

[![Read our  DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/wklnd/Nizzia-City-Rewrite-CB)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Tooling](#tooling)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Nizzia City is a gritty, text-driven crime game set in a rundown metropolis where players compete for wealth, power, and reputation. Every action matters: train your stats, work a job, invest in stocks, manage real estate, grow and sell weed, acquire pets, trade items on the player market, and wage war against rivals.

The game runs on a Node.js / Express backend with MongoDB and a Vue 3 single-page frontend.

---

## Features

### Player Systems

- Secure JWT-based authentication with login and registration.
- Persistent player profiles with stats, inventory, battle records, and titles.
- Energy, nerve, happiness, and health regeneration on scheduled intervals.
- Cooldown mechanics across drugs, boosters, alcohol, and medical items.

### Economy

- Cash economy with a player-to-player item marketplace (list, browse, buy, cancel).
- Banking system with dynamic APR rates, fixed-term deposits, and automated interest payouts.
- Stock market with multiple tickers, historical price charts, event-driven volatility, and portfolio tracking.
- Real estate ownership with upgradeable properties and upkeep costs.

### Progression

- Gym training across four battle stats (strength, defense, dexterity, speed) with unlockable gym tiers.
- Job system with ranks, promotions, stat requirements, and scaling pay.
- Education system for long-term skill advancement.
- Pets with happiness bonuses, renaming, and property-based housing.
- Player titles and honor bars awarded for milestones.

### Crime and Grow

- Pickpocketing and organized crime with stat-based outcome calculations.
- Warehouse grow operation: purchase warehouses, plant seeds across seven strains, harvest on real-time timers, and sell or consume the product for cash and stat boosts.
- Addiction mechanics tied to substance consumption.

### Social

- Hall of Fame leaderboards for wealth, battle prowess, and work stats.
- NPC actors that autonomously trade stocks, invest in the bank, and train at the gym.
- Cartels with territory control, missions, and NPC encounters.

### Casino

- Tiered spin wheels with configurable reward tables.

### Administration

- Full admin console: player lookup, resource adjustment, cooldown control, item creation, stock manipulation, bank account oversight, and database maintenance.

---

## Tech Stack

### Backend

| Package      | Purpose                                    |
| ------------ | ------------------------------------------ |
| Express 5    | HTTP server and API routing                |
| Mongoose 8   | MongoDB ODM                                |
| jsonwebtoken | JWT authentication                         |
| bcryptjs     | Password hashing                           |
| node-cron    | Scheduled tasks (regen, NPC actions, rates) |
| dotenv       | Environment configuration                  |
| cors         | Cross-origin resource sharing              |
| morgan       | HTTP request logging                       |
| chalk        | Terminal output formatting                 |

### Frontend

| Package    | Purpose                   |
| ---------- | ------------------------- |
| Vue 3      | Reactive UI framework     |
| Vue Router | Client-side routing       |
| Pinia      | State management          |
| Axios      | HTTP client               |
| Vite       | Build tool and dev server |

### Dev Tools

| Package  | Purpose              |
| -------- | -------------------- |
| ESLint   | Code linting         |
| Prettier | Code formatting      |
| nodemon  | Auto-restart on save |

---

## Getting Started

### Prerequisites

- Node.js v18 or later
- A running MongoDB instance (local or remote)

### Installation

```sh
git clone https://github.com/wklnd/Nizzia-City-Rewrite-CB.git
cd Nizzia-City-Rewrite-CB

# Install all dependencies (backend)
npm install

# Install frontend dependencies
cd frontend-vue
npm install
```

### Configuration

Create a `.env` file in the project root (or `backend/` directory) with at least:

```
MONGO_URI=mongodb://localhost:27017/nizziacity
JWT_SECRET=your_secret_key
PORT=3000
```

### Running

```sh
# Start the backend
npm start          # or: npm run dev (with nodemon)

# In a separate terminal, start the frontend
cd frontend-vue
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Project Structure

```
backend/
    app.js                  Application entry point
    config/                 Game balance and data tables
                            (jobs, stocks, pets, properties, casino, crimes, etc.)
    controllers/            Route handlers for every game system
    creation/               Offline data workbench (items, properties, titles, honor bars)
    cronjobs/               Scheduled tasks
                            (regen, NPC behavior, stock ticker, bank APR, daily reset)
    middleware/             Auth, error handling, request logging
    models/                 Mongoose schemas (Player, Item, Stock, Property, Cartel, etc.)
    routes/                 Express route definitions
    services/               Business logic layer
    tools/                  CLI utilities and offline helpers
    utils/                  Shared helpers

frontend-vue/
    src/
        api/                Axios client configuration
        assets/             Global CSS and static assets
        components/         Reusable Vue components (Sidebar, Topbar, InfoBox, Footer)
        composables/        Vue composables for shared logic
        layouts/            Page layout wrappers
        pages/              Route-level page components
        router/             Vue Router configuration
        stores/             Pinia state stores
        utils/              Frontend utility functions
    public/
        assets/images/      Property and pet images
```

---

## API Reference

All endpoints are mounted under `/api`. Authentication is required unless noted otherwise.

### Authentication

| Method | Endpoint             | Description                |
| ------ | -------------------- | -------------------------- |
| POST   | `/api/auth/register` | Create a new account       |
| POST   | `/api/auth/login`    | Authenticate and receive JWT |

### Item Market

| Method | Endpoint               | Description                                |
| ------ | ---------------------- | ------------------------------------------ |
| GET    | `/api/market/listings` | Browse listings (filter by item or seller) |
| POST   | `/api/market/list`     | Create a listing from inventory            |
| POST   | `/api/market/buy`      | Purchase items from a listing              |
| POST   | `/api/market/cancel`   | Cancel a listing and return items           |

### Banking

| Method | Endpoint                     | Description                      |
| ------ | ---------------------------- | -------------------------------- |
| GET    | `/api/bank/rates`            | Current APR rates for all terms  |
| GET    | `/api/bank/accounts/:userId` | Retrieve deposit accounts        |
| POST   | `/api/bank/deposit`          | Open a new fixed-term deposit    |
| POST   | `/api/bank/withdraw`         | Withdraw a matured deposit       |

### Stocks

| Method | Endpoint              | Description                      |
| ------ | --------------------- | -------------------------------- |
| GET    | `/api/stocks/prices`  | Latest prices for all tickers    |
| GET    | `/api/stocks/history` | Historical price data for charts |
| POST   | `/api/stocks/buy`     | Purchase shares                  |
| POST   | `/api/stocks/sell`    | Sell shares from portfolio       |

### Grow System

| Method | Endpoint                  | Description                             |
| ------ | ------------------------- | --------------------------------------- |
| GET    | `/api/grow/strains`       | All strains with costs, times, effects  |
| GET    | `/api/grow/warehouses`    | All warehouse tiers with pot limits     |
| GET    | `/api/grow/my`            | Player's warehouse, pots, and stash     |
| POST   | `/api/grow/buy-warehouse` | Purchase or upgrade warehouse           |
| POST   | `/api/grow/buy-pot`       | Buy an additional pot                   |
| POST   | `/api/grow/plant`         | Plant a seed in a pot                   |
| POST   | `/api/grow/harvest`       | Harvest a ready plant                   |
| POST   | `/api/grow/sell`          | Sell weed from stash for cash           |
| POST   | `/api/grow/use`           | Consume weed for stat boosts            |

### Admin

All admin routes are mounted under `/api/admin` and require administrator privileges. Capabilities include player lookup, resource adjustment, stat modification, cooldown management, item creation, stock manipulation, and database operations.

---

## Tooling

The `backend/tools/` directory contains standalone utilities:

| Tool                             | Description                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| `itemCreator.html`               | Browser-based form for designing items with effect builders    |
| `crime/pickpocket.html`          | Stat-based outcome simulator for crime balancing               |
| `database/databasePurge.js`      | Drops the entire database (destructive, requires confirmation) |
| `database/databaseDump.js`       | Dumps database contents to JSON                                |
| `database/seedMarket.js`         | Populates the marketplace with sample listings                 |
| `database/normalizePlayers.js`   | Normalizes player documents to current schema                  |
| `resetCooldowns.js`              | CLI tool to clear player cooldowns with dry-run support        |
| `stocks/backfill.js`             | Backfills historical stock price data                          |

The `backend/creation/` directory provides an offline workbench for building items, properties, titles, and honor bars with JSON import/export.

---

## Contributing

This project is not open for contributions at this time. If you would like to contribute, fork the repository, make your changes on a feature branch, and submit a pull request for review.

---

## License

Copyright Oscar Wiklund. All rights reserved.

This source code is provided for personal, educational, and non-commercial use only. You may study and reference the code freely, but you may not republish, redistribute, or use it commercially without explicit written permission from the author.

---

*Built by Oscar Wiklund and Vue.*
