import { supabase } from "./supabase-client.js";
import { renderLayout, requireAuth, isAdmin } from "./layout.js";
import { rs, matchTypeLabel, fmtDateTime, escapeHtml } from "./format.js";
import { toast } from "./toast.js";

let tab = "tournaments";
const panel = () => document.getElementById("adminPanel");

async function init() {
  await renderLayout();
  const user = await requireAuth();
  if (!user) return;

  const admin = await isAdmin(user.id);
  const gate = document.getElementById("gate");
  if (!admin) {
    gate.innerHTML = `
      <div style="max-width:32rem; margin:0 auto; text-align:center; padding-top:2rem;">
        <h2 style="font-size:1.4rem; font-weight:800;">Admin Access Required</h2>
        <p class="muted" style="margin-top:.5rem;">Your account doesn't have admin privileges. Ask the site owner to grant you the admin role.</p>
        <code style="display:inline-block; margin-top:1rem; background:var(--secondary); padding:.4rem .8rem; border-radius:.4rem; font-size:.75rem;">Your user ID: ${user.id}</code>
      </div>`;
    return;
  }
  gate.style.display = "none";
  document.getElementById("adminUi").style.display = "";

  document.getElementById("adminTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    tab = btn.dataset.tab;
    document.querySelectorAll("#adminTabs .pill").forEach((p) => p.classList.toggle("active", p === btn));
    draw();
  });

  draw();
}

function draw() {
  if (tab === "tournaments") return drawTournaments();
  if (tab === "payments") return drawPayments();
  if (tab === "rooms") return drawRooms();
  if (tab === "results") return drawResults();
  if (tab === "players") return drawPlayers();
  if (tab === "settings") return drawSettings();
}

/* ================= Tournaments ================= */
const MATCH_TYPE_OPTIONS = ["erangel_squad","erangel_duo","erangel_solo","livik_squad","livik_duo","livik_solo","tdm_4v4","tdm_2v2","tdm_1v1"];
const STATUS_OPTIONS = ["upcoming","registration_open","live","completed","cancelled"];

async function drawTournaments(editing) {
  const { data } = await supabase.from("tournaments").select("*").order("match_date", { ascending: false });

  panel().innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
      <h2 class="gold-text" style="font-weight:800;">Manage Tournaments</h2>
      <button id="newTBtn" class="btn-neon btn-sm">+ New</button>
    </div>
    <div id="tFormWrap"></div>
    <div style="display:flex; flex-direction:column; gap:.5rem;" id="tList">
      ${(data ?? [])
        .map(
          (t) => `
        <div class="row-item">
          <div class="grow"><div class="t1">${escapeHtml(t.name)} ${t.is_featured ? "★" : ""}</div><div class="t2">${matchTypeLabel(t.match_type)} · ${fmtDateTime(t.match_date)} · ${rs(t.entry_fee)} entry</div></div>
          <span class="badge pending" style="background:var(--secondary); color:var(--foreground);">${t.status.replace("_", " ")}</span>
          <button data-edit="${t.id}" style="border:none; background:none; color:var(--primary); font-size:.7rem; font-weight:700; text-transform:uppercase;">Edit</button>
          <button data-del="${t.id}" class="icon-btn danger">🗑</button>
        </div>`
        )
        .join("") || `<p class="muted">No tournaments yet.</p>`}
    </div>`;

  document.getElementById("newTBtn").addEventListener("click", () => tournamentForm(null));
  panel().querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => tournamentForm((data ?? []).find((t) => t.id === b.dataset.edit)))
  );
  panel().querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Delete this tournament?")) return;
      const { error } = await supabase.from("tournaments").delete().eq("id", b.dataset.del);
      if (error) toast.error(error.message);
      else {
        toast.success("Deleted");
        drawTournaments();
      }
    })
  );

  if (editing !== undefined) tournamentForm(editing);
}

function tournamentForm(t) {
  const f = t ?? {
    name: "", match_type: "erangel_squad", map: "Erangel", entry_fee: 200, prize_pool: 15000,
    team_size: 4, total_slots: 100, match_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    status: "registration_open", is_featured: false, description: "", rules: "",
  };
  document.getElementById("tFormWrap").innerHTML = `
    <div class="form-box">
      <div class="grid2">
        <label class="field"><span>Name</span><input id="f_name" value="${escapeHtml(f.name)}" /></label>
        <label class="field"><span>Match Type</span><select id="f_match_type">${MATCH_TYPE_OPTIONS.map((o) => `<option value="${o}" ${o === f.match_type ? "selected" : ""}>${o}</option>`).join("")}</select></label>
        <label class="field"><span>Map</span><input id="f_map" value="${escapeHtml(f.map)}" /></label>
        <label class="field"><span>Team Size</span><input id="f_team_size" type="number" value="${f.team_size}" /></label>
        <label class="field"><span>Entry Fee</span><input id="f_entry_fee" type="number" value="${f.entry_fee}" /></label>
        <label class="field"><span>Prize Pool</span><input id="f_prize_pool" type="number" value="${f.prize_pool}" /></label>
        <label class="field"><span>Total Slots</span><input id="f_total_slots" type="number" value="${f.total_slots}" /></label>
        <label class="field"><span>Match Date</span><input id="f_match_date" type="datetime-local" value="${(f.match_date || "").slice(0, 16)}" /></label>
        <label class="field"><span>Status</span><select id="f_status">${STATUS_OPTIONS.map((o) => `<option value="${o}" ${o === f.status ? "selected" : ""}>${o}</option>`).join("")}</select></label>
        <label style="display:flex; align-items:center; gap:.5rem; margin-top:1.4rem;"><input id="f_featured" type="checkbox" ${f.is_featured ? "checked" : ""} /> Featured</label>
      </div>
      <label class="field" style="margin-top:.75rem;"><span>Description</span><textarea id="f_description" rows="2">${escapeHtml(f.description ?? "")}</textarea></label>
      <label class="field"><span>Rules</span><textarea id="f_rules" rows="3">${escapeHtml(f.rules ?? "")}</textarea></label>
      <div style="display:flex; gap:.5rem; margin-top:.5rem;">
        <button id="f_save" class="btn-neon btn-sm">Save</button>
        <button id="f_cancel" class="btn-outline btn-sm">Cancel</button>
      </div>
    </div>`;

  document.getElementById("f_cancel").addEventListener("click", () => (document.getElementById("tFormWrap").innerHTML = ""));
  document.getElementById("f_save").addEventListener("click", async () => {
    const payload = {
      name: document.getElementById("f_name").value,
      match_type: document.getElementById("f_match_type").value,
      map: document.getElementById("f_map").value,
      team_size: Number(document.getElementById("f_team_size").value),
      entry_fee: Number(document.getElementById("f_entry_fee").value),
      prize_pool: Number(document.getElementById("f_prize_pool").value),
      total_slots: Number(document.getElementById("f_total_slots").value),
      match_date: new Date(document.getElementById("f_match_date").value).toISOString(),
      status: document.getElementById("f_status").value,
      is_featured: document.getElementById("f_featured").checked,
      description: document.getElementById("f_description").value,
      rules: document.getElementById("f_rules").value,
    };
    const res = t ? await supabase.from("tournaments").update(payload).eq("id", t.id) : await supabase.from("tournaments").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      toast.success("Saved");
      drawTournaments();
    }
  });
}

/* ================= Payments ================= */
let paymentFilter = "pending";
async function drawPayments() {
  const { data } = await supabase
    .from("payments")
    .select("*, tournaments(name, entry_fee), profiles!payments_user_id_fkey(pubg_username, pubg_uid, mobile)")
    .eq("status", paymentFilter)
    .order("created_at", { ascending: false });

  panel().innerHTML = `
    <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.5rem; margin-bottom:1rem;">
      <h2 class="gold-text" style="font-weight:800;">Payment Verification</h2>
      <div style="display:flex; gap:.35rem;">
        ${["pending", "approved", "rejected"].map((s) => `<button class="pill ${s === paymentFilter ? "active" : ""}" data-f="${s}" style="padding:.4rem .8rem; font-size:.6rem;">${s}</button>`).join("")}
      </div>
    </div>
    <div style="display:flex; flex-direction:column; gap:.75rem;" id="pList">
      ${(data ?? [])
        .map(
          (p) => `
        <div class="row-item" style="align-items:flex-start; flex-direction:column;">
          <div style="display:flex; width:100%; justify-content:space-between; gap:.75rem; flex-wrap:wrap;">
            <div class="grow">
              <div class="t1">${escapeHtml(p.profiles?.pubg_username || "Unknown")} — ${escapeHtml(p.tournaments?.name)}</div>
              <div class="t2">UID: ${escapeHtml(p.profiles?.pubg_uid)} · ${escapeHtml(p.profiles?.mobile)}</div>
              <div class="t2" style="margin-top:.2rem;"><b>${p.method.toUpperCase()}</b> · TXID: <code style="background:var(--secondary); padding:.1rem .35rem; border-radius:.3rem;">${escapeHtml(p.transaction_id)}</code> · ${rs(p.amount)}</div>
            </div>
            <div style="display:flex; gap:.4rem;">
              ${p.screenshot_url ? `<button data-view="${p.id}" data-path="${p.screenshot_url}" class="icon-btn">👁</button>` : ""}
              ${
                p.status === "pending"
                  ? `<button data-approve="${p.id}" data-reg="${p.registration_id}" data-user="${p.user_id}" data-tname="${escapeHtml(p.tournaments?.name)}" data-tid="${p.tournament_id}" class="btn-sm" style="background:var(--primary); color:var(--primary-foreground); border:none; border-radius:.4rem;">✔</button>
                     <button data-reject="${p.id}" data-reg="${p.registration_id}" data-user="${p.user_id}" data-tid="${p.tournament_id}" class="btn-sm" style="background:var(--destructive); color:#fff; border:none; border-radius:.4rem;">✕</button>`
                  : ""
              }
            </div>
          </div>
          <div class="imgSlot" style="width:100%;"></div>
        </div>`
        )
        .join("") || `<p class="muted" style="padding:1rem 0;">No ${paymentFilter} payments.</p>`}
    </div>`;

  panel().querySelectorAll("[data-f]").forEach((b) =>
    b.addEventListener("click", () => {
      paymentFilter = b.dataset.f;
      drawPayments();
    })
  );

  panel().querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", async () => {
      const { data: signed } = await supabase.storage.from("payment-screenshots").createSignedUrl(b.dataset.path, 300);
      const slot = b.closest(".row-item").querySelector(".imgSlot");
      slot.innerHTML = signed?.signedUrl ? `<img src="${signed.signedUrl}" style="max-height:20rem; margin-top:.75rem; border-radius:.5rem; border:1px solid var(--border); cursor:pointer;" />` : "";
      slot.querySelector("img")?.addEventListener("click", () => (slot.innerHTML = ""));
    })
  );

  panel().querySelectorAll("[data-approve]").forEach((b) =>
    b.addEventListener("click", () => reviewPayment(b.dataset.approve, b.dataset.reg, b.dataset.user, "approved", b.dataset.tid, b.dataset.tname))
  );
  panel().querySelectorAll("[data-reject]").forEach((b) =>
    b.addEventListener("click", () => {
      const note = prompt("Reason for rejection?");
      if (note !== null) reviewPayment(b.dataset.reject, b.dataset.reg, b.dataset.user, "rejected", b.dataset.tid, "", note);
    })
  );
}

async function reviewPayment(paymentId, regId, userId, status, tournamentId, tname, note) {
  const { error } = await supabase.from("payments").update({ status, admin_note: note ?? null, reviewed_at: new Date().toISOString() }).eq("id", paymentId);
  if (error) return toast.error(error.message);
  await supabase.from("registrations").update({ status }).eq("id", regId);
  await supabase.from("notifications").insert({
    user_id: userId,
    title: status === "approved" ? "Payment Approved" : "Payment Rejected",
    message: status === "approved" ? `Your slot in ${tname} is reserved.` : note ? `Reason: ${note}` : "Your payment was rejected. Contact support.",
    link: `/tournament.html?id=${tournamentId}`,
  });
  toast.success(`Marked ${status}`);
  drawPayments();
}

/* ================= Rooms ================= */
async function drawRooms() {
  const { data } = await supabase.from("tournaments").select("id, name, match_date, room_id, room_password").in("status", ["registration_open", "live", "upcoming"]).order("match_date");
  panel().innerHTML = `
    <h2 class="gold-text" style="font-weight:800; margin-bottom:1rem;">Room ID / Password</h2>
    <div style="display:flex; flex-direction:column; gap:.75rem;">
      ${(data ?? [])
        .map(
          (t) => `
        <div class="row-item" style="display:grid; grid-template-columns:1fr; gap:.5rem;" data-row="${t.id}">
          <div><div class="t1">${escapeHtml(t.name)}</div><div class="t2">${fmtDateTime(t.match_date)}</div></div>
          <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
            <input placeholder="Room ID" value="${escapeHtml(t.room_id ?? "")}" class="field" style="flex:1; min-width:120px;" data-room />
            <input placeholder="Password" value="${escapeHtml(t.room_password ?? "")}" class="field" style="flex:1; min-width:120px;" data-pass />
            <button class="btn-neon btn-sm" data-save-room="${t.id}">Save</button>
          </div>
        </div>`
        )
        .join("") || `<p class="muted">No active tournaments.</p>`}
    </div>`;

  panel().querySelectorAll("[data-save-room]").forEach((b) =>
    b.addEventListener("click", async () => {
      const row = b.closest("[data-row]");
      const room_id = row.querySelector("[data-room]").value;
      const room_password = row.querySelector("[data-pass]").value;
      const { error } = await supabase.from("tournaments").update({ room_id, room_password }).eq("id", b.dataset.saveRoom);
      if (error) toast.error(error.message);
      else toast.success("Room saved");
    })
  );
}

/* ================= Results ================= */
let selectedTid = "";
async function drawResults() {
  const { data: tournaments } = await supabase.from("tournaments").select("id, name").order("match_date", { ascending: false });

  panel().innerHTML = `
    <h2 class="gold-text" style="font-weight:800; margin-bottom:1rem;">Publish Results</h2>
    <select id="tidSelect" class="field" style="max-width:26rem;">
      <option value="">Select tournament...</option>
      ${(tournaments ?? []).map((t) => `<option value="${t.id}" ${t.id === selectedTid ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}
    </select>
    <div id="resultsBody" style="margin-top:1rem;"></div>`;

  document.getElementById("tidSelect").addEventListener("change", (e) => {
    selectedTid = e.target.value;
    drawResultsBody();
  });
  if (selectedTid) drawResultsBody();
}

async function drawResultsBody() {
  const body = document.getElementById("resultsBody");
  if (!selectedTid) {
    body.innerHTML = "";
    return;
  }
  const { data: results } = await supabase.from("results").select("*, profiles(pubg_username)").eq("tournament_id", selectedTid).order("position");

  body.innerHTML = `
    <div class="form-box" style="display:grid; grid-template-columns:1fr; gap:.5rem;">
      <div class="grid" style="grid-template-columns:1fr 70px 70px 90px 1fr; gap:.5rem;">
        <input id="r_name" placeholder="Player Name" class="field" style="margin:0;" />
        <input id="r_pos" type="number" placeholder="Pos" value="1" class="field" style="margin:0;" />
        <input id="r_kills" type="number" placeholder="Kills" value="0" class="field" style="margin:0;" />
        <input id="r_prize" type="number" placeholder="Prize" value="0" class="field" style="margin:0;" />
        <input id="r_uid" placeholder="User ID (optional)" class="field" style="margin:0;" />
      </div>
      <button id="r_add" class="btn-neon btn-sm" style="width:fit-content;">Add</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:.5rem;">
      ${(results ?? [])
        .map(
          (r) => `
        <div class="row-item">
          <div class="gold-text" style="font-size:1.2rem; font-weight:800;">#${r.position}</div>
          <div class="grow"><div class="t1">${escapeHtml(r.player_name)}</div><div class="t2">${r.kills} kills · ${rs(r.prize_amount)}</div></div>
          <button data-del-result="${r.id}" class="icon-btn danger">🗑</button>
        </div>`
        )
        .join("") || `<p class="muted">No results yet for this tournament.</p>`}
    </div>`;

  document.getElementById("r_add").addEventListener("click", async () => {
    const player_name = document.getElementById("r_name").value.trim();
    const position = Number(document.getElementById("r_pos").value);
    const kills = Number(document.getElementById("r_kills").value);
    const prize_amount = Number(document.getElementById("r_prize").value);
    const user_id = document.getElementById("r_uid").value.trim() || null;
    if (!player_name) return toast.error("Player name");

    const { error } = await supabase.from("results").insert({ tournament_id: selectedTid, player_name, position, kills, prize_amount, user_id });
    if (error) return toast.error(error.message);

    if (user_id) {
      const { data: prof } = await supabase.from("profiles").select("total_wins, total_kills, total_earnings").eq("id", user_id).maybeSingle();
      if (prof) {
        await supabase
          .from("profiles")
          .update({
            total_wins: (prof.total_wins ?? 0) + (position === 1 ? 1 : 0),
            total_kills: (prof.total_kills ?? 0) + kills,
            total_earnings: Number(prof.total_earnings ?? 0) + prize_amount,
          })
          .eq("id", user_id);
      }
      await supabase.from("notifications").insert({ user_id, title: "Result Published", message: `You finished #${position} with ${kills} kills.`, link: "/dashboard.html" });
    }
    toast.success("Result saved");
    drawResultsBody();
  });

  body.querySelectorAll("[data-del-result]").forEach((b) =>
    b.addEventListener("click", async () => {
      await supabase.from("results").delete().eq("id", b.dataset.delResult);
      drawResultsBody();
    })
  );
}

/* ================= Players ================= */
let playerQuery = "";
async function drawPlayers() {
  let q = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
  if (playerQuery) q = q.ilike("pubg_username", `%${playerQuery}%`);
  const { data } = await q;

  panel().innerHTML = `
    <h2 class="gold-text" style="font-weight:800; margin-bottom:1rem;">Players</h2>
    <input id="playerSearch" placeholder="Search by username..." class="field" value="${escapeHtml(playerQuery)}" style="max-width:26rem;" />
    <div style="display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem;">
      ${(data ?? [])
        .map(
          (p) => `
        <div class="row-item">
          <div class="grow"><div class="t1">${escapeHtml(p.pubg_username)} <span class="muted" style="font-weight:400;">(${escapeHtml(p.full_name)})</span></div><div class="t2">UID: ${escapeHtml(p.pubg_uid)} · ${escapeHtml(p.mobile)} · ${escapeHtml(p.email)}</div></div>
          <div style="font-size:.75rem;">${p.total_wins}W · ${p.total_kills}K · ${rs(p.total_earnings)}</div>
          <button data-promote="${p.id}" class="btn-outline btn-sm" style="color:var(--accent);">Make Admin</button>
        </div>`
        )
        .join("") || `<p class="muted">No players found.</p>`}
    </div>`;

  document.getElementById("playerSearch").addEventListener("input", (e) => {
    playerQuery = e.target.value;
    drawPlayers();
  });
  panel().querySelectorAll("[data-promote]").forEach((b) =>
    b.addEventListener("click", async () => {
      const { error } = await supabase.from("user_roles").insert({ user_id: b.dataset.promote, role: "admin" });
      if (error) toast.error(error.message);
      else {
        toast.success("Promoted to admin");
        drawPlayers();
      }
    })
  );
}

/* ================= Settings ================= */
async function drawSettings() {
  const { data } = await supabase.from("site_settings").select("*");
  const m = {};
  (data ?? []).forEach((r) => (m[r.key] = r.value));
  const pa = m.payment_accounts ?? {};
  const c = m.contact ?? {};
  const st = m.stats ?? {};
  const live = m.live_stream ?? {};

  panel().innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2rem;">
      <div>
        <h3 class="gold-text" style="font-size:.85rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.75rem;">Payment Accounts</h3>
        <div class="grid grid-2">
          ${["easypaisa", "jazzcash"]
            .map(
              (mth) => `
            <div class="form-box" style="margin-bottom:0;">
              <div style="font-weight:700; text-transform:uppercase; margin-bottom:.5rem;">${mth}</div>
              <label class="field"><span>Title</span><input id="pa_${mth}_title" value="${escapeHtml(pa[mth]?.title ?? "")}" /></label>
              <label class="field"><span>Number</span><input id="pa_${mth}_number" value="${escapeHtml(pa[mth]?.number ?? "")}" /></label>
            </div>`
            )
            .join("")}
        </div>
        <button id="savePA" class="btn-neon btn-sm" style="margin-top:.75rem;">Save Accounts</button>
      </div>

      <div>
        <h3 class="gold-text" style="font-size:.85rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.75rem;">Live Stream</h3>
        <div class="grid grid-2">
          <label class="field"><span>YouTube Video ID</span><input id="ls_id" value="${escapeHtml(live.youtube_video_id ?? "")}" placeholder="e.g. jfKfPfyJRdk" /></label>
          <label style="display:flex; align-items:center; gap:.5rem; margin-top:1.4rem;"><input id="ls_islive" type="checkbox" ${live.is_live ? "checked" : ""} /> Currently Live</label>
        </div>
        <button id="saveLive" class="btn-neon btn-sm" style="margin-top:.75rem;">Save Live Stream</button>
      </div>

      <div>
        <h3 class="gold-text" style="font-size:.85rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.75rem;">Contact</h3>
        <div class="grid grid-2">
          ${["whatsapp", "email", "facebook", "instagram", "youtube", "discord"].map((k) => `<label class="field"><span>${k}</span><input id="c_${k}" value="${escapeHtml(c[k] ?? "")}" /></label>`).join("")}
        </div>
        <button id="saveContact" class="btn-neon btn-sm" style="margin-top:.75rem;">Save Contact</button>
      </div>

      <div>
        <h3 class="gold-text" style="font-size:.85rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.75rem;">Homepage Stats</h3>
        <div class="grid" style="grid-template-columns:repeat(1,1fr);" id="statsGrid">
          ${["total_players", "online_players", "daily_tournaments", "prize_distributed", "total_winners"].map((k) => `<label class="field"><span>${k}</span><input id="st_${k}" type="number" value="${st[k] ?? 0}" /></label>`).join("")}
        </div>
        <button id="saveStats" class="btn-neon btn-sm" style="margin-top:.75rem;">Save Stats</button>
      </div>
    </div>`;

  document.getElementById("statsGrid").style.gridTemplateColumns = "repeat(auto-fit, minmax(160px, 1fr))";

  async function save(key, value) {
    const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  document.getElementById("savePA").addEventListener("click", () =>
    save("payment_accounts", {
      easypaisa: { title: document.getElementById("pa_easypaisa_title").value, number: document.getElementById("pa_easypaisa_number").value },
      jazzcash: { title: document.getElementById("pa_jazzcash_title").value, number: document.getElementById("pa_jazzcash_number").value },
    })
  );

  document.getElementById("saveLive").addEventListener("click", () =>
    save("live_stream", { youtube_video_id: document.getElementById("ls_id").value, is_live: document.getElementById("ls_islive").checked })
  );

  document.getElementById("saveContact").addEventListener("click", () => {
    const obj = {};
    ["whatsapp", "email", "facebook", "instagram", "youtube", "discord"].forEach((k) => (obj[k] = document.getElementById(`c_${k}`).value));
    save("contact", obj);
  });

  document.getElementById("saveStats").addEventListener("click", () => {
    const obj = {};
    ["total_players", "online_players", "daily_tournaments", "prize_distributed", "total_winners"].forEach((k) => (obj[k] = Number(document.getElementById(`st_${k}`).value)));
    save("stats", obj);
  });
}

init();
