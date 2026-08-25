import { supabase } from "./supabase-client.js";
import { renderLayout, requireAuth } from "./layout.js";
import { rs, qs, escapeHtml } from "./format.js";
import { toast } from "./toast.js";

const id = qs("id");
let method = "easypaisa";
let copiedKey = "";

async function init() {
  await renderLayout();
  const user = await requireAuth();
  if (!user) return;

  const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: settingsRow } = await supabase.from("site_settings").select("value").eq("key", "payment_accounts").maybeSingle();
  const settings = settingsRow?.value ?? {};

  if (!t) {
    document.getElementById("content").innerHTML = `<p class="muted">Tournament not found.</p>`;
    return;
  }

  function acc() {
    return settings[method] ?? {};
  }

  function draw() {
    const a = acc();
    document.getElementById("content").innerHTML = `
    <div class="glass card" style="margin-top:1.5rem;">
      <h2 style="font-size:1.1rem; font-weight:700;">${escapeHtml(t.name)}</h2>
      <div class="grid grid-2" style="margin-top:.75rem; font-size:.9rem;">
        <div class="stat-box" style="text-align:left;"><div class="l">Entry Fee</div><div class="v" style="margin-top:.3rem;">${rs(t.entry_fee)}</div></div>
        <div class="stat-box" style="text-align:left;"><div class="l">Prize Pool</div><div class="v gold-text" style="margin-top:.3rem;">${rs(t.prize_pool)}</div></div>
        <div class="stat-box" style="text-align:left;"><div class="l">Player</div><div class="v" style="margin-top:.3rem;">${escapeHtml(profile?.pubg_username ?? "")}</div></div>
        <div class="stat-box" style="text-align:left;"><div class="l">PUBG UID</div><div class="v" style="margin-top:.3rem;">${escapeHtml(profile?.pubg_uid ?? "")}</div></div>
      </div>
    </div>

    <form id="joinForm" class="glass card" style="margin-top:1.5rem; display:flex; flex-direction:column; gap:1.25rem;">
      <div>
        <div style="margin-bottom:.5rem; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:var(--muted-foreground);">Select Payment Method</div>
        <div class="method-grid">
          <button type="button" data-method="easypaisa" class="method-box ${method === "easypaisa" ? "selected" : ""}">
            <div class="name easypaisa">EasyPaisa</div><div class="muted" style="font-size:.72rem; margin-top:.2rem;">Tap to select</div>
          </button>
          <button type="button" data-method="jazzcash" class="method-box ${method === "jazzcash" ? "selected" : ""}">
            <div class="name jazzcash">JazzCash</div><div class="muted" style="font-size:.72rem; margin-top:.2rem;">Tap to select</div>
          </button>
        </div>
      </div>

      ${
        a.title || a.number
          ? `<div style="border:1px solid oklch(0.84 0.17 89/30%); background:oklch(0.84 0.17 89/5%); border-radius:.85rem; padding:1rem;">
        <div class="gold-text" style="font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em;">Send ${rs(t.entry_fee)} to:</div>
        <div style="margin-top:.6rem; display:flex; flex-direction:column; gap:.4rem;">
          <div class="copy-row"><div><span class="muted" style="font-size:.75rem;">Title:</span> <b>${escapeHtml(a.title)}</b></div><button type="button" data-copy="${escapeHtml(a.title)}" data-key="title">${copiedKey === "title" ? "✓" : "⧉"}</button></div>
          <div class="copy-row"><div><span class="muted" style="font-size:.75rem;">Number:</span> <b>${escapeHtml(a.number)}</b></div><button type="button" data-copy="${escapeHtml(a.number)}" data-key="num">${copiedKey === "num" ? "✓" : "⧉"}</button></div>
        </div>
      </div>`
          : ""
      }

      <label class="field"><span>Transaction ID</span><input id="txid" required /></label>

      ${t.team_size > 1 ? `<label class="field"><span>Team Name (optional)</span><input id="teamName" /></label>` : ""}

      <label class="field">
        <span>Payment Screenshot</span>
        <div class="upload-box"><span>📤</span><input id="fileInput" type="file" accept="image/*" required style="flex:1;" /></div>
      </label>

      <button type="submit" id="submitBtn" class="btn-neon">Submit Payment</button>
      <p class="muted text-center" style="font-size:.75rem;">Your slot will be reserved after admin approves the payment.</p>
    </form>`;

    document.querySelectorAll(".method-box").forEach((b) =>
      b.addEventListener("click", () => {
        method = b.dataset.method;
        draw();
      })
    );
    document.querySelectorAll("[data-copy]").forEach((b) =>
      b.addEventListener("click", () => {
        navigator.clipboard.writeText(b.dataset.copy);
        copiedKey = b.dataset.key;
        draw();
        setTimeout(() => {
          copiedKey = "";
        }, 1500);
      })
    );

    document.getElementById("joinForm").addEventListener("submit", submit);
  }

  async function submit(e) {
    e.preventDefault();
    const txid = document.getElementById("txid").value.trim();
    const file = document.getElementById("fileInput").files[0];
    const teamName = document.getElementById("teamName")?.value.trim() ?? "";
    if (!txid) return toast.error("Enter transaction ID");
    if (!file) return toast.error("Upload payment screenshot");

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Submitting...";
    try {
      const { data: existing } = await supabase.from("registrations").select("id").eq("tournament_id", id).eq("user_id", user.id).maybeSingle();
      let regId = existing?.id;
      if (!regId) {
        const { data: created, error } = await supabase
          .from("registrations")
          .insert({ tournament_id: id, user_id: user.id, team_name: teamName || null, status: "pending" })
          .select("id")
          .single();
        if (error) throw error;
        regId = created.id;
      }

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: pErr } = await supabase.from("payments").insert({
        registration_id: regId,
        user_id: user.id,
        tournament_id: id,
        method,
        transaction_id: txid,
        amount: t.entry_fee,
        screenshot_url: path,
        status: "pending",
      });
      if (pErr) throw pErr;

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Payment Submitted",
        message: `Your payment for ${t.name} is pending verification.`,
        link: `/tournament.html?id=${id}`,
      });

      toast.success("Payment submitted! Awaiting admin verification.");
      window.location.href = "dashboard.html";
    } catch (err) {
      toast.error(err.message || "Something went wrong");
      btn.disabled = false;
      btn.textContent = "Submit Payment";
    }
  }

  draw();
}

init();
