import {
  userNameSpan,
  userIdSpan,
  userEmailSpan,
  xpSvg,
  xpByProjectSvg,
  msFirstSpan,
  msLastSpan,
  msProjectsSpan,
  msBestSpan,
} from "./dom.js";
import { buildXPByProject, formatXP } from "./data.js";

export function renderProfile(user) {
  userNameSpan.textContent = user.login ?? "";
  userIdSpan.textContent = user.id ?? "";
  userEmailSpan.textContent = user.email ?? "";
}

export function renderMilestones(points) {
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

export function drawXPGraph(points) {
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
}

export function drawXPByProjectGraph(points) {
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
