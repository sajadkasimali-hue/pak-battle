import { supabase } from "./supabase-client.js";
import { renderLayout } from "./layout.js";
import { rs, fmtDateTime } from "./format.js";
import { tournamentCardHTML, subscribeCardUpdates } from "./tournament-card.js";

renderLayout();

async function loadStats() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [players, online, daily, prizes, winners] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", fiveMinAgo),
    supabase.from("tournaments").select("*", { count: "exact", head: true }).gte("match_date", startOfDay.toISOString()).lte("match_date", endOfDay.toISOString()),
    supabase.from("results").select("prize_amount"),
    supabase.from("results").select("*", { count: "exact", head: true }).eq("position", 1),
  ]);

  const prizeTotal = (prizes.data ?? []).reduce((s, r) => s + Number(r.prize_amount ?? 0), 0);
  const values = [players.count ?? 0, online.count ?? 0, daily.count ?? 0, rs(prizeTotal), winners.count ?? 0];
  document.querySelectorAll("#liveStats .item").forEach((item, i) => {
    item.querySelector(".val").outerHTML = `<div class="val gold-text">${values[i]}</div>`;
  });
}

function tournamentBanner(t, remaining) {
  return `
  <div style="position:relative; min-height:280px; background:linear-gradient(135deg, oklch(0.84 0.17 89/20%), var(--background), oklch(1 0 0/10%)); display:flex; align-items:center; justify-content:center;">
    <div style="font-size:6rem; opacity:.35;">🏆</div>
    <div style="position:absolute; left:1rem; top:1rem; border-radius:999px; background:linear-gradient(135deg,#f59e0b,#fde047); padding:.3rem .8rem; font-size:.6rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:#000;">★ Featured</div>
  </div>
  <div style="padding:2rem; display:flex; flex-direction:column; gap:1.2rem;">
    <div>
      <div style="font-size:.7rem; text-transform:uppercase; letter-spacing:.15em; color:var(--primary);">${fmtDateTime(t.match_date)}</div>
      <h3 style="margin-top:.4rem; font-size:1.8rem; font-weight:800;">${t.name}</h3>
    </div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr); text-align:center;">
      <div class="stat-box"><div class="v">${rs(t.entry_fee)}</div><div class="l">Entry</div></div>
      <div class="stat-box"><div class="v gold-text">${rs(t.prize_pool)}</div><div class="l">Prize</div></div>
      <div class="stat-box"><div class="v">${t.total_slots}</div><div class="l">Slots</div></div>
    </div>
    <div style="display:flex; gap:.75rem;">
      <a href="tournament.html?id=${t.id}" class="btn-neon" style="flex:1;">Join Now</a>
      <a href="tournament.html?id=${t.id}" class="btn-outline" style="flex:1;">Details</a>
    </div>
  </div>`;
}

async function loadTournaments() {
  const { data } = await supabase.from("tournaments").select("*").order("match_date", { ascending: true }).limit(8);
  const list = data ?? [];
  const featured = list.find((t) => t.is_featured) ?? list[0];
  const upcoming = list.filter((t) => t.id !== featured?.id).slice(0, 6);

  if (featured) {
    document.getElementById("featuredSection").style.display = "";
    const fc = document.getElementById("featuredCard");
    fc.style.gridTemplateColumns = window.innerWidth >= 768 ? "1fr 1fr" : "1fr";
    fc.innerHTML = tournamentBanner(featured, Math.max(0, featured.total_slots - (featured.filled_slots ?? 0)));
  }

  const grid = document.getElementById("upcomingGrid");
  grid.innerHTML = upcoming.map(tournamentCardHTML).join("") || `<p class="muted">No upcoming tournaments right now.</p>`;
  subscribeCardUpdates(grid);
}

async function loadWinners() {
  const { data } = await supabase
    .from("results")
    .select("*, tournaments(name, match_type)")
    .eq("position", 1)
    .order("created_at", { ascending: false })
    .limit(5);
  const el = document.getElementById("winnersList");
  if (!data || data.length === 0) {
    el.innerHTML = `<p class="muted">No results yet — be the first champion.</p>`;
    return;
  }
  el.innerHTML = data
    .map(
      (r) => `
    <div class="row-item">
      <div style="font-size:1.6rem;">🏆</div>
      <div class="grow"><div class="t1">${r.player_name}</div><div class="t2">${r.tournaments?.name ?? ""}</div></div>
      <div style="text-align:right;">
        <div class="gold-text" style="font-weight:800;">${rs(r.prize_amount)}</div>
        <div style="font-size:.6rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted-foreground);">${r.kills} kills</div>
      </div>
    </div>`
    )
    .join("");
}

async function loadTopPlayers() {
  const { data } = await supabase
    .from("profiles")
    .select("id, pubg_username, total_wins, total_kills, total_earnings")
    .order("total_earnings", { ascending: false })
    .limit(5);
  const el = document.getElementById("topPlayersList");
  if (!data || data.length === 0) {
    el.innerHTML = `<p class="muted">Leaderboard will appear once tournaments conclude.</p>`;
    return;
  }
  el.innerHTML = data
    .map(
      (p, i) => `
    <div class="row-item">
      <div style="display:flex; height:2rem; width:2rem; align-items:center; justify-content:center; border-radius:999px; font-weight:800; background:${i === 0 ? "linear-gradient(135deg,var(--gold),var(--neon))" : "var(--secondary)"}; color:${i === 0 ? "#000" : "inherit"};">${i + 1}</div>
      <div class="grow t1">${p.pubg_username || "Anonymous"}</div>
      <div style="text-align:right;">
        <div class="gold-text" style="font-weight:800;">${rs(p.total_earnings)}</div>
        <div style="font-size:.6rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted-foreground);">${p.total_wins}W · ${p.total_kills}K</div>
      </div>
    </div>`
    )
    .join("");
}

async function loadReviews() {
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles(pubg_username)")
    .order("created_at", { ascending: false })
    .limit(6);
  if (!data || data.length === 0) return;
  document.getElementById("reviewsSection").style.display = "";
  document.getElementById("reviewsGrid").innerHTML = data
    .map(
      (r) => `
    <div class="glass card">
      <div class="stars" style="font-size:1.1rem;">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
      <p style="margin-top:.75rem; font-size:.9rem;">"${r.comment}"</p>
      <div style="margin-top:.75rem; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--primary);">— ${r.profiles?.pubg_username ?? "Player"}</div>
    </div>`
    )
    .join("");
}

async function loadLive() {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "live_stream").maybeSingle();
  const v = data?.value ?? {};
  const isLive = !!v.is_live && v.youtube_video_id;
  const embed = isLive
    ? `<div class="yt-live online glass-strong">
        <div class="yt-frame-wrap">
          <iframe src="https://www.youtube.com/embed/${v.youtube_video_id}?autoplay=0&rel=0" title="Live" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
          <div class="yt-live-badge">● Live</div>
        </div>
      </div>`
    : `<div class="yt-offline glass">
        <div class="circle"><img src="assets/logo.png" alt="" /></div>
        <div class="pill" style="margin-bottom:.75rem;">📡 Currently Offline</div>
        <h3 class="section-title"><span class="gold-text">Pak Battle Esports</span> is offline</h3>
        <p class="muted" style="margin-top:.5rem; max-width:26rem; margin-left:auto; margin-right:auto;">Subscribe to get notified the instant we go live.</p>
        <a href="https://www.youtube.com/@PakBattleESports" target="_blank" rel="noreferrer" class="yt-btn">▶ Subscribe on YouTube</a>
      </div>`;

  if (isLive) {
    document.getElementById("liveSection").style.display = "";
    document.getElementById("liveEmbedTop").innerHTML = embed;
    document.getElementById("liveSectionBottom").style.display = "none";
  } else {
    document.getElementById("liveEmbedBottom").innerHTML = embed;
  }
}

loadStats();
loadTournaments();
loadWinners();
loadTopPlayers();
loadReviews();
loadLive();
