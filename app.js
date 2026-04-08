// ============================================================
// UTILITY: XSS-safe text escaping
// ============================================================
function esc(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function safeName(agent) {
  if (agent.name && agent.name.trim()) return esc(agent.name);
  if (agent.addr) return esc(agent.addr.slice(0, 10) + '...');
  return 'Unknown Agent';
}

// ============================================================
// SHARED SORT — reused by metrics and breakeven tables
// ============================================================
function sortByCol(arr, col, dir) {
  return [...arr].sort((a, b) => {
    const va = a[col], vb = b[col];
    if (col === "name") return dir * String(va || '').localeCompare(String(vb || ''));
    return dir * ((Number(va) || 0) - (Number(vb) || 0));
  });
}

// ============================================================
// SEASON CONFIG — update these values for each new season
// ============================================================
const SEASON_CONFIG = {
  number: 2,
  start: "2026-04-03",
  end: "2026-04-10T00:00:00Z",
  label: "Season 2 \u00b7 Apr 3 \u2013 Apr 10, 00:00 UTC",
  labelEnded: "Season 2 \u00b7 Ended Apr 10, 2026",
};

const SEASON_END = new Date(SEASON_CONFIG.end);
const RANK_CLASS = { 1: "gold", 2: "silver", 3: "bronze" };

// ============================================================
// SEASON END HANDLING
// ============================================================
function isSeasonEnded() {
  return new Date() >= SEASON_END;
}

function updateSeasonBadge() {
  const badge = document.getElementById("seasonBadge");
  if (isSeasonEnded()) {
    badge.classList.add("ended");
    document.getElementById("seasonText").textContent = SEASON_CONFIG.labelEnded;
    document.getElementById("countdown").textContent = "";
    const li = document.getElementById("liveIndicator");
    if (li) li.innerHTML = '';
  }
}

// ============================================================
// COUNTDOWN
// ============================================================
function startCountdown() {
  let intervalId;
  function update() {
    const diff = SEASON_END - new Date();
    if (diff <= 0) {
      document.getElementById("countdown").textContent = "\u00b7 ended";
      updateSeasonBadge();
      if (intervalId) clearInterval(intervalId);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const parts = [];
    if (d > 0) parts.push(d + "d");
    parts.push(String(h).padStart(2, "0") + "h");
    parts.push(String(m).padStart(2, "0") + "m");
    parts.push(String(s).padStart(2, "0") + "s");
    document.getElementById("countdown").textContent = "\u00b7 " + parts.join(" ");
  }
  update();
  intervalId = setInterval(update, 1000);
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tab, btn) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const s2panels = [document.getElementById("tab-s2"), document.getElementById("tab-s2-metrics")];
  const s1panel = document.getElementById("tab-s1");

  if (tab === "s2") {
    s2panels.forEach(p => { if (p) p.classList.add("active"); });
    if (s1panel) s1panel.classList.remove("active");
  } else {
    s2panels.forEach(p => { if (p) p.classList.remove("active"); });
    if (s1panel) s1panel.classList.add("active");
  }
}

// ============================================================
// SUBSCRIPTION LEADERBOARD
// ============================================================
function buildColHtml(agents, startRank, colTitle) {
  let html = `<div class="col-title">${esc(colTitle)}</div>`;
  html += `<div class="t-header"><span>#</span><span>Agent</span><span style="text-align:right">Subs</span><span style="text-align:right">+24h</span></div>`;

  if (agents.length === 0) {
    html += `<div class="empty-state">No agents found</div>`;
    return html;
  }

  agents.forEach((a, i) => {
    const rank = startRank + i;
    const name = safeName(a);
    const rc = RANK_CLASS[rank] || "";
    const count = Number(a.count) || 0;
    const count24h = Number(a.count24h) || 0;
    html += `<div class="row">
      <div class="rank ${rc}">${rank}</div>
      <div class="agent-name">${name}</div>
      <div class="count">${count}</div>
      <div class="growth ${count24h === 0 ? 'zero' : ''}">+${count24h}</div>
    </div>`;
  });
  return html;
}

// ============================================================
// METRICS TABLE
// ============================================================
let _metricsAll = [];
let _metricsSortCol = "rank";
let _metricsSortDir = 1;
let _metricsShown = 20;

function getSortedMetrics() {
  return sortByCol(_metricsAll, _metricsSortCol, _metricsSortDir);
}

const _prevPnl = {};

function makeMetricRow(a, visualRank) {
  const returnPct = Number(a.returnPct) || 0;
  const sortinoRatio = Number(a.sortinoRatio) || 0;
  const profitFactor = Number(a.profitFactor) || 0;
  const winRate = Number(a.winRate) || 0;
  const totalRealizedPnl = Number(a.totalRealizedPnl) || 0;
  const totalTradeVolume = Number(a.totalTradeVolume) || 0;
  const totalTradeCount = Number(a.totalTradeCount) || 0;
  const winCount = Number(a.winCount) || 0;
  const lossCount = Number(a.lossCount) || 0;

  const retPct = (returnPct * 100).toFixed(2);
  const retClass = returnPct > 0 ? "mx-pos" : returnPct < 0 ? "mx-neg" : "mx-muted";
  const sortino = Math.abs(sortinoRatio) > 1000 ? "\u2014" : sortinoRatio.toFixed(3);
  const sortinoClass = sortinoRatio > 0 ? "mx-pos" : sortinoRatio < 0 ? "mx-neg" : "mx-muted";
  const pf = profitFactor > 0 ? profitFactor.toFixed(2) : "\u2014";
  const pfClass = profitFactor >= 1 ? "mx-pos" : profitFactor > 0 ? "mx-neg" : "mx-muted";
  const wr = (winRate * 100).toFixed(0) + "%";
  const wrClass = winRate >= 0.5 ? "mx-pos" : "mx-neg";
  const pnlClass = totalRealizedPnl > 0 ? "mx-pos" : totalRealizedPnl < 0 ? "mx-neg" : "mx-muted";
  const pnlStr = totalRealizedPnl > 0 ? "+$" + totalRealizedPnl.toFixed(2) : totalRealizedPnl < 0 ? "-$" + Math.abs(totalRealizedPnl).toFixed(2) : "\u2014";
  const vol = "$" + Math.round(totalTradeVolume).toLocaleString("en-US");

  const safeImgUrl = (a.imageUrl && a.imageUrl.startsWith('https://')) ? esc(a.imageUrl) : '';
  const avatar = safeImgUrl
    ? `<img src="${safeImgUrl}" class="agent-avatar" loading="lazy" decoding="async">`
    : `<span class="agent-avatar skeleton"></span>`;

  const rankBadge = visualRank === 1 ? `<span class="rank-badge rank-gold">1</span>`
    : visualRank === 2 ? `<span class="rank-badge rank-silver">2</span>`
    : visualRank === 3 ? `<span class="rank-badge rank-bronze">3</span>` : "";

  const agentName = esc(a.name || 'Unknown Agent');
  const nameInner = a.id
    ? `<a href="https://degen.virtuals.io/agents/${esc(a.id)}" target="_blank" rel="noopener" class="agent-link">${agentName}</a>`
    : agentName;

  const nameHtml = `<div class="agent-cell">${avatar}${rankBadge}${nameInner}</div>`;

  const prev = _prevPnl[a.id];
  const flashClass = prev !== undefined ? (totalRealizedPnl > prev ? "flash-g" : totalRealizedPnl < prev ? "flash-r" : "") : "";
  _prevPnl[a.id] = totalRealizedPnl;

  const rowClass = visualRank === 1 ? "row-gold" : visualRank === 2 ? "row-silver" : visualRank === 3 ? "row-bronze" : "";

  const tr = document.createElement("tr");
  if (rowClass) tr.className = rowClass;
  if (flashClass) { tr.classList.add(flashClass); setTimeout(() => tr.classList.remove(flashClass), 900); }

  tr.innerHTML = `
    <td>${nameHtml}</td>
    <td>${a.rank || "\u2014"}</td>
    <td class="${retClass}">${retPct}%</td>
    <td class="${sortinoClass}">${sortino}</td>
    <td class="${pfClass}">${pf}</td>
    <td class="${wrClass}">${wr}</td>
    <td class="mx-muted">${winCount}/${lossCount}</td>
    <td>${totalTradeCount}</td>
    <td class="mx-muted">${vol}</td>
    <td class="${pnlClass}">${pnlStr}</td>`;

  // Hide broken avatar images without inline onerror handler
  const img = tr.querySelector("img.agent-avatar");
  if (img) img.addEventListener("error", function() { this.style.display = "none"; });

  return tr;
}

function renderMetricsTable() {
  const sorted = getSortedMetrics();
  const tbody = document.getElementById("metricsBody");
  tbody.innerHTML = "";

  if (sorted.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="10" class="empty-state">No metrics data available</td>`;
    tbody.appendChild(tr);
    return;
  }

  sorted.slice(0, _metricsShown).forEach((a, i) => tbody.appendChild(makeMetricRow(a, i + 1)));

  const btn = document.getElementById("metricsLoadMore");
  if (_metricsShown < sorted.length) {
    btn.style.display = "block";
    btn.textContent = `Load more (${sorted.length - _metricsShown} remaining)`;
  } else {
    btn.style.display = "none";
  }
}

// ============================================================
// METRICS INIT
// ============================================================
function renderMetrics(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) return;

  _metricsAll = leaderboard;
  renderMetricsTable();

  if (!renderMetrics._sortInit) {
    renderMetrics._sortInit = true;
    document.querySelectorAll("#metricsHead th").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        if (_metricsSortCol === col) {
          _metricsSortDir *= -1;
        } else {
          _metricsSortCol = col;
          _metricsSortDir = col === "rank" ? 1 : -1;
        }
        _metricsShown = 20;
        document.querySelectorAll("#metricsHead th").forEach(t => {
          t.classList.remove("sort-asc", "sort-desc");
          t.querySelector(".sort-icon").textContent = "\u2195";
        });
        th.classList.add(_metricsSortDir === 1 ? "sort-asc" : "sort-desc");
        th.querySelector(".sort-icon").textContent = _metricsSortDir === 1 ? "\u2191" : "\u2193";
        renderMetricsTable();
      });
    });
  }

  document.getElementById("metricsSection").style.display = "block";
  document.getElementById("metricsUpdated").textContent = "Updated " + new Date().toUTCString().slice(5, 22) + " UTC";
}

// ============================================================
// BREAKEVEN TABLE
// ============================================================
let _beData = [];
let _beSortCol = "subs";
let _beSortDir = -1;

function renderBeTable() {
  const sorted = sortByCol(_beData, _beSortCol, _beSortDir);

  const fmt = n => "$" + Math.round(n).toLocaleString("en-US");
  const tbody = document.getElementById("breakevenBody");
  tbody.innerHTML = "";

  if (sorted.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" class="empty-state">No breakeven data available</td>`;
    tbody.appendChild(tr);
    return;
  }

  sorted.forEach(a => {
    const barColor = a.donePct >= 100 ? "#5DCAA5" : a.donePct > 30 ? "#BA7517" : "#888780";
    const pnlColor = a.pnl > 0 ? "#5DCAA5" : a.pnl < 0 ? "#E24B4A" : "var(--muted)";
    const pnlStr = a.pnl > 0 ? "+$" + a.pnl.toFixed(2) : a.pnl < 0 ? "-$" + Math.abs(a.pnl).toFixed(2) : "\u2014";

    const payoutPerSub = (a.subs > 0 && a.pnl > 0) ? (a.pnl * 0.5) / a.subs : 0;
    const payoutColor = payoutPerSub > 0 ? "#5DCAA5" : "var(--muted)";
    const payoutStr = payoutPerSub > 0 ? "+$" + payoutPerSub.toFixed(2) : "\u2014";

    const nameHtml = a.agentId
      ? `<a href="https://degen.virtuals.io/agents/${esc(a.agentId)}" target="_blank" rel="noopener" class="agent-link">${esc(a.displayName)}</a>`
      : esc(a.displayName);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:500;white-space:nowrap">${nameHtml}</td>
      <td>${a.subs}</td>
      <td>$${a.subPrice}</td>
      <td>${fmt(a.pot)}</td>
      <td style="color:var(--accent2)">${a.needed > 0 ? fmt(a.needed) : "\u2014"}</td>
      <td style="color:${pnlColor}">${pnlStr}</td>
      <td style="color:${payoutColor}">${payoutStr}</td>
      <td>
        <div class="be-bar-wrap">
          <span style="font-size:11px;color:${barColor};min-width:36px;text-align:right">${a.donePct.toFixed(1)}%</span>
          <div class="be-bar-bg"><div class="be-bar-fill" style="width:${Math.min(a.donePct, 100)}%;background:${barColor}"></div></div>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderBreakeven(potAgents) {
  // Hardcoded subs as of Apr 3, 2026 02:00 UTC (Season 1 end snapshot — historical data)
  const S1_SUBS = {
    "benyorke | starchild": 139,
    "argonaut ai": 90,
    "otto ai - trade execution agent": 92,
    "otto ai": 92,
    "miclaw jordan": 38,
    "miclaw jordan \ud83c\udfc6": 38,
    "ethy ai": 75,
    "butlerliquid": 79,
    "taxerclaw": 59,
    "pokedex": 83,
    "degeneratetrader": 70,
    "degenx": 44,
  };

  const SUB_PRICES = { "miclaw jordan": 23 };

  _beData = potAgents.map(a => {
    const displayName = (a.name || 'Unknown Agent').replace("Otto AI - Trade Execution Agent", "Otto AI");
    const normName = (a.name || '').replace(" \ud83c\udfc6","").toLowerCase();
    const subs = S1_SUBS[normName] || S1_SUBS[(a.name || '').toLowerCase()] || 0;
    const subPrice = SUB_PRICES[normName] || 10;
    const needed = subs * subPrice * 2;
    const pnl = a.finalPnl || 0;
    const donePct = needed > 0 ? Math.max(0, Math.min((pnl / needed) * 100, 100)) : 0;
    const payoutPerSub = (subs > 0 && pnl > 0) ? (pnl * 0.5) / subs : 0;
    return { name: normName, displayName, agentId: a.agentId || null, subs, subPrice, pot: a.pot, needed, pnl, payoutPerSub, donePct };
  });

  renderBeTable();

  if (!renderBreakeven._sortInit) {
    renderBreakeven._sortInit = true;
    document.querySelectorAll("#beHead th").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        if (_beSortCol === col) { _beSortDir *= -1; }
        else { _beSortCol = col; _beSortDir = col === "name" ? 1 : -1; }
        document.querySelectorAll("#beHead th").forEach(t => {
          t.classList.remove("sort-asc","sort-desc");
          const si = t.querySelector(".sort-icon"); if (si) si.textContent = "\u2195";
        });
        th.classList.add(_beSortDir === 1 ? "sort-asc" : "sort-desc");
        const si = th.querySelector(".sort-icon"); if (si) si.textContent = _beSortDir === 1 ? "\u2191" : "\u2193";
        renderBeTable();
      });
    });
  }

  document.getElementById("breakevenSection").style.display = "block";
}

// ============================================================
// SAFE FETCH helper with timeout
// ============================================================
async function safeFetch(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 15000);
  try {
    const r = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ============================================================
// MAIN DATA LOAD
// ============================================================
async function loadData() {
  try {
    const r = await safeFetch("https://raw.githubusercontent.com/djumbao/Agent-Trading-Competition/main/data.json?t=" + Date.now());
    const data = await r.json();

    if (!data.agents || data.agents.length === 0) {
      document.getElementById("mainContent").innerHTML = `<div class="table-wrap"><div class="empty-state">Data is being fetched, check back in a minute...</div></div>`;
      return;
    }

    document.getElementById("totalSubs").textContent = data.total;
    document.getElementById("totalAgents").textContent = data.agentCount;
    document.getElementById("growth24h").textContent = "+" + data.total24h;

    const top20 = data.agents.slice(0, 20);

    const leftHtml = buildColHtml(top20.slice(0, 10), 1, "Top 1\u201310");
    const rightHtml = buildColHtml(top20.slice(10, 20), 11, "Top 11\u201320");

    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `
      <div class="two-col">
        <div class="table-wrap">${leftHtml}</div>
        <div class="table-wrap">${rightHtml}</div>
      </div>`;

    if (data.updatedAt) {
      const d = new Date(data.updatedAt);
      document.getElementById("lastUpdated").textContent =
        "Updated " + d.toUTCString().slice(5, 22) + " UTC";
    }

    if (data.potAgents && data.potAgents.length > 0) {
      renderBreakeven(data.potAgents);
    }

    if (data.leaderboard && data.leaderboard.length > 0) {
      renderMetrics(data.leaderboard);
    }

  } catch(e) {
    console.error("Data load failed:", e);
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `<div class="table-wrap"><div class="error">
      <div class="error-text">Failed to load data \u2014 the API might be temporarily unavailable</div>
      <button class="retry-btn" id="retryBtn">Try again</button>
    </div></div>`;
    document.getElementById("retryBtn").addEventListener("click", loadData);
  }
}

// ============================================================
// INIT
// ============================================================
startCountdown();
updateSeasonBadge();
loadData();

// Attach tab buttons + hash routing
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    const tab = this.dataset.tab;
    switchTab(tab, this);
    history.replaceState(null, "", "#" + tab);
  });
});

// Restore tab from URL hash on load
const initHash = location.hash.replace("#", "");
if (initHash === "s1") {
  const s1btn = document.querySelector('.tab-btn[data-tab="s1"]');
  if (s1btn) switchTab("s1", s1btn);
}

// Attach "load more" button for metrics
document.getElementById("metricsLoadMore").addEventListener("click", () => {
  _metricsShown += 20;
  renderMetricsTable();
});

// Auto-refresh main data every 60s, skip when tab is hidden
let _refreshId = setInterval(() => {
  if (!document.hidden) loadData().catch(e => console.warn("Auto-refresh error:", e.message));
}, 60000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadData().catch(e => console.warn("Auto-refresh error:", e.message));
});

// Show live indicator
const li = document.getElementById("liveIndicator");
if (li) li.style.display = "inline-flex";
