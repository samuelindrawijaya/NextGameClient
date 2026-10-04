import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { compare } from "bcryptjs";

let credentialCheck = false;
let changed = false;
const admins = [];
const libraries = [];
const users = [
  {
    user_id: "1",
    email: "user@example.test",
    access_role_code: 1,
    access_role_name: "user",
    is_verified: false,
    free_claim_game: 0,
  },
];
const invoices = [
  {
    id: "1",
    invoice_number: "INV-MANUAL",
    user_id: "1",
    game_id: "1",
    is_processed: false,
    is_invoice_used: false,
  },
];
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
  if (url.pathname === "/rest/v1/rpc/admin_manage_account") {
    let content = "";
    for await (const chunk of request) content += chunk;
    const body = JSON.parse(content);
    let row;
    if (body.p_action === "INSERT") {
      row = {
        id: String(admins.length + 1),
        ...body.p_data,
        is_active: body.p_data.is_active ?? true,
        session_version: "1",
        created_by_email: body.p_operator,
        created_at: new Date().toISOString(),
      };
      admins.unshift(row);
    } else {
      row = admins.find((row) => row.id === body.p_id);
      Object.assign(row, body.p_data, {
        session_version: String(Number(row.session_version) + 1),
      });
    }
    const { password_hash, session_version, ...safe } = row;
    void password_hash;
    void session_version;
    response.end(JSON.stringify(safe));
    return;
  }
  if (url.pathname === "/rest/v1/rpc/admin_apply_change") {
    let content = "";
    for await (const chunk of request) content += chunk;
    const body = JSON.parse(content);
    if (body.p_entity === "libraries") {
      if (body.p_data.app_id_buy !== game.app_id) {
        response.statusCode = 400;
        response.end(JSON.stringify({ code: "PGA01" }));
        return;
      }
      const row = { id: String(libraries.length + 1), ...body.p_data };
      libraries.push(row);
      response.end(JSON.stringify(row));
      return;
    }
    if (body.p_entity === "transactions") {
      Object.assign(invoices[0], body.p_data);
      response.end(JSON.stringify(invoices[0]));
      return;
    }
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
  if (url.pathname === "/rest/v1/rpc/admin_library_games") {
    let content = "";
    for await (const chunk of request) content += chunk;
    const body = JSON.parse(content);
    const q = body.p_query;
    response.end(
      JSON.stringify(
        !q ||
          q === game.app_id ||
          game.name.toLowerCase().includes(q.toLowerCase())
          ? [game]
          : [],
      ),
    );
    return;
  }
  const table = url.pathname.split("/").at(-1);
  if (table === "game_lists" && url.searchParams.has("or")) {
    response.statusCode = 500;
    response.end(JSON.stringify({ code: "57014" }));
    return;
  }
  let rows =
    table === "game_lists"
      ? [game]
      : table === "admin_accounts"
        ? admins
        : table === "user"
          ? users
          : table === "user_list_game"
            ? libraries
            : table === "history_purchase"
              ? invoices
              : [];
  if (table === "game_lists") {
    const appId = url.searchParams.get("app_id");
    if (appId?.startsWith("eq."))
      rows = rows.filter((row) => row.app_id === appId.slice(3));
    const name = url.searchParams.get("name");
    if (name?.startsWith("ilike.*"))
      rows = rows.filter((row) =>
        row.name.toLowerCase().includes(name.slice(7, -1).toLowerCase()),
      );
    if (name === "ilike.*timeout*") {
      response.statusCode = 500;
      response.end(JSON.stringify({ code: "57014" }));
      return;
    }
  }
  if (table === "admin_accounts") {
    for (const field of ["email", "id"]) {
      const value = url.searchParams.get(field);
      if (value?.startsWith("eq."))
        rows = rows.filter((row) => row[field] === value.slice(3));
    }
    if (!url.searchParams.get("select")?.includes("password_hash"))
      rows = rows.map(({ password_hash, session_version, ...row }) => {
        void password_hash;
        void session_version;
        return row;
      });
  }
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
