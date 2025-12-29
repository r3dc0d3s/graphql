// script.js

// =====================
// DOM
// =====================
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginPage = document.getElementById("login-page");
const profilePage = document.getElementById("profile-page");
const logoutButton = document.getElementById("logout-button");

const userNameSpan = document.getElementById("user-name");
const userIdSpan = document.getElementById("user-id");
const userEmailSpan = document.getElementById("user-email");

const userXpSpan = document.getElementById("user-xp");
const userXpRawSpan = document.getElementById("user-xp-raw");

const xpSvg = document.getElementById("xp-graph");
const xpByProjectSvg = document.getElementById("xp-by-project");

const tabsNav = document.querySelector(".tabs");

const msFirstSpan = document.getElementById("ms-first");
const msLastSpan = document.getElementById("ms-last");
const msProjectsSpan = document.getElementById("ms-projects");
const msBestSpan = document.getElementById("ms-best");

// =====================
// Config
// =====================
const GRAPHQL_ENDPOINT = "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql";
const SIGNIN_ENDPOINT = "https://learn.zone01oujda.ma/api/auth/signin";

// =====================
// GraphQL Queries
// =====================
const profileQuery = `
query GetProfile {
  user {
    id
    login
    email
  }
}
`;

const xpQueryForGraph = `
query GetAccurateXP {
  transaction(
    where: {
      type: { _eq: "xp" }
      _or: [
        { path: { _nlike: "%piscine%" } }
        { object: { type: { _eq: "piscine" } } }
      ]
    }
    order_by: { createdAt: asc }
  ) {
    amount
    createdAt
    object { name }
  }
}
`;

// =====================
// UI helpers
// =====================
function showPage(page) {
  if (page === "profile") {
    loginPage.style.display = "none";
    profilePage.style.display = "block";
  } else {
    loginPage.style.display = "block";
    profilePage.style.display = "none";
  }
}

function setLoginError(msg) {
  loginError.textContent = msg || "";
}

function logout() {
  localStorage.removeItem("jwt");
  setLoginError("");
  showPage("login");
   setLoginError("");

  // clear UI remnants
  if (xpSvg) xpSvg.innerHTML = "";
  if (xpByProjectSvg) xpByProjectSvg.innerHTML = "";
}

function showPanel(panelId) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));

  document.querySelectorAll(".tab").forEach((b) => {
    const active = b.dataset.panel === panelId;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add("is-active");
}

if (tabsNav) {
  tabsNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    showPanel(btn.dataset.panel);
  });
}

// =====================
// Networking helpers
// =====================
async function graphqlFetch(query, variables) {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) throw new Error("Not logged in (missing jwt).");

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${msg}`.trim());
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data;
}

async function fetchProfile() {
  const data = await graphqlFetch(profileQuery);
  const user = data?.user?.[0];
  if (!user) throw new Error("Profile query returned no user.");
  return user;
}

async function fetchXPTransactions() {
  const data = await graphqlFetch(xpQueryForGraph);
  return data?.transaction ?? [];
}

// =====================
// Render: profile + derived data
// =====================
function renderProfile(user) {
  userNameSpan.textContent = user.login ?? "";
  userIdSpan.textContent = user.id ?? "";
  userEmailSpan.textContent = user.email ?? "";
}

// XP amounts are typically “bytes-like”; format for humans, but also show raw.
function formatXP(bytes) {
  const n = Number(bytes) || 0;
  const kb = n / 1000;
  if (kb < 1000) return `${Math.round(kb).toLocaleString()} KB`;
  const mb = kb / 1000;
  return `${mb.toFixed(1).toLocaleString()} MB`;
}

function buildXPPoints(transactions) {
  let total = 0;

  const points = transactions.map((t) => {
    const inc = Number(t.amount) || 0;
    total += inc;

    return {
      date: new Date(t.createdAt),
      total, // cumulative
      inc,   // increment
      name: t.object?.name || "Unknown",
    };
  });

  return { points, total };
}

function renderMilestones(points) {
  if (!points || points.length === 0) {
    msFirstSpan.textContent = "-";
    msLastSpan.textContent = "-";
    msProjectsSpan.textContent = "0";
    msBestSpan.textContent = "-";
    return;
  }

  const first = points[0].date;
  const last = points[points.length - 1].date;

  const projectSet = new Set(points.map((p) => p.name));
  let best = 0;
  for (const p of points) {
    if (p.inc > best) best = p.inc;
  }

  msFirstSpan.textContent = first.toLocaleDateString();
  msLastSpan.textContent = last.toLocaleDateString();
  msProjectsSpan.textContent = projectSet.size.toLocaleString();
  msBestSpan.textContent = formatXP(best);
}

// =====================
// Graph 1: XP over time (points already cumulative)
// =====================
function drawXPGraph(points) {
  if (!xpSvg) return;
  xpSvg.innerHTML = "";

  if (!points || points.length === 0) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", "20");
    t.setAttribute("y", "30");
    t.textContent = "No XP data";
    xpSvg.appendChild(t);
    return;
  }

  const width = 900;
  const height = 420;
  const padding = 60;

  xpSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const minTime = points[0].date.getTime();
  const maxTime = points[points.length - 1].date.getTime();
  const dateRange = Math.max(1, maxTime - minTime);

  const maxXP = Math.max(1, points[points.length - 1].total);

  const xScale = (d) => {
    const time = d.getTime();
    const ratio = (time - minTime) / dateRange;
    return padding + ratio * (width - 2 * padding);
  };

  const yScale = (xp) => {
    const ratio = xp / maxXP;
    return height - padding - ratio * (height - 2 * padding);
  };

  const mkLine = (x1, y1, x2, y2) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    el.setAttribute("x1", String(x1));
    el.setAttribute("y1", String(y1));
    el.setAttribute("x2", String(x2));
    el.setAttribute("y2", String(y2));
    return el;
  };

  const mkText = (x, y, text, anchor) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
    if (anchor) el.setAttribute("text-anchor", anchor);
    el.setAttribute("font-size", "12");
    el.textContent = text;
    return el;
  };

  // axes
  const xAxis = mkLine(padding, height - padding, width - padding, height - padding);
  xAxis.setAttribute("stroke", "#333");
  xAxis.setAttribute("stroke-width", "2");
  xpSvg.appendChild(xAxis);

  const yAxis = mkLine(padding, padding, padding, height - padding);
  yAxis.setAttribute("stroke", "#333");
  yAxis.setAttribute("stroke-width", "2");
  xpSvg.appendChild(yAxis);

  // y ticks + grid
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const ratio = i / yTicks;
    const xpVal = (1 - ratio) * maxXP;
    const y = padding + ratio * (height - 2 * padding);

    const grid = mkLine(padding, y, width - padding, y);
    grid.setAttribute("stroke", "#e6e6e6");
    grid.setAttribute("stroke-width", "1");
    xpSvg.appendChild(grid);

    const tick = mkLine(padding - 6, y, padding, y);
    tick.setAttribute("stroke", "#333");
    tick.setAttribute("stroke-width", "1");
    xpSvg.appendChild(tick);

    const label = mkText(padding - 10, y + 4, formatXP(xpVal), "end");
    label.setAttribute("fill", "#444");
    xpSvg.appendChild(label);
  }

  // x ticks
  const xTicks = 5;
  const dtf = new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" });
  for (let i = 0; i <= xTicks; i++) {
    const ratio = i / xTicks;
    const time = minTime + ratio * dateRange;
    const x = padding + ratio * (width - 2 * padding);

    const tick = mkLine(x, height - padding, x, height - padding + 6);
    tick.setAttribute("stroke", "#333");
    tick.setAttribute("stroke-width", "1");
    xpSvg.appendChild(tick);

    const label = mkText(x, height - padding + 22, dtf.format(new Date(time)), "middle");
    label.setAttribute("fill", "#444");
    xpSvg.appendChild(label);
  }

  // titles
  const xTitle = mkText(width / 2, height - 12, "Time", "middle");
  xTitle.setAttribute("fill", "#111");
  xpSvg.appendChild(xTitle);

  const yTitle = mkText(18, height / 2, "Total XP", "middle");
  yTitle.setAttribute("fill", "#111");
  yTitle.setAttribute("transform", `rotate(-90 18 ${height / 2})`);
  xpSvg.appendChild(yTitle);

  // path
  const d = points
    .map((p, i) => {
      const x = xScale(p.date);
      const y = yScale(p.total);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#4A90E2");
  path.setAttribute("stroke-width", "2.5");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  xpSvg.appendChild(path);

  // points
  points.forEach((p) => {
    const cx = xScale(p.date);
    const cy = yScale(p.total);

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", String(cx));
    c.setAttribute("cy", String(cy));
    c.setAttribute("r", "3.5");
    c.setAttribute("fill", "#7B68EE");

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent =
      `${p.date.toLocaleDateString()}\n` +
      `${p.name}\n` +
      `+${formatXP(p.inc)} → ${formatXP(p.total)} total`;
    c.appendChild(title);

    xpSvg.appendChild(c);
  });
}

// =====================
// Graph 2: XP by project
// =====================
function buildXPByProject(points) {
  const map = new Map(); // name -> sum of increments
  for (const p of points) {
    map.set(p.name, (map.get(p.name) || 0) + p.inc);
  }
  return Array.from(map.entries())
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp);
}

function drawXPByProjectGraph(points) {
  if (!xpByProjectSvg) return;
  xpByProjectSvg.innerHTML = "";

  const data = buildXPByProject(points).slice(0, 12);
  if (!data.length) return;

  const W = 900, H = 420, P = 60;
  xpByProjectSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const maxXP = Math.max(1, ...data.map((d) => d.xp));
  const chartW = W - 2 * P;
  const chartH = H - 2 * P;

  const gap = 10;
  const barW = (chartW - gap * (data.length - 1)) / data.length;

  const ns = "http://www.w3.org/2000/svg";

  const xAxis = document.createElementNS(ns, "line");
  xAxis.setAttribute("x1", P);
  xAxis.setAttribute("y1", H - P);
  xAxis.setAttribute("x2", W - P);
  xAxis.setAttribute("y2", H - P);
  xAxis.setAttribute("stroke", "#333");
  xAxis.setAttribute("stroke-width", "2");
  xpByProjectSvg.appendChild(xAxis);

  const yAxis = document.createElementNS(ns, "line");
  yAxis.setAttribute("x1", P);
  yAxis.setAttribute("y1", P);
  yAxis.setAttribute("x2", P);
  yAxis.setAttribute("y2", H - P);
  yAxis.setAttribute("stroke", "#333");
  yAxis.setAttribute("stroke-width", "2");
  xpByProjectSvg.appendChild(yAxis);

  data.forEach((d, i) => {
    const x = P + i * (barW + gap);
    const h = (d.xp / maxXP) * chartH;
    const y = (H - P) - h;

    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(barW));
    rect.setAttribute("height", String(h));
    rect.setAttribute("fill", "#4A90E2");

    const title = document.createElementNS(ns, "title");
    title.textContent = `${d.name}\n${formatXP(d.xp)}`;
    rect.appendChild(title);

    xpByProjectSvg.appendChild(rect);

    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", String(x + barW / 2));
    label.setAttribute("y", String(H - P + 18));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "10");
    label.setAttribute("fill", "#444");
    label.textContent = d.name.length > 10 ? d.name.slice(0, 10) + "…" : d.name;
    xpByProjectSvg.appendChild(label);
  });
}

// =====================
// Init page
// =====================
async function initProfilePage() {
  const user = await fetchProfile();
  renderProfile(user);

  const tx = await fetchXPTransactions();
  const { points, total } = buildXPPoints(tx);

  // XP UI (no duplication)
  if (userXpSpan) userXpSpan.textContent = formatXP(total);
  if (userXpRawSpan) userXpRawSpan.textContent = `(${total.toLocaleString()})`;

  // Milestones (same points)
  renderMilestones(points);

  // Graphs (same points)
  drawXPGraph(points);
  drawXPByProjectGraph(points);

  // default panel
  showPanel("panel-profile");
}

// =====================
// Auth
// =====================
function base64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function signin(identifier, password) {
  const encoded = base64Utf8(`${identifier}:${password}`);

  const res = await fetch(SIGNIN_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Basic ${encoded}` },
  });

  if (!res.ok) {
    let msg = `Login failed (HTTP ${res.status})`;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const errJson = await res.json().catch(() => null);
      msg = errJson?.error || errJson?.message || msg;
    } else {
      const errText = await res.text().catch(() => "");
      if (errText) msg = errText;
    }
    throw new Error(msg);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await res.json();
    if (typeof body === "string") return body;
    if (body?.jwt) return body.jwt;
    if (body?.token) return body.token;
    return JSON.stringify(body);
  }

  return await res.text();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const identifier = loginForm.identifier.value;
  const password = loginForm.password.value;

  try {
    setLoginError("");

    const jwt = await signin(identifier, password);
    localStorage.setItem("jwt", jwt);

    showPage("profile");
    await initProfilePage();
  } catch (err) {
    setLoginError(err.message || "Login failed.");
    logout();
  }
});

logoutButton.addEventListener("click", logout);

// =====================
// Initial load
// =====================
async function checkLoginStatus() {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) {
    showPage("login");
    return;
  }

  showPage("profile");
  try {
    await initProfilePage();
  } catch (err) {
    logout();
  }
}

checkLoginStatus();

// Optional debug helper (still no duplication: reuse buildXPPoints)
window.testMyXP = async function testMyXP() {
  const tx = await fetchXPTransactions();
  const { total } = buildXPPoints(tx);
  console.log("✅ Calculated Total XP:", total);
  return total;
};
