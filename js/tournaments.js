import { supabase } from "./supabase-client.js";
import { renderLayout } from "./layout.js";
import { tournamentCardHTML, subscribeCardUpdates } from "./tournament-card.js";

renderLayout();

let all = [];
let filter = "all";
let query = "";

function render() {
  let list = all;
  if (filter !== "all") list = list.filter((t) => t.match_type.startsWith(filter));
  if (query) list = list.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  const grid = document.getElementById("grid");
  document.getElementById("status").style.display = "none";
  if (list.length === 0) {
    grid.innerHTML = `<p class="muted" style="grid-column:1/-1;">No tournaments match your filters.</p>`;
    return;
  }
  grid.innerHTML = list.map(tournamentCardHTML).join("");
  subscribeCardUpdates(grid);
}

async function load() {
  const { data, error } = await supabase.from("tournaments").select("*").order("match_date");
  if (error) {
    document.getElementById("status").textContent = "Failed to load tournaments.";
    return;
  }
  all = data ?? [];
  render();
}

document.getElementById("filterRow").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-filter]");
  if (!btn) return;
  filter = btn.dataset.filter;
  document.querySelectorAll("#filterRow .pill").forEach((p) => p.classList.toggle("active", p === btn));
  render();
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  query = e.target.value;
  render();
});

load();
