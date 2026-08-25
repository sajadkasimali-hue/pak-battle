import { supabase } from "./supabase-client.js";
import { renderLayout, requireAuth, isAdmin } from "./layout.js";
import { rs, matchTypeLabel, fmtDateTime, escapeHtml } from "./format.js";
import { toast } from "./toast.js";

let user = null;
let tab = "profile";

function badgeClass(s) {
  return s === "approved" ? "approved" : s === "rejected" ? "rejected" : "pending";
}

async function init() {
  await renderLayout();
  user = await requireAuth();
  if (!user) return;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  document.getElementById("welcomeName").textContent = profile?.pubg_username || profile?.full_name || "";

  if (await isAdmin(user.id)) document.getElementById("adminLink").style.display = "";

  document.getElementById("tabRow").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    tab = btn.dataset.tab;
    document.querySelectorAll("#tabRow button").forEach((b) => b.classList.toggle("active", b === btn));
    draw(profile);
  });

  draw(profile);
}

async function draw(profile) {
  const panel = document.getElementById("panel");
  panel.innerHTML = `<p class="muted">Loading...</p>`;

  if (tab === "profile") {
    panel.innerHTML = `
    <h2 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem;" class="gold-text">Profile</h2>
    <div class="grid grid-2">
      <label class="field"><span>Full Name</span><input id="p_full_name" value="${escapeHtml(profile.full_name)}" /></label>
      <label class="field"><span>PUBG UID</span><input id="p_pubg_uid" value="${escapeHtml(profile.pubg_uid)}" /></label>
      <label class="field"><span>PUBG Username</span><input id="p_pubg_username" value="${escapeHtml(profile.pubg_username)}" /></label>
      <label class="field"><span>Mobile</span><input id="p_mobile" value="${escapeHtml(profile.mobile)}" /></label>
    </div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr); margin-top:1rem;">
      <div class="stat-box"><div class="v">${profile.total_wins}</div><div class="l">Total Wins</div></div>
      <div class="stat-box"><div class="v">${profile.total_kills}</div><div class="l">Total Kills</div></div>
      <div class="stat-box"><div class="v gold-text">${rs(profile.total_earnings)}</div><div class="l">Earnings</div></div>
    </div>
    <button id="saveProfile" class="btn-neon" style="margin-top:1.25rem;">💾 Save</button>`;

    document.getElementById("saveProfile").addEventListener("click", async () => {
      const payload = {
        full_name: document.getElementById("p_full_name").value,
        pubg_uid: document.getElementById("p_pubg_uid").value,
        pubg_username: document.getElementById("p_pubg_username").value,
        mobile: document.getElementById("p_mobile").value,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Profile updated");
        Object.assign(profile, payload);
      }
    });
  }

  if (tab === "tournaments") {
    const { data } = await supabase.from("registrations").select("*, tournaments(*), payments(*)").eq("user_id", user.id).order("created_at", { ascending: false });
    panel.innerHTML = `<h2 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem;" class="gold-text">My Tournaments</h2>` +
      (!data || data.length === 0
        ? `<div class="empty-box">You haven't joined any tournaments yet.<br/><a href="tournaments.html" class="btn-neon btn-sm" style="display:inline-block; margin-top:1rem;">Browse tournaments</a></div>`
        : `<div style="display:flex; flex-direction:column; gap:.75rem;">${data
            .map(
              (r) => `
        <div class="row-item">
          <span style="font-size:1.6rem;">🏆</span>
          <div class="grow"><div class="t1">${escapeHtml(r.tournaments?.name)}</div><div class="t2">${matchTypeLabel(r.tournaments?.match_type)} · ${fmtDateTime(r.tournaments?.match_date)}</div></div>
          <span class="badge ${badgeClass(r.status)}">${r.status}</span>
          <a href="tournament.html?id=${r.tournament_id}" style="font-size:.7rem; font-weight:700; text-transform:uppercase; color:var(--primary);">View</a>
        </div>`
            )
            .join("")}</div>`);
  }

  if (tab === "history") {
    const { data } = await supabase.from("results").select("*, tournaments(name, match_type)").eq("user_id", user.id).order("created_at", { ascending: false });
    panel.innerHTML = `<h2 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem;" class="gold-text">Match History</h2>` +
      (!data || data.length === 0
        ? `<div class="empty-box">No match history yet.</div>`
        : `<div style="display:flex; flex-direction:column; gap:.75rem;">${data
            .map(
              (h) => `
        <div class="row-item">
          <div class="gold-text" style="font-size:1.4rem; font-weight:800;">#${h.position}</div>
          <div class="grow"><div class="t1">${escapeHtml(h.tournaments?.name)}</div><div class="t2">${h.kills} kills · ${fmtDateTime(h.created_at)}</div></div>
          <div class="gold-text" style="font-weight:800;">${rs(h.prize_amount)}</div>
        </div>`
            )
            .join("")}</div>`);
  }

  if (tab === "payments") {
    const { data } = await supabase.from("payments").select("*, tournaments(name)").eq("user_id", user.id).order("created_at", { ascending: false });
    panel.innerHTML = `<h2 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem;" class="gold-text">Payments</h2>` +
      (!data || data.length === 0
        ? `<div class="empty-box">No payments yet.</div>`
        : `<div style="display:flex; flex-direction:column; gap:.75rem;">${data
            .map(
              (p) => `
        <div class="row-item">
          <div class="grow"><div class="t1">${escapeHtml(p.tournaments?.name)}</div><div class="t2">${p.method.toUpperCase()} · TXID: ${escapeHtml(p.transaction_id)}</div></div>
          <div style="font-weight:800;">${rs(p.amount)}</div>
          <span class="badge ${badgeClass(p.status)}">${p.status}</span>
        </div>`
            )
            .join("")}</div>`);
  }

  if (tab === "notifications") {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    panel.innerHTML = `<h2 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem;" class="gold-text">Notifications</h2>` +
      (!data || data.length === 0
        ? `<div class="empty-box">You're all caught up.</div>`
        : `<div style="display:flex; flex-direction:column; gap:.75rem;">${data
            .map(
              (n) => `
        <div class="row-item notif" data-id="${n.id}" style="cursor:pointer; align-items:flex-start; ${n.read ? "" : "border-color:oklch(0.84 0.17 89/40%); background:oklch(0.84 0.17 89/5%);"}">
          <div class="grow">
            <div class="t1">${escapeHtml(n.title)}</div>
            <div class="t2" style="margin-top:.2rem;">${escapeHtml(n.message)}</div>
          </div>
          <div style="font-size:.6rem; text-transform:uppercase; color:var(--muted-foreground); flex-shrink:0;">${fmtDateTime(n.created_at)}</div>
        </div>`
            )
            .join("")}</div>`);

    panel.querySelectorAll(".notif").forEach((el) =>
      el.addEventListener("click", async () => {
        await supabase.from("notifications").update({ read: true }).eq("id", el.dataset.id);
        draw(profile);
      })
    );
  }

  if (tab === "settings") {
    panel.innerHTML = `
    <h2 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem;" class="gold-text">Settings</h2>
    <div style="font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:var(--muted-foreground);">Email</div>
    <div style="margin-top:.25rem; font-weight:700;">${escapeHtml(user.email)}</div>
    <label class="field" style="margin-top:1.25rem;"><span>New Password</span><input id="newPw" type="password" /></label>
    <button id="updatePw" class="btn-neon">Update Password</button>`;

    document.getElementById("updatePw").addEventListener("click", async () => {
      const pw = document.getElementById("newPw").value;
      if (pw.length < 8) return toast.error("Password must be at least 8 chars");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) toast.error(error.message);
      else {
        toast.success("Password updated");
        document.getElementById("newPw").value = "";
      }
    });
  }
}

init();
