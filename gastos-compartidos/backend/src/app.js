import express from "express";
import { askRouter } from "./routes/ask.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.use(express.json());
app.use("/api/health", healthRouter);
app.use("/api/ask", askRouter);
