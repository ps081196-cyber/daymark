# Daymark

A full-stack task planner built with HTML, CSS, JavaScript, Express, and MongoDB.

## Run locally

1. Install Node.js and MongoDB, or create a MongoDB Atlas database.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

The API uses an HttpOnly JWT cookie. Tasks are always queried and mutated with the authenticated user's ID, so users only see their own task lists.
