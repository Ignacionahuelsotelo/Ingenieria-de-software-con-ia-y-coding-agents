import { Router } from "express";
import { listLeagues } from "../services/sportdb.js";

export const leaguesRouter = Router();

leaguesRouter.get("/", (req, res) => {
  res.json(listLeagues());
});
