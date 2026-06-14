/* Graduation Party 2026 — main app */
const { useState, useEffect, useMemo, useRef } = React;

const PALETTE = [
  "#9d2de3",
  "#a82cd5",
  "#cb2baa",
  "#f12b8d",
  "#f47c1b",
  "#f6e437",
];
const TARGET = new Date("2026-06-17T17:30:00");

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  style: "confetti",
  accent: "#f12b8d",
  displayFont: "Unbounded",
  confetti: true,
}; /*EDITMODE-END*/

const FONT_STACKS = {
  Unbounded: '"Unbounded", system-ui, sans-serif',
  "Baloo 2": '"Baloo 2", system-ui, sans-serif',
  "Chau Philomene One": '"Chau Philomene One", system-ui, sans-serif',
};

/* ---------- Confetti ---------- */
function Confetti({ on }) {
  const pieces = useMemo(() => {
    return Array.from({ length: 46 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      bg: PALETTE[i % PALETTE.length],
      delay: -Math.random() * 12,
      dur: 7 + Math.random() * 8,
      size: 8 + Math.random() * 8,
      round: Math.random() > 0.6,
    }));
  }, []);
  if (!on) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i
          key={p.id}
          style={{
            left: p.left + "%",
            background: p.bg,
            animationDelay: p.delay + "s",
            animationDuration: p.dur + "s",
            width: p.size,
            height: p.size * 1.3,
            borderRadius: p.round ? "50%" : "3px",
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Countdown ---------- */
function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const s = Math.floor(diff / 1000);
  return {
    done: diff === 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

function Countdown({ t }) {
  const c = useCountdown(TARGET);
  const pad = (n) => String(n).padStart(2, "0");
  if (c.done) {
    return (
      <div className="countdown">
        <div className="cd-cell" style={{ minWidth: 260 }}>
          <div className="cd-num" style={{ fontSize: 36 }}>
            {t.countdown.started}
          </div>
        </div>
      </div>
    );
  }
  const cells = [
    [c.days, t.countdown.days],
    [pad(c.hours), t.countdown.hours],
    [pad(c.mins), t.countdown.mins],
    [pad(c.secs), t.countdown.secs],
  ];
  return (
    <div className="countdown">
      {cells.map(([n, label], i) => (
        <div className="cd-cell" key={i}>
          <div className="cd-num">{n}</div>
          <div className="cd-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- RSVP form ---------- */
const PRICE = 5000;
const fmtTng = (n) => n.toLocaleString("ru-RU") + " ₸";

/* ───────────────────────────────────────────────────────────
   GOOGLE ТАБЛИЦА: вставьте сюда ссылку вашего Web App
   (см. инструкцию). Пока пусто — заявки сохраняются в браузере.
   ─────────────────────────────────────────────────────────── */
const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxuZXOolzuFp5SmUmCaTRxOF7ifHieW6elT1Soze37NWGRG6nyoJzxvcU1L71sq5Ed7/exec";

function sendToSheet(entry) {
  if (!SHEET_ENDPOINT) return;
  const ru = (r) => (r === "student" ? "Ученик" : "Родитель");
  const payload = {
    ts: entry.ts,
    name: entry.name,
    role: ru(entry.role),
    people: entry.people,
    total: entry.total,
    guests: entry.guests.map((g) => `${g.name} (${ru(g.role)})`).join("; "),
  };
  fetch(SHEET_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* заявка уже сохранена в браузере */
  });
}

function RolePills({ value, onChange, t }) {
  return (
    <div className="role-pills">
      <button
        type="button"
        className={value === "student" ? "on" : ""}
        onClick={() => onChange("student")}
      >
        🎓 {t.rsvp.student}
      </button>
      <button
        type="button"
        className={value === "parent" ? "on" : ""}
        onClick={() => onChange("parent")}
      >
        👨‍👩‍👧 {t.rsvp.parent}
      </button>
    </div>
  );
}

function Rsvp({ t }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [guests, setGuests] = useState([]); // [{name, role}]
  const [errs, setErrs] = useState({});
  const [sent, setSent] = useState(false);
  const [data, setData] = useState(null);

  const people = 1 + guests.length;
  const hasStudent =
    role === "student" || guests.some((g) => g.role === "student");
  const hasParent =
    role === "parent" || guests.some((g) => g.role === "parent");
  // Student: 5000 ₸. Parents: 5000 ₸ total for all parents (even both). Max 10000.
  const total = (hasStudent ? PRICE : 0) + (hasParent ? PRICE : 0);

  const addGuest = () =>
    setGuests((g) => (g.length < 9 ? [...g, { name: "", role: "" }] : g));
  const removeGuest = (i) => setGuests((g) => g.filter((_, idx) => idx !== i));
  const setGuest = (i, key, val) =>
    setGuests((g) => g.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)));

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!name.trim()) er.name = t.rsvp.errName;
    if (!role) er.role = t.rsvp.errRole;
    guests.forEach((gst, i) => {
      if (!gst.name.trim()) er["gn" + i] = t.rsvp.errName;
      if (!gst.role) er["gr" + i] = t.rsvp.errRole;
    });
    setErrs(er);
    if (Object.keys(er).length) {
      const first = document.querySelector(".rsvp-card .err");
      if (first)
        window.scrollTo({
          top: first.getBoundingClientRect().top + window.scrollY - 120,
          behavior: "smooth",
        });
      return;
    }
    const entry = {
      name: name.trim(),
      role,
      guests: guests.map((g) => ({ name: g.name.trim(), role: g.role })),
      people,
      total,
      ts: new Date().toISOString(),
    };
    try {
      const all = JSON.parse(localStorage.getItem("party_rsvps_2026") || "[]");
      all.push(entry);
      localStorage.setItem("party_rsvps_2026", JSON.stringify(all));
    } catch (err) {
      /* storage unavailable */
    }
    sendToSheet(entry);
    setData(entry);
    setSent(true);
    window.scrollTo({
      top: document.getElementById("rsvp").offsetTop - 70,
      behavior: "smooth",
    });
  };
  const reset = () => {
    setName("");
    setRole("");
    setGuests([]);
    setErrs({});
    setSent(false);
    setData(null);
  };

  if (sent && data) {
    let savedCount = 0;
    try {
      savedCount = JSON.parse(
        localStorage.getItem("party_rsvps_2026") || "[]",
      ).length;
    } catch (e) {}
    const everyone = [{ name: data.name, role: data.role }, ...data.guests];
    return (
      <div className="rsvp-card">
        <div className="rsvp-success">
          <div className="big">{t.rsvp.successBig}</div>
          <h3>{t.rsvp.successTitle}</h3>
          <p>{t.rsvp.successSub}</p>
          <div className="summary">
            {everyone.map((p, i) => (
              <span key={i}>
                {p.name} ·{" "}
                {p.role === "student" ? t.rsvp.sum.student : t.rsvp.sum.parent}
              </span>
            ))}
          </div>
          <div className="success-total">
            <span>
              {data.people} {t.rsvp.sum.people}
            </span>
            <span className="amt">
              {fmtTng(data.total)} <em>{t.rsvp.sum.paid}</em>
            </span>
          </div>
          <p className="saved-note">
            {t.rsvp.savedNote} <b>{savedCount}</b>
          </p>
          <div>
            <button className="reset" onClick={reset}>
              {t.rsvp.reset}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="rsvp-card" onSubmit={submit} noValidate>
      {/* Main attendee */}
      <div className="attendee-head">{t.rsvp.youLabel}</div>
      <div className={"field" + (errs.name ? " err" : "")}>
        <label>{t.rsvp.name}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.rsvp.namePh}
        />
        {errs.name && <div className="msg">{errs.name}</div>}
      </div>
      <div className={"field" + (errs.role ? " err" : "")}>
        <label>{t.rsvp.role}</label>
        <RolePills value={role} onChange={setRole} t={t} />
        {errs.role && <div className="msg">{errs.role}</div>}
      </div>

      {/* Additional guests */}
      <div className="guests-block">
        <div className="guests-head">
          <span>{t.rsvp.guestsTitle}</span>
          <button type="button" className="add-guest" onClick={addGuest}>
            + {t.rsvp.addGuest}
          </button>
        </div>
        {guests.map((g, i) => (
          <div className="guest-card" key={i}>
            <div className="guest-card-head">
              <span>
                {t.rsvp.guestWord} {i + 1}
              </span>
              <button
                type="button"
                className="rm-guest"
                onClick={() => removeGuest(i)}
              >
                ✕ {t.rsvp.remove}
              </button>
            </div>
            <div className={"field" + (errs["gn" + i] ? " err" : "")}>
              <input
                value={g.name}
                onChange={(e) => setGuest(i, "name", e.target.value)}
                placeholder={t.rsvp.guestNamePh}
              />
              {errs["gn" + i] && <div className="msg">{errs["gn" + i]}</div>}
            </div>
            <div
              className={"field" + (errs["gr" + i] ? " err" : "")}
              style={{ marginBottom: 0 }}
            >
              <RolePills
                value={g.role}
                onChange={(v) => setGuest(i, "role", v)}
                t={t}
              />
              {errs["gr" + i] && <div className="msg">{errs["gr" + i]}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="total-box">
        {hasStudent && (
          <div className="bd-line">
            <span>🎓 {t.rsvp.lineStudent}</span>
            <span>{fmtTng(PRICE)}</span>
          </div>
        )}
        {hasParent && (
          <div className="bd-line">
            <span>👨‍👩‍👧 {t.rsvp.lineParents}</span>
            <span>{fmtTng(PRICE)}</span>
          </div>
        )}
        {!hasStudent && !hasParent && (
          <div className="bd-line bd-empty">
            <span>{t.rsvp.role}</span>
            <span>—</span>
          </div>
        )}
        <div className="bd-total">
          <span>{t.rsvp.totalLabel}</span>
          <b>{fmtTng(total)}</b>
        </div>
      </div>
      <p className="price-note">ℹ️ {t.rsvp.priceNote}</p>

      <button className="submit-btn" type="submit">
        {t.rsvp.submit} 🎉
      </button>
    </form>
  );
}

/* ---------- Venue photo gallery ---------- */
function VenueGallery({ t }) {
  const photos = [
    { src: "venue/grads.webp", cap: t.venue.caps.grads },
    { src: "venue/table.jpg", cap: t.venue.caps.table },
    { src: "venue/terrace.jpg", cap: t.venue.caps.terrace },
    { src: "venue/sunset.jpg", cap: t.venue.caps.sunset },
  ];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => {
      if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <div className="venue-gallery">
      <div className="vg-main" onClick={() => setZoom(true)}>
        <img src={photos[active].src} alt={photos[active].cap} />
        <div className="vg-cap">
          <span>{photos[active].cap}</span>
          <span className="vg-zoom">⤢</span>
        </div>
      </div>
      <div className="vg-thumbs">
        {photos.map((p, i) => (
          <button
            key={i}
            className={"vg-thumb" + (i === active ? " on" : "")}
            onClick={() => setActive(i)}
            aria-label={p.cap}
          >
            <img src={p.src} alt={p.cap} loading="lazy" />
          </button>
        ))}
      </div>
      {zoom && (
        <div className="vg-lightbox" onClick={() => setZoom(false)}>
          <button
            className="vg-close"
            aria-label="Close"
            onClick={() => setZoom(false)}
          >
            ✕
          </button>
          <img
            src={photos[active].src}
            alt={photos[active].cap}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="vg-lb-cap">{photos[active].cap}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- App ---------- */
function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [lang, setLang] = useState(
    () => localStorage.getItem("party_lang") || "kz",
  );
  const t = window.CONTENT[lang];

  useEffect(() => {
    localStorage.setItem("party_lang", lang);
  }, [lang]);

  // apply tweaks to :root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-style", tw.style);
    root.style.setProperty("--accent", tw.accent);
    root.style.setProperty(
      "--font-display",
      FONT_STACKS[tw.displayFont] || FONT_STACKS.Unbounded,
    );
  }, [tw.style, tw.accent, tw.displayFont]);

  const go = (id) => () => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: "smooth" });
  };

  return (
    <div>
      {/* Top bar */}
      <header className="topbar">
        <div className="brand">
          <img className="school-logo" src="logo.png" alt="Mugalim" />
        </div>
        <div className="lang-toggle" role="group" aria-label="Language">
          <button
            className={lang === "kz" ? "on" : ""}
            onClick={() => setLang("kz")}
          >
            ҚАЗ
          </button>
          <button
            className={lang === "ru" ? "on" : ""}
            onClick={() => setLang("ru")}
          >
            РУС
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="blob b3"></div>
        <Confetti on={tw.confetti} />
        <div className="wrap hero-inner">
          <span className="eyebrow">{t.hero.eyebrow}</span>
          <h1>
            <span className="spectrum-text">{t.hero.title}</span>
            <span className="year spectrum-text">{t.hero.year}</span>
          </h1>
          <p className="hero-sub">{t.hero.sub}</p>
          <div>
            <div className="date-chip">
              <span className="dot"></span>
              {t.hero.dateLabel}
            </div>
          </div>
          <Countdown t={t} />
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={go("rsvp")}>
              {t.hero.ctaPrimary}
            </button>
            <button className="btn btn-ghost" onClick={go("schedule")}>
              {t.hero.ctaGhost}
            </button>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="block" id="schedule">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">{t.schedule.kicker}</div>
            <h2>{t.schedule.title}</h2>
            <p>{t.schedule.sub}</p>
          </div>
          <div className="timeline">
            {t.schedule.items.map((it, i) => (
              <div className={"tl-card c" + (i + 1)} key={i}>
                <div className="tl-emoji">{it.emoji}</div>
                <div className="tl-time">{it.time}</div>
                <h3>{it.title}</h3>
                <p>{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Venue */}
      <section className="block" id="venue" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="venue-grid">
            <div className="venue-info">
              <div
                className="kicker section-head"
                style={{ margin: 0, textAlign: "left" }}
              >
                <span
                  style={{
                    color: "var(--accent)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  {t.venue.kicker}
                </span>
              </div>
              <h2 style={{ marginTop: 12 }}>{t.venue.title}</h2>
              <div className="addr">
                {t.venue.rows.map((r, i) => (
                  <div className="addr-row" key={i}>
                    <div className="ic">{r.ic}</div>
                    <div>
                      {r.main}
                      <span className="muted">{r.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
              <a
                className="map-btn"
                href="https://2gis.kz/almaty/firm/70000001067854236?m=76.903565%2C43.205423%2F18.25%2Fr%2F4"
                target="_blank"
                rel="noopener"
              >
                📍 {t.venue.mapBtn}
              </a>
            </div>
            <div className="map-slot map-gallery">
              <VenueGallery t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section className="block rsvp" id="rsvp">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">{t.rsvp.kicker}</div>
            <h2>{t.rsvp.title}</h2>
            <p>{t.rsvp.sub}</p>
          </div>
          <div className="parent-notice">
            <span className="pn-ic">👪</span>
            <span>
              <b>20</b> · {t.rsvp.parentLimit}
            </span>
          </div>
          <Rsvp t={t} />
        </div>
      </section>

      {/* Footer */}
      <footer className="foot">
        <div className="big spectrum-text">{t.foot.big}</div>
        <p>{t.foot.note}</p>
      </footer>

      {/* Tweaks */}
      <TweaksPanel>
        <TweakSection label={lang === "kz" ? "Стиль" : "Стиль"} />
        <TweakRadio
          label={lang === "kz" ? "Бағыт" : "Направление"}
          value={tw.style}
          options={["confetti", "carnival", "blocks"]}
          onChange={(v) => setTweak("style", v)}
        />
        <TweakColor
          label={lang === "kz" ? "Акцент түсі" : "Акцент"}
          value={tw.accent}
          options={PALETTE}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakSelect
          label={lang === "kz" ? "Тақырып қаріпі" : "Шрифт заголовков"}
          value={tw.displayFont}
          options={["Unbounded", "Baloo 2", "Chau Philomene One"]}
          onChange={(v) => setTweak("displayFont", v)}
        />
        <TweakToggle
          label="Confetti 🎊"
          value={tw.confetti}
          onChange={(v) => setTweak("confetti", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
