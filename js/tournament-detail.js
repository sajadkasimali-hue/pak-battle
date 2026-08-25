import { supabase } from "./supabase-client.js";
import { renderLayout } from "./layout.js";
import { rs, matchTypeLabel, fmtDateTime, timeUntil, qs, escapeHtml } from "./format.js";

const id = qs("id");
let user = null;

async function render() {
  user = await renderLayout();
  if (!id) {
    document.getElementById("content").innerHTML = `<p class="muted">No tournament specified.</p>`;
    return;
  }

  const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (!t) {
    document.getElementById("content").innerHTML = `<p class="muted">Tournament not found.</p>`;
    return;
  }

  let myReg = null;
  if (user) {
    const { data } = await supabase.from("registrations").select("*, payments(*)").eq("tournament_id", id).eq("user_id", user.id).maybeSingle();
    myReg = data;
  }

  const filled = t.filled_slots ?? 0;
  const remaining = Math.max(0, t.total_slots - filled);
  const isFull = filled >= t.total_slots || !!t.full_at;
  const open = t.status === "registration_open" && !isFull && !myReg;
  const approved = myReg?.status === "approved";

  let actionHTML;
  if (approved && (t.room_id || t.room_password)) {
    actionHTML = `
    <div class="neon-border" style="border-radius:.85rem; padding:1.25rem;">
      <h3 class="neon-text" style="font-size:.85rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.75rem;">🔒 Room Details</h3>
      <div class="grid grid-2">
        <div class="stat-box" style="text-align:left;"><div class="l">Room ID</div><div class="v" style="margin-top:.3rem;">${escapeHtml(t.room_id) || "—"}</div></div>
        <div class="stat-box" style="text-align:left;"><div class="l">Password</div><div class="v" style="margin-top:.3rem;">${escapeHtml(t.room_password) || "—"}</div></div>
      </div>
      <p class="muted" style="margin-top:.75rem; font-size:.75rem;">Visible only to you. Do not share.</p>
    </div>`;
  } else if (myReg) {
    const msg =
      myReg.status === "pending"
        ? "Waiting for admin to verify your payment. You'll be notified."
        : myReg.status === "approved"
        ? "Room details will appear here 15 minutes before match start."
        : "Your payment was rejected. Contact support.";
    actionHTML = `
    <div style="border:1px solid oklch(0.7 0.15 80/40%); background:oklch(0.7 0.15 80/10%); border-radius:.85rem; padding:1.25rem; text-align:center;">
      <h3 style="color:oklch(0.8 0.15 80); font-weight:700;">Your registration is ${myReg.status}</h3>
      <p class="muted" style="margin-top:.4rem; font-size:.85rem;">${msg}</p>
    </div>`;
  } else if (open) {
    actionHTML = `<a href="${user ? `join.html?id=${t.id}` : "auth.html"}" class="btn-neon" style="flex:1; text-align:center;">${user ? "Join Tournament" : "Login to Join"}</a>`;
  } else {
    actionHTML = `<button disabled class="btn-outline" style="flex:1;">Registration Closed</button>`;
  }

  document.getElementById("content").innerHTML = `
  <div class="glass" style="border-radius:1.25rem; overflow:hidden;">
    <div style="position:relative; height:14rem; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg, oklch(0.84 0.17 89/20%), var(--background), oklch(1 0 0/10%));">
      <div style="font-size:6rem; opacity:.35;">🏆</div>
      <div style="position:absolute; left:1rem; top:1rem; border-radius:.35rem; background:rgba(0,0,0,.6); padding:.35rem .75rem; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--primary);">${matchTypeLabel(t.match_type)}</div>
      <div style="position:absolute; right:1rem; top:1rem; border-radius:.35rem; background:rgba(0,0,0,.6); padding:.35rem .75rem; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em;">⏱ ${timeUntil(t.match_date)}</div>
    </div>
    <div style="padding:1.75rem; display:flex; flex-direction:column; gap:1.5rem;">
      <div>
        <h1 style="font-size:2rem; font-weight:800;">${escapeHtml(t.name)}</h1>
        ${t.description ? `<p class="muted" style="margin-top:.5rem;">${escapeHtml(t.description)}</p>` : ""}
      </div>
      <div class="grid" style="grid-template-columns:repeat(2,1fr);">
        <div class="stat-box" style="text-align:left;"><div class="l">🗺️ Map</div><div class="v" style="margin-top:.3rem;">${escapeHtml(t.map)}</div></div>
        <div class="stat-box" style="text-align:left;"><div class="l">👥 Team</div><div class="v" style="margin-top:.3rem;">${t.team_size} player${t.team_size > 1 ? "s" : ""}</div></div>
        <div class="stat-box" style="text-align:left;"><div class="l">📅 Date</div><div class="v" style="margin-top:.3rem;">${fmtDateTime(t.match_date)}</div></div>
        <div class="stat-box" style="text-align:left;"><div class="l">🪙 Entry</div><div class="v" style="margin-top:.3rem;">${rs(t.entry_fee)}</div></div>
      </div>
      <div class="grid grid-3">
        <div class="glass-strong" style="border-radius:.85rem; padding:1rem; text-align:center;">
          <div style="font-size:.62rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted-foreground);">Prize Pool</div>
          <div class="gold-text" style="margin-top:.3rem; font-size:1.8rem; font-weight:800;">${rs(t.prize_pool)}</div>
        </div>
        <div class="glass-strong" style="border-radius:.85rem; padding:1rem; text-align:center;">
          <div style="font-size:.62rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted-foreground);">Slots</div>
          <div class="neon-text" style="margin-top:.3rem; font-size:1.8rem; font-weight:800;">${remaining}<span class="muted" style="font-size:1rem;">/${t.total_slots}</span></div>
          <div class="slot-bar" style="margin-top:.5rem;"><div class="fill ${isFull ? "full" : ""}" style="width:${Math.min(100, (filled / t.total_slots) * 100)}%"></div></div>
        </div>
        <div class="glass-strong" style="border-radius:.85rem; padding:1rem; text-align:center;">
          <div style="font-size:.62rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted-foreground);">Status</div>
          <div style="margin-top:.3rem; font-size:1.3rem; font-weight:800; text-transform:uppercase; color:${isFull ? "#ef4444" : open ? "var(--neon)" : "var(--destructive)"};">${isFull ? "Full" : open ? "Open" : t.status.replace("_", " ")}</div>
        </div>
      </div>
      ${
        t.rules
          ? `<div style="border:1px solid oklch(0.84 0.17 89/12%); background:oklch(0.14 0.008 90/40%); border-radius:.85rem; padding:1.25rem;">
        <h3 class="gold-text" style="font-size:.85rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.5rem;">Rules</h3>
        <p class="muted" style="white-space:pre-line; font-size:.85rem;">${escapeHtml(t.rules)}</p>
      </div>`
          : ""
      }
      ${actionHTML.includes("btn-neon") || actionHTML.includes("btn-outline") ? `<div style="display:flex; gap:.75rem;">${actionHTML}</div>` : actionHTML}
    </div>
  </div>`;

}

render();

// realtime updates (subscribe once)
if (id) {
  supabase
    .channel(`tournament-detail:${id}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, () => render())
    .subscribe();
}
