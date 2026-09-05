# Daymark

A full-stack task planner built with HTML, CSS, JavaScript, Express, and MongoDB.

## Run locally

1. Install Node.js and MongoDB, or create a MongoDB Atlas database.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

The API uses an HttpOnly JWT cookie. Tasks are always queried and mutated with the authenticated user's ID, so users only see their own task lists.

## Deploy on Render

1. Create a MongoDB Atlas database and allow Render's outbound connections.
2. In Render, choose **New > Blueprint**, connect `ps081196-cyber/daymark`, and apply `render.yaml`.
3. Set `MONGODB_URI` to the Atlas connection string when Render prompts for it. `JWT_SECRET` is generated automatically.
4. Open the Render service URL. The frontend and Express API are served from the same URL, so authentication works without extra CORS configuration.
