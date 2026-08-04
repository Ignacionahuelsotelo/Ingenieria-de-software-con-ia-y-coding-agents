import { Router } from "express";
import { getMatches } from "../services/sportdb.js";
import { findLeague } from "../config/leagues.js";

export const matchesRouter = Router();

matchesRouter.get("/", async (req, res) => {
  const { league } = req.query;
  if (!league) {
    return res.status(400).json({ error: "Missing required query param: league" });
  }
  if (!findLeague(league)) {
    return res.status(400).json({ error: `Unknown league: ${league}` });
  }

  try {
    const matches = await getMatches(league);
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch matches from SportDB" });
  }
});
