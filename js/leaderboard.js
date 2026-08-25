import { supabase } from "./supabase-client.js";
import { renderLayout } from "./layout.js";
import { rs, escapeHtml } from "./format.js";

renderLayout();

let sort = "total_earnings";

async function load() {
  const { data } = await supabase
    .from("profiles")
    .select("id, pubg_username, total_wins, total_kills, total_earnings")
    .order(sort, { ascending: false })
    .limit(50);

  const list = document.getElementById("list");
  if (!data || data.length === 0) {
    list.innerHTML = `<p class="muted text-center" style="padding:1.5rem;">No ranked players yet.</p>`;
    return;
  }

  list.innerHTML = data
    .map((p, i) => {
      const rankBg = i === 0 ? "#fbbf24" : i === 1 ? "#d4d4d8" : i === 2 ? "#b45309" : "var(--secondary)";
      const rankColor = i < 3 ? "#000" : "var(--muted-foreground)";
      const rowBg = i < 3 ? "background:linear-gradient(90deg, oklch(1 0 0/8%), transparent);" : "";
      return `
      <div style="display:grid; grid-template-columns:40px 1fr auto; align-items:center; gap:.75rem; border-radius:.6rem; padding:.75rem; ${rowBg}">
        <div style="display:flex; height:2.2rem; width:2.2rem; align-items:center; justify-content:center; border-radius:999px; font-weight:800; background:${rankBg}; color:${rankColor};">${i + 1}</div>
        <div style="min-width:0; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(p.pubg_username) || "Anonymous"}</div>
        <div style="display:flex; gap:1rem; font-size:.75rem; flex-shrink:0;">
          <span><span class="muted">W </span><b>${p.total_wins}</b></span>
          <span><span class="muted">K </span><b>${p.total_kills}</b></span>
          <span class="gold-text" style="font-weight:800;">${rs(p.total_earnings)}</span>
        </div>
      </div>`;
    })
    .join("");
}

document.getElementById("sortRow").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-sort]");
  if (!btn) return;
  sort = btn.dataset.sort;
  document.querySelectorAll("#sortRow .pill").forEach((p) => p.classList.toggle("active", p === btn));
  load();
});

load();
