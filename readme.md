## Nizzia City - A Torn.com inspired Crime Game

### Lore: 
Nizzia City is a rundown, crime-ridden city where players can immerse themselves in a virtual world filled with various activities, jobs, and interactions. The game draws inspiration from Torn.com, offering a similar experience with its own unique twists and features.

### Features
- User Authentication: Secure login and registration system.
- Player Profiles: Each player has a profile with stats, inventory, and achievements.
- Casino System: Players can try their luck at the casino with various games and rewards.
- Item Management: Players can acquire, use, and trade items.
- Pet Store: Players can buy and manage a single pet that grants bonuses (e.g., happiness). Pets live in your current property.
- Item Market: Player-to-player marketplace to list items for sale, browse listings, buy, and cancel.
- Admin Panel: A dedicated interface for administrators to manage the game.
- Real-time Updates: Dynamic updates to player stats and game events.
- Cooldown System: Certain actions have cooldown periods to enhance gameplay balance.


### Tech
Nizzia City's backend is written in NodeJS with the following packages:
    "bcryptjs": "^2.4.3",
    "chalk": "^5.6.2",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.14.2",
    "morgan": "^1.10.0",
    "node-cron": "^3.0.3"

The frontend is built with Vue.js 3 and uses:
    "axios": "^1.7.7",
    "pinia": "^2.1.7",
    "vue": "^3.4.38",
    "vue-router": "^4.4.5"


### Setup
1. Clone the repository
2. Run `npm install` in both `backend` and `frontend-vue` directories
3. Create a `.env` file in the `backend` directory based on the `.env
   example provided.
4. Start the backend server with `npm start` in the `backend` directory.
5. Start the frontend development server with `npm run dev` in the `frontend-vue` directory.
6. Access the application at `http://localhost:5173` in your web browser.

### Item Market
- UI: In the Vue app, open City and click the "Market" (🛒) POI, or use the sidebar link to "/market".
- Actions supported:
    - Create listing: pick an item from your inventory, set quantity and unit price.
    - Browse and buy: filter listings by name and purchase quantities up to the available amount.
    - Manage: view your active listings and cancel them to return remaining items to your inventory.
- API endpoints (mounted under `/api/market`):
    - `GET /market/listings` — Optional query params: `itemId`, `sellerId` (playerId or user id). Returns `{ listings: [...] }`.
    - `POST /market/list` — Body: `{ userId, itemId, qty, price }`. Deducts inventory and creates a listing.
    - `POST /market/buy` — Body: `{ userId, listingId, qty }`. Transfers money and items; deletes listing when empty.
    - `POST /market/cancel` — Body: `{ userId, listingId }`. Returns remaining stock to seller and removes listing.

Notes
- `userId` accepts either a Player `id` (number) or the `user` ObjectId string; the backend resolves both forms.
- Listings store `itemId` (the custom item key), and inventory references the Item document `_id`.

### Database
The application uses MongoDB as its database. Ensure you have a MongoDB instance running and properly
configured in your `.env` file.

### Contributing
Contributing is not currently open, but all contributions will be considered in the future. Please fork the repository and create a pull request with your changes.



### Upcoming Features
- Pet Minigames
    - Expand pets with activities (training, tricks, competitions) that provide additional bonuses and fun progression.
- The Job Update 
    - The job system allows players to work in various professions to earn money and gain experience. It also allows players to create their own companies, hire employees, and manage business operations. If the company does well, it even can be listed on the in-game stock market for players to invest in.
	Each Job allows players to gain stats and job points, which can be used to gain perks and bonuses related to their profession.
- Item Market
	- An in-game marketplace where players can buy and sell items with each other. This feature will include an auction system, direct trades, and a listing system for players to showcase their items for sale.