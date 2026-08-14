import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scheduleRouter } from "./routes/schedule.routes.js";
import { slotsRouter } from "./routes/slots.routes.js";
import { bookingsRouter } from "./routes/bookings.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "../../../frontend");

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(frontendDir));

  app.use(scheduleRouter);
  app.use(slotsRouter);
  app.use(bookingsRouter);
  app.use(adminRouter);

  // ROUTES_INSERTION_POINT

  app.use((err, req, res, _next) => {
    if (err.statusCode && err.code) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Error interno del servidor." } });
  });

  return app;
}

export { createApp };
