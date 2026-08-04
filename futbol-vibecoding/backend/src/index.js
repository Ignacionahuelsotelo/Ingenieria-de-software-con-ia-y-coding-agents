import { existsSync } from "node:fs";

if (existsSync(new URL("../.env", import.meta.url))) {
  process.loadEnvFile(new URL("../.env", import.meta.url));
}

const { app } = await import("./app.js");

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
