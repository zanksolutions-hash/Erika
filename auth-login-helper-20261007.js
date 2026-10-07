import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wlaypzkiokwknwioxwoq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KC7o5nOGfz4dzQrgUhc1Mg_ATbDqzYI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const message = document.getElementById("loginMessage");

if (form && emailInput && passwordInput && message) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    message.textContent = "Connexion…";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const detail = error.message || "Erreur inconnue";
        message.textContent = `Connexion refusée : ${detail}`;
        return;
      }

      if (!data?.session) {
        message.textContent = "Connexion non établie. Réessaie dans quelques secondes.";
        return;
      }

      message.textContent = "Connexion réussie…";
      window.location.reload();
    } catch (error) {
      message.textContent = `Erreur de connexion : ${error?.message || "impossible de joindre Supabase"}`;
    }
  }, true);
}
