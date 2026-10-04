import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { compare } from "bcryptjs";

let credentialCheck = false;
let changed = false;
let next;
function shutdown() {
  next?.kill();
  server.closeAllConnections();
  server.close(() => process.exit(0));
}
const game = {
  id: "1",
  app_id: "1245620",
  name: "ELDEN RING",
  genre: ["RPG"],
  categories: [],
  publishers: [],
  release_date: "2022-02-24",
  image: "/steam/1245620-header.jpg",
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3501");
  response.setHeader("Content-Type", "application/json");
  if (url.pathname === "/health") {
    try {
      await fetch("http://localhost:3001/admin", {
        signal: AbortSignal.timeout(1000),
      });
    } catch {
      response.statusCode = 503;
    }
    response.end("{}");
    return;
  }
  if (url.pathname === "/shutdown") {
    response.end("{}");
    setImmediate(shutdown);
    return;
  }
  if (url.pathname === "/checks") {
    response.end(JSON.stringify({ credentialCheck, changed }));
    return;
  }
  if (
    request.headers.apikey !== "test-service-role" ||
    request.headers.authorization !== "Bearer test-service-role"
  ) {
    response.statusCode = 401;
    response.end("{}");
    return;
  }
  if (url.pathname === "/rest/v1/rpc/admin_apply_change") {
    let content = "";
    for await (const chunk of request) content += chunk;
    const body = JSON.parse(content);
    if (body.p_entity === "users") {
      credentialCheck =
        Boolean(body.p_data.password_hash?.startsWith("$2b$12$")) &&
        (await compare("test-user-password-123", body.p_data.password_hash)) &&
        !("password" in body.p_data);
      response.end(JSON.stringify({ user_id: "1", email: body.p_data.email }));
      return;
    }
    changed = true;
    Object.assign(game, body.p_data);
    response.end(JSON.stringify(game));
    return;
  }
  const table = url.pathname.split("/").at(-1);
  const rows = table === "game_lists" ? [game] : [];
  response.setHeader(
    "Content-Range",
    `${rows.length ? "0-0" : "*"}/${rows.length}`,
  );
  response.end(request.method === "HEAD" ? "" : JSON.stringify(rows));
});
server.listen(3501, "127.0.0.1", () => {
  next = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "0.0.0.0",
      "--port",
      "3001",
    ],
    { stdio: "inherit", windowsHide: true },
  );
  next.on("error", (error) => {
    console.error(error.message);
    shutdown();
  });
});
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
