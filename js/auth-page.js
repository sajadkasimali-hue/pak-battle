import { supabase } from "./supabase-client.js";
import { renderLayout } from "./layout.js";
import { qs } from "./format.js";
import { toast } from "./toast.js";

let mode = qs("mode") === "signup" ? "signup" : "login";

async function init() {
  const user = await renderLayout();
  if (user) {
    window.location.href = "dashboard.html";
    return;
  }
  applyMode();
}

function applyMode() {
  document.getElementById("authTitle").innerHTML =
    mode === "signup"
      ? `<span class="neon-text">Create</span> <span class="gold-text">Account</span>`
      : `<span class="neon-text">Welcome</span> <span class="gold-text">Back</span>`;
  document.getElementById("authSub").textContent = mode === "signup" ? "Join Pakistan's #1 PUBG arena" : "Sign in to continue";
  document.getElementById("signupFields").style.display = mode === "signup" ? "" : "none";
  document.getElementById("confirmField").style.display = mode === "signup" ? "" : "none";
  document.getElementById("submitBtn").textContent = mode === "signup" ? "Create Account" : "Sign In";
  document.getElementById("toggleMode").textContent = mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in";
  document.getElementById("forgotBtn").style.display = mode === "login" ? "" : "none";

  ["full_name", "pubg_uid", "pubg_username", "mobile"].forEach((id) => {
    document.getElementById(id).required = mode === "signup";
  });
  document.getElementById("confirm").required = mode === "signup";
}

document.getElementById("toggleMode").addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  applyMode();
});

document.getElementById("forgotBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return toast.error("Enter your email first");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}auth.html` });
  if (error) toast.error(error.message);
  else toast.success("Reset link sent to your email");
});

document.getElementById("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  btn.disabled = true;
  btn.textContent = "Please wait...";

  try {
    if (mode === "signup") {
      const confirm = document.getElementById("confirm").value;
      const full_name = document.getElementById("full_name").value.trim();
      const pubg_uid = document.getElementById("pubg_uid").value.trim();
      const pubg_username = document.getElementById("pubg_username").value.trim();
      const mobile = document.getElementById("mobile").value.trim();

      if (password !== confirm) throw new Error("Passwords don't match");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      if (!full_name || !pubg_uid || !pubg_username || !mobile) throw new Error("All fields are required");

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}dashboard.html`,
          data: { full_name, pubg_uid, pubg_username, mobile },
        },
      });
      if (error) throw error;
      toast.success("Account created! Welcome to PakBattle.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
    }
    window.location.href = "dashboard.html";
  } catch (err) {
    toast.error(err.message || "Something went wrong");
    btn.disabled = false;
    btn.textContent = mode === "signup" ? "Create Account" : "Sign In";
  }
});

init();
