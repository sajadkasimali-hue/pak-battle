import { supabase } from "./supabase-client.js";
import { rs, matchTypeLabel, fmtDateTime } from "./format.js";

export function tournamentCardHTML(t) {
  const filled = t.filled_slots ?? 0;
  const isFull = filled >= t.total_slots || !!t.full_at;
  const open = t.status === "registration_open" && !isFull;
  const remaining = Math.max(0, t.total_slots - filled);
  const pct = Math.min(100, (filled / Math.max(1, t.total_slots)) * 100);
  const statusClass = isFull ? "status-full" : open ? "status-open" : "status-closed";
  const statusLabel = isFull ? "Registration Closed" : open ? "Open" : t.status.replace("_", " ");

  return `
  <div class="t-card animate-float-up" data-id="${t.id}" data-total="${t.total_slots}">
    ${t.is_featured ? `<div class="tag-featured">★ Featured</div>` : ""}
    ${isFull ? `<div class="tag-full">Full</div>` : ""}
    <div class="banner">
      <div class="trophy">🏆</div>
      <div class="banner-bottom">
        <span class="chip">${matchTypeLabel(t.match_type)}</span>
        <span class="chip ${statusClass}" data-role="status-chip">${statusLabel}</span>
      </div>
    </div>
    <div class="body">
      <h3>${t.name}</h3>
      <div class="meta">
        <span>🗺️ ${t.map}</span>
        <span>👥 ${t.team_size}P</span>
        <span>📅 ${fmtDateTime(t.match_date)}</span>
        <span>🪙 ${rs(t.entry_fee)}</span>
      </div>
      <div class="prize-row">
        <div>
          <div style="font-size:.62rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted-foreground);">Prize Pool</div>
          <div class="amt gold-text">${rs(t.prize_pool)}</div>
        </div>
        <div style="font-size:1.6rem;">🏆</div>
      </div>
      <div>
        <div class="slot-line">
          <span><b data-role="filled">${filled}</b> / ${t.total_slots} slots</span>
          <span data-role="remaining" style="font-weight:700; color:${isFull ? "#ef4444" : "var(--primary)"};">${isFull ? "FULL" : remaining + " left"}</span>
        </div>
        <div class="slot-bar"><div class="fill ${isFull ? "full" : ""}" data-role="fill" style="width:${pct}%"></div></div>
      </div>
      <div class="actions">
        <a href="tournament.html?id=${t.id}" class="btn-details">Details</a>
        ${
          open
            ? `<a href="tournament.html?id=${t.id}" class="btn-neon">Join Now</a>`
            : `<button disabled class="btn-details" style="opacity:.7;">${isFull ? "Full" : "Closed"}</button>`
        }
      </div>
    </div>
  </div>`;
}

/** Subscribe to realtime slot updates for a list of rendered cards. */
export function subscribeCardUpdates(containerEl) {
  const channel = supabase
    .channel(`cards:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "tournaments" },
      (payload) => {
        const row = payload.new;
        const card = containerEl.querySelector(`.t-card[data-id="${row.id}"]`);
        if (!card) return;
        const total = Number(card.dataset.total);
        const filled = row.filled_slots ?? 0;
        const isFull = filled >= total || !!row.full_at;
        card.querySelector('[data-role="filled"]').textContent = filled;
        const remainingEl = card.querySelector('[data-role="remaining"]');
        remainingEl.textContent = isFull ? "FULL" : Math.max(0, total - filled) + " left";
        remainingEl.style.color = isFull ? "#ef4444" : "var(--primary)";
        const fillEl = card.querySelector('[data-role="fill"]');
        fillEl.style.width = Math.min(100, (filled / Math.max(1, total)) * 100) + "%";
        fillEl.classList.toggle("full", isFull);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
