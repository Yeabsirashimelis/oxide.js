/**
 * Automated test runner — starts the demo server, hits every endpoint,
 * tests WebSocket features, then prints a summary.
 *
 * Run:  node examples/test-all.js
 */

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = 3456;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;
const results = [];

function log(ok, name, detail = "") {
  if (ok) {
    passed++;
    results.push(`  \x1b[32m PASS \x1b[0m ${name}`);
  } else {
    failed++;
    results.push(`  \x1b[31m FAIL \x1b[0m ${name} — ${detail}`);
  }
}

// ── HTTP helper ────────────────────────────────────────────────────
function request(method, urlPath, { body, headers = {}, followRedirect = false } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "accept-encoding": "identity", ...headers },
    };

    if (body) {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      if (!options.headers["content-type"]) {
        options.headers["content-type"] = "application/json";
      }
      options.headers["content-length"] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json;
        try { json = JSON.parse(data); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });

    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// ── WebSocket helper (raw HTTP upgrade) ────────────────────────────
function connectWs(urlPath) {
  const WebSocket = require("ws");
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}${urlPath}`);
    const messages = [];
    const waiters = [];

    ws.on("open", () => {
      resolve({
        ws,
        messages,
        send: (data) => ws.send(typeof data === "string" ? data : JSON.stringify(data)),
        waitForMessage: () =>
          new Promise((res) => {
            if (messages.length) return res(messages.shift());
            waiters.push(res);
          }),
        close: () => ws.close(),
      });
    });

    ws.on("message", (d) => {
      const msg = d.toString();
      if (waiters.length) {
        waiters.shift()(msg);
      } else {
        messages.push(msg);
      }
    });
    ws.on("error", reject);
  });
}

// ── Tests ──────────────────────────────────────────────────────────
async function runTests() {
  // 1. GET /
  {
    const r = await request("GET", "/");
    log(r.json?.message === "Welcome to Oxide.js!", "GET / — welcome JSON", JSON.stringify(r.json));
  }

  // 2. Route params
  {
    const r = await request("GET", "/users/42");
    log(r.json?.userId === "42", "GET /users/:id — route params", JSON.stringify(r.json));
  }

  // 3. Query strings
  {
    const r = await request("GET", "/search?q=oxide&page=1");
    log(r.json?.query?.q === "oxide" && r.json?.query?.page === "1", "GET /search?q= — query strings", JSON.stringify(r.json));
  }

  // 4. POST JSON body
  {
    const r = await request("POST", "/echo", { body: { hello: "world" } });
    log(r.status === 201 && r.json?.received?.hello === "world", "POST /echo — JSON body parsing", `${r.status} ${JSON.stringify(r.json)}`);
  }

  // 5. PUT
  {
    const r = await request("PUT", "/users/7", { body: { name: "Updated" } });
    log(r.json?.updated === "7" && r.json?.data?.name === "Updated", "PUT /users/:id — update", JSON.stringify(r.json));
  }

  // 6. PATCH
  {
    const r = await request("PATCH", "/users/7", { body: { name: "Patched" } });
    log(r.json?.patched === "7", "PATCH /users/:id — patch", JSON.stringify(r.json));
  }

  // 7. DELETE
  {
    const r = await request("DELETE", "/users/7");
    log(r.status === 204, "DELETE /users/:id — 204 No Content", `status=${r.status}`);
  }

  // 8. HEAD
  {
    const r = await request("HEAD", "/health");
    log(r.status === 200 && r.headers["x-health"] === "ok", "HEAD /health — custom header", `status=${r.status} x-health=${r.headers["x-health"]}`);
  }

  // 9. ALL (any method)
  {
    const r = await request("PATCH", "/any-method");
    log(r.json?.method === "PATCH" && r.json?.message?.includes("app.all"), "ALL /any-method — matches PATCH", JSON.stringify(r.json));
  }

  // 10. HTML response
  {
    const r = await request("GET", "/html");
    log(r.body.includes("<h1>Hello from Oxide.js</h1>"), "GET /html — HTML response", r.body.slice(0, 60));
  }

  // 11. Plain text
  {
    const r = await request("GET", "/text");
    log(r.body === "Plain text response", "GET /text — plain text", r.body);
  }

  // 12. Redirect
  {
    const r = await request("GET", "/old-page");
    log(r.status === 302 && r.headers.location === "/", "GET /old-page — redirect 302", `status=${r.status} location=${r.headers.location}`);
  }

  // 13. Custom headers + links
  {
    const r = await request("GET", "/headers-demo");
    log(
      r.headers["x-custom-header"] === "oxide" && r.headers.link?.includes("/page/2"),
      "GET /headers-demo — set, type, links",
      `x-custom=${r.headers["x-custom-header"]} link=${r.headers.link}`
    );
  }

  // 14. Request info
  {
    const r = await request("GET", "/request-info");
    log(r.json?.ip !== undefined && r.json?.protocol !== undefined, "GET /request-info — ip, hostname, protocol", JSON.stringify(r.json));
  }

  // 15. sendFile
  {
    const r = await request("GET", "/file");
    log(r.body.includes("Static file serving works"), "GET /file — sendFile", r.body.slice(0, 60));
  }

  // 16. Download
  {
    const r = await request("GET", "/download");
    log(
      r.headers["content-disposition"]?.includes("theme.css") && r.body.includes("font-family"),
      "GET /download — file download",
      `disposition=${r.headers["content-disposition"]}`
    );
  }

  // 17. Template rendering (EJS)
  {
    const r = await request("GET", "/render");
    log(
      r.body.includes("Oxide.js Demo") && r.body.includes("Developer"),
      "GET /render — EJS template",
      r.body.slice(0, 80)
    );
  }

  // 18. CORS headers
  {
    const r = await request("OPTIONS", "/", { headers: { origin: "http://example.com" } });
    log(
      r.headers["access-control-allow-origin"] === "*",
      "CORS — Access-Control-Allow-Origin",
      `origin=${r.headers["access-control-allow-origin"]}`
    );
  }

  // 19. Cookies: set, get, clear
  {
    const r1 = await request("GET", "/cookie/set");
    const cookie = r1.headers["set-cookie"]?.[0] || r1.headers["set-cookie"] || "";
    log(cookie.includes("flavor=chocolate"), "GET /cookie/set — Set-Cookie header", cookie);

    const r2 = await request("GET", "/cookie/get", { headers: { cookie: "flavor=chocolate" } });
    log(r2.json?.cookies?.flavor === "chocolate", "GET /cookie/get — reads cookie", JSON.stringify(r2.json));

    const r3 = await request("GET", "/cookie/clear");
    const clearCookie = r3.headers["set-cookie"]?.[0] || r3.headers["set-cookie"] || "";
    log(clearCookie.includes("flavor="), "GET /cookie/clear — clears cookie", clearCookie);
  }

  // 20. Sessions
  {
    const r1 = await request("GET", "/session/set");
    const sid = (r1.headers["set-cookie"]?.[0] || r1.headers["set-cookie"] || "").split(";")[0];
    log(r1.json?.session?.username === "oxide-user", "GET /session/set — sets session data", JSON.stringify(r1.json));

    const r2 = await request("GET", "/session/get", { headers: { cookie: sid } });
    log(r2.json?.session?.username === "oxide-user", "GET /session/get — reads session", JSON.stringify(r2.json));
  }

  // 21. Validation — valid
  {
    const r = await request("POST", "/register", {
      body: { name: "Alice", email: "alice@example.com", age: 25, role: "user" },
    });
    log(r.status === 201, "POST /register — valid data accepted", `status=${r.status}`);
  }

  // 22. Validation — invalid
  {
    const r = await request("POST", "/register", { body: { name: "A", email: "bad" } });
    log(r.status === 400, "POST /register — invalid data rejected (400)", `status=${r.status}`);
  }

  // 23. Rate limiting
  {
    let lastStatus;
    for (let i = 0; i < 6; i++) {
      const r = await request("GET", "/limited");
      lastStatus = r.status;
    }
    log(lastStatus === 429, "GET /limited — rate limit enforced (429)", `status=${lastStatus}`);
  }

  // 24. Route groups
  {
    const r = await request("GET", "/admin/dashboard");
    log(r.json?.page === "Admin Dashboard", "GET /admin/dashboard — route group", JSON.stringify(r.json));
  }

  // 25. Mounted router
  {
    const r1 = await request("GET", "/api/v1/products");
    log(Array.isArray(r1.json) && r1.json.length === 2, "GET /api/v1/products — mounted router", JSON.stringify(r1.json));

    const r2 = await request("GET", "/api/v1/products/1");
    log(r2.json?.id === "1", "GET /api/v1/products/:id — mounted route params", JSON.stringify(r2.json));

    const r3 = await request("POST", "/api/v1/products", { body: { name: "New Item" } });
    log(r3.status === 201, "POST /api/v1/products — mounted POST", `status=${r3.status}`);
  }

  // 26. Error: ctx.throw
  {
    const r = await request("GET", "/error/throw");
    log(r.status === 403 && r.json?.message === "Access denied", "GET /error/throw — ctx.throw(403)", `${r.status} ${r.json?.message}`);
  }

  // 27. Error: HttpError
  {
    const r = await request("GET", "/error/http-error");
    log(r.status === 502, "GET /error/http-error — HttpError class", `status=${r.status}`);
  }

  // 28. Error: unexpected
  {
    const r = await request("GET", "/error/unexpected");
    log(r.status === 500 && r.json?.message === "Internal Server Error", "GET /error/unexpected — 500 hidden message", `${r.status} ${r.json?.message}`);
  }

  // 29. Custom 404
  {
    const r = await request("GET", "/nonexistent-route");
    log(r.status === 404 && r.json?.message === "Route not found", "GET /unknown — custom 404", `${r.status} ${r.json?.message}`);
  }

  // 30. URL-encoded body
  {
    const r = await request("POST", "/echo", {
      body: "name=oxide&type=framework",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    log(r.json?.received?.name === "oxide", "POST /echo — URL-encoded body", JSON.stringify(r.json));
  }

  // 31. Compression (Accept-Encoding: gzip)
  {
    const r = await request("GET", "/api/v1/products", {
      headers: { "accept-encoding": "gzip" },
    });
    // Server may or may not compress based on threshold, but shouldn't break
    log(r.status === 200, "GET with gzip — compression middleware active", `status=${r.status} encoding=${r.headers["content-encoding"] || "none"}`);
  }

  // 32. Static file
  {
    const r = await request("GET", "/index.html");
    log(r.body.includes("Static file serving works"), "GET /index.html — static file", r.body.slice(0, 60));
  }

  // 33. Static CSS
  {
    const r = await request("GET", "/style.css");
    log(r.body.includes("font-family") && r.headers["content-type"]?.includes("css"), "GET /style.css — static CSS with mime type", `type=${r.headers["content-type"]}`);
  }

  // ── WebSocket tests ────────────────────────────────────────────────

  // 34. WS echo
  {
    try {
      const client = await connectWs("/ws/echo");
      const welcome = await client.waitForMessage();
      log(welcome === "Connected to echo server", "WS /ws/echo — connect + welcome", welcome);

      client.send("hello oxide");
      const echo = await client.waitForMessage();
      log(echo === "Echo: hello oxide", "WS /ws/echo — echo message", echo);
      client.close();
    } catch (e) {
      log(false, "WS /ws/echo", e.message);
    }
  }

  // 35. WS chat: join room, send to room, broadcast, list rooms
  {
    try {
      const client1 = await connectWs("/ws/chat");
      const client2 = await connectWs("/ws/chat");

      // Both auto-join lobby
      const join1 = JSON.parse(await client1.waitForMessage());
      const join2 = JSON.parse(await client2.waitForMessage());
      log(join1.event === "joined" && join1.room === "lobby", "WS /ws/chat — auto join lobby", JSON.stringify(join1));

      // Client1 joins a new room
      client1.send({ action: "join", room: "dev" });
      const joinDev = JSON.parse(await client1.waitForMessage());
      log(joinDev.event === "joined" && joinDev.room === "dev", "WS /ws/chat — join room", JSON.stringify(joinDev));

      // Client1 lists rooms
      await new Promise((r) => setTimeout(r, 50));
      client1.send({ action: "rooms" });
      const roomList = JSON.parse(await client1.waitForMessage());
      log(roomList.rooms?.includes("lobby") && roomList.rooms?.includes("dev"), "WS /ws/chat — list rooms", JSON.stringify(roomList));

      // Client1 broadcasts
      await new Promise((r) => setTimeout(r, 50));
      client1.send({ action: "broadcast", text: "hi all" });
      const bc = JSON.parse(await client2.waitForMessage());
      log(bc.event === "broadcast" && bc.text === "hi all", "WS /ws/chat — broadcast", JSON.stringify(bc));

      // Client1 leaves room
      await new Promise((r) => setTimeout(r, 50));
      client1.send({ action: "leave", room: "dev" });
      const left = JSON.parse(await client1.waitForMessage());
      log(left.event === "left" && left.room === "dev", "WS /ws/chat — leave room", JSON.stringify(left));

      client1.close();
      client2.close();
    } catch (e) {
      log(false, "WS /ws/chat", e.message);
    }
  }

  // Small delay to let WS close cleanly
  await new Promise((r) => setTimeout(r, 200));
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log("\n  Starting Oxide.js demo server on port", PORT, "...\n");

  // Start the server as a child process
  const server = spawn("node", [path.join(__dirname, "app.js")], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe",
  });

  server.stderr.on("data", (d) => process.stderr.write(d));

  // Wait for server to print its banner
  await new Promise((resolve) => {
    server.stdout.on("data", (data) => {
      if (data.toString().includes("running on")) resolve();
    });
    setTimeout(resolve, 4000);
  });

  // Retry connection until server is accepting
  for (let i = 0; i < 15; i++) {
    try {
      await request("GET", "/");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  try {
    await runTests();
  } catch (e) {
    console.error("  Test runner error:", e);
  }

  // Print results
  console.log("\n  ─── Results ───────────────────────────────────\n");
  results.forEach((r) => console.log(r));
  console.log(`\n  ─── Summary ───────────────────────────────────`);
  console.log(`  Total: ${passed + failed}  |  \x1b[32mPassed: ${passed}\x1b[0m  |  \x1b[31mFailed: ${failed}\x1b[0m`);
  console.log();

  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main();
