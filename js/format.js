export const rs = (n) => "Rs. " + Number(n || 0).toLocaleString("en-PK");

const MATCH_TYPES = {
  erangel_squad: "Erangel Squad",
  erangel_duo: "Erangel Duo",
  erangel_solo: "Erangel Solo",
  livik_squad: "Livik Squad",
  livik_duo: "Livik Duo",
  livik_solo: "Livik Solo",
  tdm_4v4: "TDM 4v4",
  tdm_2v2: "TDM 2v2",
  tdm_1v1: "TDM 1v1",
};
export const matchTypeLabel = (t) => MATCH_TYPES[t] ?? t ?? "";

export function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeUntil(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Started";
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}
