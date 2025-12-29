export function formatXP(bytes) {
  const n = Number(bytes) || 0;
  const kb = n / 1000;
  if (kb < 1000) return `${Math.round(kb).toLocaleString()} KB`;
  const mb = kb / 1000;
  return `${mb.toFixed(1).toLocaleString()} MB`;
}

export function buildXPPoints(transactions) {
  let total = 0;

  const points = transactions.map((t) => {
    const inc = Number(t.amount) || 0;
    total += inc;

    return {
      date: new Date(t.createdAt),
      total,
      inc,
      name: t.object?.name || "Unknown",
    };
  });

  return { points, total };
}

export function buildXPByProject(points) {
  const map = new Map();
  for (const p of points) {
    map.set(p.name, (map.get(p.name) || 0) + p.inc);
  }
  return Array.from(map.entries())
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp);
}
