import { Router } from "express";
import { getStandings } from "../services/sportdb.js";
import { findLeague } from "../config/leagues.js";

export const standingsRouter = Router();

standingsRouter.get("/", async (req, res) => {
  const { league } = req.query;
  if (!league) {
    return res.status(400).json({ error: "Missing required query param: league" });
  }
  if (!findLeague(league)) {
    return res.status(400).json({ error: `Unknown league: ${league}` });
  }

  try {
    const standings = await getStandings(league);
    res.json(standings);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch standings from SportDB" });
  }
});
