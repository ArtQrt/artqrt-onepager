/* artqrt: gemeinsame Einstellungen, Sprache und Navigation fuer alle Seiten */
(function () {
  const KEY = "artqrt-lang";
  let lang = "de";
  try { if (localStorage.getItem(KEY) === "en") lang = "en"; } catch (e) {}
  if (lang === "en") document.documentElement.classList.add("i18n-pending");

  /* Zentrale Config: alle veraenderbaren Werte hier.
     Paketpreise und Laufzeiten stehen zusaetzlich fest im HTML und im JSON-LD von unternehmen.html sowie in index.html (data-from), bei Aenderungen dort mitziehen. */
  const CONFIG = {
    brand: "artqrt",
    email: "info@artqrt.de",
    backend: {                                   // Supabase-Projekt "artqrt" (Frankfurt). url: null = Demo-Modus
      url: "https://pxysbalpzvbzqacanlmb.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXNiYWxwenZienFhY2FubG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTE4NDcsImV4cCI6MjEwNzIyNzg0N30.hkNlT6p-uU4sYy--30HqSMkF4TtcLH0uC8NTsPiZ9AI"   // öffentlicher Schlüssel, darf im Code stehen
    },
    vat: 19,                                     // MwSt. in %
    packages: [
      { id: "essential", name: "Essential", net: 349, works: 3, premium: "no", curation: false },
      { id: "studio", name: "Studio", net: 579, works: 5, premium: "optional", curation: false },
      { id: "signature", name: "Signature", net: 990, works: 8, premium: "yes", curation: true }
    ],
    swapMonths: 6,                               // Werkwechsel, fuer alle Pakete gleich
    minTermMonths: 3, renewMonths: 3, noticeWeeks: 4,
    freightSurcharge: 35                         // Platzhalter: Zuschlag pro Speditions-Werk und Monat, netto
  };

  const T = (de, en) => (lang === "en" ? en : de);
  const money = n => new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE",
    { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
  const gross = n => Math.round(n * (100 + CONFIG.vat)) / 100;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* Startseite: Beispielwerk ueber dem Sideboard ausrichten */
  function layoutRoom() {
    const room = document.querySelector(".room"), svg = document.querySelector(".room-svg"), p = document.getElementById("painting");
    if (!room || !svg || !p) return;
    const rh = room.clientHeight, sh = svg.getBoundingClientRect().height, unit = sh / 750, bottom = rh - sh + 470 * unit;
    const fp = Math.max(5, Math.round(8 * unit * 1.4)); p.style.setProperty("--fp", fp + "px");
    const h = Math.min(300 * unit, bottom - Math.max(18, rh * 0.05) - 2 * fp), w = h * 0.8;
    p.style.width = w + "px"; p.style.height = h + "px"; p.style.top = (bottom - h - 2 * fp) + "px";
  }

  /* Anmeldung: Sitzung liegt im Browser (localStorage) und wird bei Bedarf erneuert */
  const SKEY = "artqrt-session", B = CONFIG.backend;
  const auth = {
    get() { try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return null; } },
    save(s) {
      const v = { access_token: s.access_token, refresh_token: s.refresh_token, user: s.user || null,
        expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (+s.expires_in || 3600) };
      try { localStorage.setItem(SKEY, JSON.stringify(v)); } catch (e) {}
      return v;
    },
    clear() { try { localStorage.removeItem(SKEY); } catch (e) {} },
    async token() {
      let s = auth.get(); if (!s || !s.access_token) return null;
      if (s.expires_at - 60 < Date.now() / 1000) {
        const r = await fetch(`${B.url}/auth/v1/token?grant_type=refresh_token`, { method: "POST",
          headers: { apikey: B.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
        if (!r.ok) { auth.clear(); return null; }
        s = auth.save(await r.json());
      }
      return s.access_token;
    },
    /* Aufruf an Supabase im Namen des angemeldeten Kontos */
    async api(path, opts = {}) {
      const t = await auth.token(); if (!t) throw new Error("no-session");
      return fetch(B.url + path, Object.assign({}, opts, { headers: Object.assign({ apikey: B.anonKey, Authorization: `Bearer ${t}` }, opts.headers || {}) }));
    }
  };

  window.ARTQRT = { lang, T, CONFIG, money, gross, esc, layoutRoom, auth };

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    if (lang === "en") {
      root.lang = "en";
      if (root.dataset.titleEn) document.title = root.dataset.titleEn;
      document.querySelectorAll("[data-en]").forEach(el => { el.innerHTML = el.dataset.en; });
      document.querySelectorAll("[data-en-placeholder]").forEach(el => { el.placeholder = el.dataset.enPlaceholder; });
      document.querySelectorAll("[data-en-label]").forEach(el => { el.setAttribute("aria-label", el.dataset.enLabel); });
    }
    root.classList.remove("i18n-pending");

    const login = document.querySelector('.nav-tools a[href="login.html"]');
    if (login && auth.get()) { login.href = "konto.html"; login.textContent = T("Konto", "Account"); }

    const btn = document.getElementById("lang");
    if (btn) {
      btn.textContent = lang === "en" ? "DE" : "EN";
      btn.setAttribute("aria-label", lang === "en" ? "Auf Deutsch wechseln" : "Switch to English");
      btn.addEventListener("click", () => {
        try { localStorage.setItem(KEY, lang === "en" ? "de" : "en"); } catch (e) {}
        location.reload();
      });
    }
    const nav = document.getElementById("nav");
    if (nav) { const onScroll = () => nav.classList.toggle("is-solid", scrollY > 24); onScroll(); addEventListener("scroll", onScroll, { passive: true }); }
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(a => { if (a.getAttribute("href") === page) a.setAttribute("aria-current", "page"); });
    const yr = document.getElementById("yr"); if (yr) yr.textContent = new Date().getFullYear();
  });
})();
