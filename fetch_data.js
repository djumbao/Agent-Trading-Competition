const https = require("https");
const fs = require("fs");

const CONTRACT = "0x37dcb399316a53d3e8d453c5fe50ba7f5e57f1de";
const KNOWN = {
  "0xd1a9ab741e5b95f040bd8f134865a93f3bf04dc7": "BenYorke | Starchild",
  "0xdb27ba8cf502f7298a2ec910ebb9e520d41f5ff6": "TraderBot",
  "0x2b9825a4a0f8457a44d66d6776083230c22c5262": "Pokedex",
  "0x7dcf2de08e918a65617ea07d94e95c84b234796a": "ProfitReaper",
  "0x380337d0180db7d0df76ac4faae2fcea908ee1fc": "Otto AI",
  "0xc2bceb0ee69455da32abb10a5ba81c0299a925c8": "ButlerLiquid",
  "0x1f6b0b803477d672662af5142067f86a5a6d4446": "DegenerateTrader",
  "0xbfa733702305280f066d470afdfa784fa70e2649": "Captain Dackie",
  "0x15ec9112637f3fe3aea458d7e1e97d700b13e9db": "Argonaut AI",
  "0x8e2a6af9139398bedc1bb0af57c8a4e37af31f02": "seykota",
  "0xfc338bb6e31d2190501dc567cdaa7ab5a72544fd": "Super Saiyan Pikachu",
  "0xc44141a684f6aa4e36cd9264ab55550b03c88643": "Ethy AI",
  "0xf023f8baa58c621c059b546b9a4e6d86313292f1": "alura",
  "0x25626fd61698e38c51a27100f854ee22fc87fb7f": "Mercury",
  "0x73bf711556f8bdf7e344b4705e2f7b3b8b38a3e8": "Monyet",
  "0xbd4567bff68010c747b10768cb1ce88b3a40507a": "Welles Wilder",
  "0x973daf0ab015c894ebe7efcf94824d5f9d0e3566": "Nox",
  "0x82f98aa2cd92e4066f8c531ab4b3d4c35f58e345": "Super Saiyan Raichu",
  "0xacd85f0be2bf5b47cea13bdcfa89e8d36fa2786d": "TaXerClaw",
  "0x320a1b0e79e1b220911c661448cb1a626e868f92": "Stanley Druckenmiller",
  "0xc73c3ae92cbd72223033f56e4f1611d470916124": "N3X11",
  "0xdfa3d9bedd9594618877d973fd01578a280b962a": "MlmTrader",
  "0x0497f698cdb42984ffcfb509472a186f984673e2": "ggbots.ai",
  "0xdad9cc48e765330cf3943f9a50de14d3519fb443": "Miclaw Jordan",
  "0x55f8076bba812721aa8e10d1f77fe5cd0389cdd0": "GekkoMode",
  "0x3781934f9cc3b5157eab5f663b144103409cfffb": "Fat Tiger",
  "0x847b1e59c16f4fe0817106cebeb999335121e678": "ColdPotato",
  "0xa68139cd52d0509b31fbd5ffd17bda376d617940": "ClawStrike",
  "0x5750d0655c90e8279b0b1a9d8312085ba6dfb7d6": "DegenX",
  "0x3f9beb72028f52111065c9e9f8684b91ad19de9d": "openfred",
  "0x40f91a5ae4a673622cff1739d9874c027e5eeeaf": "Aida",
  "0x7cd2cc09bead267795ee9567531b0a4b256c1519": "Axiom AI",
  "0xa64f48a161d378091a22498c2d8faa76874e4544": "DennisMind",
  "0x5853cf91affb8ce034e483fceb90036002ee283d": "AGC by Virtuals",
  "0xa8af1c4593e5fee93199d50dad991e98d0c7c600": "ALLIN",
  "0x7ef30f3241d1d199c46fdc919f305f5dea937657": "Breathe Agent",
  "0xd11d6f9cfdd4b0b102cda6536a0b8762e2392d5f": "clio",
  "0xaf3d72a4e3158393950e360bf7c9556796fa70fa": "ICTmaster",
  "0xc3b0b52aa48b6dd357646d3f6929ccf4cecfee07": "FLO",
  "0x6c5e86d57d6a8e7c9d662e2e88824e9ce289470b": "Saber",
  "0xcd9286753033cfde5a5c4f7470443951cd6cdf42": "Nexor",
  "0x7a653ebe909e92dd952979415126f12e09fc6838": "Secret",
  "0x1d05246a51301b5ce364021f9288146cdb0c9ea0": "WolfOfAlgos",
  "0xea62013f2f894d5dc31ab62e924ef3317f8aed7c": "Swan",
  "0x057bfc6f324500e972d38a125865d013180a749b": "LongTradeBot",
  "0xbc27675e1eb971cbb8332d0b5e2225082b149405": "Jim Simons",
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON parse error: " + data.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

async function main() {
  const now = Date.now();
  const cutoff24h = now - 24 * 60 * 60 * 1000;
  const counts = {}, counts24h = {};
  let total = 0, total24h = 0, txLoaded = 0;

  let nextUrl = `https://base.blockscout.com/api/v2/addresses/${CONTRACT}/transactions?filter=to`;

  while (nextUrl) {
    console.log(`Fetching... ${txLoaded} txns so far`);
    const r = await fetchJson(nextUrl);
    if (!r.items || r.items.length === 0) break;

    r.items.forEach(tx => {
      const inp = tx.raw_input || tx.input || "";
      if (!inp || !inp.toLowerCase().startsWith("0xdf563f4b")) return;
      if (tx.status !== "ok" && tx.status !== 1 && tx.status !== "1") return;
      if (inp.length < 138) return;
      const token = "0x" + inp.slice(2).substring(72, 136).slice(-40).toLowerCase();
      counts[token] = (counts[token] || 0) + 1;
      total++;
      const txTime = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;
      if (txTime > cutoff24h) {
        counts24h[token] = (counts24h[token] || 0) + 1;
        total24h++;
      }
    });

    txLoaded += r.items.length;
    nextUrl = r.next_page_params
      ? `https://base.blockscout.com/api/v2/addresses/${CONTRACT}/transactions?filter=to&block_number=${r.next_page_params.block_number}&index=${r.next_page_params.index}&items_count=${r.next_page_params.items_count}`
      : null;

    await new Promise(r => setTimeout(r, 200));
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([addr, count]) => ({
      addr,
      name: KNOWN[addr] || null,
      count,
      count24h: counts24h[addr] || 0,
    }));

  console.log("Fetching pot-agents data...");
  let potAgents = [];
  try {
    const potData = await fetchJson("https://degen.virtuals.io/api/pot-agents");
    if (potData.success && potData.data) {
      potAgents = potData.data.filter(a => (a.currentSeason?.startingCapital || 0) > 0).map(a => ({
        name: a.currentSeason?.copyTradeAgentName || a.name,
        agentId: a.currentSeason?.copyTradeAgentId || null,
        pot: a.currentSeason?.startingCapital || 0,
        finalPnl: a.currentSeason?.finalPnl || 0,
        realizedPnl: a.currentSeason?.realizedPnl || 0,
        unrealizedPnl: a.currentSeason?.unrealizedPnl || 0,
        currentValue: a.currentSeason?.currentValue || 0,
        subPrice: 10,
      }));
      console.log(`Fetched ${potAgents.length} pot agents`);
    }
  } catch(e) {
    console.error("Failed to fetch pot-agents:", e.message);
  }

  console.log("Fetching leaderboard metrics...");
  let leaderboard = [];
  try {
    let offset = 0;
    const limit = 100;
    while (true) {
      const lbData = await fetchJson(`https://degen.virtuals.io/api/leaderboard?limit=${limit}&offset=${offset}`);
      if (!lbData.success || !lbData.data || lbData.data.length === 0) break;
      lbData.data.forEach(a => {
        leaderboard.push({
          id: a.id,
          name: a.name,
          rank: a.performance?.rank || null,
          compositeScore: a.performance?.compositeScore || 0,
          sortinoRatio: a.performance?.sortinoRatio || 0,
          returnPct: a.performance?.returnPct || 0,
          profitFactor: a.performance?.profitFactor || 0,
          winRate: a.performance?.winRate || 0,
          winCount: a.performance?.winCount || 0,
          lossCount: a.performance?.lossCount || 0,
          totalTradeCount: a.performance?.totalTradeCount || 0,
          totalTradeVolume: a.performance?.totalTradeVolume || 0,
          totalRealizedPnl: a.performance?.totalRealizedPnl || 0,
          subscriptionPrice: a.subscriptionPrice || 10,
          tokenSymbol: a.tokenSymbol || "",
          imageUrl: a.imageUrl || "",
        });
      });
      if (!lbData.pagination?.hasMore) break;
      offset += limit;
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`Fetched ${leaderboard.length} leaderboard entries`);
  } catch(e) {
    console.error("Failed to fetch leaderboard:", e.message);
  }

  const result = {
    updatedAt: new Date().toISOString(),
    total,
    total24h,
    agentCount: sorted.length,
    agents: sorted,
    potAgents,
    leaderboard,
  };

  fs.writeFileSync("data.json", JSON.stringify(result, null, 2));
  console.log(`Done! ${total} subs, ${sorted.length} agents. Saved to data.json`);

  // Update history.json with PnL snapshot
  console.log("Updating history.json...");
  try {
    let history = {};
    if (fs.existsSync("history.json")) {
      history = JSON.parse(fs.readFileSync("history.json", "utf8"));
    }
    const ts = Math.floor(Date.now() / 1000);
    const KEEP_DAYS = 8; // keep 8 days of history
    const cutoff = ts - KEEP_DAYS * 24 * 60 * 60;

    potAgents.forEach(a => {
      const key = a.name;
      if (!history[key]) history[key] = [];
      history[key].push({ t: ts, pnl: a.finalPnl });
      // prune old entries
      history[key] = history[key].filter(p => p.t > cutoff);
    });

    fs.writeFileSync("history.json", JSON.stringify(history));
    console.log(`History updated for ${potAgents.length} agents`);
  } catch(e) {
    console.error("Failed to update history:", e.message);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
