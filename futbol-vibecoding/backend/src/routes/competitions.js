import { Router } from "express";
import { listCompetitions } from "../services/sportdb.js";

export const competitionsRouter = Router();

competitionsRouter.get("/", async (req, res) => {
  try {
    const competitions = await listCompetitions();
    res.json(competitions);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch competitions from SportDB" });
  }
});
