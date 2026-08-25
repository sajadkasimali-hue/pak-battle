import { supabase } from "./supabase-client.js";
import { renderLayout } from "./layout.js";
import { escapeHtml } from "./format.js";
import { toast } from "./toast.js";

let user = null;
let rating = 5;

async function init() {
  user = await renderLayout();

  const { data } = await supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle();
  const c = data?.value ?? {};

  document.getElementById("contactBox").innerHTML = `
    <h3 class="gold-text" style="font-size:.85rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.75rem;">Quick Contact</h3>
    ${
      c.whatsapp
        ? `<a href="https://wa.me/${c.whatsapp.replace(/\D/g, "")}" target="_blank" rel="noreferrer" class="row-item" style="border-color:oklch(0.84 0.17 89/30%); background:oklch(0.84 0.17 89/10%); margin-bottom:.6rem;">
        <span style="font-size:1.4rem;">💬</span><div><div class="t1">WhatsApp Support</div><div class="t2">${escapeHtml(c.whatsapp)}</div></div>
      </a>`
        : ""
    }
    ${
      c.email
        ? `<a href="mailto:${c.email}" class="row-item" style="margin-bottom:.6rem;">
        <span style="font-size:1.4rem;">✉️</span><div><div class="t1">Email</div><div class="t2">${escapeHtml(c.email)}</div></div>
      </a>`
        : ""
    }
    <div style="display:flex; gap:.5rem; padding-top:.5rem;">
      ${c.facebook ? `<a href="${c.facebook}" target="_blank" rel="noreferrer" class="btn-outline" style="flex:1; text-align:center;">f</a>` : ""}
      ${c.instagram ? `<a href="${c.instagram}" target="_blank" rel="noreferrer" class="btn-outline" style="flex:1; text-align:center;">ig</a>` : ""}
      ${c.youtube ? `<a href="${c.youtube}" target="_blank" rel="noreferrer" class="btn-outline" style="flex:1; text-align:center;">yt</a>` : ""}
      ${c.discord ? `<a href="${c.discord}" target="_blank" rel="noreferrer" class="btn-outline" style="flex:1; text-align:center; font-size:.65rem;">Discord</a>` : ""}
    </div>`;

  document.getElementById("reviewHint").textContent = user ? "" : "Sign in required to post.";
  drawStars();
}

function drawStars() {
  document.querySelectorAll("#starRow button").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.n) <= rating);
  });
}

document.getElementById("starRow").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-n]");
  if (!b) return;
  rating = Number(b.dataset.n);
  drawStars();
});

document.getElementById("reviewForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!user) return toast.error("Please sign in to leave a review");
  const comment = document.getElementById("comment").value.trim();
  if (!comment) return toast.error("Write a comment");
  const { error } = await supabase.from("reviews").insert({ user_id: user.id, rating, comment });
  if (error) toast.error(error.message);
  else {
    toast.success("Review posted");
    document.getElementById("comment").value = "";
    rating = 5;
    drawStars();
  }
});

init();
