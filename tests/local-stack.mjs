// Local stand-in for Supabase, for testing the app with no account and no Docker.
//
//   POSTGREST_BIN=/path/to/postgrest node tests/local-stack.mjs
//
// Real parts: Postgres with the real migration and security rules, and PostgREST
// (the API layer Supabase itself uses). Fake parts: login and file storage, which
// are small imitations below. Data disappears on exit. Never use it in production.
//
// .env.local for this mode:
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon-key

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";
import { startDb } from "./db/harness.ts";

const JWT_SECRET = crypto.randomBytes(32).toString("hex");
const GATEWAY_PORT = 54321;
const POSTGREST_PORT = 54322;
const DB_PORT = 54400;
const ANON_KEY = "local-anon-key";

const db = await startDb(DB_PORT);
const sql = db.client;
await sql.query(`create role authenticator login password 'postgres' noinherit;
                 grant anon, authenticated, service_role to authenticator;`);

const postgrest = spawn(process.env.POSTGREST_BIN, {
  env: {
    ...process.env,
    PGRST_DB_URI: `postgres://authenticator:postgres@127.0.0.1:${DB_PORT}/postgres`,
    PGRST_DB_SCHEMAS: "public",
    PGRST_DB_ANON_ROLE: "anon",
    PGRST_JWT_SECRET: JWT_SECRET,
    PGRST_SERVER_PORT: String(POSTGREST_PORT),
  },
  stdio: "inherit",
});

const b64 = (value) => Buffer.from(value).toString("base64url");

function signJwt(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: user.id, role: "authenticated", aud: "authenticated", email: user.email, iat: now, exp: now + 3600 };
  const body = `${b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64(JSON.stringify(payload))}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyJwt(token) {
  const [head, payload, signature] = (token ?? "").split(".");
  if (!signature) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${payload}`).digest("base64url");
  if (expected !== signature) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  return claims.exp > Date.now() / 1000 ? claims : null;
}

const hashPassword = (password, salt = crypto.randomBytes(8).toString("hex")) =>
  `${salt}:${crypto.scryptSync(password, salt, 32).toString("hex")}`;
const checkPassword = (password, stored) =>
  Boolean(stored) && hashPassword(password, stored.split(":")[0]) === stored;

const toUser = (row) => ({
  id: row.id,
  aud: "authenticated",
  role: "authenticated",
  email: row.email,
  app_metadata: {},
  user_metadata: row.raw_user_meta_data ?? {},
  created_at: new Date().toISOString(),
});

const refreshTokens = new Map();

function session(row) {
  const refresh_token = crypto.randomBytes(16).toString("hex");
  refreshTokens.set(refresh_token, row.id);
  return {
    access_token: signJwt(row),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token,
    user: toUser(row),
  };
}

const findUser = async (column, value) =>
  (await sql.query(`select * from auth.users where ${column} = $1`, [value])).rows[0];

const bearer = (req) => (req.headers.authorization ?? "").replace(/^Bearer /i, "");

async function handleAuth(req, res, path, query, body, json) {
  const input = body.length ? JSON.parse(body.toString()) : {};

  if (path === "/signup" && req.method === "POST") {
    if (await findUser("email", input.email)) {
      return json(422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
    }
    const { rows } = await sql.query(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, $2, $3) returning *`,
      [input.email, hashPassword(input.password), input.data ?? {}],
    );
    return json(200, session(rows[0]));
  }

  if (path === "/token" && req.method === "POST") {
    const grant = query.get("grant_type");
    if (grant === "password") {
      const row = await findUser("email", input.email);
      if (!row || !checkPassword(input.password, row.encrypted_password)) {
        return json(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      return json(200, session(row));
    }
    if (grant === "refresh_token") {
      const id = refreshTokens.get(input.refresh_token);
      const row = id && (await findUser("id", id));
      if (!row) return json(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      return json(200, session(row));
    }
  }

  const claims = verifyJwt(bearer(req));

  if (path === "/user") {
    const row = claims && (await findUser("id", claims.sub));
    if (!row) return json(403, { code: 403, error_code: "user_not_found", msg: "User not found" });
    if (req.method === "PUT" && input.password) {
      await sql.query(`update auth.users set encrypted_password = $2 where id = $1`, [row.id, hashPassword(input.password)]);
    }
    return json(200, toUser(row));
  }

  if (path === "/logout") return json(204);
  if (path === "/recover") return json(200, {});
  return json(404, { msg: `Not implemented in local stack: ${path}` });
}

const files = new Map(); // "bucket/path" -> { body, type }

/** Runs a storage.objects statement as the caller, so the real RLS policies apply. */
async function asUser(claims, statement, params) {
  await sql.query("begin");
  try {
    await sql.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await sql.query("set local role authenticated");
    const result = await sql.query(statement, params);
    await sql.query("commit");
    return result;
  } catch (error) {
    await sql.query("rollback");
    throw error;
  }
}

async function handleStorage(req, res, path, body, json) {
  const publicMatch = path.match(/^\/object\/public\/(.+)$/);
  if (publicMatch && req.method === "GET") {
    const file = files.get(publicMatch[1]);
    if (!file) return json(404, { message: "Not found" });
    res.writeHead(200, { "content-type": file.type, "cache-control": "public, max-age=3600" });
    return res.end(file.body);
  }

  const claims = verifyJwt(bearer(req));
  if (!claims) return json(401, { message: "Unauthorized" });

  const listMatch = path.match(/^\/object\/list\/([^/]+)$/);
  if (listMatch && req.method === "POST") {
    const { prefix } = JSON.parse(body.toString());
    const { rows } = await asUser(
      claims,
      `select name from storage.objects where bucket_id = $1 and name like $2`,
      [listMatch[1], `${prefix}/%`],
    );
    return json(200, rows.map((row) => ({ name: row.name.split("/").pop() })));
  }

  const objectMatch = path.match(/^\/object\/([^/]+)(?:\/(.+))?$/);
  if (objectMatch && req.method === "DELETE") {
    const { prefixes } = JSON.parse(body.toString());
    for (const name of prefixes) {
      await asUser(claims, `delete from storage.objects where bucket_id = $1 and name = $2`, [objectMatch[1], name]);
      files.delete(`${objectMatch[1]}/${name}`);
    }
    return json(200, []);
  }

  if (objectMatch?.[2] && req.method === "POST") {
    const [, bucket, name] = objectMatch;
    try {
      await asUser(claims, `insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, name]);
    } catch (error) {
      return json(403, { statusCode: "403", error: "Unauthorized", message: error.message });
    }
    // The real client sends multipart form data; keep the file bytes intact.
    const type = req.headers["content-type"] ?? "application/octet-stream";
    let content = body;
    let contentType = type;
    if (type.startsWith("multipart/form-data")) {
      const boundary = Buffer.from(`--${type.split("boundary=")[1]}`);
      const parts = [];
      let start = body.indexOf(boundary);
      while (start !== -1) {
        const next = body.indexOf(boundary, start + boundary.length);
        if (next === -1) break;
        parts.push(body.subarray(start + boundary.length + 2, next - 2));
        start = next;
      }
      const filePart = parts.find((part) => part.includes("filename=")) ?? parts.at(-1);
      const split = filePart.indexOf("\r\n\r\n");
      contentType = filePart.subarray(0, split).toString().match(/content-type: (.+)/i)?.[1]?.trim() ?? "image/webp";
      content = filePart.subarray(split + 4);
    }
    files.set(`${bucket}/${name}`, { body: content, type: contentType });
    return json(200, { Key: `${bucket}/${name}`, Id: crypto.randomUUID() });
  }

  return json(404, { message: `Not implemented in local stack: ${path}` });
}

function proxyToPostgrest(req, res, path, search, body) {
  const headers = { ...req.headers, host: `127.0.0.1:${POSTGREST_PORT}` };
  delete headers.apikey;
  // The anon key isn't a JWT here; PostgREST treats no token as the anon role.
  if (bearer(req) === ANON_KEY || !headers.authorization) delete headers.authorization;

  const upstream = http.request(
    { host: "127.0.0.1", port: POSTGREST_PORT, path: `${path}${search}`, method: req.method, headers },
    (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    },
  );
  upstream.on("error", (error) => {
    res.writeHead(502);
    res.end(error.message);
  });
  upstream.end(body);
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "*",
};

const gateway = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    Object.entries(CORS).forEach(([key, value]) => res.setHeader(key, value));
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, "http://local");
    const body = Buffer.concat(chunks);
    const json = (status, payload) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(payload === undefined ? undefined : JSON.stringify(payload));
    };

    try {
      if (url.pathname.startsWith("/rest/v1")) {
        return proxyToPostgrest(req, res, url.pathname.slice(8) || "/", url.search, body);
      }
      if (url.pathname.startsWith("/auth/v1")) {
        return await handleAuth(req, res, url.pathname.slice(8), url.searchParams, body, json);
      }
      if (url.pathname.startsWith("/storage/v1")) {
        return await handleStorage(req, res, url.pathname.slice(11), body, json);
      }
      json(404, { message: "Unknown route" });
    } catch (error) {
      console.error(error);
      json(500, { message: String(error) });
    }
  });
});

gateway.listen(GATEWAY_PORT, "127.0.0.1", () => {
  console.log(`Local stack ready on http://127.0.0.1:${GATEWAY_PORT}`);
});

async function shutdown() {
  postgrest.kill();
  gateway.close();
  await db.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
