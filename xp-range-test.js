// xp-range-test.js
// Purpose: fetch XP in a date range, print total + rows to console (no UI).
// Usage (in DevTools console):
//   runXpRangeTest({ from: "2025-11-29T00:00:00Z", to: "2025-12-30T00:00:00Z" });
// Or just:
//   runXpRangeTest(); // defaults to last 30 days (UTC-ish)

//const GRAPHQL_ENDPOINT = "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql";

const XP_RANGE_QUERY = `
query GetXPRange($from: timestamptz!, $to: timestamptz!) {
  total: transaction_aggregate(
    where: {
      type: { _eq: "xp" }
      _or: [
        { path: { _nlike: "%piscine%" } }
        { object: { type: { _eq: "piscine" } } }
      ]
      createdAt: { _gte: $from, _lt: $to }
    }
  ) {
    aggregate {
      sum { amount }
      count
    }
  }

  rows: transaction(
    where: {
      type: { _eq: "xp" }
      _or: [
        { path: { _nlike: "%piscine%" } }
        { object: { type: { _eq: "piscine" } } }
      ]
      createdAt: { _gte: $from, _lt: $to }
    }
    order_by: { createdAt: asc }
  ) {
    amount
    createdAt
    path
    object { name type }
  }
}
`;

// -------- helpers --------

function getJwt() {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) throw new Error("No jwt in localStorage. Log in first.");
  return jwt;
}

async function graphqlFetch(query, variables) {
  const jwt = getJwt();

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`.trim());
  }

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);

  return json.data;
}

function formatXP(bytes) {
  const n = Number(bytes) || 0;
  const kb = n / 1000;
  if (kb < 1000) return `${Math.round(kb).toLocaleString()} KB`;
  const mb = kb / 1000;
  return `${mb.toFixed(1)} MB`;
}

function lastNDaysRangeIso(nDays) {
  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)); // tomorrow 00:00Z
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - nDays);
  return { from: from.toISOString(), to: to.toISOString() };
}

// -------- main test --------

// Signature:
//   runXpRangeTest({ from, to, preview = 10, verifyClientSum = false }) -> Promise<void>
async function runXpRangeTest(opts = {}) {
  const { from, to } = opts.from && opts.to ? opts : lastNDaysRangeIso(30);
  const preview = Number.isFinite(opts.preview) ? opts.preview : 10;
  const verifyClientSum = Boolean(opts.verifyClientSum);

  console.log("⏱️ XP Range Test");
  console.log("from:", from);
  console.log("to  :", to);

  const data = await graphqlFetch(XP_RANGE_QUERY, { from, to });

  const totalRaw = data?.total?.aggregate?.sum?.amount ?? 0;
  const count = data?.total?.aggregate?.count ?? 0;
  const rows = data?.rows ?? [];

  console.log("✅ Server total (sum.amount):", totalRaw, `(${formatXP(totalRaw)})`);
  console.log("✅ Server count:", count);
  console.log("✅ Rows returned:", rows.length);

  if (verifyClientSum) {
    const clientSum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    console.log("🔎 Client recompute (optional):", clientSum, `(${formatXP(clientSum)})`);
  }

  console.log(`\n--- First ${Math.min(preview, rows.length)} rows ---`);
  rows.slice(0, preview).forEach((r, i) => {
    const name = r.object?.name || "Unknown";
    const dt = new Date(r.createdAt).toLocaleString();
    console.log(
      `${String(i + 1).padStart(2, "0")}. ${dt} | +${formatXP(r.amount)} | ${name}`
    );
  });

  console.log("\nDone.");
}

// expose globally for DevTools
window.runXpRangeTest = runXpRangeTest;
