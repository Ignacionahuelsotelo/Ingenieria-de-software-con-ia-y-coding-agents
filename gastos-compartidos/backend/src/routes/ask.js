import { Router } from "express";
import { ask } from "../tools/loop.js";

export const askRouter = Router();

askRouter.post("/", async (req, res) => {
  const { question, history, allowWrites } = req.body ?? {};

  if (typeof question !== "string" || question.trim() === "") {
    return res.status(400).json({ error: "Missing required field: question" });
  }
  if (history !== undefined && !Array.isArray(history)) {
    return res.status(400).json({ error: "Field history must be an array" });
  }

  try {
    const { answer } = await ask(question, history ?? [], { allowWrites: allowWrites === true });
    res.json({ answer });
  } catch (err) {
    console.error(err);
    if (err.code === "NOT_CONFIGURED") {
      return res.status(503).json({ error: "Assistant is not configured" });
    }
    res.status(502).json({ error: "Failed to get an answer from the assistant" });
  }
});
