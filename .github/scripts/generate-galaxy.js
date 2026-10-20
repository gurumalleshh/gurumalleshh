const fs = require("node:fs");
const path = require("node:path");

const username = process.env.GITHUB_USER || "gurumalleshh";
const output = path.join("dist", "contribution-galaxy.svg");
const endpoint = `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`;

function esc(value) {
  return String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

async function main() {
  const response = await fetch(endpoint, { headers: { "User-Agent": "contribution-galaxy-generator" } });
  if (!response.ok) throw new Error(`Contribution API returned HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.contributions) || payload.contributions.length < 300) {
    throw new Error("Contribution API returned incomplete daily data.");
  }

  const days = payload.contributions.slice(-365);
  const width = 1000, height = 250, cx = width / 2, cy = height / 2;
  const max = Math.max(1, ...days.map((d) => Number(d.count) || 0));
  const stars = [];
  const nebulae = [];
  const points = [];

  days.forEach((day, i) => {
    // One orbiting point per calendar day; brighter/larger stars reflect more contributions.
    const t = i / Math.max(1, days.length - 1);
    const angle = t * Math.PI * 11 + 0.35;
    const orbit = 18 + t * 102;
    const wobble = Math.sin(i * 1.73) * 8 + Math.cos(i * 0.31) * 5;
    const x = cx + Math.cos(angle) * (orbit * 3.15 + wobble);
    const y = cy + Math.sin(angle) * (orbit * 0.83 + wobble * 0.45);
    const count = Math.max(0, Number(day.count) || 0);
    const level = count === 0 ? 0 : Math.min(1, count / max);
    const radius = count === 0 ? 1.15 : 1.6 + level * 3.5;
    const color = count === 0 ? "#263247" : level > 0.72 ? "#c4b5fd" : level > 0.4 ? "#67e8f9" : "#38bdf8";
    const opacity = count === 0 ? 0.48 : 0.72 + level * 0.28;
    points.push({ x, y });
    stars.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="${color}" opacity="${opacity.toFixed(2)}"><title>${esc(day.date)}: ${count} contribution(s)</title></circle>`);
    if (count > 0 && count >= max * 0.65) {
      nebulae.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(radius * 3.6).toFixed(2)}" fill="${color}" opacity="0.12" filter="url(#blur)"/>`);
    }
  });

  const links = points.filter((_, i) => i % 5 === 0).map((p, j, arr) => {
    const next = arr[j + 1];
    return next ? `<line x1="${p.x.toFixed(2)}" y1="${p.y.toFixed(2)}" x2="${next.x.toFixed(2)}" y2="${next.y.toFixed(2)}" stroke="#334155" stroke-width="0.7" opacity="0.28"/>` : "";
  }).join("");

  const total = days.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  const active = days.filter((d) => Number(d.count) > 0).length;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contribution Galaxy for ${esc(username)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070b16"/><stop offset="0.52" stop-color="#11132b"/><stop offset="1" stop-color="#071a2c"/></linearGradient>
    <radialGradient id="core"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".34"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="100%" height="100%" rx="18" fill="url(#bg)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="340" ry="112" fill="url(#core)"/>
  <g fill="#94a3b8" opacity=".35">${Array.from({length:85},(_,i)=>{const x=(i*127.7)%width,y=(i*53.9)%height,r=(i%3===0)?1.1:.55;return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/>`;}).join("")}</g>
  <g>${links}</g><g>${nebulae.join("")}</g><g filter="url(#glow)">${stars.join("")}</g>
  <text x="28" y="34" fill="#e2e8f0" font-family="Segoe UI,Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="2">CONTRIBUTION GALAXY</text>
  <text x="29" y="53" fill="#94a3b8" font-family="Segoe UI,Arial,sans-serif" font-size="10">@${esc(username)} · LAST 365 DAYS</text>
  <text x="972" y="32" text-anchor="end" fill="#67e8f9" font-family="Segoe UI,Arial,sans-serif" font-size="12">${total.toLocaleString()} contributions</text>
  <text x="972" y="48" text-anchor="end" fill="#a5b4fc" font-family="Segoe UI,Arial,sans-serif" font-size="10">${active} active days</text>
  <text x="28" y="229" fill="#64748b" font-family="Segoe UI,Arial,sans-serif" font-size="9">Each star represents a day · brighter stars indicate more contributions</text>
</svg>`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, svg);
  console.log(`Created ${output}: ${days.length} days, ${total} contributions, ${active} active days.`);
}
main().catch((error) => { console.error(error); process.exit(1); });
