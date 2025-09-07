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

### Base URL
All routes are mounted under `/api`.

- Users: `/api/users`
- Basic: `/api/basic`
- Pool: `/api/pool`

### Auth
Protected routes expect a JWT in the header:

---

### Users (`/api/users`)
- **POST** `/signup` — Register a new user.
- **POST** `/login` — Log in; returns JWT + profile.
- **GET** `/:uid` — Get user by ID.
- **GET** `/:uid/:eid/:type/getExerciseHis` — Get exercise history for a given entry/type.
- **PATCH** `/:uid/updateWeight` — Update current weight (appends to history).

---

### Basic (`/api/basic`)
- **POST** `/:uid/basicInformation` — Create/update basic profile data (weight/height/age/goal, etc.).
- **GET** `/:uid/getDailyBasic` — Get today’s computed basics (kcal, etc.).
- **GET** `/:uid/getPool` — Get default food/exercise pools.
- **POST** `/:uid/addDiet` — Add a diet (meal/food) record.
- **PATCH** `/:uid/editDiet` — Edit an existing diet record.
- **DELETE** `/:uid/:foodId/deleteDiet` — Delete a diet record by foodId.
- **POST** `/:uid/:eid/addExercise` — Add an exercise record (by exercise id).
- **DELETE** `/:uid/deleteExercise` — Delete an exercise record.
- **PATCH** `/:uid/updateExercise` — Update an exercise record.
- **GET** `/:uid/getWeightHis` — Get weight history.
- **GET** `/:uid/getHis` — Get overall history (diet/exercise summaries).

---

### Pool / Custom Content (`/api/pool`)
- **GET** `/:uid/:type/preSign?contentType=<mime>` — Get AWS S3 **pre-signed PUT** URL for image upload.  
  - `type`: `food` or `exercise`  
  - `contentType`: e.g. `image/png`, `image/jpeg`, `image/webp`, `image/gif`
- **POST** `/:uid/uploadFood` — Create a **custom food** item (with optional uploaded image URL).
- **GET** `/:uid/getCustomizedFood` — List user’s custom foods.
- **POST** `/:uid/:foodId/updateFood` — Update a custom food.
- **DELETE** `/:uid/:foodId/deleteFood` — Delete a custom food.

- **GET** `/:uid/getCusExercise` — List user’s custom exercises.
- **POST** `/:uid/uploadAerobic` — Add an **aerobic** exercise record.
- **POST** `/:uid/uploadAnaerobic` — Add an **anaerobic** exercise record.
- **PATCH** `/:uid/updateCusExercise/:id` — Update a custom exercise (by id).
- **DELETE** `/:uid/:id/deleteCusExercise` — Delete a custom exercise (by id).

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