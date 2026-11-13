import { app } from "./app.js";
import { pool, rows } from "./db.js";
const port = Number(process.env.PORT || 5000);
try {
  await rows("SET time_zone = '+00:00'");
  await rows("SELECT 1 FROM app_session LIMIT 1");
  const server = app.listen(port, "127.0.0.1", () =>
    console.log(`CampusCanva API + MySQL: http://localhost:${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () =>
      server.close(async () => {
        await pool.end();
        process.exit(0);
      }),
    );
} catch (error) {
  console.error(
    "Cannot start: check MySQL and .env, then run npm run db:setup.",
    error.code || error.message,
  );
  await pool.end();
  process.exitCode = 1;
}
