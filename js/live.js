import { supabase } from "./supabase-client.js";
import { renderLayout } from "./layout.js";

renderLayout();

async function load() {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "live_stream").maybeSingle();
  const v = data?.value ?? {};
  const isLive = !!v.is_live && v.youtube_video_id;
  document.getElementById("embed").innerHTML = isLive
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
        <p class="muted" style="margin-top:.5rem;">Subscribe to get notified the instant we go live.</p>
        <a href="https://www.youtube.com/@PakBattleESports" target="_blank" rel="noreferrer" class="yt-btn">▶ Subscribe on YouTube</a>
      </div>`;
}

load();
