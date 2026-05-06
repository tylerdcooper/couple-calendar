/**
 * Couple Calendar — Home Assistant Panel
 * A beautiful, touch-first shared calendar for two.
 * Designed for wall-mounted 21" touchscreens.
 * Read-only: events are managed from your phone via Google Calendar.
 */

// ─── Utilities ────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function startOfDay(d) { const n = new Date(d); n.setHours(0,0,0,0); return n; }
function addDays(d, n)  { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d,n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)  { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59); }

function startOfWeek(d, firstDay = 0) {
  const diff = (d.getDay() - firstDay + 7) % 7;
  return startOfDay(addDays(d, -diff));
}

function formatTime(date, format24) {
  return date.toLocaleTimeString([], {
    hour: "numeric", minute: "2-digit", hour12: !format24,
  });
}

function parseEventDT(dtObj) {
  if (!dtObj) return null;
  const s = dtObj.dateTime || dtObj.date;
  if (!s) return null;
  if (s.length === 10) { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); }
  return new Date(s);
}

function luminance(hex) {
  const [r,g,b] = hex.replace("#","").match(/.{2}/g).map(h => {
    const c = parseInt(h,16)/255;
    return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function textOnBg(hex) { return luminance(hex) > 0.35 ? "#1a1a2e" : "#ffffff"; }

// ─── Styles ───────────────────────────────────────────────────────────────────

function buildStyles(cfg) {
  const isDark = cfg.theme === "dark" ||
    (cfg.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const p = isDark ? {
    bg: "#0D1117", surface: "#161B22", surfaceAlt: "#1F2937", surfaceHov: "#243040",
    border: "rgba(255,255,255,0.07)", borderFocus: "rgba(255,255,255,0.18)",
    text: "#F0F6FC", textSub: "#8B949E", textMuted: "#484F58",
    today: "#FBBF24", todayText: "#0D1117",
    shadow: "rgba(0,0,0,0.6)", overlay: "rgba(13,17,23,0.85)",
  } : {
    bg: "#F5F7FA", surface: "#FFFFFF", surfaceAlt: "#EEF1F6", surfaceHov: "#E5E9F0",
    border: "rgba(0,0,0,0.08)", borderFocus: "rgba(0,0,0,0.22)",
    text: "#1A1A2E", textSub: "#4B5563", textMuted: "#9CA3AF",
    today: "#F59E0B", todayText: "#1A1A2E",
    shadow: "rgba(0,0,0,0.18)", overlay: "rgba(0,0,0,0.55)",
  };

  const aColor = cfg.personA?.color || "#818CF8";

  return `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  :host, .panel-root {
    display: flex; flex-direction: column; height: 100%; width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
    background: ${p.bg}; color: ${p.text}; overflow: hidden;
    user-select: none; -webkit-user-select: none;
  }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 24px 14px;
    background: ${p.surface}; border-bottom: 1px solid ${p.border};
    flex-shrink: 0; z-index: 10;
  }
  .header-left { display: flex; align-items: center; gap: 12px; flex: 1; }
  .menu-btn {
    width: 48px; height: 48px; border-radius: 12px; border: none; cursor: pointer;
    background: transparent; color: ${p.textSub};
    display: flex; align-items: center; justify-content: center; transition: background 0.15s;
  }
  .menu-btn:hover, .menu-btn:active { background: ${p.surfaceAlt}; }
  .nav-btn {
    width: 44px; height: 44px; border-radius: 10px; border: none; cursor: pointer;
    background: ${p.surfaceAlt}; color: ${p.text};
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, transform 0.1s; flex-shrink: 0;
  }
  .nav-btn:active { transform: scale(0.93); background: ${p.surfaceHov}; }
  .header-title { flex: 1; }
  .header-month { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }
  .header-year  { font-size: 14px; color: ${p.textSub}; margin-top: 2px; }
  .today-btn {
    padding: 10px 20px; border-radius: 10px; border: 1px solid ${p.border};
    background: transparent; color: ${p.text}; cursor: pointer; font-size: 15px; font-weight: 500;
    transition: background 0.15s;
  }
  .today-btn:active { background: ${p.surfaceAlt}; }
  .refresh-btn {
    width: 44px; height: 44px; border-radius: 10px; border: none; cursor: pointer;
    background: ${p.surfaceAlt}; color: ${p.textSub};
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, transform 0.15s;
  }
  .refresh-btn:active { background: ${p.surfaceHov}; }
  .refresh-btn.spinning svg { animation: spin 0.7s linear infinite; }
  .view-switcher { display: flex; gap: 6px; }
  .view-btn {
    padding: 10px 18px; border-radius: 10px; border: 1px solid ${p.border};
    background: transparent; color: ${p.textSub}; cursor: pointer; font-size: 14px; font-weight: 500;
    transition: all 0.15s;
  }
  .view-btn.active {
    background: ${aColor}22; color: ${aColor}; border-color: ${aColor}55;
  }

  /* ── Legend / filter bar ── */
  .legend {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 10px 24px;
    background: ${p.surface}; border-bottom: 1px solid ${p.border}; flex-shrink: 0;
  }
  .legend-filter {
    padding: 7px 16px; border-radius: 20px; border: 1px solid transparent;
    cursor: pointer; font-size: 13px; font-weight: 600;
    background: ${p.surfaceAlt}; color: ${p.textSub};
    display: flex; align-items: center; gap: 7px; transition: all 0.15s;
  }
  .legend-filter.active { border-color: currentColor; background: transparent; }
  .legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .legend-spacer { flex: 1; }
  .last-updated {
    font-size: 12px; color: ${p.textMuted}; white-space: nowrap;
  }

  /* ── Main ── */
  .main { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }

  /* ── Month grid ── */
  .month-view { display: flex; flex-direction: column; height: 100%; }
  .weekday-header {
    display: grid; grid-template-columns: repeat(7, 1fr);
    padding: 0 4px; border-bottom: 1px solid ${p.border};
    background: ${p.surface}; flex-shrink: 0;
  }
  .weekday-label {
    padding: 10px 4px; text-align: center; font-size: 12px; font-weight: 700;
    color: ${p.textSub}; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .month-grid {
    flex: 1; display: grid; grid-template-rows: repeat(6, 1fr);
    padding: 4px; gap: 4px; overflow: hidden;
  }
  .month-grid.five-rows { grid-template-rows: repeat(5, 1fr); }
  .week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .day-cell {
    background: ${p.surface}; border: 1px solid ${p.border}; border-radius: 12px;
    padding: 8px; display: flex; flex-direction: column;
    overflow: hidden; transition: background 0.12s; position: relative; min-height: 0;
  }
  .day-cell.other-month { opacity: 0.32; }
  .day-cell.today { border-color: ${p.today}66; }
  .day-number {
    font-size: 17px; font-weight: 600; line-height: 1;
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; align-self: flex-start;
  }
  .day-cell.today .day-number { background: ${p.today}; color: ${p.todayText}; font-weight: 800; }
  .event-chips { display: flex; flex-direction: column; gap: 3px; margin-top: 5px; flex: 1; overflow: hidden; }
  .event-chip {
    padding: 3px 7px; border-radius: 5px; font-size: 12px; font-weight: 500;
    line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    cursor: pointer; transition: opacity 0.1s;
  }
  .event-chip:active { opacity: 0.7; }
  .more-events {
    font-size: 11px; color: ${p.textSub}; font-weight: 700;
    padding: 2px 4px; margin-top: 1px; cursor: pointer;
  }

  /* ── Week view ── */
  .week-view { display: flex; flex-direction: column; height: 100%; }
  .week-day-header {
    display: grid; gap: 2px; flex-shrink: 0;
    background: ${p.surface}; border-bottom: 1px solid ${p.border}; padding: 10px 0 8px;
  }
  .week-day-col-header { text-align: center; cursor: default; }
  .week-day-name { font-size: 11px; font-weight: 700; color: ${p.textSub}; text-transform: uppercase; letter-spacing: 0.5px; }
  .week-day-num {
    font-size: 24px; font-weight: 700;
    width: 42px; height: 42px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin: 4px auto 0;
  }
  .week-day-num.today { background: ${p.today}; color: ${p.todayText}; }
  .week-all-day-row {
    display: grid; gap: 2px; flex-shrink: 0;
    border-bottom: 1px solid ${p.border}; padding: 4px 0;
    background: ${p.surfaceAlt};
  }
  .week-all-day-cell { min-height: 28px; padding: 2px 4px; }
  .week-all-day-event {
    border-radius: 4px; padding: 3px 8px; font-size: 12px; font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
    margin-bottom: 2px;
  }
  .week-time-grid { display: flex; flex: 1; overflow-y: auto; scroll-behavior: smooth; }
  .time-gutter { width: 56px; flex-shrink: 0; border-right: 1px solid ${p.border}; position: relative; }
  .time-label {
    height: 60px; display: flex; align-items: flex-start; justify-content: flex-end;
    padding: 0 8px; font-size: 11px; color: ${p.textSub}; margin-top: -8px;
  }
  .week-days-grid { flex: 1; display: grid; gap: 2px; position: relative; }
  .week-day-time-col { position: relative; border-right: 1px solid ${p.border}40; }
  .hour-line { position: absolute; left: 0; right: 0; height: 1px; background: ${p.border}; pointer-events: none; }
  .now-line { position: absolute; left: 0; right: 0; height: 2px; background: ${p.today}; pointer-events: none; z-index: 5; }
  .now-line::before { content:""; width:10px; height:10px; border-radius:50%; background:${p.today}; position:absolute; left:-5px; top:-4px; }
  .week-event {
    position: absolute; left: 3px; right: 3px; border-radius: 6px;
    padding: 4px 7px; font-size: 12px; font-weight: 500; cursor: pointer;
    overflow: hidden; z-index: 2; transition: opacity 0.1s;
    border-left: 3px solid rgba(255,255,255,0.25);
  }
  .week-event:active { opacity: 0.75; }
  .week-event-title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .week-event-time  { font-size: 11px; opacity: 0.85; }

  /* ── Agenda view ── */
  .agenda-view { height: 100%; overflow-y: auto; padding: 16px 24px; }
  .agenda-date-group { margin-bottom: 24px; }
  .agenda-date-label {
    font-size: 12px; font-weight: 800; color: ${p.textSub}; text-transform: uppercase;
    letter-spacing: 1px; padding: 0 4px 10px; border-bottom: 1px solid ${p.border}; margin-bottom: 12px;
  }
  .agenda-date-label.today-label { color: ${p.today}; }
  .agenda-event {
    display: flex; gap: 14px; align-items: flex-start;
    padding: 14px; border-radius: 12px; margin-bottom: 8px; cursor: pointer;
    background: ${p.surface}; border: 1px solid ${p.border};
    transition: background 0.12s, transform 0.1s;
  }
  .agenda-event:active { background: ${p.surfaceAlt}; transform: scale(0.99); }
  .agenda-event-color { width: 4px; border-radius: 2px; flex-shrink: 0; align-self: stretch; min-height: 36px; }
  .agenda-event-info { flex: 1; min-width: 0; }
  .agenda-event-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
  .agenda-event-time  { font-size: 14px; color: ${p.textSub}; display: flex; align-items: center; gap: 6px; }
  .agenda-event-who   { font-size: 12px; font-weight: 700; margin-top: 5px; }
  .agenda-empty { text-align: center; color: ${p.textMuted}; padding: 64px 24px; font-size: 16px; line-height: 1.7; }

  /* ── Settings drawer ── */
  .drawer-overlay {
    position: fixed; inset: 0; background: ${p.overlay}; z-index: 100;
    opacity: 0; pointer-events: none; transition: opacity 0.25s; backdrop-filter: blur(4px);
  }
  .drawer-overlay.open { opacity: 1; pointer-events: auto; }
  .drawer {
    position: fixed; top: 0; left: 0; bottom: 0; width: 400px; max-width: 90vw;
    background: ${p.surface}; z-index: 101;
    transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 4px 0 40px ${p.shadow};
  }
  .drawer.open { transform: translateX(0); }
  .drawer-header {
    display: flex; align-items: center; padding: 24px 24px 16px;
    border-bottom: 1px solid ${p.border}; flex-shrink: 0; gap: 12px;
  }
  .drawer-title { font-size: 22px; font-weight: 700; flex: 1; }
  .close-btn {
    width: 40px; height: 40px; border-radius: 10px; border: none; cursor: pointer;
    background: ${p.surfaceAlt}; color: ${p.text};
    display: flex; align-items: center; justify-content: center; transition: background 0.15s;
  }
  .close-btn:active { background: ${p.surfaceHov}; }
  .drawer-body { flex: 1; overflow-y: auto; padding: 24px; }
  .settings-section { margin-bottom: 32px; }
  .settings-section-title {
    font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
    color: ${p.textSub}; margin-bottom: 16px;
  }
  .settings-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
  .settings-row label { flex: 1; font-size: 15px; font-weight: 500; }
  .settings-row input[type="text"], .settings-row select {
    padding: 10px 14px; border-radius: 10px; border: 1px solid ${p.border};
    background: ${p.surfaceAlt}; color: ${p.text}; font-size: 15px; width: 180px; outline: none;
    transition: border-color 0.15s;
  }
  .settings-row input[type="text"]:focus, .settings-row select:focus { border-color: ${p.borderFocus}; }
  .color-swatch-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .color-swatch {
    width: 34px; height: 34px; border-radius: 50%; cursor: pointer; border: 3px solid transparent;
    transition: transform 0.15s, border-color 0.15s;
  }
  .color-swatch:hover { transform: scale(1.15); }
  .color-swatch.selected { border-color: ${p.text}; }
  .save-btn {
    width: 100%; padding: 16px; border-radius: 12px; border: none; cursor: pointer;
    color: white; font-size: 16px; font-weight: 700; transition: opacity 0.15s, transform 0.1s; margin-top: 8px;
  }
  .save-btn:active { opacity: 0.85; transform: scale(0.98); }

  /* ── Event detail modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: ${p.overlay}; z-index: 200;
    opacity: 0; pointer-events: none; transition: opacity 0.2s;
    display: flex; align-items: flex-end; justify-content: center; backdrop-filter: blur(4px);
  }
  .modal-overlay.open { opacity: 1; pointer-events: auto; }
  .modal {
    background: ${p.surface}; border-radius: 24px 24px 0 0;
    width: 100%; max-width: 680px; max-height: 70vh;
    transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 -8px 40px ${p.shadow};
  }
  .modal.open { transform: translateY(0); }
  .modal-handle { width: 48px; height: 5px; border-radius: 3px; background: ${p.border}; margin: 14px auto 0; flex-shrink: 0; }
  .modal-header {
    display: flex; align-items: center; padding: 16px 24px 12px; gap: 12px;
    border-bottom: 1px solid ${p.border}; flex-shrink: 0;
  }
  .modal-color-bar { width: 5px; border-radius: 3px; align-self: stretch; flex-shrink: 0; }
  .modal-title { font-size: 22px; font-weight: 700; flex: 1; }
  .modal-body { padding: 20px 24px 32px; overflow-y: auto; }
  .modal-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: ${p.textSub}; font-size: 15px; }
  .modal-who-badge {
    display: inline-block; padding: 4px 14px; border-radius: 20px;
    font-size: 13px; font-weight: 700;
  }
  .modal-description { font-size: 15px; line-height: 1.7; color: ${p.textSub}; margin-top: 16px; }

  /* ── Animations ── */
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slide-left  { from{transform:translateX(0);opacity:1} to{transform:translateX(-4%);opacity:0} }
  @keyframes slide-right { from{transform:translateX(0);opacity:1} to{transform:translateX(4%);opacity:0}  }
  @keyframes enter-left  { from{transform:translateX(4%);opacity:0}  to{transform:translateX(0);opacity:1} }
  @keyframes enter-right { from{transform:translateX(-4%);opacity:0} to{transform:translateX(0);opacity:1} }
  .anim-slide-left  { animation: slide-left  0.2s ease forwards; }
  .anim-slide-right { animation: slide-right 0.2s ease forwards; }
  .anim-enter-left  { animation: enter-left  0.2s ease forwards; }
  .anim-enter-right { animation: enter-right 0.2s ease forwards; }

  .spinner-wrap { display: flex; align-items: center; justify-content: center; height: 100%; }
  .spinner { width: 40px; height: 40px; border: 3px solid ${p.border}; border-top-color: ${aColor}; border-radius: 50%; animation: spin 0.8s linear infinite; }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${p.textMuted}; border-radius: 3px; }
  `;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICON = {
  menu:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  close:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  chevL:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevR:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  refresh: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  clock:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  heart:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  cal:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  settings:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
};

const COLOR_PRESETS = [
  "#818CF8","#6366F1","#A78BFA","#C084FC",
  "#F472B6","#FB7185","#F43F5E","#FCA5A5",
  "#34D399","#10B981","#6EE7B7","#4ADE80",
  "#FBBF24","#F59E0B","#FCD34D","#FDE68A",
  "#60A5FA","#38BDF8","#7DD3FC","#93C5FD",
  "#FB923C","#F97316","#FDBA74","#FED7AA",
];

const AUTO_REFRESH_MS = 5 * 60 * 1000; // refresh events every 5 minutes

// ─── Panel component ──────────────────────────────────────────────────────────

class CoupleCalendarPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._hass         = null;
    this._panelConfig  = null;
    this._config       = null;
    this._view         = "month";
    this._cursor       = new Date();
    this._today        = startOfDay(new Date());
    this._events       = [];
    this._loading      = false;
    this._activeFilter = "all";
    this._drawerOpen   = false;
    this._lastFetched  = null;

    this._touchStartX  = 0;
    this._touchStartY  = 0;

    this._localSettings = this._loadLocalSettings();
    this._render();
    this._startClock();
    this._startAutoRefresh();
  }

  // ── HA wiring ──────────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) { this._initialized = true; this._applyConfig(); }
  }

  set panel(panel) {
    this._panelConfig = panel?.config || {};
    this._applyConfig();
  }

  _applyConfig() {
    if (!this._panelConfig) return;
    const pc = this._panelConfig;
    this._config = {
      personA: pc.personA || { name: "Partner 1", color: "#818CF8", calendar: "" },
      personB: pc.personB || { name: "Partner 2", color: "#F472B6", calendar: "" },
      joint:   pc.joint   || { color: "#34D399",  calendar: "" },
      firstDayOfWeek: parseInt(pc.firstDayOfWeek ?? 0),
      timeFormat:     pc.timeFormat  || "12h",
      defaultView:    pc.defaultView || "month",
      theme:          pc.theme       || "dark",
    };
    const ls = this._localSettings;
    if (ls.personAName)  this._config.personA.name  = ls.personAName;
    if (ls.personAColor) this._config.personA.color = ls.personAColor;
    if (ls.personBName)  this._config.personB.name  = ls.personBName;
    if (ls.personBColor) this._config.personB.color = ls.personBColor;
    if (ls.jointColor)   this._config.joint.color   = ls.jointColor;
    if (ls.theme)        this._config.theme          = ls.theme;
    if (ls.timeFormat)   this._config.timeFormat     = ls.timeFormat;
    if (ls.firstDayOfWeek !== undefined) this._config.firstDayOfWeek = ls.firstDayOfWeek;
    if (ls.defaultView)  this._config.defaultView    = ls.defaultView;

    this._view = this._config.defaultView;
    this._render();
    this._fetchEvents();
  }

  // ── Data ───────────────────────────────────────────────────────────────

  async _fetchEvents(showSpinner = true) {
    if (!this._hass || !this._config) return;
    if (showSpinner) { this._loading = true; this._renderMainContent(); }

    const { start, end } = this._fetchRange();
    const entities = this._calendarEntities();

    try {
      const all = [];
      for (const { entityId, who } of entities) {
        if (!entityId) continue;
        const s = start.toISOString().replace(".000Z","Z");
        const e = end.toISOString().replace(".000Z","Z");
        const data = await this._hass.callApi(
          "GET",
          `calendars/${entityId}?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`
        );
        if (Array.isArray(data)) {
          for (const ev of data) all.push({ ...ev, _who: who, _color: this._whoColor(who) });
        }
      }
      this._events = all;
      this._lastFetched = new Date();
    } catch (e) {
      console.error("[CoupleCalendar] fetch error:", e);
    }

    this._loading = false;
    this._renderMainContent();
    this._renderLegend(); // update "last updated" timestamp
  }

  async _manualRefresh() {
    const btn = this.shadowRoot.querySelector(".refresh-btn");
    if (btn) btn.classList.add("spinning");
    await this._fetchEvents(false);
    if (btn) btn.classList.remove("spinning");
  }

  _fetchRange() {
    if (this._view === "week") {
      const ws = startOfWeek(this._cursor, this._config.firstDayOfWeek);
      return { start: ws, end: addDays(ws, 7) };
    }
    if (this._view === "agenda") {
      return { start: startOfDay(new Date()), end: addDays(new Date(), 90) };
    }
    const s = startOfMonth(this._cursor);
    const e = endOfMonth(this._cursor);
    return { start: addDays(s, -7), end: addDays(e, 7) };
  }

  _calendarEntities() {
    const { personA, personB, joint } = this._config;
    const list = [];
    if (personA?.calendar) list.push({ entityId: personA.calendar, who: "a" });
    if (personB?.calendar) list.push({ entityId: personB.calendar, who: "b" });
    if (joint?.calendar)   list.push({ entityId: joint.calendar,   who: "joint" });
    return list;
  }

  _whoColor(who) {
    if (who === "a")     return this._config.personA.color;
    if (who === "b")     return this._config.personB.color;
    if (who === "joint") return this._config.joint.color;
    return "#888";
  }

  _whoName(who) {
    if (who === "a")     return this._config.personA.name;
    if (who === "b")     return this._config.personB.name;
    if (who === "joint") return `${this._config.personA.name} & ${this._config.personB.name}`;
    return "Unknown";
  }

  _filteredEvents() {
    if (this._activeFilter === "all") return this._events;
    return this._events.filter(e => e._who === this._activeFilter);
  }

  _eventsOnDay(day) {
    return this._filteredEvents().filter(ev => {
      const s = parseEventDT(ev.start);
      const e = parseEventDT(ev.end);
      if (!s) return false;
      const ds = startOfDay(day);
      const de = addDays(ds, 1);
      return s < de && (e || s) >= ds;
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  _navigate(dir) {
    const main = this.shadowRoot.querySelector(".main");
    if (main) {
      main.classList.add(dir > 0 ? "anim-slide-left" : "anim-slide-right");
      setTimeout(() => {
        main.classList.remove("anim-slide-left","anim-slide-right");
        this._shiftCursor(dir);
        this._renderMainContent();
        main.classList.add(dir > 0 ? "anim-enter-right" : "anim-enter-left");
        setTimeout(() => main.classList.remove("anim-enter-right","anim-enter-left"), 220);
        this._fetchEvents(false);
      }, 180);
    } else {
      this._shiftCursor(dir);
      this._renderMainContent();
      this._fetchEvents(false);
    }
  }

  _shiftCursor(dir) {
    if (this._view === "week")   this._cursor = addDays(this._cursor, dir * 7);
    else if (this._view === "agenda") this._cursor = addDays(this._cursor, dir * 30);
    else this._cursor = addMonths(this._cursor, dir);
  }

  _goToday() {
    this._cursor = new Date();
    this._today  = startOfDay(new Date());
    this._renderHeader();
    this._renderMainContent();
    this._fetchEvents(false);
  }

  _switchView(view) {
    this._view = view;
    this._render();
    this._fetchEvents();
  }

  // ── Rendering ──────────────────────────────────────────────────────────

  _render() {
    const style = document.createElement("style");
    style.textContent = buildStyles(this._config || {});

    const root = document.createElement("div");
    root.className = "panel-root";
    root.innerHTML = `
      <div class="header"         id="cc-header"></div>
      <div class="legend"         id="cc-legend"></div>
      <div class="main"           id="cc-main"></div>
      <div class="drawer-overlay" id="cc-drawer-overlay"></div>
      <div class="drawer"         id="cc-drawer"></div>
      <div class="modal-overlay"  id="cc-modal-overlay">
        <div class="modal"        id="cc-modal"></div>
      </div>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(root);

    this._bindStaticEvents();
    this._renderHeader();
    this._renderLegend();
    this._renderMainContent();
    this._renderDrawer();
  }

  _renderHeader() {
    const cfg  = this._config || {};
    const fdow = cfg.firstDayOfWeek ?? 0;
    let titleMain = "", titleSub = "";

    if (this._view === "week") {
      const ws = startOfWeek(this._cursor, fdow);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) {
        titleMain = MONTH_NAMES[ws.getMonth()]; titleSub = ws.getFullYear();
      } else {
        titleMain = `${MONTH_NAMES[ws.getMonth()].slice(0,3)} – ${MONTH_NAMES[we.getMonth()].slice(0,3)}`; titleSub = ws.getFullYear();
      }
    } else if (this._view === "agenda") {
      titleMain = "Upcoming"; titleSub = new Date().getFullYear();
    } else {
      titleMain = MONTH_NAMES[this._cursor.getMonth()]; titleSub = this._cursor.getFullYear();
    }

    const el = this.shadowRoot.getElementById("cc-header");
    if (!el) return;
    el.innerHTML = `
      <div class="header-left">
        <button class="menu-btn" id="cc-menu-btn" aria-label="Settings">${ICON.menu}</button>
        <button class="nav-btn"  id="cc-prev-btn" aria-label="Previous">${ICON.chevL}</button>
        <button class="nav-btn"  id="cc-next-btn" aria-label="Next">${ICON.chevR}</button>
        <div class="header-title">
          <div class="header-month">${titleMain}</div>
          <div class="header-year">${titleSub}</div>
        </div>
      </div>
      <button class="today-btn"   id="cc-today-btn">Today</button>
      <button class="refresh-btn" id="cc-refresh-btn" aria-label="Refresh">${ICON.refresh}</button>
      <div class="view-switcher">
        <button class="view-btn ${this._view==="month"  ? "active":""}" data-view="month">Month</button>
        <button class="view-btn ${this._view==="week"   ? "active":""}" data-view="week">Week</button>
        <button class="view-btn ${this._view==="agenda" ? "active":""}" data-view="agenda">Agenda</button>
      </div>
    `;

    el.querySelector("#cc-menu-btn").addEventListener("click", () => this._openDrawer());
    el.querySelector("#cc-prev-btn").addEventListener("click", () => this._navigate(-1));
    el.querySelector("#cc-next-btn").addEventListener("click", () => this._navigate(1));
    el.querySelector("#cc-today-btn").addEventListener("click", () => this._goToday());
    el.querySelector("#cc-refresh-btn").addEventListener("click", () => this._manualRefresh());
    el.querySelectorAll(".view-btn").forEach(btn =>
      btn.addEventListener("click", () => this._switchView(btn.dataset.view))
    );
  }

  _renderLegend() {
    const cfg    = this._config || {};
    const aColor = cfg.personA?.color || "#818CF8";
    const bColor = cfg.personB?.color || "#F472B6";
    const jColor = cfg.joint?.color   || "#34D399";
    const aName  = cfg.personA?.name  || "Partner 1";
    const bName  = cfg.personB?.name  || "Partner 2";

    let lastStr = "";
    if (this._lastFetched) {
      const diff = Math.round((Date.now() - this._lastFetched) / 60000);
      lastStr = diff < 1 ? "Updated just now" : `Updated ${diff}m ago`;
    }

    const filters = [
      { id: "all",   label: "All",       color: null },
      { id: "a",     label: aName,       color: aColor },
      { id: "b",     label: bName,       color: bColor },
      { id: "joint", label: "Together",  color: jColor },
    ];

    const el = this.shadowRoot.getElementById("cc-legend");
    if (!el) return;
    el.innerHTML = `
      ${filters.map(f => `
        <button class="legend-filter ${this._activeFilter===f.id?"active":""}"
          data-filter="${f.id}"
          style="${f.color ? `color:${f.color};` : ""}
                 ${this._activeFilter===f.id && f.color ? `border-color:${f.color};` : ""}">
          ${f.color ? `<span class="legend-dot" style="background:${f.color};"></span>` : ""}
          ${f.label}
        </button>
      `).join("")}
      <div class="legend-spacer"></div>
      ${lastStr ? `<div class="last-updated">${lastStr}</div>` : ""}
    `;

    el.querySelectorAll(".legend-filter").forEach(btn =>
      btn.addEventListener("click", () => {
        this._activeFilter = btn.dataset.filter;
        this._renderLegend();
        this._renderMainContent();
      })
    );
  }

  _renderMainContent() {
    const el = this.shadowRoot.getElementById("cc-main");
    if (!el) return;
    if (this._loading) { el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`; return; }
    if (this._view === "month")  this._renderMonthView(el);
    if (this._view === "week")   this._renderWeekView(el);
    if (this._view === "agenda") this._renderAgendaView(el);
    this._bindSwipe(el);
  }

  // ── Month view ────────────────────────────────────────────────────────

  _renderMonthView(el) {
    const cfg   = this._config || {};
    const fdow  = cfg.firstDayOfWeek ?? 0;
    const year  = this._cursor.getFullYear();
    const month = this._cursor.getMonth();
    const firstDay  = new Date(year, month, 1);
    const lastDay   = new Date(year, month + 1, 0);
    const startPad  = (firstDay.getDay() - fdow + 7) % 7;
    const totalCells = startPad + lastDay.getDate();
    const numRows   = Math.ceil(totalCells / 7);

    const dayLabels = Array.from({ length: 7 }, (_, i) => DAY_NAMES_SHORT[(fdow + i) % 7]);
    const cells = Array.from({ length: numRows * 7 }, (_, i) => new Date(year, month, 1 + (i - startPad)));

    el.innerHTML = `
      <div class="month-view">
        <div class="weekday-header">
          ${dayLabels.map(n => `<div class="weekday-label">${n}</div>`).join("")}
        </div>
        <div class="month-grid ${numRows===5?"five-rows":""}">
          ${this._chunkArray(cells, 7).map(week => `
            <div class="week-row">
              ${week.map(day => this._renderDayCell(day, month)).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    `;

    // Tap event chip → show detail
    el.querySelectorAll(".event-chip").forEach(chip =>
      chip.addEventListener("click", e => {
        e.stopPropagation();
        const idx = parseInt(chip.dataset.idx);
        this._openDetailModal(this._filteredEvents()[idx]);
      })
    );
    // Tap "more" → switch to week view on that date
    el.querySelectorAll(".more-events").forEach(more =>
      more.addEventListener("click", e => {
        e.stopPropagation();
        const iso = more.closest(".day-cell")?.dataset.date;
        if (iso) { this._cursor = new Date(iso + "T12:00:00"); this._switchView("week"); }
      })
    );
  }

  _renderDayCell(day, currentMonth) {
    const isToday      = isSameDay(day, this._today);
    const isOtherMonth = day.getMonth() !== currentMonth;
    const events       = this._eventsOnDay(day);
    const allEvents    = this._filteredEvents();
    const MAX = 3;

    const chips = events.slice(0, MAX).map(ev => {
      const idx = allEvents.indexOf(ev);
      if (!ev.start?.dateTime) {
        // All-day: solid colored chip with title — same pattern as Google/Apple Calendar
        const tc = textOnBg(ev._color);
        return `<div class="event-chip" data-idx="${idx}"
          style="background:${ev._color}; color:${tc}; border-left:none; font-weight:600;"
          title="${ev.summary||"Event"}">${ev.summary||"Event"}</div>`;
      }
      const t = formatTime(new Date(ev.start.dateTime), this._config?.timeFormat === "24h");
      return `<div class="event-chip" data-idx="${idx}"
        style="background:${ev._color}22; color:${ev._color}; border-left:3px solid ${ev._color};"
        title="${ev.summary||"Event"}">
        <span style="opacity:0.7;font-size:10px;">${t} </span>${ev.summary||"Event"}
      </div>`;
    }).join("");

    const overflow = events.length > MAX
      ? `<div class="more-events">+${events.length - MAX} more</div>` : "";

    return `
      <div class="day-cell ${isToday?"today":""} ${isOtherMonth?"other-month":""}"
           data-date="${day.toISOString().slice(0,10)}">
        <div class="day-number">${day.getDate()}</div>
        <div class="event-chips">${chips}${overflow}</div>
      </div>`;
  }

  // ── Week view ─────────────────────────────────────────────────────────

  _renderWeekView(el) {
    const cfg    = this._config || {};
    const fdow   = cfg.firstDayOfWeek ?? 0;
    const use24  = cfg.timeFormat === "24h";
    const ws     = startOfWeek(this._cursor, fdow);
    const days   = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const HOUR_H = 60;

    const dayHeaders = days.map(d => `
      <div class="week-day-col-header">
        <div class="week-day-name">${DAY_NAMES_SHORT[d.getDay()]}</div>
        <div class="week-day-num ${isSameDay(d, this._today)?"today":""}">${d.getDate()}</div>
      </div>`).join("");

    const allDayCells = days.map(d => `
      <div class="week-all-day-cell">
        ${this._eventsOnDay(d).filter(ev => !ev.start?.dateTime).map(ev => {
          const c = textOnBg(ev._color);
          return `<div class="week-all-day-event" style="background:${ev._color};color:${c};"
            data-evjson="${encodeURIComponent(JSON.stringify(ev))}">${ev.summary||"Event"}</div>`;
        }).join("")}
      </div>`).join("");

    const now       = new Date();
    const nowMin    = now.getHours() * 60 + now.getMinutes();
    const todayIdx  = days.findIndex(d => isSameDay(d, this._today));
    const hours     = Array.from({ length: 24 }, (_, h) => h);

    const timeGutter = hours.map(h => {
      if (h === 0) return `<div class="time-label"></div>`;
      const lbl = use24 ? `${String(h).padStart(2,"0")}:00` : (h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`);
      return `<div class="time-label">${lbl}</div>`;
    }).join("");

    const timeCols = days.map((d, di) => {
      const timedEvs = this._eventsOnDay(d).filter(ev => !!ev.start?.dateTime);
      const blocks = timedEvs.map(ev => {
        const s    = new Date(ev.start.dateTime);
        const e    = ev.end?.dateTime ? new Date(ev.end.dateTime) : addDays(s, 1/24);
        const top  = ((s.getHours() * 60 + s.getMinutes()) / 60) * HOUR_H;
        const h    = Math.max(28, ((e - s) / 3600000) * HOUR_H);
        const tc   = textOnBg(ev._color);
        return `<div class="week-event" style="top:${top}px;height:${h}px;background:${ev._color};color:${tc};"
          data-evjson="${encodeURIComponent(JSON.stringify(ev))}">
          <div class="week-event-title">${ev.summary||"Event"}</div>
          ${h > 38 ? `<div class="week-event-time">${formatTime(s, use24)}</div>` : ""}
        </div>`;
      }).join("");

      const hourLines = hours.map(h => `<div class="hour-line" style="top:${h*HOUR_H}px;"></div>`).join("");
      const nowLine   = di === todayIdx ? `<div class="now-line" style="top:${(nowMin/60)*HOUR_H}px;"></div>` : "";
      return `<div class="week-day-time-col" style="height:${24*HOUR_H}px;">${hourLines}${nowLine}${blocks}</div>`;
    }).join("");

    const gc = "grid-template-columns: repeat(7, 1fr)";
    el.innerHTML = `
      <div class="week-view">
        <div class="week-day-header" style="${gc}">${dayHeaders}</div>
        <div class="week-all-day-row" style="display:grid;${gc};">${allDayCells}</div>
        <div class="week-time-grid">
          <div class="time-gutter">${timeGutter}</div>
          <div class="week-days-grid" style="${gc}">${timeCols}</div>
        </div>
      </div>`;

    setTimeout(() => {
      const tg = el.querySelector(".week-time-grid");
      if (tg) tg.scrollTop = 7 * HOUR_H;
    }, 50);

    el.querySelectorAll(".week-event, .week-all-day-event").forEach(evEl =>
      evEl.addEventListener("click", e => {
        e.stopPropagation();
        try { this._openDetailModal(JSON.parse(decodeURIComponent(evEl.dataset.evjson))); } catch {}
      })
    );
  }

  // ── Agenda view ───────────────────────────────────────────────────────

  _renderAgendaView(el) {
    const use24  = this._config?.timeFormat === "24h";
    const events = this._filteredEvents()
      .filter(ev => { const s = parseEventDT(ev.start); return s && s >= startOfDay(new Date()); })
      .sort((a, b) => (parseEventDT(a.start)||0) - (parseEventDT(b.start)||0));

    if (!events.length) {
      el.innerHTML = `<div class="agenda-view"><div class="agenda-empty">No upcoming events on the selected calendars.<br>Add events in Google Calendar on your phone — they'll appear here within a few minutes.</div></div>`;
      return;
    }

    const groups = {};
    for (const ev of events) {
      const d = parseEventDT(ev.start);
      if (!d) continue;
      const key = d.toISOString().slice(0,10);
      (groups[key] = groups[key] || []).push(ev);
    }

    const html = Object.entries(groups).map(([key, dayEvs]) => {
      const d          = new Date(key + "T12:00:00");
      const isToday    = isSameDay(d, this._today);
      const isTomorrow = isSameDay(d, addDays(this._today, 1));
      let label = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
      if (isToday)    label = "Today  ·  " + label;
      if (isTomorrow) label = "Tomorrow  ·  " + label;

      const evHtml = dayEvs.map(ev => {
        const s = parseEventDT(ev.start);
        const e = parseEventDT(ev.end);
        const allDay  = !ev.start?.dateTime;
        const timeStr = allDay ? "All day"
          : `${formatTime(s, use24)}${e ? "  –  " + formatTime(e, use24) : ""}`;
        const allEvs  = this._filteredEvents();
        const idx     = allEvs.indexOf(ev);
        return `<div class="agenda-event" data-idx="${idx}">
          <div class="agenda-event-color" style="background:${ev._color};"></div>
          <div class="agenda-event-info">
            <div class="agenda-event-title">${ev.summary||"(No title)"}</div>
            <div class="agenda-event-time">${ICON.clock} ${timeStr}</div>
            <div class="agenda-event-who" style="color:${ev._color};">${this._whoName(ev._who)}</div>
          </div>
        </div>`;
      }).join("");

      return `<div class="agenda-date-group">
        <div class="agenda-date-label ${isToday?"today-label":""}">${label}</div>
        ${evHtml}
      </div>`;
    }).join("");

    el.innerHTML = `<div class="agenda-view">${html}</div>`;

    el.querySelectorAll(".agenda-event").forEach(evEl =>
      evEl.addEventListener("click", () => {
        const idx = parseInt(evEl.dataset.idx);
        this._openDetailModal(this._filteredEvents()[idx]);
      })
    );
  }

  // ── Settings drawer ───────────────────────────────────────────────────

  _renderDrawer() {
    const cfg  = this._config || {};
    const aColor = cfg.personA?.color || "#818CF8";
    const bColor = cfg.personB?.color || "#F472B6";
    const jColor = cfg.joint?.color   || "#34D399";
    const el = this.shadowRoot.getElementById("cc-drawer");
    if (!el) return;

    el.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title">${ICON.settings} &nbsp;Settings</div>
        <button class="close-btn" id="cc-drawer-close">${ICON.close}</button>
      </div>
      <div class="drawer-body">
        <div class="settings-section">
          <div class="settings-section-title">Partner 1</div>
          <div class="settings-row"><label>Name</label><input type="text" id="s-a-name" value="${cfg.personA?.name||"Partner 1"}"></div>
          <div class="settings-section-title" style="font-size:11px;margin-bottom:8px;margin-top:4px;">Color</div>
          <div class="color-swatch-row" id="s-a-colors">
            ${COLOR_PRESETS.map(c => `<div class="color-swatch ${c===aColor?"selected":""}" data-color="${c}" style="background:${c};"></div>`).join("")}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Partner 2</div>
          <div class="settings-row"><label>Name</label><input type="text" id="s-b-name" value="${cfg.personB?.name||"Partner 2"}"></div>
          <div class="settings-section-title" style="font-size:11px;margin-bottom:8px;margin-top:4px;">Color</div>
          <div class="color-swatch-row" id="s-b-colors">
            ${COLOR_PRESETS.map(c => `<div class="color-swatch ${c===bColor?"selected":""}" data-color="${c}" style="background:${c};"></div>`).join("")}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Together / Shared</div>
          <div class="settings-section-title" style="font-size:11px;margin-bottom:8px;margin-top:4px;">Color</div>
          <div class="color-swatch-row" id="s-j-colors">
            ${COLOR_PRESETS.map(c => `<div class="color-swatch ${c===jColor?"selected":""}" data-color="${c}" style="background:${c};"></div>`).join("")}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Display</div>
          <div class="settings-row">
            <label>Theme</label>
            <select id="s-theme">
              <option value="dark"  ${cfg.theme==="dark"?"selected":""}>Dark</option>
              <option value="light" ${cfg.theme==="light"?"selected":""}>Light</option>
              <option value="auto"  ${cfg.theme==="auto"?"selected":""}>Auto</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Time format</label>
            <select id="s-time">
              <option value="12h" ${cfg.timeFormat==="12h"?"selected":""}>12-hour</option>
              <option value="24h" ${cfg.timeFormat==="24h"?"selected":""}>24-hour</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Week starts</label>
            <select id="s-fdow">
              <option value="0" ${cfg.firstDayOfWeek===0?"selected":""}>Sunday</option>
              <option value="1" ${cfg.firstDayOfWeek===1?"selected":""}>Monday</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Default view</label>
            <select id="s-default-view">
              <option value="month"  ${cfg.defaultView==="month" ?"selected":""}>Month</option>
              <option value="week"   ${cfg.defaultView==="week"  ?"selected":""}>Week</option>
              <option value="agenda" ${cfg.defaultView==="agenda"?"selected":""}>Agenda</option>
            </select>
          </div>
        </div>
        <button class="save-btn" id="cc-save-settings" style="background:${aColor};">Save Changes</button>
      </div>
    `;

    ["a","b","j"].forEach(who =>
      el.querySelectorAll(`#s-${who}-colors .color-swatch`).forEach(sw =>
        sw.addEventListener("click", () => {
          el.querySelectorAll(`#s-${who}-colors .color-swatch`).forEach(s => s.classList.remove("selected"));
          sw.classList.add("selected");
        })
      )
    );
    el.querySelector("#cc-drawer-close").addEventListener("click", () => this._closeDrawer());
    el.querySelector("#cc-save-settings").addEventListener("click", () => this._saveSettings());
  }

  _openDrawer()  {
    this._renderDrawer();
    this.shadowRoot.getElementById("cc-drawer-overlay").classList.add("open");
    this.shadowRoot.getElementById("cc-drawer").classList.add("open");
  }
  _closeDrawer() {
    this.shadowRoot.getElementById("cc-drawer-overlay").classList.remove("open");
    this.shadowRoot.getElementById("cc-drawer").classList.remove("open");
  }

  _saveSettings() {
    const dr = this.shadowRoot.getElementById("cc-drawer");
    const patch = {
      personAName:  dr.querySelector("#s-a-name")?.value || undefined,
      personBName:  dr.querySelector("#s-b-name")?.value || undefined,
      personAColor: dr.querySelector("#s-a-colors .selected")?.dataset.color || undefined,
      personBColor: dr.querySelector("#s-b-colors .selected")?.dataset.color || undefined,
      jointColor:   dr.querySelector("#s-j-colors .selected")?.dataset.color || undefined,
      theme:        dr.querySelector("#s-theme")?.value || undefined,
      timeFormat:   dr.querySelector("#s-time")?.value  || undefined,
      firstDayOfWeek: parseInt(dr.querySelector("#s-fdow")?.value ?? this._config?.firstDayOfWeek ?? 0),
      defaultView:  dr.querySelector("#s-default-view")?.value || undefined,
    };
    this._saveLocalSettings(patch);
    this._closeDrawer();
    this._applyConfig();   // re-reads local settings and re-renders
  }

  // ── Event detail modal ────────────────────────────────────────────────

  _openDetailModal(ev) {
    if (!ev) return;
    const use24   = this._config?.timeFormat === "24h";
    const color   = ev._color;
    const tc      = textOnBg(color);
    const isAllDay = !ev.start?.dateTime;
    const s = parseEventDT(ev.start);
    const e = parseEventDT(ev.end);

    let dateStr = s ? s.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
    if (!isAllDay && s && e) dateStr += `  ·  ${formatTime(s, use24)} – ${formatTime(e, use24)}`;
    else if (isAllDay) dateStr += "  ·  All day";

    const modal   = this.shadowRoot.getElementById("cc-modal");
    const overlay = this.shadowRoot.getElementById("cc-modal-overlay");

    modal.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-color-bar" style="background:${color};"></div>
        <div class="modal-title">${ev.summary||"(No title)"}</div>
        <button class="close-btn" id="cc-modal-close">${ICON.close}</button>
      </div>
      <div class="modal-body">
        <div class="modal-meta">${ICON.cal} ${dateStr}</div>
        <div class="modal-meta">${ICON.heart}
          <span class="modal-who-badge" style="background:${color}22; color:${color};">${this._whoName(ev._who)}</span>
        </div>
        ${ev.description ? `<div class="modal-description">${ev.description}</div>` : ""}
      </div>`;

    overlay.classList.add("open");
    modal.classList.add("open");
    modal.querySelector("#cc-modal-close").addEventListener("click", () => this._closeModal());
    overlay.addEventListener("click", evt => { if (evt.target === overlay) this._closeModal(); }, { once: true });
  }

  _closeModal() {
    this.shadowRoot.getElementById("cc-modal-overlay")?.classList.remove("open");
    this.shadowRoot.getElementById("cc-modal")?.classList.remove("open");
    setTimeout(() => { const m = this.shadowRoot.getElementById("cc-modal"); if (m) m.innerHTML = ""; }, 300);
  }

  // ── Swipe ─────────────────────────────────────────────────────────────

  _bindSwipe(el) {
    el.addEventListener("pointerdown", e => { this._touchStartX = e.clientX; this._touchStartY = e.clientY; }, { passive: true });
    el.addEventListener("pointerup",   e => {
      const dx = e.clientX - this._touchStartX;
      const dy = e.clientY - this._touchStartY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) this._navigate(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  _bindStaticEvents() {
    this.shadowRoot.getElementById("cc-drawer-overlay")?.addEventListener("click", () => this._closeDrawer());
  }

  // ── Auto-refresh & clock ──────────────────────────────────────────────

  _startAutoRefresh() {
    this._autoRefreshTimer = setInterval(() => {
      this._fetchEvents(false);
      this._renderLegend(); // keep "Updated Xm ago" ticking
    }, AUTO_REFRESH_MS);
  }

  _startClock() {
    setInterval(() => {
      const newToday = startOfDay(new Date());
      if (!isSameDay(newToday, this._today)) { this._today = newToday; this._renderMainContent(); }
      else if (this._view === "week") this._renderMainContent(); // move now-line
      this._renderLegend(); // tick "Updated Xm ago"
    }, 60_000);
  }

  // ── localStorage ──────────────────────────────────────────────────────

  _loadLocalSettings() {
    try { return JSON.parse(localStorage.getItem("couple_calendar_settings") || "{}"); } catch { return {}; }
  }
  _saveLocalSettings(data) {
    try {
      const merged = { ...this._loadLocalSettings(), ...data };
      localStorage.setItem("couple_calendar_settings", JSON.stringify(merged));
      this._localSettings = merged;
    } catch {}
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  _chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }
}

customElements.define("couple-calendar-panel", CoupleCalendarPanel);
window.customPanelTypes = window.customPanelTypes || [];
window.customPanelTypes.push({ name: "couple-calendar-panel" });
