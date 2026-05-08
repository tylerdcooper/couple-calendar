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

  const aColor = (cfg.calendars?.[0]?.color) || cfg.personA?.color || "#818CF8";

  return `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  :host, .panel-root {
    display: flex; flex-direction: row; height: 100%; width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
    background: ${p.bg}; color: ${p.text}; overflow: hidden;
    user-select: none; -webkit-user-select: none;
  }

  /* ── Header ── */
  .header {
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px;
    padding: 14px 24px;
    background: ${p.surface}; border-bottom: 1px solid ${p.border};
    flex-shrink: 0; z-index: 10;
  }
  .header-left  { display: flex; align-items: center; gap: 8px; }
  .header-right { display: flex; align-items: center; justify-content: flex-end; }
  .menu-btn {
    width: 44px; height: 44px; border-radius: 10px; border: none; cursor: pointer;
    background: transparent; color: ${p.textSub}; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; transition: background 0.15s;
  }
  .menu-btn:hover, .menu-btn:active { background: ${p.surfaceAlt}; }

  /* Nav cluster: [←] [Title] [→] flanked together, like Google/Fantastical */
  .header-nav { display: flex; align-items: center; gap: 4px; }
  .nav-btn {
    width: 36px; height: 36px; border-radius: 8px; border: none; cursor: pointer;
    background: transparent; color: ${p.textSub};
    display: flex; align-items: center; justify-content: center;
    transition: background 0.12s, transform 0.1s; flex-shrink: 0;
  }
  .nav-btn:hover  { background: ${p.surfaceAlt}; color: ${p.text}; }
  .nav-btn:active { transform: scale(0.9); background: ${p.surfaceHov}; }
  .header-title-wrap { min-width: 180px; text-align: center; cursor: default; }
  .header-month { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.1; white-space: nowrap; }
  .header-sub   { font-size: 12px; color: ${p.textSub}; margin-top: 1px; }

  .today-btn {
    padding: 8px 16px; border-radius: 8px; border: 1px solid ${p.border};
    background: transparent; color: ${p.textSub}; cursor: pointer; font-size: 13px; font-weight: 600;
    transition: all 0.15s; flex-shrink: 0; white-space: nowrap;
  }
  .today-btn:hover  { background: ${p.surfaceAlt}; color: ${p.text}; border-color: ${p.borderFocus}; }
  .today-btn:active { background: ${p.surfaceHov}; }

  .view-switcher { display: flex; background: ${p.surfaceAlt}; border-radius: 10px; padding: 3px; gap: 2px; }
  .view-btn {
    padding: 8px 16px; border-radius: 8px; border: none;
    background: transparent; color: ${p.textSub}; cursor: pointer; font-size: 13px; font-weight: 600;
    transition: all 0.15s; white-space: nowrap;
  }
  .view-btn.active { background: ${p.surface}; color: ${p.text}; box-shadow: 0 0 4px ${p.shadow}; margin: 1px; }

  /* Clock — centered in header grid */
  .header-clock { display: flex; flex-direction: column; align-items: center; }
  .header-clock-time { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.1; }
  .header-clock-date { font-size: 12px; color: ${p.textSub}; margin-top: 1px; }

  /* Refresh + timestamp — lives in the legend bar */
  .legend-refresh { display: flex; align-items: center; gap: 4px; color: ${p.textMuted}; font-size: 12px; white-space: nowrap; }
  .refresh-icon-btn {
    background: none; border: none; cursor: pointer; padding: 2px;
    color: ${p.textMuted}; display: flex; align-items: center;
    transition: color 0.15s, transform 0.15s;
  }
  .refresh-icon-btn:hover  { color: ${p.textSub}; }
  .refresh-icon-btn:active { transform: scale(0.9); }
  .refresh-icon-btn.spinning svg { animation: spin 0.7s linear infinite; }

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

  /* ── Right column (everything except the sidebar) ── */
  .panel-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
  .main { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }

  /* ── Kiosk sidebar — full height, sits to the left of everything ── */
  .kiosk-sidebar {
    width: 0; flex-shrink: 0; overflow: hidden;
    display: flex; flex-direction: column; gap: 12px;
    background: ${p.surface}; border-right: 1px solid ${p.border};
    transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
    scrollbar-width: none;
  }
  .kiosk-sidebar::-webkit-scrollbar { display: none; }
  .kiosk-mode .kiosk-sidebar {
    width: var(--fc-sidebar-width, 300px); overflow-y: auto; padding: 14px 12px;
  }
  .kiosk-sidebar > * { flex-shrink: 0; flex-grow: 0; width: 100%; height: auto !important; }

  /* ── Header badges (center slot in kiosk mode) ── */
  .header-badges { display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; }
  .badge {
    display: flex; flex-direction: column; align-items: center;
    padding: 5px 12px; border-radius: 12px;
    background: ${p.surfaceAlt}; cursor: pointer; min-width: 64px;
    transition: background 0.15s;
  }
  .badge:active { background: ${p.surfaceHov}; }
  .badge-value  { font-size: 16px; font-weight: 700; line-height: 1.15; white-space: nowrap; }
  .badge-label  { font-size: 11px; color: ${p.textSub}; margin-top: 1px; white-space: nowrap; }

  /* ── Month grid ── */
  .month-view { display: flex; flex-direction: column; height: 100%; }
  /* Scrollable month view — weekday header lives INSIDE .month-scroll so
     all sticky elements share the same scroll container and top:0 is consistent */
  .month-view { display: flex; flex-direction: column; height: 100%; }
  .month-scroll {
    flex: 1; overflow-y: auto; padding: 0 4px 4px;
    scrollbar-width: none;
  }
  .month-scroll::-webkit-scrollbar { display: none; }
  /* Weekday name row — sticky at the very top of the scroll container */
  .weekday-header {
    display: grid; grid-template-columns: repeat(7, 1fr);
    padding: 0; border-bottom: 1px solid ${p.border};
    background: ${p.surface};
    position: sticky; top: 0; z-index: 3;
  }
  .weekday-label {
    padding: 10px 4px; text-align: center; font-size: 12px; font-weight: 700;
    color: ${p.textSub}; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .month-section { margin-bottom: 4px; }
  /* Month name label — sticky just below the weekday header (~37px) */
  .month-section-label {
    padding: 8px 8px 5px; font-size: 13px; font-weight: 800;
    color: ${p.textSub}; text-transform: uppercase; letter-spacing: 0.8px;
    position: sticky; top: 37px; background: ${p.bg}; z-index: 2;
  }
  .week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
  .day-cell {
    background: ${p.surface}; border: 1px solid ${p.border}; border-radius: 12px;
    padding: 8px; display: flex; flex-direction: column;
    overflow: hidden; transition: background 0.12s; position: relative;
    min-height: 110px;
  }
  .day-cell.other-month { opacity: 0.28; }
  .day-cell.today { border-color: ${p.today}66; }
  .day-number {
    font-size: 20px; font-weight: 600; line-height: 1;
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; align-self: flex-start;
  }
  .day-cell.today .day-number { background: ${p.today}; color: ${p.todayText}; font-weight: 800; }
  .event-chips { display: flex; flex-direction: column; gap: 3px; margin-top: 5px; flex: 1; overflow: hidden; }
  .event-chip {
    padding: 4px 8px; border-radius: 5px; font-size: 13px; font-weight: 500;
    line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    cursor: pointer; transition: opacity 0.1s;
  }
  .event-chip:active { opacity: 0.7; }
  .more-events {
    font-size: 12px; color: ${p.textSub}; font-weight: 700;
    padding: 2px 4px; margin-top: 1px; cursor: pointer;
  }

  /* ── Week view ── */
  .week-view { display: flex; flex-direction: column; height: 100%; }
  .week-day-header {
    display: flex; flex-shrink: 0;
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
    display: flex; flex-shrink: 0;
    border-bottom: 1px solid ${p.border}; padding: 4px 0;
    background: ${p.surfaceAlt};
  }
  .week-all-day-cell { min-height: 28px; padding: 2px 4px; }
  .week-all-day-event {
    border-radius: 4px; padding: 3px 8px; font-size: 12px; font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
    margin-bottom: 2px;
  }
  .week-time-grid { display: flex; flex: 1; overflow-y: auto; scrollbar-width: none; }
  .week-time-grid::-webkit-scrollbar { display: none; }
  .time-gutter { width: 56px; flex-shrink: 0; border-right: 1px solid ${p.border}; position: relative; }
  .time-label {
    height: 60px; display: flex; align-items: flex-start; justify-content: flex-end;
    padding: 0 8px; font-size: 12px; color: ${p.textSub}; transform: translateY(-8px);
  }
  .week-days-grid { flex: 1; display: grid; gap: 2px; position: relative; }
  .week-day-time-col { position: relative; border-right: 1px solid ${p.border}; }
  .week-day-time-col.today-col { background: ${isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)"}; }
  .hour-line { position: absolute; left: 0; right: 0; height: 1px; background: ${p.border}; pointer-events: none; }
  .now-line { position: absolute; left: 0; right: 0; height: 2px; background: ${p.today}; pointer-events: none; z-index: 5; }
  .now-line::before { content:""; width:10px; height:10px; border-radius:50%; background:${p.today}; position:absolute; left:-5px; top:-4px; }
  .now-time-label { position: absolute; right: calc(100% + 6px); top: -8px; font-size: 10px; font-weight: 800; color: ${p.today}; white-space: nowrap; line-height: 1; }
  .week-event {
    position: absolute; border-radius: 6px;
    padding: 4px 7px; font-size: 12px; font-weight: 500; cursor: pointer;
    overflow: hidden; z-index: 2; transition: opacity 0.1s;
    border-left: 3px solid rgba(255,255,255,0.25);
    box-sizing: border-box;
  }
  .week-event:active { opacity: 0.75; }
  .week-event-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .week-event-time  { font-size: 12px; opacity: 0.85; }

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
  .agenda-event-title { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
  .agenda-event-time  { font-size: 15px; color: ${p.textSub}; display: flex; align-items: center; gap: 6px; }
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

  /* ── Calendar cards (settings drawer) ── */
  .cal-card {
    background: ${p.surfaceAlt}; border: 1px solid ${p.border}; border-radius: 14px;
    padding: 16px; margin-bottom: 12px;
  }
  .cal-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .cal-name-input {
    flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid ${p.border};
    background: ${p.surface}; color: ${p.text}; font-size: 15px; font-weight: 600; outline: none;
    transition: border-color 0.15s;
  }
  .cal-name-input:focus { border-color: ${p.borderFocus}; }
  .cal-delete-btn {
    width: 34px; height: 34px; border-radius: 8px; border: none; cursor: pointer;
    background: ${p.surfaceHov}; color: ${p.textSub};
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: background 0.15s; font-size: 14px;
  }
  .cal-delete-btn:active { background: #ef444430; color: #ef4444; }
  .cal-card-color-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${p.textSub}; margin-top: 4px; }
  .cal-entity-select {
    width: 100%; margin-top: 8px; padding: 6px 4px; border-radius: 10px;
    border: 1px solid ${p.border}; background: ${p.surface}; color: ${p.text};
    font-size: 13px; outline: none;
  }
  .cal-entity-select option { padding: 6px 10px; }
  .cal-entity-select option:checked { background: ${p.surfaceHov}; }
  .add-cal-btn {
    width: 100%; padding: 12px; border-radius: 10px; border: 2px dashed ${p.border};
    background: transparent; color: ${p.textSub}; font-size: 14px; font-weight: 600; cursor: pointer;
    transition: border-color 0.15s, color 0.15s; margin-top: 4px;
  }
  .add-cal-btn:hover { border-color: ${p.borderFocus}; color: ${p.text}; }

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

// ─── Overlap layout (Google Calendar / Fantastical style) ─────────────────────
// Assigns _col and _numCols to each timed event so overlapping events
// are rendered side-by-side instead of stacked on top of each other.
function layoutTimedEvents(events) {
  if (events.length <= 1) {
    events.forEach(ev => { ev._col = 0; ev._numCols = 1; });
    return events;
  }

  // Sort by start time, then longer events first
  const sorted = [...events].sort((a, b) => {
    const sa = parseEventDT(a.start), sb = parseEventDT(b.start);
    const diff = (sa || 0) - (sb || 0);
    if (diff !== 0) return diff;
    const ea = a.end?.dateTime ? parseEventDT(a.end) : sa;
    const eb = b.end?.dateTime ? parseEventDT(b.end) : sb;
    return (eb - sb) - (ea - sa); // longer first within same start time
  });

  function evOverlap(a, b) {
    const sa = parseEventDT(a.start);
    const ea = a.end?.dateTime ? parseEventDT(a.end) : addDays(sa, 1/48);
    const sb = parseEventDT(b.start);
    const eb = b.end?.dateTime ? parseEventDT(b.end) : addDays(sb, 1/48);
    return sa < eb && sb < ea;
  }

  // Greedily assign each event to the first available column
  const columns = []; // columns[c] = list of events placed in column c
  sorted.forEach(ev => {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      if (!columns[c].some(other => evOverlap(ev, other))) {
        columns[c].push(ev);
        ev._col = c;
        placed = true;
        break;
      }
    }
    if (!placed) {
      ev._col = columns.length;
      columns.push([ev]);
    }
  });

  // For each event, _numCols = how many columns are active at its time
  // = (max column index among all events it overlaps with) + 1
  sorted.forEach(ev => {
    const peers = sorted.filter(other => evOverlap(ev, other));
    ev._numCols = Math.max(...peers.map(o => (o._col ?? 0) + 1));
  });

  return sorted;
}

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
    this._sidebarCardEls = []; // live references for hass pass-through
    this._mounted      = false;

    this._touchStartX  = 0;
    this._touchStartY  = 0;

    this._localSettings = this._loadLocalSettings();
    this._render();
    this._startClock();
    this._startAutoRefresh();
  }

  connectedCallback()    { this._mounted = true; }
  disconnectedCallback() { this._mounted = false; }

  // ── HA wiring ──────────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._applyConfig();
    } else {
      // Push hass to sidebar cards so they get live state updates
      for (const card of (this._sidebarCardEls || [])) {
        try { card.hass = hass; } catch (_) {}
      }
      // Update badge values in-place (lightweight text update)
      if (this._config?.kioskMode && this._config?.headerBadges?.length) {
        this._updateBadges();
      }
    }
  }

  set panel(panel) {
    this._panelConfig = panel?.config || {};
    this._applyConfig();
  }

  _applyConfig() {
    if (!this._panelConfig) return;
    const pc = this._panelConfig;
    const ls = this._localSettings;

    // Settings: HA config entry (panelConfig) is authoritative — synced across all devices.
    // localStorage overrides apply only when set explicitly (local-only tweaks).
    this._config = {
      firstDayOfWeek: ls.firstDayOfWeek !== undefined ? ls.firstDayOfWeek : (pc.firstDayOfWeek ?? 0),
      timeFormat:     ls.timeFormat  || pc.timeFormat  || "12h",
      defaultView:    ls.defaultView || pc.defaultView || "month",
      theme:          ls.theme       || pc.theme       || "dark",
      // Sidebar: localStorage (most recent save on this device) → HA config → default
      kioskMode:    ls.kioskMode     !== undefined ? ls.kioskMode     : (pc.kioskMode     ?? false),
      headerBadges: ls.headerBadges  !== undefined ? ls.headerBadges  : (pc.headerBadges  ?? []),
      sidebarCards: ls.sidebarCards  !== undefined ? ls.sidebarCards  : (pc.sidebarCards  ?? []),
      sidebarWidth: ls.sidebarWidth  !== undefined ? ls.sidebarWidth  : (pc.sidebarWidth  ?? 300),
    };

    // Calendars: localStorage (most recent save) → HA panelConfig → migrate v1
    if (ls.calendars && ls.calendars.length > 0) {
      this._calendars = ls.calendars;
    } else if (pc.calendars && pc.calendars.length > 0) {
      this._calendars = pc.calendars;
    } else {
      // Migrate from v1 panel config format
      this._calendars = [];
      const colors = ["#818CF8","#F472B6","#34D399","#FBBF24","#60A5FA","#FB923C"];
      let idx = 0;
      const toArr = v => !v ? [] : Array.isArray(v) ? v.filter(Boolean) : [v];
      if (pc.personA?.calendar) {
        this._calendars.push({ id:"cal_0", name: pc.personA.name||"Partner 1",
          color: pc.personA.color||colors[idx], entities: toArr(pc.personA.calendar) }); idx++;
      }
      if (pc.personB?.calendar) {
        this._calendars.push({ id:"cal_1", name: pc.personB.name||"Partner 2",
          color: pc.personB.color||colors[idx], entities: toArr(pc.personB.calendar) }); idx++;
      }
      if (pc.joint?.calendar) {
        this._calendars.push({ id:"cal_2", name:"Together",
          color: pc.joint.color||colors[idx], entities: toArr(pc.joint.calendar) });
      }
    }

    this._view = this._config.defaultView;
    this._render();
    this._loadLovelaceResources(); // load HACS card scripts so sidebar cards work
    this._fetchEvents().then(() => {
      if (this._view === "month") this._prefetchFullMonthRange();
    });
  }

  // ── Data ───────────────────────────────────────────────────────────────

  // Skip re-polling Google if data was fetched within this window
  static get STALE_MS() { return 2 * 60 * 1000; } // 2 minutes

  async _fetchEvents(showSpinner = true) {
    if (!this._hass || !this._config) return;
    if (showSpinner) { this._loading = true; this._renderMainContent(); }

    const { start, end } = this._fetchRange();
    const entities  = this._calendarEntities();
    const uniqueIds = [...new Set(entities.map(e => e.entityId).filter(Boolean))];

    // Only re-poll Google when data is stale — skips the wait on quick view switches
    const dataIsStale = !this._lastFetched ||
      (Date.now() - this._lastFetched.getTime()) > CoupleCalendarPanel.STALE_MS;
    if (dataIsStale && uniqueIds.length) {
      try {
        await this._hass.callService("homeassistant", "update_entity", { entity_id: uniqueIds });
      } catch (_) { /* non-fatal */ }
    }

    try {
      const sStr = start.toISOString().replace(".000Z","Z");
      const eStr = end.toISOString().replace(".000Z","Z");

      // Fetch all calendar entities in parallel
      const results = await Promise.all(
        entities
          .filter(({ entityId }) => !!entityId)
          .map(({ entityId, who }) =>
            this._hass.callApi("GET",
              `calendars/${entityId}?start=${encodeURIComponent(sStr)}&end=${encodeURIComponent(eStr)}`)
              .then(data => Array.isArray(data)
                ? data.map(ev => ({ ...ev, _who: who, _color: this._whoColor(who) }))
                : [])
              .catch(() => [])
          )
      );

      this._events = results.flat();
      this._lastFetched = new Date();
    } catch (e) {
      console.error("[FamilyCalendar] fetch error:", e);
    }

    this._loading = false;
    this._renderMainContent();
    this._tickUpdated();
  }

  async _manualRefresh() {
    const btn = this.shadowRoot.getElementById("cc-refresh-btn");
    if (btn) btn.classList.add("spinning");
    this._lastFetched = null; // force re-poll on manual refresh
    await this._fetchEvents(false);
    if (btn) btn.classList.remove("spinning");
  }

  _fetchRange() {
    if (this._view === "week") {
      const ws = this._weekStart();
      return { start: ws, end: addDays(ws, 7) };
    }
    if (this._view === "agenda") {
      return { start: startOfDay(new Date()), end: addDays(new Date(), 90) };
    }
    // Month Phase 1: ± 2 months — fast initial render
    return {
      start: addMonths(startOfMonth(this._cursor), -2),
      end:   addMonths(endOfMonth(this._cursor),    2),
    };
  }

  // Phase 2: load the full 13-month scroll range in the background.
  // Guards against view-change mid-flight so there's no cascade or lockup.
  async _prefetchFullMonthRange() {
    if (this._view !== "month" || !this._hass) return;

    const start = addMonths(startOfMonth(this._cursor), -3);
    const end   = addMonths(endOfMonth(this._cursor),    9);

    const entities = this._calendarEntities();
    if (!entities.length) return;

    const sStr = start.toISOString().replace(".000Z","Z");
    const eStr = end.toISOString().replace(".000Z","Z");

    try {
      const results = await Promise.all(
        entities
          .filter(({ entityId }) => !!entityId)
          .map(({ entityId, who }) =>
            this._hass.callApi("GET",
              `calendars/${entityId}?start=${encodeURIComponent(sStr)}&end=${encodeURIComponent(eStr)}`)
              .then(data => Array.isArray(data)
                ? data.map(ev => ({ ...ev, _who: who, _color: this._whoColor(who) }))
                : [])
              .catch(() => [])
          )
      );

      // Bail if the user switched views while we were fetching
      if (this._view !== "month") return;

      this._events = results.flat();
      // _renderMonthView saves + restores scrollTop, so this is seamless
      this._renderMainContent();
    } catch (_) { /* silent — Phase 1 data is still showing */ }
  }

  _calendarEntities() {
    const list = [];
    for (const cal of (this._calendars || [])) {
      const entities = Array.isArray(cal.entities) ? cal.entities : (cal.entities ? [cal.entities] : []);
      for (const entityId of entities) {
        if (entityId) list.push({ entityId, who: cal.id });
      }
    }
    return list;
  }

  _calById(id) {
    return (this._calendars || []).find(c => c.id === id);
  }

  _whoColor(who) {
    return this._calById(who)?.color || "#888";
  }

  _whoName(who) {
    return this._calById(who)?.name || "Unknown";
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
      // Use strict > so all-day event exclusive end dates (e.g. end=Friday
      // for a Thursday event) don't bleed onto the following day.
      return s < de && (e || s) > ds;
    });
  }

  // ── Week start helper ──────────────────────────────────────────────────

  _weekStart(cursor) {
    const d    = cursor || this._cursor;
    const fdow = this._config?.firstDayOfWeek;
    if (fdow === "today") {
      // Anchor to today; each nav step is a 7-day window from today
      const todayMs  = startOfDay(new Date()).getTime();
      const cursorMs = startOfDay(d).getTime();
      const diffDays = Math.round((cursorMs - todayMs) / 86400000);
      const window   = Math.floor(diffDays / 7);
      return addDays(startOfDay(new Date()), window * 7);
    }
    return startOfWeek(d, parseInt(fdow ?? 0));
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  _navigate(dir) {
    // Month view: smooth-scroll to the adjacent month instead of re-rendering.
    // Read the currently displayed month from the header text (not _cursor, which
    // stays fixed so switching to Week/Agenda returns to the right period).
    if (this._view === "month") {
      const scrollEl  = this.shadowRoot.querySelector("#cc-month-scroll");
      const monthEl   = this.shadowRoot.querySelector(".header-month");
      const subEl     = this.shadowRoot.querySelector(".header-sub");
      const curM      = MONTH_NAMES.indexOf(monthEl?.textContent?.trim() ?? "");
      const curY      = parseInt(subEl?.textContent) || this._cursor.getFullYear();
      const targetDate = addMonths(new Date(curY, curM < 0 ? this._cursor.getMonth() : curM, 1), dir);
      const key        = `${targetDate.getFullYear()}-${targetDate.getMonth()}`;
      const target     = scrollEl?.querySelector(`[data-month-key="${key}"]`);
      if (target && scrollEl) {
        const hdrH = scrollEl.querySelector(".weekday-header")?.offsetHeight ?? 37;
        scrollEl.scrollTo({ top: target.offsetTop - hdrH, behavior: "smooth" });
      } else {
        // Target month not rendered — shift cursor and re-render
        this._shiftCursor(dir);
        this._renderMainContent();
        this._renderHeader();
      }
      return;
    }

    const main = this.shadowRoot.querySelector(".main");
    if (main) {
      main.classList.add(dir > 0 ? "anim-slide-left" : "anim-slide-right");
      setTimeout(() => {
        main.classList.remove("anim-slide-left","anim-slide-right");
        this._shiftCursor(dir);
        this._renderHeader();
        this._renderMainContent();
        main.classList.add(dir > 0 ? "anim-enter-right" : "anim-enter-left");
        setTimeout(() => main.classList.remove("anim-enter-right","anim-enter-left"), 220);
        this._fetchEvents(false);
      }, 180);
    } else {
      this._shiftCursor(dir);
      this._renderHeader();
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
    this._cursor       = new Date();
    this._today        = startOfDay(new Date());
    this._scrollToCursor = true; // tell _renderMonthView to jump to cursor, not restore scroll
    this._renderHeader();
    this._renderMainContent();
    this._scrollToCursor = false;
    this._fetchEvents(false);
  }

  _switchView(view) {
    this._view = view;
    this._render();
    this._fetchEvents().then(() => {
      if (this._view === "month") this._prefetchFullMonthRange();
    });
  }

  // ── Rendering ──────────────────────────────────────────────────────────

  _render() {
    const style = document.createElement("style");
    style.textContent = buildStyles(this._config || {});

    const root = document.createElement("div");
    root.className = `panel-root${this._config?.kioskMode ? " kiosk-mode" : ""}`;
    root.style.setProperty("--fc-sidebar-width", `${this._config?.sidebarWidth ?? 300}px`);
    root.innerHTML = `
      <div class="kiosk-sidebar"  id="cc-sidebar"></div>
      <div class="panel-right">
        <div class="header"       id="cc-header"></div>
        <div class="legend"       id="cc-legend"></div>
        <div class="main"         id="cc-main"></div>
      </div>
      <div class="drawer-overlay" id="cc-drawer-overlay"></div>
      <div class="drawer"         id="cc-drawer"></div>
      <div class="modal-overlay"  id="cc-modal-overlay">
        <div class="modal"        id="cc-modal"></div>
      </div>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(root);

    this._sidebarCardEls = [];
    this._bindStaticEvents();
    this._renderHeader();
    this._renderLegend();
    this._renderMainContent();
    this._renderSidebar().catch(() => {});
    this._renderDrawer();
  }

  _renderHeader() {
    const title = this._headerTitle();
    const el    = this.shadowRoot.getElementById("cc-header");
    if (!el) return;

    el.innerHTML = `
      <div class="header-left">
        <button class="menu-btn" id="cc-menu-btn" aria-label="Settings">${ICON.menu}</button>
        <div class="header-nav">
          <button class="nav-btn" id="cc-prev-btn" aria-label="Previous">${ICON.chevL}</button>
          <div class="header-title-wrap">
            <div class="header-month">${title.main}</div>
            ${title.sub ? `<div class="header-sub">${title.sub}</div>` : ""}
          </div>
          <button class="nav-btn" id="cc-next-btn" aria-label="Next">${ICON.chevR}</button>
        </div>
        <button class="today-btn" id="cc-today-btn">Today</button>
      </div>

      ${this._config?.kioskMode && (this._config?.headerBadges?.length)
        ? `<div class="header-badges" id="cc-badges">${this._renderBadgesHTML()}</div>`
        : `<div class="header-clock">
             <div class="header-clock-time" id="cc-clock-time"></div>
             <div class="header-clock-date" id="cc-clock-date"></div>
           </div>`
      }

      <div class="header-right">
        <div class="view-switcher">
          <button class="view-btn ${this._view==="month"  ?"active":""}" data-view="month">Month</button>
          <button class="view-btn ${this._view==="week"   ?"active":""}" data-view="week">Week</button>
          <button class="view-btn ${this._view==="agenda" ?"active":""}" data-view="agenda">Agenda</button>
        </div>
      </div>
    `;

    this._tickClock();
    this._tickUpdated();

    el.querySelector("#cc-menu-btn").addEventListener("click",  () => this._openDrawer());
    el.querySelector("#cc-prev-btn").addEventListener("click",  () => this._navigate(-1));
    el.querySelector("#cc-next-btn").addEventListener("click",  () => this._navigate(1));
    el.querySelector("#cc-today-btn").addEventListener("click", () => this._goToday());
    el.querySelectorAll(".view-btn").forEach(btn =>
      btn.addEventListener("click", () => this._switchView(btn.dataset.view))
    );
  }

  _headerTitle() {
    if (this._view === "week") {
      const ws = this._weekStart();
      const we = addDays(ws, 6);
      const sameMonth = ws.getMonth() === we.getMonth();
      const sameYear  = ws.getFullYear() === we.getFullYear();
      const dFmt = d => d.toLocaleDateString([], { month: "short", day: "numeric" });
      if (sameMonth) {
        return { main: `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}`, sub: ws.getFullYear() };
      }
      return { main: `${dFmt(ws)} – ${dFmt(we)}`, sub: sameYear ? ws.getFullYear() : `${ws.getFullYear()} – ${we.getFullYear()}` };
    }
    if (this._view === "agenda") {
      const today = new Date();
      const end   = addDays(today, 90);
      if (today.getMonth() === end.getMonth()) {
        return { main: MONTH_NAMES[today.getMonth()], sub: today.getFullYear() };
      }
      return {
        main: `${MONTH_NAMES[today.getMonth()].slice(0,3)} – ${MONTH_NAMES[end.getMonth()].slice(0,3)}`,
        sub:  today.getFullYear(),
      };
    }
    // Month view
    return { main: MONTH_NAMES[this._cursor.getMonth()], sub: this._cursor.getFullYear() };
  }

  _renderLegend() {
    const filters = [
      { id: "all", label: "All", color: null },
      ...(this._calendars || []).map(c => ({ id: c.id, label: c.name, color: c.color })),
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
      <div style="flex:1;"></div>
      <div class="legend-refresh">
        <button class="refresh-icon-btn" id="cc-refresh-btn" aria-label="Refresh">${ICON.refresh}</button>
        <span id="cc-updated-text"></span>
      </div>
    `;
    this._tickUpdated();

    el.querySelectorAll(".legend-filter").forEach(btn =>
      btn.addEventListener("click", () => {
        this._activeFilter = btn.dataset.filter;
        this._renderLegend();
        this._renderMainContent();
      })
    );
    el.querySelector("#cc-refresh-btn")?.addEventListener("click", () => this._manualRefresh());
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

  // ── Month view (continuous scrollable) ───────────────────────────────

  _renderMonthView(el) {
    const cfg  = this._config || {};
    const fdow = cfg.firstDayOfWeek === "today" ? 0 : parseInt(cfg.firstDayOfWeek ?? 0);

    // Preserve scroll position across event-fetch re-renders
    const prevScroll = el.querySelector("#cc-month-scroll")?.scrollTop ?? null;

    const dayLabels = Array.from({ length: 7 }, (_, i) => DAY_NAMES_SHORT[(fdow + i) % 7]);

    // Render 3 months before cursor through 9 months after = 13 months total
    const BEFORE = 3, AFTER = 9;
    const sections = Array.from({ length: BEFORE + AFTER + 1 }, (_, i) =>
      this._renderMonthSection(addMonths(this._cursor, i - BEFORE), fdow)
    ).join("");

    // Weekday header lives INSIDE the scroll container so all sticky
    // elements share the same ancestor and top:0 / top:37px are consistent.
    el.innerHTML = `
      <div class="month-view">
        <div class="month-scroll" id="cc-month-scroll">
          <div class="weekday-header">
            ${dayLabels.map(n => `<div class="weekday-label">${n}</div>`).join("")}
          </div>
          ${sections}
        </div>
      </div>
    `;

    const scrollEl = el.querySelector("#cc-month-scroll");
    if (scrollEl) {
      if (prevScroll !== null && !this._scrollToCursor) {
        // Restore position after event-fetch re-render
        scrollEl.scrollTop = prevScroll;
      } else {
        // Fresh render or Today button — scroll to the cursor month.
        // Offset by the weekday-header height so it isn't hidden under the sticky row.
        const target = scrollEl.querySelector(`[data-month-key="${this._cursor.getFullYear()}-${this._cursor.getMonth()}"]`);
        const hdrH   = scrollEl.querySelector(".weekday-header")?.offsetHeight ?? 37;
        if (target) scrollEl.scrollTop = target.offsetTop - hdrH;
      }
      scrollEl.addEventListener("scroll", () => this._onMonthScroll(scrollEl), { passive: true });
    }

    this._bindMonthEvents(el);
  }

  _renderMonthSection(monthDate, fdow) {
    const year     = monthDate.getFullYear();
    const month    = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() - fdow + 7) % 7;
    const numRows  = Math.ceil((startPad + lastDay.getDate()) / 7);
    const cells    = Array.from({ length: numRows * 7 }, (_, i) => new Date(year, month, 1 + (i - startPad)));

    const weekRowsHtml = this._chunkArray(cells, 7).map(week => `
      <div class="week-row">
        ${week.map(day => this._renderDayCell(day, month)).join("")}
      </div>
    `).join("");

    const isCurrentYear = year === new Date().getFullYear();
    const label = isCurrentYear ? MONTH_NAMES[month] : `${MONTH_NAMES[month]} ${year}`;

    return `
      <div class="month-section"
           data-month-key="${year}-${month}"
           data-year="${year}" data-month="${month}">
        <div class="month-section-label">${label}</div>
        ${weekRowsHtml}
      </div>
    `;
  }

  _onMonthScroll(scrollEl) {
    // Find the month section at the top quarter of the viewport
    const threshold = scrollEl.scrollTop + scrollEl.clientHeight * 0.25;
    const sections  = Array.from(scrollEl.querySelectorAll(".month-section"));
    let active = sections[0];
    for (const s of sections) {
      if (s.offsetTop <= threshold) active = s; else break;
    }
    if (!active) return;
    const y = parseInt(active.dataset.year);
    const m = parseInt(active.dataset.month);

    // Update ONLY the header display — do NOT change _cursor so switching
    // to Week/Agenda view always returns to the original navigation position.
    const monthEl = this.shadowRoot.querySelector(".header-month");
    const subEl   = this.shadowRoot.querySelector(".header-sub");
    const isCurrentYear = y === new Date().getFullYear();
    if (monthEl) monthEl.textContent = MONTH_NAMES[m];
    if (subEl)   subEl.textContent   = isCurrentYear ? y : y;
  }

  _bindMonthEvents(el) {
    el.querySelectorAll(".event-chip").forEach(chip =>
      chip.addEventListener("click", e => {
        e.stopPropagation();
        this._openDetailModal(this._filteredEvents()[parseInt(chip.dataset.idx)]);
      })
    );
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
    // Preserve scroll position across re-renders (e.g. auto-refresh)
    const prevScroll = el.querySelector(".week-time-grid")?.scrollTop ?? null;

    const cfg    = this._config || {};
    const use24  = cfg.timeFormat === "24h";
    const ws     = this._weekStart();
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

    const now    = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const todayIdx  = days.findIndex(d => isSameDay(d, this._today));
    const hours     = Array.from({ length: 24 }, (_, h) => h);

    const timeGutter = hours.map(h => {
      if (h === 0) return `<div class="time-label"></div>`;
      const lbl = use24 ? `${String(h).padStart(2,"0")}:00` : (h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`);
      return `<div class="time-label">${lbl}</div>`;
    }).join("");

    const timeCols = days.map((d, di) => {
      const timedEvs = layoutTimedEvents(
        this._eventsOnDay(d).filter(ev => !!ev.start?.dateTime)
      );
      const blocks = timedEvs.map(ev => {
        const s        = new Date(ev.start.dateTime);
        const e        = ev.end?.dateTime ? new Date(ev.end.dateTime) : addDays(s, 1/24);
        const top      = ((s.getHours() * 60 + s.getMinutes()) / 60) * HOUR_H;
        const h        = Math.max(28, ((e - s) / 3600000) * HOUR_H) - 1; // -1px gap between back-to-back events
        const tc       = textOnBg(ev._color);
        const numCols  = ev._numCols || 1;
        const col      = ev._col || 0;
        const colW     = 100 / numCols;
        const leftPct  = col * colW;
        const gap      = numCols > 1 ? 2 : 0; // 2px gutter between side-by-side events
        return `<div class="week-event"
          style="top:${top}px;height:${h}px;
                 left:calc(${leftPct}% + 2px);
                 width:calc(${colW}% - ${2 + gap}px);
                 right:auto;
                 background:${ev._color};color:${tc};"
          data-evjson="${encodeURIComponent(JSON.stringify(ev))}">
          <div class="week-event-title">${ev.summary||"Event"}</div>
          ${h > 38 ? `<div class="week-event-time">${formatTime(s, use24)}</div>` : ""}
        </div>`;
      }).join("");

      const hourLines = hours.map(h => `<div class="hour-line" style="top:${h*HOUR_H}px;"></div>`).join("");
      const nowLine   = di === todayIdx
        ? `<div class="now-line" style="top:${(nowMin/60)*HOUR_H}px;"></div>`
        : "";
      const isToday   = di === todayIdx;
      return `<div class="week-day-time-col ${isToday ? "today-col" : ""}" style="height:${24*HOUR_H}px;">${hourLines}${nowLine}${blocks}</div>`;
    }).join("");

    const gc      = "grid-template-columns: repeat(7, 1fr)";
    const innerGC = `display:grid;${gc};gap:2px;flex:1;`;
    el.innerHTML = `
      <div class="week-view">
        <div class="week-day-header">
          <div style="width:56px;flex-shrink:0;"></div>
          <div style="${innerGC}">${dayHeaders}</div>
        </div>
        <div class="week-all-day-row">
          <div style="width:56px;flex-shrink:0;"></div>
          <div style="${innerGC}">${allDayCells}</div>
        </div>
        <div class="week-time-grid">
          <div class="time-gutter" style="min-height:${24*HOUR_H}px;">${timeGutter}</div>
          <div class="week-days-grid" style="${gc}">${timeCols}</div>
        </div>
      </div>`;

    const tg = el.querySelector(".week-time-grid");
    if (tg) tg.scrollTop = prevScroll !== null ? prevScroll : 7 * HOUR_H;

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
      el.innerHTML = `<div class="agenda-view"><div class="agenda-empty">No upcoming events on the selected calendars.<br>Add events in Google Calendar on your phone — they'll appear here within seconds.</div></div>`;
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

  // ── Kiosk sidebar ────────────────────────────────────────────────────

  async _renderSidebar() {
    const el = this.shadowRoot.getElementById("cc-sidebar");
    if (!el) return;
    el.innerHTML = "";
    this._sidebarCardEls = [];

    if (!this._config?.kioskMode) return;

    // Ensure all Lovelace resources (HACS card scripts) are loaded before
    // attempting to create any card elements.
    el.innerHTML = `<div style="padding:16px;color:#8B949E;font-size:12px;text-align:center;line-height:1.6;">Loading...</div>`;
    await this._loadLovelaceResources();
    if (!this._mounted) return; // navigated away during resource load

    el.innerHTML = "";

    const cards = this._config.sidebarCards || [];
    if (!cards.length) {
      el.innerHTML = `<div style="padding:16px;color:#8B949E;font-size:13px;text-align:center;line-height:1.6;">
        Open ☰ Settings → Sidebar to add sidebar cards
      </div>`;
      return;
    }

    for (const cardConfig of cards) {
      const type = cardConfig.type;
      if (!type) continue;

      const isCustom    = type.startsWith("custom:");
      const elementName = isCustom ? type.slice(7) : type;
      const builtinName = isCustom ? null : `hui-${type}-card`;
      const regName     = (builtinName && customElements.get(builtinName)) ? builtinName
                        : (customElements.get(elementName) ? elementName : null);

      if (!regName) {
        // Element not yet registered — wait up to 10 s then give up
        const resolved = await Promise.race([
          customElements.whenDefined(elementName).then(() => elementName),
          new Promise(r => setTimeout(() => r(null), 10_000)),
        ]);
        if (!resolved) {
          const errDiv = document.createElement("div");
          errDiv.style.cssText = "padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);color:#f87171;font-size:12px;";
          errDiv.textContent = `"${type}" did not load. Visit a Lovelace dashboard first, or check it's installed.`;
          el.appendChild(errDiv);
          continue;
        }
        // Element is now registered — fall through using the resolved name
        Object.assign({ regName: resolved }, { regName: resolved });
        // Re-check after whenDefined resolves
        const newReg = customElements.get(builtinName || "") ? builtinName
                     : customElements.get(elementName) ? elementName : resolved;
        const cardEl2 = document.createElement(newReg);
        try { if (typeof cardEl2.setConfig === "function") cardEl2.setConfig(cardConfig); }
        catch (e) {
          const errDiv = document.createElement("div");
          errDiv.style.cssText = "padding:12px;border-radius:10px;background:rgba(220,38,38,0.1);color:#f87171;font-size:12px;";
          errDiv.textContent = `${type}: ${e.message}`;
          el.appendChild(errDiv); continue;
        }
        cardEl2.hass = this._hass;
        el.appendChild(cardEl2);
        this._sidebarCardEls.push(cardEl2);
        continue;
      }

      // Create element and call setConfig ourselves so we control errors
      const cardEl = document.createElement(regName);
      try {
        if (typeof cardEl.setConfig === "function") cardEl.setConfig(cardConfig);
      } catch (e) {
        const errDiv = document.createElement("div");
        errDiv.style.cssText = "padding:12px;border-radius:10px;background:rgba(220,38,38,0.1);color:#f87171;font-size:12px;line-height:1.5;";
        errDiv.textContent = `${type}: ${e.message}`;
        el.appendChild(errDiv);
        continue;
      }
      cardEl.hass = this._hass;
      el.appendChild(cardEl);
      this._sidebarCardEls.push(cardEl);
    }
  }

  // ── Header badges ────────────────────────────────────────────────────

  _renderBadgesHTML() {
    const badges = this._config?.headerBadges || [];
    if (!badges.length) return "";
    return badges.map(entityId => {
      const state = this._hass?.states?.[entityId];
      if (!state) return `<div class="badge"><div class="badge-value">—</div><div class="badge-label">${entityId.split(".")[1]?.replace(/_/g," ") || entityId}</div></div>`;
      const val   = state.state;
      const attrs = state.attributes;
      const unit  = attrs.unit_of_measurement || "";
      const name  = (attrs.friendly_name || entityId).replace(/^[^.]+\./, "").replace(/_/g," ");
      return `<div class="badge" data-entity="${entityId}">
        <div class="badge-value">${val}${unit}</div>
        <div class="badge-label">${name}</div>
      </div>`;
    }).join("");
  }

  _updateBadges() {
    const badgesEl = this.shadowRoot.getElementById("cc-badges");
    if (!badgesEl || !this._hass) return;
    const badges = this._config?.headerBadges || [];
    Array.from(badgesEl.children).forEach((badge, i) => {
      const entityId = badge.dataset.entity;
      if (!entityId) return;
      const state = this._hass.states?.[entityId];
      if (!state) return;
      const val  = state.state;
      const unit = state.attributes?.unit_of_measurement || "";
      const valEl = badge.querySelector(".badge-value");
      if (valEl) valEl.textContent = val + unit;
    });
  }

  // ── Settings drawer ───────────────────────────────────────────────────

  _renderDrawer() {
    const cfg  = this._config || {};
    const aColor = (cfg.calendars?.[0]?.color) || cfg.personA?.color || "#818CF8";
    const bColor = cfg.personB?.color || "#F472B6";
    const jColor = cfg.joint?.color   || "#34D399";
    const el = this.shadowRoot.getElementById("cc-drawer");
    if (!el) return;

    // Build available calendar entity options from hass.states
    const availableEntities = Object.keys(this._hass?.states || {})
      .filter(id => id.startsWith("calendar."))
      .sort()
      .map(id => ({ value: id, label: id.replace("calendar.", "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }));

    const entityOptions = availableEntities.map(e =>
      `<option value="${e.value}">${e.label}</option>`
    ).join("");

    const calCards = (this._calendars || []).map((cal, i) => {
      const selectedEntities = Array.isArray(cal.entities) ? cal.entities : (cal.entities ? [cal.entities] : []);
      return `
        <div class="cal-card" data-cal-id="${cal.id}">
          <div class="cal-card-header">
            <input type="text" class="cal-name-input" value="${cal.name}" placeholder="Calendar name">
            ${(this._calendars.length > 1) ? `<button class="cal-delete-btn" data-cal-id="${cal.id}" aria-label="Remove">${ICON.close}</button>` : ""}
          </div>
          <div class="cal-card-color-label">Color</div>
          <div class="color-swatch-row cal-colors" data-cal-id="${cal.id}">
            ${COLOR_PRESETS.map(c => `<div class="color-swatch ${c===cal.color?"selected":""}" data-color="${c}" style="background:${c};"></div>`).join("")}
          </div>
          <div class="cal-card-color-label" style="margin-top:12px;">Google Calendar Entities</div>
          <select class="cal-entity-select" data-cal-id="${cal.id}" multiple size="${Math.min(5, availableEntities.length || 3)}">
            ${availableEntities.map(e => `<option value="${e.value}" ${selectedEntities.includes(e.value)?"selected":""}>${e.label}</option>`).join("")}
          </select>
        </div>
      `;
    }).join("");

    const firstColor = (this._calendars?.[0]?.color) || "#818CF8";

    el.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title">${ICON.settings} &nbsp;Settings</div>
        <button class="close-btn" id="cc-drawer-close">${ICON.close}</button>
      </div>
      <div class="drawer-body">
        <div class="settings-section">
          <div class="settings-section-title">Calendars</div>
          <div id="cal-cards-list">${calCards}</div>
          <button class="add-cal-btn" id="cc-add-cal">+ Add Calendar</button>
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
              <option value="0"     ${(cfg.firstDayOfWeek==0||cfg.firstDayOfWeek=="0")?"selected":""}>Sunday</option>
              <option value="1"     ${(cfg.firstDayOfWeek==1||cfg.firstDayOfWeek=="1")?"selected":""}>Monday</option>
              <option value="today" ${cfg.firstDayOfWeek==="today"?"selected":""}>Today (rolling 7 days)</option>
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

        <div class="settings-section">
          <div class="settings-section-title">Sidebar</div>
          <div class="settings-row">
            <label>Enable sidebar</label>
            <input type="checkbox" id="s-kiosk" ${cfg.kioskMode?"checked":""} style="width:20px;height:20px;cursor:pointer;accent-color:${firstColor};">
          </div>
          <div id="s-kiosk-options" style="${cfg.kioskMode?"":"display:none"}">
            <div class="settings-row" style="margin-top:4px;">
              <label>Sidebar width (px)</label>
              <input type="number" id="s-sidebar-width" value="${cfg.sidebarWidth ?? 300}" min="100" max="800" step="10"
                style="width:80px;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:inherit;font-size:14px;text-align:center;">
            </div>
            <div class="settings-section-title" style="margin-top:8px;font-size:10px;">HEADER BADGES <span style="font-weight:400;font-style:italic;opacity:0.7">— replaces clock (add sensor.time for a time badge)</span></div>
            <div id="s-badges-list">
              ${(cfg.headerBadges||[]).map((id,i) => `
                <div class="settings-row" style="margin-bottom:8px;">
                  <input type="text" class="badge-entity-input" value="${id}" placeholder="e.g. weather.home" style="flex:1;">
                  <button class="cal-delete-btn" data-badge-idx="${i}">${ICON.close}</button>
                </div>`).join("")}
            </div>
            <button class="add-cal-btn" id="s-add-badge" style="margin-bottom:16px;">+ Add Badge Entity</button>

            <div class="settings-section-title" style="font-size:10px;">SIDEBAR CARDS <span style="font-weight:400;font-style:italic;opacity:0.7">— paste YAML directly from your dashboard card editor</span></div>
            <div id="s-cards-list">
              ${(cfg.sidebarCards||[]).map((card,i,arr) => `
                <div class="cal-card" data-card-idx="${i}" style="margin-bottom:10px;">
                  <div class="cal-card-header" style="margin-bottom:6px;">
                    <div style="display:flex;flex-direction:column;gap:2px;margin-right:6px;">
                      <button class="card-move-btn" data-card-idx="${i}" data-dir="-1" ${i===0?"disabled":""} style="background:none;border:none;cursor:pointer;color:#8B949E;padding:0;line-height:1;font-size:14px;">▲</button>
                      <button class="card-move-btn" data-card-idx="${i}" data-dir="1"  ${i===arr.length-1?"disabled":""} style="background:none;border:none;cursor:pointer;color:#8B949E;padding:0;line-height:1;font-size:14px;">▼</button>
                    </div>
                    <span style="font-size:12px;font-weight:700;opacity:0.6;flex:1;">${card.type||"card"}</span>
                    <button class="cal-delete-btn" data-card-idx="${i}">${ICON.close}</button>
                  </div>
                  <textarea class="card-config-input" rows="5" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);color:inherit;font-size:12px;font-family:monospace;resize:vertical;" placeholder="type: weather-forecast&#10;entity: weather.home">${this._cardToYaml(card)}</textarea>
                </div>`).join("")}
            </div>
            <button class="add-cal-btn" id="s-add-card">+ Add Sidebar Card</button>
          </div>
        </div>

        <button class="save-btn" id="cc-save-settings" style="background:${firstColor};">Save Changes</button>
      </div>
    `;

    // Kiosk toggle shows/hides the kiosk options section
    el.querySelector("#s-kiosk")?.addEventListener("change", e => {
      const opts = el.querySelector("#s-kiosk-options");
      if (opts) opts.style.display = e.target.checked ? "" : "none";
    });

    // Add badge entity row
    el.querySelector("#s-add-badge")?.addEventListener("click", () => {
      const list = el.querySelector("#s-badges-list");
      if (!list) return;
      const idx = list.children.length;
      const row = document.createElement("div");
      row.className = "settings-row";
      row.style.marginBottom = "8px";
      row.innerHTML = `<input type="text" class="badge-entity-input" placeholder="e.g. sensor.time" style="flex:1;">
        <button class="cal-delete-btn" data-badge-idx="${idx}">${ICON.close}</button>`;
      list.appendChild(row);
      row.querySelector(".cal-delete-btn").addEventListener("click", () => row.remove());
    });
    el.querySelectorAll("[data-badge-idx]").forEach(btn =>
      btn.addEventListener("click", () => btn.closest(".settings-row")?.remove())
    );

    // Add sidebar card
    el.querySelector("#s-add-card")?.addEventListener("click", () => {
      const list = el.querySelector("#s-cards-list");
      if (!list) return;
      const idx = list.children.length;
      const div = document.createElement("div");
      div.className = "cal-card";
      div.dataset.cardIdx = idx;
      div.style.marginBottom = "10px";
      div.innerHTML = `
        <div class="cal-card-header" style="margin-bottom:6px;">
          <span style="font-size:12px;font-weight:700;opacity:0.6;">new card</span>
          <button class="cal-delete-btn">${ICON.close}</button>
        </div>
        <textarea class="card-config-input" rows="5" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);color:inherit;font-size:12px;font-family:monospace;resize:vertical;" placeholder="type: weather-forecast&#10;entity: weather.home"></textarea>`;
      list.appendChild(div);
      div.querySelector(".cal-delete-btn").addEventListener("click", () => div.remove());
    });
    el.querySelectorAll("[data-card-idx] .cal-delete-btn").forEach(btn =>
      btn.addEventListener("click", () => btn.closest(".cal-card")?.remove())
    );

    // Move sidebar card up/down — rebuild the live card list order
    el.querySelectorAll(".card-move-btn").forEach(btn =>
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const list = el.querySelector("#s-cards-list");
        const card = btn.closest(".cal-card");
        const dir  = parseInt(btn.dataset.dir);
        if (!list || !card) return;
        const cards = Array.from(list.querySelectorAll(".cal-card"));
        const idx   = cards.indexOf(card);
        const swapWith = cards[idx + dir];
        if (!swapWith) return;
        if (dir === -1) list.insertBefore(card, swapWith);
        else            list.insertBefore(swapWith, card);
        // Re-number data-card-idx and update disabled states
        Array.from(list.querySelectorAll(".cal-card")).forEach((c, i, arr) => {
          c.dataset.cardIdx = i;
          c.querySelectorAll(".card-move-btn").forEach(b => {
            b.disabled = (b.dataset.dir === "-1" && i === 0) ||
                         (b.dataset.dir === "1"  && i === arr.length - 1);
          });
        });
      })
    );

    // Color swatch selection per calendar card
    el.querySelectorAll(".cal-colors").forEach(row => {
      row.querySelectorAll(".color-swatch").forEach(sw =>
        sw.addEventListener("click", () => {
          row.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
          sw.classList.add("selected");
        })
      );
    });

    // Delete calendar — only bind to buttons that have data-cal-id so sidebar
    // card and badge delete buttons are not accidentally caught by this handler
    el.querySelectorAll(".cal-delete-btn[data-cal-id]").forEach(btn =>
      btn.addEventListener("click", () => {
        const id = btn.dataset.calId;
        this._calendars = this._calendars.filter(c => c.id !== id);
        this._renderDrawer();
      })
    );

    // Delete sidebar card (data-card-idx on the button itself)
    el.querySelectorAll(".cal-card[data-card-idx] .cal-delete-btn").forEach(btn =>
      btn.addEventListener("click", () => btn.closest(".cal-card")?.remove())
    );

    // Add calendar
    el.querySelector("#cc-add-cal").addEventListener("click", () => {
      const colors = ["#818CF8","#F472B6","#34D399","#FBBF24","#60A5FA","#FB923C","#A78BFA","#34D399"];
      const newId = `cal_${Date.now()}`;
      const usedColors = (this._calendars || []).map(c => c.color);
      const nextColor = colors.find(c => !usedColors.includes(c)) || colors[this._calendars.length % colors.length];
      this._calendars = [...(this._calendars || []), { id: newId, name: "New Calendar", color: nextColor, entities: [] }];
      this._renderDrawer();
      // Scroll to bottom to show new card
      setTimeout(() => el.querySelector(".drawer-body")?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    });

    el.querySelector("#cc-drawer-close").addEventListener("click", () => this._closeDrawer());
    el.querySelector("#cc-save-settings").addEventListener("click", () => this._saveSettings());
  }

  _openDrawer() {
    this._renderDrawer();
    this.shadowRoot.getElementById("cc-drawer-overlay").classList.add("open");
    this.shadowRoot.getElementById("cc-drawer").classList.add("open");
  }
  _closeDrawer() {
    this.shadowRoot.getElementById("cc-drawer-overlay").classList.remove("open");
    this.shadowRoot.getElementById("cc-drawer").classList.remove("open");
  }

  async _saveSettings() {
    const dr = this.shadowRoot.getElementById("cc-drawer");

    // Collect updated calendars from the drawer
    const updatedCals = (this._calendars || []).map(cal => {
      const card   = dr.querySelector(`.cal-card[data-cal-id="${cal.id}"]`);
      if (!card) return cal;
      const name   = card.querySelector(".cal-name-input")?.value?.trim() || cal.name;
      const color  = card.querySelector(".cal-colors .selected")?.dataset.color || cal.color;
      const select = card.querySelector(".cal-entity-select");
      const entities = select
        ? Array.from(select.selectedOptions).map(o => o.value)
        : cal.entities;
      return { ...cal, name, color, entities };
    });

    // Kiosk mode settings
    const kioskMode = dr.querySelector("#s-kiosk")?.checked ?? false;
    const headerBadges = Array.from(dr.querySelectorAll(".badge-entity-input"))
      .map(i => i.value.trim()).filter(Boolean);
    const yaml = await this._loadYaml();
    const sidebarCards = Array.from(dr.querySelectorAll(".cal-card[data-card-idx]"))
      .map(card => {
        const text = card.querySelector(".card-config-input")?.value?.trim();
        if (!text) return null;
        try {
          const parsed = yaml ? yaml.load(text) : JSON.parse(text);
          return (parsed && typeof parsed === "object" && parsed.type) ? parsed : null;
        } catch (e) {
          console.warn("[FamilyCalendar] Could not parse card config:", e.message);
          return null;
        }
      }).filter(Boolean);

    const allSettings = {
      theme:          dr.querySelector("#s-theme")?.value          || "dark",
      timeFormat:     dr.querySelector("#s-time")?.value           || "12h",
      firstDayOfWeek: dr.querySelector("#s-fdow")?.value          ?? 0,
      defaultView:    dr.querySelector("#s-default-view")?.value   || "month",
      kioskMode,
      headerBadges,
      sidebarCards,
      sidebarWidth:   parseInt(dr.querySelector("#s-sidebar-width")?.value, 10) || 300,
      calendars:      updatedCals,
    };

    // Always save to localStorage first as an immediate backup
    this._saveLocalSettings(allSettings);

    // Also save to HA config entry so OTHER devices pick it up on load
    try {
      await this._hass.callWS({
        type: "couple_calendar/update_settings",
        settings: allSettings,
      });
    } catch (e) {
      console.warn("[FamilyCalendar] Could not save to HA, settings are in localStorage:", e);
    }

    // Update local state immediately
    this._calendars = updatedCals;
    if (this._config) Object.assign(this._config, allSettings);
    this._closeDrawer();
    this._render();
    this._renderSidebar().catch(() => {});
    this._fetchEvents();
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

  // ── YAML helpers ─────────────────────────────────────────────────────

  // Load all Lovelace resources (HACS cards etc.) so custom elements are
  // available in our panel. HA only loads these when a Lovelace dashboard
  // opens, so we need to do it ourselves. Runs once per session.
  _loadLovelaceResources() {
    // Return a single shared Promise so every caller awaits the same load.
    // Once resolved, subsequent calls return the already-resolved Promise.
    if (window.__fcResourcesPromise) return window.__fcResourcesPromise;
    window.__fcResourcesPromise = this._doLoadLovelaceResources();
    return window.__fcResourcesPromise;
  }

  async _doLoadLovelaceResources() {
    if (!this._hass) return;

    // Fetch resources from both sources in parallel:
    //  - lovelace/resources  → global resource list (UI-mode HACS registrations)
    //  - lovelace/config     → dashboard-level resources (YAML-mode / per-dashboard)
    // Many setups (especially YAML-mode Lovelace) only have resources in the
    // config, not in the global list, which is why lovelace/resources alone fails.
    const [globalResources, lovelaceConfig] = await Promise.all([
      this._hass.callWS({ type: "lovelace/resources" }).catch(() => []),
      this._hass.callWS({ type: "lovelace/config" }).catch(() => ({})),
    ]);

    const seen = new Set();
    const allResources = [
      ...(Array.isArray(globalResources) ? globalResources : []),
      ...(lovelaceConfig?.resources || []),
    ].filter(r => {
      if (!r?.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    console.log("[FamilyCalendar] Loading", allResources.length, "Lovelace resources");

    // Normalize URLs the same way HA's load-resources.ts does — absolute
    // against the HA server origin so they work behind proxies / Nabu Casa.
    const hassUrl = this._hass.auth?.data?.hassUrl || "";

    await Promise.all(allResources.map(res => {
      // Resolve to absolute URL (no-op for already-absolute URLs)
      const absUrl = hassUrl ? new URL(res.url, hassUrl).toString() : res.url;
      const bareUrl = absUrl.split("?")[0];
      // Check body AND head for an existing tag (HA appends to body)
      if (document.querySelector(`script[src^="${bareUrl}"]`)) return Promise.resolve();
      return new Promise(resolve => {
        const s = document.createElement("script");
        s.src = absUrl;
        // HA's loadModule uses type="module"; loadJS uses no type
        if (res.type === "module") s.type = "module";
        s.onload = resolve;
        s.onerror = () => { console.warn("[FamilyCalendar] Resource failed:", absUrl); resolve(); };
        // HA appends to document.body (not head) — match the exact pattern
        document.body.appendChild(s);
      });
    }));
  }

  // Lazy-load js-yaml from jsDelivr (cached globally after first load).
  // Falls back gracefully if offline.
  async _loadYaml() {
    if (window.__fcYaml) return window.__fcYaml;
    try {
      const mod = await import("https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs");
      window.__fcYaml = mod.default || mod;
      return window.__fcYaml;
    } catch (_) {
      return null; // offline — _saveSettings falls back to JSON.parse
    }
  }

  // Convert a card config object back to YAML for display in the textarea.
  // Simple custom serialiser so we don't need js-yaml just to open the drawer.
  _cardToYaml(obj, indent = 0) {
    if (!obj || typeof obj !== "object") return String(obj ?? "");
    const pad = "  ".repeat(indent);
    return Object.entries(obj).map(([k, v]) => {
      if (v === null || v === undefined) return `${pad}${k}:`;
      if (Array.isArray(v)) {
        const items = v.map(item =>
          typeof item === "object"
            ? `${pad}  -\n${this._cardToYaml(item, indent + 2)}`
            : `${pad}  - ${item}`
        ).join("\n");
        return `${pad}${k}:\n${items}`;
      }
      if (typeof v === "object") {
        return `${pad}${k}:\n${this._cardToYaml(v, indent + 1)}`;
      }
      // Quote strings that contain special YAML chars, leave others bare
      const safe = /^[a-zA-Z0-9._\-/: ]+$/.test(String(v));
      const val  = safe ? v : `"${String(v).replace(/"/g, '\\"')}"`;
      return `${pad}${k}: ${val}`;
    }).join("\n");
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
    }, AUTO_REFRESH_MS);
  }

  _tickClock() {
    const now   = new Date();
    const use24 = this._config?.timeFormat === "24h";
    const timeEl = this.shadowRoot.getElementById("cc-clock-time");
    const dateEl = this.shadowRoot.getElementById("cc-clock-date");
    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !use24 });
    if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  _tickUpdated() {
    const el = this.shadowRoot.getElementById("cc-updated-text");
    if (!el) return;
    if (!this._lastFetched) { el.textContent = ""; return; }
    const diff = Math.round((Date.now() - this._lastFetched) / 60000);
    el.textContent = diff < 1 ? "just now" : `${diff}m ago`;
  }

  _startClock() {
    setInterval(() => {
      this._tickClock();
      this._tickUpdated();
      const newToday = startOfDay(new Date());
      if (!isSameDay(newToday, this._today)) { this._today = newToday; this._renderMainContent(); }
      else if (this._view === "week") this._renderMainContent();
    }, 10_000);
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
