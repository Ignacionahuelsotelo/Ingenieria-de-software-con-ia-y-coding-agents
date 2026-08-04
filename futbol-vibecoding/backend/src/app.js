import express from "express";
import { leaguesRouter } from "./routes/leagues.js";
import { matchesRouter } from "./routes/matches.js";
import { standingsRouter } from "./routes/standings.js";

export const app = express();

app.use("/api/leagues", leaguesRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/standings", standingsRouter);
