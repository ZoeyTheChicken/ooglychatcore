import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { createWss } from "./lib/ws-broadcast";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function cleanupExpired() {
  try {
    await pool.query(`
      DELETE FROM mutes WHERE is_permanent = false AND expires_at < NOW();
      DELETE FROM bans  WHERE is_permanent = false AND expires_at < NOW();
    `);
    logger.info("Expired mutes and bans cleaned up");
  } catch (err) {
    logger.error({ err }, "Failed to clean up expired mutes/bans");
  }
}

const server = http.createServer(app);
createWss(server);
server.listen(port, () => {
  logger.info({ port }, "Server listening");
  cleanupExpired();
  setInterval(cleanupExpired, 60 * 1000);
});
