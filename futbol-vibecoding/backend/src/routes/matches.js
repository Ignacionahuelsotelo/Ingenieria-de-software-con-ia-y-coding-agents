import { Router } from "express";
import {
  getMatches,
  getMatchById,
  getMatchesByDate,
  getMatchEvents,
  getMatchLineups,
  getMatchStatistics,
  getRiverBocaMatches,
} from "../services/sportdb.js";
import { findLeague } from "../config/leagues.js";

export const matchesRouter = Router();

matchesRouter.get("/river-boca", async (req, res) => {
  try {
    const matches = await getRiverBocaMatches();
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch matches from SportDB" });
  }
});

matchesRouter.get("/:id/events", async (req, res) => {
  try {
    const events = await getMatchEvents(req.params.id);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch match events from SportDB" });
  }
});

matchesRouter.get("/:id/lineups", async (req, res) => {
  try {
    const lineups = await getMatchLineups(req.params.id);
    res.json(lineups);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch match lineups from SportDB" });
  }
});

matchesRouter.get("/:id/statistics", async (req, res) => {
  try {
    const statistics = await getMatchStatistics(req.params.id);
    res.json(statistics);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch match statistics from SportDB" });
  }
});

matchesRouter.get("/:id", async (req, res) => {
  try {
    const match = await getMatchById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }
    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch match from SportDB" });
  }
});

matchesRouter.get("/", async (req, res) => {
  const { league, date } = req.query;

  if (date) {
    try {
      const matches = await getMatchesByDate(date);
      return res.json(matches);
    } catch (err) {
      console.error(err);
      return res.status(502).json({ error: "Failed to fetch matches from SportDB" });
    }
  }

  if (!league) {
    return res.status(400).json({ error: "Missing required query param: league or date" });
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
