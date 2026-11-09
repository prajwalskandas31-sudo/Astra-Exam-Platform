// Simulates a full exam sitting: N students sign in, open the same paper, autosave and submit.
//
//   BASE_URL=http://localhost:3000 LOADTEST_PASSWORD=<pw> node scripts/load-test.mjs --users 1000
//
// Options: --users N (1000)  --syncs N autosaves per student (4)  --sync-gap ms between autosaves (15000)
//          --ramp ms over which students arrive (30000)  --test <id> (loadtest-paper-1)
// Seed the accounts first with prisma/seed-loadtest.ts. Every request runs from this machine, so
// for a production-scale run use a load-testing service or several machines.

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = process.env.LOADTEST_PASSWORD;
const USERS = Number(arg("users", 1000));
const SYNCS = Number(arg("syncs", 4));
const SYNC_GAP = Number(arg("sync-gap", 15000));
const RAMP = Number(arg("ramp", 30000));
const TEST_ID = arg("test", "loadtest-paper-1");
if (!PASSWORD) {
  console.error("Set LOADTEST_PASSWORD to the password used by prisma/seed-loadtest.ts");
  process.exit(1);
}

const stats = new Map(); // step -> { ok, fail, times[], codes }
const record = (step, ms, ok, code) => {
  const s = stats.get(step) ?? { ok: 0, fail: 0, times: [], codes: {} };
  s[ok ? "ok" : "fail"]++;
  s.times.push(ms);
  if (!ok) s.codes[code] = (s.codes[code] ?? 0) + 1;
  stats.set(step, s);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Client {
  cookies = new Map();
  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  absorb(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
    }
  }
  async req(step, path, init = {}, okStatuses = [200]) {
    const started = performance.now();
    let res;
    try {
      res = await fetch(BASE + path, {
        redirect: "manual",
        ...init,
        headers: { cookie: this.cookieHeader(), ...(init.headers || {}) },
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e) {
      record(step, performance.now() - started, false, e.name === "TimeoutError" ? "timeout" : "network");
      throw e;
    }
    this.absorb(res);
    const ok = okStatuses.includes(res.status);
    const body = await res.text();
    record(step, performance.now() - started, ok, res.status);
    if (!ok) throw new Error(`${step} ${res.status} ${body.slice(0, 120)}`);
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
}

async function student(i) {
  const c = new Client();
  const email = `load${i}@astra-load.test`;
  const { csrfToken } = await c.req("csrf", "/api/auth/csrf");
  await c.req(
    "login",
    "/api/auth/callback/credentials",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, email, password: PASSWORD, json: "true" }),
    },
    [200, 302]
  );
  if (![...c.cookies.keys()].some((k) => k.includes("session-token"))) {
    record("login-session", 0, false, "no-session-cookie");
    throw new Error("login gave no session");
  }
  await c.req("session-check", "/api/auth/session-check");

  const json = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const { attemptId } = await c.req("start", "/api/attempts/start", json({ testId: TEST_ID }));
  const attempt = await c.req("load-paper", `/api/attempts/${attemptId}`);
  const questions = attempt.test.questions.map((tq) => tq.question.id);

  // Answer a few questions between autosaves, like a real student
  const answers = {};
  let cursor = 0;
  for (let s = 0; s < SYNCS; s++) {
    await sleep(SYNC_GAP * (0.75 + Math.random() * 0.5));
    const changed = [];
    for (let k = 0; k < 3 && cursor < questions.length; k++, cursor++) {
      const a = { questionId: questions[cursor], selectedOption: "ABCDE"[Math.floor(Math.random() * 5)], status: "ANSWERED", timeSpent: 20 + k };
      answers[a.questionId] = a;
      changed.push(a);
    }
    await c.req("sync", `/api/attempts/${attemptId}/sync`, { ...json({ answers: changed, timeRemaining: 10_000 }), method: "PUT" });
  }

  await c.req("submit", `/api/attempts/${attemptId}/submit`, json({ reason: "MANUAL", answers: Object.values(answers) }));
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);

async function main() {
  console.log(`Load test: ${USERS} students → ${BASE}, ${SYNCS} autosaves each, ramp ${RAMP / 1000}s`);
  const t0 = performance.now();
  let completed = 0;
  let failed = 0;
  const errors = new Map();
  await Promise.all(
    Array.from({ length: USERS }, async (_, idx) => {
      await sleep(Math.random() * RAMP);
      try {
        await student(idx + 1);
        completed++;
      } catch (e) {
        failed++;
        const key = String(e.message).slice(0, 80);
        errors.set(key, (errors.get(key) ?? 0) + 1);
      }
    })
  );
  const secs = (performance.now() - t0) / 1000;

  console.log(`\nFinished in ${secs.toFixed(1)}s — ${completed} students completed the exam, ${failed} failed\n`);
  console.log("step            requests   errors     p50      p95      p99      max");
  for (const [step, s] of stats) {
    const t = s.times.sort((a, b) => a - b);
    const f = (n) => `${Math.round(n)}ms`.padStart(8);
    console.log(`${step.padEnd(15)} ${String(s.ok + s.fail).padStart(8)} ${String(s.fail).padStart(8)} ${f(pct(t, 50))} ${f(pct(t, 95))} ${f(pct(t, 99))} ${f(t[t.length - 1] ?? 0)}${s.fail ? "  " + JSON.stringify(s.codes) : ""}`);
  }
  if (errors.size) {
    console.log("\nTop errors:");
    for (const [msg, n] of [...errors].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${n} × ${msg}`);
  }
  process.exitCode = failed ? 1 : 0;
}

main();
