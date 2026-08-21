import express from "express";
import { askRouter } from "./routes/ask.js";
import { healthRouter } from "./routes/health.js";
import { groupRouter } from "./routes/group.js";
import { expensesRouter } from "./routes/expenses.js";

export const app = express();

app.use(express.json());
app.use("/api/health", healthRouter);
app.use("/api/ask", askRouter);
app.use("/api/group", groupRouter);
app.use("/api/expenses", expensesRouter);
