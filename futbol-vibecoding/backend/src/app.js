import express from "express";
import swaggerUi from "swagger-ui-express";
import { competitionsRouter } from "./routes/competitions.js";
import { leaguesRouter } from "./routes/leagues.js";
import { matchesRouter } from "./routes/matches.js";
import { standingsRouter } from "./routes/standings.js";
import { openApiSpec } from "./openapi.js";

export const app = express();

app.use("/api/leagues", leaguesRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/standings", standingsRouter);
app.use("/api/competitions", competitionsRouter);

app.get("/api-docs.json", (req, res) => res.json(openApiSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
