# FitTrack Back-End

A RESTful API server for the FitTrack fitness tracking application. Built with Node.js, Express, and MongoDB, this service manages user authentication, diet and exercise records, and provides endpoints for the front-end to fetch and store fitness data.

---

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **User Authentication**: Register, login, and JWT-based session management.
- **Diet Tracking**: Create, read, update, and delete daily food consumption entries.
- **Exercise Logging**: Manage both aerobic and anaerobic workout records, including calorie calculations.
- **Daily Summary**: Aggregate endpoints to retrieve daily calorie intake vs. expenditure.
- **Protected Routes**: Middleware to secure endpoints for authenticated users.
- **MongoDB Integration**: Mongoose ODM for schema definitions and database operations.

---

## Prerequisites
- Node.js: v18 or higher
- npm (or Yarn)
- MongoDB: Local or hosted instance (e.g., MongoDB Atlas)

---

## Installation

1. Clone the repository
```bash
git clone https://github.com/Guotai812/FitTrack_Back.git
cd fittrack-back
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Configure environment
Copy `.env.example` to `.env` and set the required variables (see below).

---

## Environment Variables

| Variable      | Description                                 |
|---------------|---------------------------------------------|
| PORT          | Port on which server runs (default `3000`)  |
| MONGODB_URI   | MongoDB connection string                   |
| JWT_SECRET    | Secret key for signing JWT tokens           |
| JWT_EXPIRES_IN| JWT expiration (e.g., `1h`, `7d`)           |
| NODE_ENV      | `development` or `production`               |

---

## Database Setup

1. If using local MongoDB, ensure the service is running:
```bash
mongod --dbpath /path/to/data
```

2. The server will automatically create necessary collections on first run.

---

## Running the Server

- Development (with auto-restart):
```bash
npm run dev
# or
yarn dev
```

- Production:
```bash
npm start
# or
yarn start
```

Server will be available at `https://fit-track-back.vercel.app`.

---

## API Endpoints

### Authentication
| Method | Endpoint              | Description                |
|--------|-----------------------|----------------------------|
| POST   | `/api/auth/register`  | Create a new user          |
| POST   | `/api/auth/login`     | Authenticate and get token |

### Users
| Method | Endpoint          | Description                  |
|--------|-------------------|------------------------------|
| GET    | `/api/users/me`   | Get current user profile     |

### Diet Records
| Method | Endpoint                                 | Description                  |
|--------|------------------------------------------|------------------------------|
| GET    | `/api/records/:userId/:date`             | Get diet/exercise for a date |
| POST   | `/api/records/:userId/:date/diets`       | Add a food entry             |
| PATCH  | `/api/records/:userId/:date/diets`       | Update a food entry          |
| DELETE | `/api/records/:userId/:date/diets/:id`   | Remove a food entry          |

### Exercise Records
| Method | Endpoint                                            | Description                   |
|--------|-----------------------------------------------------|-------------------------------|
| POST   | `/api/records/:userId/:date/exercise/aerobic`       | Add aerobic exercise entry    |
| POST   | `/api/records/:userId/:date/exercise/anaerobic`     | Add anaerobic exercise entry  |
| PATCH  | `/api/records/:userId/:date/exercise/:type/:id`     | Update exercise entry         |
| DELETE | `/api/records/:userId/:date/exercise/:type/:id`     | Remove exercise entry         |

---

## Project Structure

```text
fittrack-back/
├─ src/
│  ├─ controllers/      # Route handlers
│  ├─ middleware/       # Auth, error handlers, etc.
│  ├─ models/           # Mongoose schemas
│  ├─ routes/           # Express route definitions
│  ├─ utils/            # Helpers (e.g., JWT, validators)
│  ├─ app.js            # Express app setup
│  └─ server.js         # Entry point to start server
├─ .env.example
├─ package.json
├─ tsconfig.json       # if using TypeScript
├─ .gitignore
└─ README.md           # This file
```

---

## Scripts
| Command       | Description                               |
|---------------|-------------------------------------------|
| `npm run dev` | Start development server with nodemon     |
| `npm start`   | Run server in production mode             |
| `npm test`    | Run test suite (if configured)            |
| `npm run lint`| Lint codebase with ESLint                 |

---

## Error Handling

Errors are returned in the following format:
```json
{
  "message": "Description of the error",
  "status": 400
}
```

---

## Testing

(Optional: Describe how to run unit/integration tests, if implemented)

---

## Contributing

Contributions are welcome! Please fork the repo, create a new branch for each feature or fix, and submit a pull request. For major changes, open an issue first to discuss.

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.
```