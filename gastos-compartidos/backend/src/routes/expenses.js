import { Router } from "express";
import { store } from "../store.js";

export const expensesRouter = Router();

expensesRouter.get("/", (req, res) => {
  res.json({ expenses: store.listExpenses() });
});
