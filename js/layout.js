import { supabase } from "./supabase-client.js";

const LINKS = [
  { href: "index.html", label: "Home" },
  { href: "tournaments.html", label: "Tournaments" },
  { href: "leaderboard.html", label: "Leaderboard" },
  { href: "live.html", label: "Live" },
  { href: "contact.html", label: "Contact" },
];

function currentPage() {
  const p = window.location.pathname.split("/").pop() || "index.html";
  return p;
}

function headerHTML(user) {
  const page = currentPage();
  const navLinks = LINKS.map(
    (l) =>
      `<a href="${l.href}" class="${l.href === page ? "active" : ""}">${l.label}</a>`
  ).join("");

  const desktopAuth = user
    ? `<a href="dashboard.html" class="btn-outline btn-sm">Dashboard</a>
       <button id="signOutBtn" class="icon-btn" title="Sign out" style="font-size:1rem;">⎋</button>`
    : `<a href="auth.html" class="btn-outline btn-sm">Login</a>
       <a href="auth.html?mode=signup" class="btn-neon btn-sm">Sign Up</a>`;

  const mobileAuth = user
    ? `<a href="dashboard.html" class="btn-outline" style="flex:1;">Dashboard</a>
       <button id="signOutBtnMobile" class="btn-outline" style="flex:1; color:var(--destructive);">Sign out</button>`
    : `<a href="auth.html" class="btn-outline" style="flex:1;">Login</a>
       <a href="auth.html?mode=signup" class="btn-neon" style="flex:1;">Sign Up</a>`;

  return `
  <header class="site-header glass-strong">
    <div class="bar">
      <a href="index.html" class="brand">
        <img src="assets/logo.png" alt="PAK BATTLE" />
        <small class="mob">
          <div class="name">PAK BATTLE</div>
          <div class="tag">Battle · Win · Repeat</div>
        </small>
      </a>
      <nav class="main-nav">${navLinks}</nav>
      <div class="header-actions">
        <span id="liveDot" class="live-dot"><span class="dot"></span>Offline</span>
        ${desktopAuth}
      </div>
      <button class="menu-btn" id="menuBtn">☰</button>
    </div>
    <div class="mobile-menu glass-strong" id="mobileMenu">
      ${LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}
      <div class="mobile-actions">${mobileAuth}</div>
    </div>
  </header>`;
}

function footerHTML() {
  return `
  <footer class="site-footer">
    <div class="grid">
      <div>
        <div class="brand">
          <img src="assets/logo.png" alt="" />
          <div>
            <div class="name" style="font-size:1.2rem;">PAK BATTLE</div>
            <div class="tag">Battle · Win · Repeat</div>
          </div>
        </div>
        <p class="muted" style="margin-top:1rem; max-width:28rem; font-size:.9rem;">
          Pakistan's premier PUBG Mobile esports tournament platform. Daily paid tournaments with instant payouts via EasyPaisa &amp; JazzCash.
        </p>
      </div>
      <div>
        <h4 class="gold-text">Quick Links</h4>
        <ul>
          <li><a href="tournaments.html">Tournaments</a></li>
          <li><a href="leaderboard.html">Leaderboard</a></li>
          <li><a href="live.html">Live Stream</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 class="gold-text">Follow</h4>
        <div class="social-row">
          <a href="https://facebook.com/pakbattle" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
          <a href="https://www.instagram.com/pakbattle_official/" target="_blank" rel="noreferrer" aria-label="Instagram">ig</a>
          <a href="https://www.youtube.com/@pakbattleesports" target="_blank" rel="noreferrer" aria-label="YouTube">yt</a>
          <a href="https://wa.me/92359992565" target="_blank" rel="noreferrer" aria-label="WhatsApp">wa</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">© 2026 PAK BATTLE Esports. All rights reserved. Not affiliated with Krafton or PUBG Mobile.</div>
  </footer>`;
}

export async function renderLayout() {
  const headerRoot = document.getElementById("header");
  const footerRoot = document.getElementById("footer");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (headerRoot) headerRoot.innerHTML = headerHTML(user);
  if (footerRoot) footerRoot.innerHTML = footerHTML();

  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  menuBtn?.addEventListener("click", () => mobileMenu.classList.toggle("open"));

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  };
  document.getElementById("signOutBtn")?.addEventListener("click", signOut);
  document.getElementById("signOutBtnMobile")?.addEventListener("click", signOut);

  // live dot from site_settings
  refreshLiveDot();

  supabase.auth.onAuthStateChange((_e, session) => {
    const u = session?.user ?? null;
    if (headerRoot) headerRoot.innerHTML = headerHTML(u);
    // re-bind after re-render
    document.getElementById("menuBtn")?.addEventListener("click", () =>
      document.getElementById("mobileMenu")?.classList.toggle("open")
    );
    document.getElementById("signOutBtn")?.addEventListener("click", signOut);
    document.getElementById("signOutBtnMobile")?.addEventListener("click", signOut);
    refreshLiveDot();
  });

  return user;
}

async function refreshLiveDot() {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "live_stream")
    .maybeSingle();
  const dot = document.getElementById("liveDot");
  if (!dot) return;
  const isLive = !!data?.value?.is_live;
  dot.classList.toggle("live", isLive);
  dot.innerHTML = `<span class="dot"></span>${isLive ? "Live" : "Offline"}`;
}

export async function requireAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "auth.html";
    return null;
  }
  return session.user;
}

export async function isAdmin(userId) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}
