import { Router } from "express";
import { getTeamById } from "../services/sportdb.js";

export const teamsRouter = Router();

teamsRouter.get("/:id", async (req, res) => {
  try {
    const team = await getTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch team from SportDB" });
  }
});