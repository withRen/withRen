// Generates assets/stats.svg from the GitHub contribution calendar.
import { writeFileSync } from "node:fs";

const USER = process.env.GH_USER || "withRen";
const TOKEN = process.env.GITHUB_TOKEN;

const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: USER } }),
});
const json = await res.json();
if (!json.data?.user) throw new Error(JSON.stringify(json));
const cal = json.data.user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap(w => w.contributionDays);

// streaks (today without contributions does not break the current streak)
let longest = 0, run = 0;
for (const d of days) { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); }
let current = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount) current++;
  else if (i === days.length - 1) continue;
  else break;
}

const W = 840, H = 360, mono = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const last = days.slice(-30);
const max = Math.max(4, ...last.map(d => d.contributionCount));
const cx = 48, cy = 150, cw = W - cx - 32, ch = 160;
const pts = last.map((d, i) => [cx + (i * cw) / (last.length - 1), cy + ch - (d.contributionCount / max) * ch]);
const line = pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
const area = `${cx},${cy + ch} ${line} ${cx + cw},${cy + ch}`;
const fmt = s => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

const tile = (x, label, value) => `
  <text x="${x}" y="58" class="n">${value}</text>
  <text x="${x}" y="82" class="l">${label}</text>`;

const grid = [0, 0.5, 1].map(f => {
  const y = cy + ch - f * ch;
  return `<line x1="${cx}" y1="${y}" x2="${cx + cw}" y2="${y}" stroke="#21262d"/><text x="${cx - 10}" y="${y + 4}" class="a" text-anchor="end">${Math.round(f * max)}</text>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
.n{font:700 26px ${mono};fill:#fff}
.l{font:400 11px ${mono};fill:#8b949e;letter-spacing:2px}
.t{font:700 13px ${mono};fill:#fff;letter-spacing:3px}
.a{font:400 10px ${mono};fill:#8b949e}
.ln{stroke-dasharray:3000;stroke-dashoffset:3000;animation:draw 1.6s ease-out forwards}
.ar{opacity:0;animation:fade .8s 1s forwards}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes fade{to{opacity:1}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8" fill="#0d1117" stroke="#30363d"/>
${tile(32, "CONTRIBUTIONS / YEAR", cal.totalContributions)}
${tile(312, "CURRENT STREAK", current + (current === 1 ? " day" : " days"))}
${tile(592, "LONGEST STREAK", longest + (longest === 1 ? " day" : " days"))}
<line x1="32" y1="104" x2="${W - 32}" y2="104" stroke="#21262d"/>
<rect x="32" y="122" width="8" height="8" fill="#fff"/><text x="50" y="132" class="t">LAST 30 DAYS</text>
${grid}
<polygon points="${area}" fill="#ffffff" fill-opacity="0.08" class="ar"/>
<polyline points="${line}" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" class="ln"/>
${pts.map(([x, y]) => `<rect x="${(x - 2.5).toFixed(1)}" y="${(y - 2.5).toFixed(1)}" width="5" height="5" fill="#fff" class="ar"/>`).join("")}
<text x="${cx}" y="${cy + ch + 22}" class="a">${fmt(last[0].date)}</text>
<text x="${cx + cw}" y="${cy + ch + 22}" class="a" text-anchor="end">${fmt(last.at(-1).date)}</text>
</svg>`;
writeFileSync("assets/stats.svg", svg);
console.log(`ok: ${cal.totalContributions} contributions, streak ${current}, longest ${longest}`);
