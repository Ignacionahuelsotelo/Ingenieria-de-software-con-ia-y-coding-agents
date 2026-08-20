import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  res.json({ status: "ok", assistant: Boolean(process.env.ANTHROPIC_API_KEY) });
});
