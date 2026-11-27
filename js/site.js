// Renders every page from the files in /data. You should rarely need to edit this file;
// change content in data/*.json and data/*.csv instead.
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const getJSON = p => fetch(p).then(r => { if (!r.ok) throw new Error(p); return r.json(); });

// Small CSV parser (handles quoted fields). Returns array of rows.
async function getCSV(p) {
  const text = (await fetch(p).then(r => { if (!r.ok) throw new Error(p); return r.text(); })).replace(/^﻿/, "");
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); if (row.some(x => x.trim())) rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  row.push(cur); if (row.some(x => x.trim())) rows.push(row);
  return rows.map(r => r.map(x => x.trim()));
}

// Loads a table from the published Google Sheet URL in data/site.json ("sheets"), if one is set,
// otherwise (or if the sheet can't be reached) from the local data/<name>.csv copy.
let SITE = {};
async function loadTable(name) {
  const url = (SITE.sheets || {})[name];
  if (url) { try { return await getCSV(url); } catch (e) { console.warn("Sheet failed, using local copy:", name); } }
  return getCSV(`data/${name}.csv`);
}

function table(rows, emptyMsg) {
  rows = rows.filter(r => r.some(c => c));
  if (rows.length < 2) return `<p class="empty">${esc(emptyMsg)}</p>`;
  const head = rows[0].map((h, i) => h.trim() || (i === 0 ? "Date" : ""));
  const cols = head.length;
  const body = rows.slice(1).map(r => {
    const filled = r.filter(c => c).length;
    // A row with only its first cell filled (e.g. "SEMI FINALS") is a section heading.
    if (filled === 1 && r[0]) return `<tr class="section"><td colspan="${cols}">${esc(r[0])}</td></tr>`;
    return `<tr>${head.map((_, i) => `<td>${/^https?:\/\//.test(r[i] || "") ? `<a href="${esc(r[i])}" target="_blank" rel="noopener">Watch ▶</a>` : esc(r[i] || "")}</td>`).join("")}</tr>`;
  }).join("");
  return `<div class="tablewrap"><table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function gallery(items) {
  return `<div class="gallery">${items.map(i => `<figure><img loading="lazy" src="${esc(i.src)}" alt="${esc(i.caption || "")}">${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`;
}

const pages = {
  async home(m) {
    const d = await getJSON("data/league.json");
    m.innerHTML = `<section class="hero-band">
        <div class="hero-text"><span class="eyebrow">${esc(d.eyebrow)}</span><h1>${(d.titleLines || [d.title]).map(esc).join("<br>")}</h1><p class="tagline">${esc(d.tagline)}</p>
          <div class="btns">${(d.buttons || []).map(b => `<a class="btn ${b.primary ? "primary" : ""}" href="${esc(b.href)}">${esc(b.label)}</a>`).join("")}</div></div>
        ${d.flyer ? `<img class="poster" src="${esc(d.flyer)}" alt="${esc(d.title)} poster">` : ""}
      </section>
      <section class="tiles">${d.details.map(([i, k, v]) => `<div class="tile"><div class="ico">${i}</div><div><div class="k">${esc(k)}</div><div class="v">${v}</div></div></div>`).join("")}</section>
      <h2 class="sec">${esc(d.linksTitle || "Explore the Winter League")}</h2>
      <section class="links">${(d.links || []).map(l => `<a class="linkcard" href="${esc(l.href)}"><div class="ico">${l.icon}</div><h3>${esc(l.label)}</h3><p>${esc(l.text)}</p><span>View →</span></a>`).join("")}</section>`;
  },
  async venue(m) {
    const d = await getJSON("data/venue.json");
    const map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(d.name + " " + d.address);
    m.innerHTML = `<h1>Venue</h1><div class="card"><h2 style="margin-top:0">${esc(d.name)}</h2><p style="margin:.2rem 0">${esc(d.address)}</p><p style="margin:.8rem 0 0"><a href="${map}" target="_blank" rel="noopener">Open in Google Maps →</a></p></div>${gallery(d.images.map(src => ({ src })))}`;
  },
  async team(m) {
    const d = await getJSON("data/team.json");
    m.innerHTML = `<h1>Team</h1><p>${esc(d.intro)}</p>${gallery(d.photos)}`;
  },
  async standings(m) {
    m.innerHTML = `<h1>Current Standings</h1>${table(await loadTable("standings"), "Standings will be posted once the season starts.")}
      <p class="glossary"><b>GP</b> games played · <b>W</b> wins · <b>D</b> draws · <b>L</b> losses · <b>F</b> goals for · <b>A</b> goals against · <b>GD</b> goal difference · <b>PTS</b> points · <b>FTD</b> forfeited</p>`;
  },
  async schedule(m) {
    m.innerHTML = `<h1>Schedule</h1>${table(await loadTable("schedule"), "Schedule will be posted soon.")}`;
  },
  async statistics(m) {
    const [g, c] = await Promise.all([loadTable("goals"), loadTable("cards")]);
    m.innerHTML = `<h1>League Statistics</h1><h2>Goal statistics</h2>${table(g, "No goals recorded yet.")}
      <p class="glossary"><b>GS</b> goals scored · <b>GP</b> games played · ranked by goals scored</p>
      <h2>Cards statistics</h2>${table(c, "No cards recorded yet.")}
      <div class="card" style="margin-top:1.5rem"><h2 style="margin-top:0">Discipline</h2><ul>
      <li><b>Yellow card</b> – 5-minute suspension from play once the player is carded.</li>
      <li><b>Red card</b> – game suspension of 1 to 3 games based on referee recommendation.</li>
      <li><b>Suspension from league</b> – players are suspended for any brawls or physical conduct against other players or coaches.</li>
      <li><b>Final verbal warning</b> – 1 to 3 game suspension for repeated threatening or verbal misconduct against coaches, players or committee members.</li></ul></div>`;
  },
  async live(m) {
    // Live links come from the "Game Link" column of the schedule Google Sheet (same sheet as the Schedule page).
    // Which day is shown: the most recent game day on or before today that has links; if none yet, the next upcoming
    // one. Each slot in data/live.json picks the row whose Field matches. Leave Game Link blank for "no stream".
    const d = await getJSON("data/live.json");
    const rows = await loadTable("schedule");
    const head = (rows[0] || []).map(h => h.toLowerCase());
    const col = re => head.findIndex(h => re.test(h));
    const iTime = col(/time/), iField = col(/field/), iMatch = col(/match/), iLink = col(/link/);
    const parse = s => { const p = (s || "").split("/"); return p.length === 3 ? new Date(+p[2], +p[0] - 1, +p[1]) : null; };
    const games = iLink < 0 ? [] : rows.slice(1).map(r => ({ date: parse(r[0]), raw: r[0], time: r[iTime], field: r[iField], match: r[iMatch], url: r[iLink] }))
      .filter(g => g.date && /^https?:\/\//.test(g.url || ""));   // only real http(s) links ever reach an iframe
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const past = games.filter(g => g.date <= today), future = games.filter(g => g.date > today);
    const day = past.length ? Math.max(...past.map(g => +g.date)) : future.length ? Math.min(...future.map(g => +g.date)) : null;
    const todays = games.filter(g => +g.date === day);
    const section = s => {
      const g = todays.find(x => String(x.field) === String(s.field));
      const sub = g ? [g.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), g.time, `Field ${g.field}`, g.match].filter(Boolean).join(" · ") : `Field ${s.field}`;
      return `<section class="livegame"><h2 class="sec">${esc(s.label)} <small>· ${esc(sub)}</small></h2>${
        g ? `<div class="video"><iframe src="${esc(g.url)}" title="${esc(s.label)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>
          <p class="empty">Video not showing? <a href="${esc(g.url)}" target="_blank" rel="noopener">Open ${esc(s.label)} on BallerCam →</a></p>`
        : `<div class="card"><p class="empty">${esc(d.emptyMessage)}</p><a class="btn primary" href="schedule.html">View schedule</a></div>`}</section>`;
    };
    m.innerHTML = `<h1>${esc(d.title)}</h1><p>${esc(d.caption)}</p><div class="livegrid">${d.slots.map(section).join("")}</div>`;
  },
  async contact(m, site) {
    const subject = encodeURIComponent("Loudoun Tigers inquiry");
    m.innerHTML = `<h1>Contact Us</h1><div class="card"><p>Want to join or sponsor the Loudoun Tigers Premier League, or have a question? Send us an email and we'll get back to you.</p>
      <div class="btns" style="margin:1.2rem 0"><a class="btn primary" href="mailto:${esc(site.email)}?subject=${subject}">✉️ Email us</a></div>
      <p class="empty">${esc(site.email)}</p></div>`;
  }
};

(async () => {
  const page = document.body.dataset.page;
  try {
    const site = SITE = await getJSON("data/site.json");
    $("#hdr").innerHTML = `<div class="bar"><a class="brand" href="index.html">${site.logo ? `<img src="${esc(site.logo)}" alt="">` : ""}<span>${esc(site.name)}</span></a>
      <nav>${site.nav.map(n => `<a href="${esc(n.href)}" class="${n.href.replace(".html", "") === (page === "home" ? "index" : page) ? "active" : ""}">${esc(n.label)}</a>`).join("")}</nav></div>`;
    const soc = site.social.filter(s => s.url).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(" · ");
    $("#ftr").innerHTML = `${soc ? soc + "<br>" : ""}© ${new Date().getFullYear()} ${esc(site.name)}`;
    await pages[page]($("#main"), site);
  } catch (e) {
    $("#main").innerHTML = `<p class="empty">Could not load page content (${esc(e.message)}). If you opened this file directly, run a local server instead: <code>python3 -m http.server</code>.</p>`;
  }
  const lb = document.createElement("div"); lb.id = "lightbox"; document.body.append(lb);
  lb.onclick = () => (lb.style.display = "none");
  document.addEventListener("click", e => { if (e.target.matches(".gallery img")) { lb.innerHTML = `<img src="${e.target.src}">`; lb.style.display = "flex"; } });
})();
