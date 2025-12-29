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

const xpSvg = document.getElementById("xp-graph");

const userXpSpan = document.getElementById("user-xp");

const xpByProjectSvg = document.getElementById("xp-by-project");



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
  showPage("login");
  setLoginError("");
  console.log("Logged out successfully.");
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
// Render profile + graph
// =====================
function renderProfile(user) {
  userNameSpan.textContent = user.login ?? "";
  userIdSpan.textContent = user.id ?? "";
  userEmailSpan.textContent = user.email ?? "";
}

function formatXP(bytes) {
  const n = Number(bytes) || 0;

  // show in KB/MB like humans expect (decimal, not kibibytes)
  const kb = n / 1000;
  if (kb < 1000) return `${Math.round(kb).toLocaleString()} KB`;
  const mb = kb / 1000;
  return `${mb.toFixed(1).toLocaleString()} MB`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildXPPoints(transactions) {
  let total = 0;

  const points = transactions.map((t) => {
    const inc = Number(t.amount) || 0;
    total += inc;

    return {
      date: new Date(t.createdAt),
      total, // cumulative total after this tx
      inc,
      name: t.object?.name || "Unknown",
    };
  });

  return { points, total };
}


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

  const xAxis = mkLine(padding, height - padding, width - padding, height - padding);
  xAxis.setAttribute("stroke", "#333");
  xAxis.setAttribute("stroke-width", "2");
  xpSvg.appendChild(xAxis);

  const yAxis = mkLine(padding, padding, padding, height - padding);
  yAxis.setAttribute("stroke", "#333");
  yAxis.setAttribute("stroke-width", "2");
  xpSvg.appendChild(yAxis);

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

  const xTitle = mkText(width / 2, height - 12, "Time", "middle");
  xTitle.setAttribute("fill", "#111");
  xpSvg.appendChild(xTitle);

  const yTitle = mkText(18, height / 2, "Total XP", "middle");
  yTitle.setAttribute("fill", "#111");
  yTitle.setAttribute("transform", `rotate(-90 18 ${height / 2})`);
  xpSvg.appendChild(yTitle);

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

  console.log(`✅ Graph drawn: ${points.length} points, max=${formatXP(maxXP)}`);
}


async function initProfilePage() {
  const user = await fetchProfile();
  renderProfile(user);

  const tx = await fetchXPTransactions();

  const { points, total } = buildXPPoints(tx);
  if (userXpSpan) userXpSpan.textContent = formatXP(total);

  drawXPGraph(points);
  drawXPByProjectGraph(points);

}


// =====================
// Auth: login/logout
// =====================
function base64Utf8(str) {
  // btoa fails on non-ascii; this makes it safe.
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

  // Zone01 sometimes returns JSON string, sometimes an object.
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await res.json();
    if (typeof body === "string") return body;
    if (body?.jwt) return body.jwt;
    if (body?.token) return body.token;
    // last resort
    return JSON.stringify(body);
  }

  // non-json
  return await res.text();
}

// events
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const identifier = loginForm.identifier.value;
  const password = loginForm.password.value;

  try {
    setLoginError("");

    const jwt = await signin(identifier, password);
    localStorage.setItem("jwt", jwt);

    console.log("Login successful! JWT stored.");
    showPage("profile");
    await initProfilePage();
  } catch (err) {
    console.error("Login failed:", err);
    setLoginError(err.message || "Login failed.");
    logout(); // ensures we don't keep a broken token
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
    console.log("User already logged in. Showing profile page.");
  } catch (err) {
    console.error("Session invalid, logging out:", err);
    logout();
  }
}

checkLoginStatus();

// (optional) debug helper
window.testMyXP = async function testMyXP() {
  const tx = await fetchXPTransactions();
  const { total } = buildXPPoints(tx);
  console.log("✅ Calculated Total XP:", total);
  return total;
};

function buildXPByProject(points) {
  const map = new Map(); // name -> total earned on that project

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

  const data = buildXPByProject(points).slice(0, 12); // top 12
  if (data.length === 0) return;

  const W = 900, H = 420, P = 60;
  xpByProjectSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const maxXP = Math.max(1, ...data.map(d => d.xp));
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
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barW);
    rect.setAttribute("height", h);
    rect.setAttribute("fill", "#4A90E2");

    const title = document.createElementNS(ns, "title");
    title.textContent = `${d.name}\n${formatXP(d.xp)}`;
    rect.appendChild(title);

    xpByProjectSvg.appendChild(rect);

    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", x + barW / 2);
    label.setAttribute("y", H - P + 18);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "10");
    label.textContent = d.name.length > 10 ? d.name.slice(0, 10) + "…" : d.name;
    xpByProjectSvg.appendChild(label);
  });
}

