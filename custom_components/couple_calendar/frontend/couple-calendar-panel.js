/**
 * Couple Calendar — Home Assistant Panel
 * A beautiful, touch-first shared calendar for two.
 * Designed for wall-mounted 21" touchscreens.
 */

// ─── Utilities ────────────────────────────────────────────────────────────────

const DAY_NAMES_LONG  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_NAMES_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function startOfDay(d) {
  const n = new Date(d); n.setHours(0,0,0,0); return n;
}

function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function addMonths(d, n) {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function startOfWeek(d, firstDay = 0) {
  const day = d.getDay();
  const diff = (day - firstDay + 7) % 7;
  return startOfDay(addDays(d, -diff));
}

function endOfWeek(d, firstDay = 0) {
  return addDays(startOfWeek(d, firstDay), 6);
}

function formatTime(date, format24) {
  if (format24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function parseEventDT(dtObj) {
  if (!dtObj) return null;
  const s = dtObj.dateTime || dtObj.date;
  if (!s) return null;
  if (s.length === 10) {
    // All-day: YYYY-MM-DD — treat as local midnight to avoid TZ shift
    const [y, m, day] = s.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(s);
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "128,128,128";
}

function luminance(hex) {
  const [r,g,b] = hex.replace("#","").match(/.{2}/g).map(h => {
    const c = parseInt(h,16)/255;
    return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

function textOnBg(hex) {
  return luminance(hex) > 0.35 ? "#1a1a2e" : "#ffffff";
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function buildStyles(cfg) {
  const isDark = cfg.theme === "dark" ||
    (cfg.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const palette = isDark ? {
    bg:          "#0D1117",
    surface:     "#161B22",
    surfaceAlt:  "#1F2937",
    surfaceHov:  "#243040",
    border:      "rgba(255,255,255,0.07)",
    borderFocus: "rgba(255,255,255,0.18)",
    text:        "#F0F6FC",
    textSub:     "#8B949E",
    textMuted:   "#484F58",
    today:       "#FBBF24",
    todayText:   "#0D1117",
    shadow:      "rgba(0,0,0,0.6)",
    overlay:     "rgba(13,17,23,0.85)",
  } : {
    bg:          "#F5F7FA",
    surface:     "#FFFFFF",
    surfaceAlt:  "#EEF1F6",
    surfaceHov:  "#E5E9F0",
    border:      "rgba(0,0,0,0.08)",
    borderFocus: "rgba(0,0,0,0.22)",
    text:        "#1A1A2E",
    textSub:     "#4B5563",
    textMuted:   "#9CA3AF",
    today:       "#FBBF24",
    todayText:   "#1A1A2E",
    shadow:      "rgba(0,0,0,0.18)",
    overlay:     "rgba(0,0,0,0.55)",
  };

  return `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

  :host, .panel-root {
    display: flex; flex-direction: column; height: 100%; width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
    font-size: 16px;
    background: ${palette.bg};
    color: ${palette.text};
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; gap: 16px;
    padding: 18px 28px 16px;
    background: ${palette.surface};
    border-bottom: 1px solid ${palette.border};
    flex-shrink: 0;
    z-index: 10;
  }
  .header-left { display: flex; align-items: center; gap: 14px; flex: 1; }
  .menu-btn {
    width: 48px; height: 48px; border-radius: 12px; border: none; cursor: pointer;
    background: transparent; color: ${palette.textSub};
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .menu-btn:hover, .menu-btn:active { background: ${palette.surfaceAlt}; }
  .nav-btn {
    width: 44px; height: 44px; border-radius: 10px; border: none; cursor: pointer;
    background: ${palette.surfaceAlt}; color: ${palette.text};
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, transform 0.1s; flex-shrink: 0; font-size: 20px;
  }
  .nav-btn:active { transform: scale(0.93); background: ${palette.surfaceHov}; }
  .header-title { flex: 1; }
  .header-month { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }
  .header-year  { font-size: 14px; font-weight: 400; color: ${palette.textSub}; margin-top: 2px; }
  .today-btn {
    padding: 10px 20px; border-radius: 10px; border: 1px solid ${palette.border};
    background: transparent; color: ${palette.text}; cursor: pointer; font-size: 15px; font-weight: 500;
    transition: background 0.15s;
  }
  .today-btn:active { background: ${palette.surfaceAlt}; }
  .view-switcher { display: flex; gap: 6px; }
  .view-btn {
    padding: 10px 18px; border-radius: 10px; border: 1px solid ${palette.border};
    background: transparent; color: ${palette.textSub}; cursor: pointer; font-size: 14px; font-weight: 500;
    transition: all 0.15s;
  }
  .view-btn.active {
    background: ${cfg.personA?.color || "#818CF8"}22;
    color: ${cfg.personA?.color || "#818CF8"};
    border-color: ${cfg.personA?.color || "#818CF8"}55;
  }

  /* ── Legend ── */
  .legend {
    display: flex; align-items: center; gap: 20px;
    padding: 10px 28px;
    background: ${palette.surface};
    border-bottom: 1px solid ${palette.border};
    flex-shrink: 0;
  }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${palette.textSub}; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .legend-filter {
    padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer;
    font-size: 13px; font-weight: 500; background: ${palette.surfaceAlt}; color: ${palette.textSub};
    transition: all 0.15s;
  }
  .legend-filter.active { color: white; }
  .legend-spacer { flex: 1; }
  .add-event-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;
    background: ${cfg.personA?.color || "#818CF8"}; color: white;
    font-size: 14px; font-weight: 600; transition: opacity 0.15s, transform 0.1s;
  }
  .add-event-btn:active { opacity: 0.85; transform: scale(0.97); }

  /* ── Main content ── */
  .main { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }

  /* ── Month grid ── */
  .month-view { display: flex; flex-direction: column; height: 100%; }
  .weekday-header {
    display: grid; grid-template-columns: repeat(7, 1fr);
    padding: 0 4px;
    border-bottom: 1px solid ${palette.border};
    background: ${palette.surface};
    flex-shrink: 0;
  }
  .weekday-label {
    padding: 10px 4px; text-align: center; font-size: 13px; font-weight: 600;
    color: ${palette.textSub}; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .month-grid {
    flex: 1; display: grid; grid-template-rows: repeat(6, 1fr);
    padding: 4px; gap: 4px; overflow: hidden;
  }
  .month-grid.five-rows { grid-template-rows: repeat(5, 1fr); }
  .week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .day-cell {
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: 12px;
    padding: 8px;
    display: flex; flex-direction: column;
    cursor: pointer; overflow: hidden;
    transition: background 0.12s, border-color 0.12s, transform 0.1s;
    position: relative;
    min-height: 0;
  }
  .day-cell:active { transform: scale(0.98); background: ${palette.surfaceAlt}; }
  .day-cell.other-month { opacity: 0.38; }
  .day-cell.today { border-color: ${palette.today}55; }
  .day-number {
    font-size: 18px; font-weight: 600; line-height: 1;
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; align-self: flex-start;
  }
  .day-cell.today .day-number {
    background: ${palette.today};
    color: ${palette.todayText};
  }
  .event-chips { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; flex: 1; overflow: hidden; }
  .event-chip {
    padding: 3px 7px; border-radius: 5px; font-size: 12px; font-weight: 500;
    line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    cursor: pointer; transition: opacity 0.1s;
  }
  .event-chip:active { opacity: 0.75; }
  .more-events {
    font-size: 11px; color: ${palette.textSub}; font-weight: 600;
    padding: 2px 4px; margin-top: 2px; cursor: pointer;
  }
  .all-day-bar {
    height: 5px; border-radius: 3px; margin-bottom: 3px;
  }

  /* ── Week view ── */
  .week-view { display: flex; flex-direction: column; height: 100%; }
  .week-day-header {
    display: grid; gap: 2px; flex-shrink: 0;
    background: ${palette.surface}; border-bottom: 1px solid ${palette.border};
    padding: 12px 0 8px;
  }
  .week-day-col-header { text-align: center; }
  .week-day-name { font-size: 12px; font-weight: 600; color: ${palette.textSub}; text-transform: uppercase; letter-spacing: 0.5px; }
  .week-day-num {
    font-size: 26px; font-weight: 700; margin-top: 2px;
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin: 4px auto 0;
  }
  .week-day-num.today { background: ${palette.today}; color: ${palette.todayText}; }
  .week-all-day-row {
    display: grid; gap: 2px; flex-shrink: 0;
    border-bottom: 1px solid ${palette.border};
    padding: 4px 0;
    background: ${palette.surfaceAlt};
  }
  .week-all-day-cell { min-height: 32px; padding: 2px 4px; }
  .week-all-day-event {
    border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
  }
  .week-time-grid { display: flex; flex: 1; overflow-y: auto; scroll-behavior: smooth; }
  .time-gutter {
    width: 58px; flex-shrink: 0; padding-top: 0;
    position: relative; border-right: 1px solid ${palette.border};
  }
  .time-label {
    height: 60px; display: flex; align-items: flex-start; justify-content: flex-end;
    padding: 0 8px; font-size: 11px; color: ${palette.textSub}; margin-top: -8px;
  }
  .week-days-grid { flex: 1; display: grid; gap: 2px; position: relative; }
  .week-day-time-col { position: relative; border-right: 1px solid ${palette.border}40; }
  .hour-line {
    position: absolute; left: 0; right: 0; height: 1px;
    background: ${palette.border}; pointer-events: none;
  }
  .now-line {
    position: absolute; left: 0; right: 0; height: 2px;
    background: ${palette.today}; pointer-events: none; z-index: 5;
  }
  .now-line::before {
    content: ""; width: 10px; height: 10px; border-radius: 50%;
    background: ${palette.today}; position: absolute; left: -5px; top: -4px;
  }
  .week-event {
    position: absolute; left: 4px; right: 4px; border-radius: 6px;
    padding: 4px 7px; font-size: 12px; font-weight: 500; cursor: pointer;
    overflow: hidden; z-index: 2; transition: opacity 0.1s;
    border-left: 3px solid rgba(255,255,255,0.3);
  }
  .week-event:active { opacity: 0.75; }
  .week-event-title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .week-event-time { font-size: 11px; opacity: 0.85; }

  /* ── Agenda view ── */
  .agenda-view { height: 100%; overflow-y: auto; padding: 16px 24px; }
  .agenda-date-group { margin-bottom: 24px; }
  .agenda-date-label {
    font-size: 13px; font-weight: 700; color: ${palette.textSub}; text-transform: uppercase;
    letter-spacing: 1px; padding: 0 4px 10px; border-bottom: 1px solid ${palette.border}; margin-bottom: 12px;
  }
  .agenda-date-label.today-label { color: ${palette.today}; }
  .agenda-event {
    display: flex; gap: 14px; align-items: flex-start;
    padding: 14px; border-radius: 12px; margin-bottom: 8px; cursor: pointer;
    background: ${palette.surface}; border: 1px solid ${palette.border};
    transition: background 0.12s, transform 0.1s;
  }
  .agenda-event:active { background: ${palette.surfaceAlt}; transform: scale(0.99); }
  .agenda-event-color { width: 4px; border-radius: 2px; flex-shrink: 0; align-self: stretch; min-height: 36px; }
  .agenda-event-info { flex: 1; min-width: 0; }
  .agenda-event-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
  .agenda-event-time { font-size: 14px; color: ${palette.textSub}; }
  .agenda-event-who { font-size: 12px; font-weight: 600; margin-top: 4px; }
  .agenda-empty { text-align: center; color: ${palette.textMuted}; padding: 48px; font-size: 16px; }

  /* ── Drawer (settings) ── */
  .drawer-overlay {
    position: fixed; inset: 0; background: ${palette.overlay}; z-index: 100;
    opacity: 0; pointer-events: none; transition: opacity 0.25s;
    backdrop-filter: blur(4px);
  }
  .drawer-overlay.open { opacity: 1; pointer-events: auto; }
  .drawer {
    position: fixed; top: 0; left: 0; bottom: 0; width: 400px; max-width: 90vw;
    background: ${palette.surface}; z-index: 101;
    transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 4px 0 40px ${palette.shadow};
  }
  .drawer.open { transform: translateX(0); }
  .drawer-header {
    display: flex; align-items: center; padding: 24px 24px 16px;
    border-bottom: 1px solid ${palette.border}; flex-shrink: 0; gap: 12px;
  }
  .drawer-title { font-size: 22px; font-weight: 700; flex: 1; }
  .close-btn {
    width: 40px; height: 40px; border-radius: 10px; border: none; cursor: pointer;
    background: ${palette.surfaceAlt}; color: ${palette.text};
    display: flex; align-items: center; justify-content: center; font-size: 20px;
    transition: background 0.15s;
  }
  .close-btn:active { background: ${palette.surfaceHov}; }
  .drawer-body { flex: 1; overflow-y: auto; padding: 24px; }
  .settings-section { margin-bottom: 32px; }
  .settings-section-title {
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: ${palette.textSub}; margin-bottom: 16px;
  }
  .settings-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
  .settings-row label { flex: 1; font-size: 15px; font-weight: 500; }
  .settings-row input[type="text"],
  .settings-row select {
    padding: 10px 14px; border-radius: 10px; border: 1px solid ${palette.border};
    background: ${palette.surfaceAlt}; color: ${palette.text};
    font-size: 15px; width: 180px; outline: none;
    transition: border-color 0.15s;
  }
  .settings-row input[type="text"]:focus,
  .settings-row select:focus { border-color: ${palette.borderFocus}; }
  .color-swatch-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .color-swatch {
    width: 36px; height: 36px; border-radius: 50%; cursor: pointer; border: 3px solid transparent;
    transition: transform 0.15s, border-color 0.15s;
  }
  .color-swatch:hover { transform: scale(1.15); }
  .color-swatch.selected { border-color: ${palette.text}; }
  .save-btn {
    width: 100%; padding: 16px; border-radius: 12px; border: none; cursor: pointer;
    background: ${cfg.personA?.color || "#818CF8"}; color: white;
    font-size: 16px; font-weight: 700; transition: opacity 0.15s, transform 0.1s;
    margin-top: 8px;
  }
  .save-btn:active { opacity: 0.85; transform: scale(0.98); }

  /* ── Modal (event detail / create) ── */
  .modal-overlay {
    position: fixed; inset: 0; background: ${palette.overlay}; z-index: 200;
    opacity: 0; pointer-events: none; transition: opacity 0.2s;
    display: flex; align-items: flex-end; justify-content: center;
    backdrop-filter: blur(4px);
  }
  .modal-overlay.open { opacity: 1; pointer-events: auto; }
  .modal {
    background: ${palette.surface}; border-radius: 24px 24px 0 0;
    width: 100%; max-width: 680px; max-height: 85vh;
    transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 -8px 40px ${palette.shadow};
  }
  .modal.open { transform: translateY(0); }
  .modal-handle {
    width: 48px; height: 5px; border-radius: 3px;
    background: ${palette.border}; margin: 14px auto 0; flex-shrink: 0;
  }
  .modal-header {
    display: flex; align-items: center; padding: 16px 24px 12px; gap: 12px;
    border-bottom: 1px solid ${palette.border}; flex-shrink: 0;
  }
  .modal-color-bar { width: 5px; border-radius: 3px; align-self: stretch; }
  .modal-title { font-size: 22px; font-weight: 700; flex: 1; }
  .modal-body { padding: 20px 24px; overflow-y: auto; }
  .modal-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; color: ${palette.textSub}; font-size: 15px; }
  .modal-meta svg { flex-shrink: 0; }
  .modal-who-badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px;
    font-size: 13px; font-weight: 700; margin-top: 4px;
  }
  .modal-description { font-size: 15px; line-height: 1.6; color: ${palette.textSub}; margin-top: 12px; }

  /* ── Create event form ── */
  .create-form { display: flex; flex-direction: column; gap: 16px; }
  .form-field { display: flex; flex-direction: column; gap: 6px; }
  .form-field label { font-size: 13px; font-weight: 600; color: ${palette.textSub}; text-transform: uppercase; letter-spacing: 0.5px; }
  .form-field input,
  .form-field textarea,
  .form-field select {
    padding: 14px 16px; border-radius: 12px; border: 1px solid ${palette.border};
    background: ${palette.surfaceAlt}; color: ${palette.text}; font-size: 16px; outline: none;
    transition: border-color 0.15s; font-family: inherit;
  }
  .form-field input:focus,
  .form-field textarea:focus,
  .form-field select:focus { border-color: ${palette.borderFocus}; }
  .form-field textarea { resize: vertical; min-height: 80px; }
  .who-selector { display: flex; gap: 10px; }
  .who-option {
    flex: 1; padding: 14px; border-radius: 12px; border: 2px solid ${palette.border};
    background: ${palette.surfaceAlt}; cursor: pointer; text-align: center;
    font-size: 14px; font-weight: 600; transition: all 0.15s;
  }
  .who-option.selected { border-width: 2px; }
  .form-actions { display: flex; gap: 12px; margin-top: 8px; }
  .btn-primary {
    flex: 1; padding: 16px; border-radius: 12px; border: none; cursor: pointer;
    font-size: 16px; font-weight: 700; color: white; transition: opacity 0.15s, transform 0.1s;
  }
  .btn-primary:active { opacity: 0.85; transform: scale(0.98); }
  .btn-secondary {
    padding: 16px 24px; border-radius: 12px; border: 1px solid ${palette.border};
    background: ${palette.surfaceAlt}; color: ${palette.text}; cursor: pointer;
    font-size: 16px; font-weight: 600; transition: background 0.15s;
  }
  .btn-secondary:active { background: ${palette.surfaceHov}; }

  /* ── Swipe animation ── */
  @keyframes slide-left  { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-5%); opacity: 0; } }
  @keyframes slide-right { from { transform: translateX(0); opacity: 1; } to { transform: translateX(5%);  opacity: 0; } }
  @keyframes enter-left  { from { transform: translateX(5%);  opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes enter-right { from { transform: translateX(-5%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .anim-slide-left  { animation: slide-left  0.22s ease forwards; }
  .anim-slide-right { animation: slide-right 0.22s ease forwards; }
  .anim-enter-left  { animation: enter-left  0.22s ease forwards; }
  .anim-enter-right { animation: enter-right 0.22s ease forwards; }

  /* ── Loading spinner ── */
  .spinner-wrap { display: flex; align-items: center; justify-content: center; height: 100%; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width: 40px; height: 40px; border: 3px solid ${palette.border}; border-top-color: ${cfg.personA?.color || "#818CF8"}; border-radius: 50%; animation: spin 0.8s linear infinite; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${palette.textMuted}; border-radius: 3px; }
  `;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const ICON = {
  menu:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  close:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  chevL:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevR:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  plus:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  clock:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  heart:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  person:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  cal:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
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

// ─── Main Panel Element ───────────────────────────────────────────────────────

class CoupleCalendarPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // State
    this._hass         = null;
    this._config       = null;
    this._view         = "month";       // month | week | agenda
    this._cursor       = new Date();    // current month/week being displayed
    this._today        = startOfDay(new Date());
    this._events       = [];            // all fetched events
    this._loading      = false;
    this._activeFilter = "all";         // all | a | b | joint
    this._drawerOpen   = false;
    this._modalMode    = null;          // null | "detail" | "create"
    this._selectedEvent = null;
    this._createDate   = null;

    // Touch tracking for swipe
    this._touchStartX  = 0;
    this._touchStartY  = 0;

    // Settings (local overrides, written to localStorage)
    this._localSettings = this._loadLocalSettings();

    this._render();
    this._startClock();
  }

  // ─── HA integration ────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._applyConfig();
    }
  }

  set panel(panel) {
    this._panelConfig = panel?.config || {};
    this._applyConfig();
  }

  _applyConfig() {
    if (!this._panelConfig) return;
    this._config = {
      personA: this._panelConfig.personA || { name: "Partner 1", color: "#818CF8", calendar: "" },
      personB: this._panelConfig.personB || { name: "Partner 2", color: "#F472B6", calendar: "" },
      joint:   this._panelConfig.joint   || { color: "#34D399", calendar: "" },
      firstDayOfWeek: parseInt(this._panelConfig.firstDayOfWeek ?? 0),
      timeFormat:     this._panelConfig.timeFormat   || "12h",
      defaultView:    this._panelConfig.defaultView  || "month",
      theme:          this._panelConfig.theme        || "dark",
    };
    // Apply any local overrides (names, colors)
    if (this._localSettings.personAName)  this._config.personA.name  = this._localSettings.personAName;
    if (this._localSettings.personAColor) this._config.personA.color = this._localSettings.personAColor;
    if (this._localSettings.personBName)  this._config.personB.name  = this._localSettings.personBName;
    if (this._localSettings.personBColor) this._config.personB.color = this._localSettings.personBColor;
    if (this._localSettings.jointColor)   this._config.joint.color   = this._localSettings.jointColor;
    if (this._localSettings.theme)        this._config.theme          = this._localSettings.theme;

    this._view = this._config.defaultView;
    this._render();
    this._fetchEvents();
  }

  // ─── Data fetching ─────────────────────────────────────────────────────

  async _fetchEvents() {
    if (!this._hass || !this._config) return;
    this._loading = true;
    this._renderMainContent();

    const { start, end } = this._fetchRange();
    const entities = this._calendarEntities();
    if (!entities.length) {
      this._loading = false;
      this._renderMainContent();
      return;
    }

    try {
      const allEvents = [];
      for (const { entityId, who } of entities) {
        if (!entityId) continue;
        const startStr = start.toISOString().replace(".000Z","Z");
        const endStr   = end.toISOString().replace(".000Z","Z");
        const data = await this._hass.callApi(
          "GET",
          `calendars/${entityId}?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`
        );
        if (Array.isArray(data)) {
          for (const ev of data) {
            allEvents.push({ ...ev, _who: who, _color: this._whoColor(who) });
          }
        }
      }
      this._events = allEvents;
    } catch (e) {
      console.error("[CoupleCalendar] Failed to fetch events:", e);
      this._events = [];
    }

    this._loading = false;
    this._renderMainContent();
  }

  _fetchRange() {
    if (this._view === "week") {
      const ws = startOfWeek(this._cursor, this._config.firstDayOfWeek);
      return { start: ws, end: addDays(ws, 7) };
    }
    if (this._view === "agenda") {
      return { start: startOfDay(new Date()), end: addDays(new Date(), 60) };
    }
    // Month view — fetch full month plus buffer
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
      const dayStart = startOfDay(day);
      const dayEnd   = addDays(dayStart, 1);
      return s < dayEnd && (e || s) >= dayStart;
    });
  }

  // ─── Navigation ────────────────────────────────────────────────────────

  _navigate(dir) {
    const grid = this.shadowRoot.querySelector(".main");
    if (grid) {
      grid.classList.add(dir > 0 ? "anim-slide-left" : "anim-slide-right");
      setTimeout(() => {
        grid.classList.remove("anim-slide-left","anim-slide-right");
        this._shiftCursor(dir);
        this._renderMainContent();
        grid.classList.add(dir > 0 ? "anim-enter-right" : "anim-enter-left");
        setTimeout(() => grid.classList.remove("anim-enter-right","anim-enter-left"), 250);
        this._fetchEvents();
      }, 200);
    } else {
      this._shiftCursor(dir);
      this._renderMainContent();
      this._fetchEvents();
    }
  }

  _shiftCursor(dir) {
    if (this._view === "week") {
      this._cursor = addDays(this._cursor, dir * 7);
    } else if (this._view === "agenda") {
      this._cursor = addDays(this._cursor, dir * 30);
    } else {
      this._cursor = addMonths(this._cursor, dir);
    }
  }

  _goToday() {
    this._cursor = new Date();
    this._today  = startOfDay(new Date());
    this._renderMainContent();
    this._fetchEvents();
  }

  _switchView(view) {
    this._view = view;
    this._renderHeader();
    this._renderMainContent();
    this._fetchEvents();
  }

  // ─── Rendering ─────────────────────────────────────────────────────────

  _render() {
    const cfg = this._config || {};
    const style = document.createElement("style");
    style.textContent = buildStyles(cfg);

    const root = document.createElement("div");
    root.className = "panel-root";
    root.innerHTML = `
      <div class="header" id="cc-header"></div>
      <div class="legend" id="cc-legend"></div>
      <div class="main"  id="cc-main"></div>
      <div class="drawer-overlay" id="cc-drawer-overlay"></div>
      <div class="drawer"         id="cc-drawer"></div>
      <div class="modal-overlay"  id="cc-modal-overlay"></div>
      <div class="modal"          id="cc-modal"></div>
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
    const cfg   = this._config || {};
    const view  = this._view;
    const fdow  = cfg.firstDayOfWeek ?? 0;
    let titleMain = "", titleSub = "";

    if (view === "week") {
      const ws = startOfWeek(this._cursor, fdow);
      const we = endOfWeek(this._cursor, fdow);
      if (ws.getMonth() === we.getMonth()) {
        titleMain = MONTH_NAMES[ws.getMonth()];
        titleSub  = ws.getFullYear();
      } else {
        titleMain = `${MONTH_NAMES[ws.getMonth()].slice(0,3)} – ${MONTH_NAMES[we.getMonth()].slice(0,3)}`;
        titleSub  = ws.getFullYear();
      }
    } else {
      titleMain = MONTH_NAMES[this._cursor.getMonth()];
      titleSub  = this._cursor.getFullYear();
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
      <button class="today-btn" id="cc-today-btn">Today</button>
      <div class="view-switcher">
        <button class="view-btn ${view==="month"?"active":""}"  data-view="month">Month</button>
        <button class="view-btn ${view==="week"?"active":""}"   data-view="week">Week</button>
        <button class="view-btn ${view==="agenda"?"active":""}" data-view="agenda">Agenda</button>
      </div>
    `;

    el.querySelector("#cc-menu-btn").addEventListener("click", () => this._openDrawer());
    el.querySelector("#cc-prev-btn").addEventListener("click", () => this._navigate(-1));
    el.querySelector("#cc-next-btn").addEventListener("click", () => this._navigate(1));
    el.querySelector("#cc-today-btn").addEventListener("click", () => this._goToday());
    el.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", () => this._switchView(btn.dataset.view));
    });
  }

  _renderLegend() {
    const cfg  = this._config || {};
    const el   = this.shadowRoot.getElementById("cc-legend");
    if (!el) return;
    const aColor = cfg.personA?.color || "#818CF8";
    const bColor = cfg.personB?.color || "#F472B6";
    const jColor = cfg.joint?.color   || "#34D399";
    const aName  = cfg.personA?.name  || "Partner 1";
    const bName  = cfg.personB?.name  || "Partner 2";

    const filters = [
      { id: "all",   label: "All",   color: null },
      { id: "a",     label: aName,   color: aColor },
      { id: "b",     label: bName,   color: bColor },
      { id: "joint", label: "Together", color: jColor },
    ];

    el.innerHTML = `
      ${filters.map(f => `
        <button class="legend-filter ${this._activeFilter===f.id?"active":""}"
          data-filter="${f.id}"
          style="${this._activeFilter===f.id && f.color ? `background:${f.color}; color:white;` : f.color ? `color:${f.color};` : ""}">
          ${f.color ? `<span class="legend-dot" style="background:${f.color};display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;"></span>` : ""}${f.label}
        </button>
      `).join("")}
      <div class="legend-spacer"></div>
      <button class="add-event-btn" id="cc-add-btn" style="background:${aColor};">
        ${ICON.plus} Add Event
      </button>
    `;

    el.querySelectorAll(".legend-filter").forEach(btn => {
      btn.addEventListener("click", () => {
        this._activeFilter = btn.dataset.filter;
        this._renderLegend();
        this._renderMainContent();
      });
    });
    el.querySelector("#cc-add-btn").addEventListener("click", () => this._openCreateModal(null));
  }

  _renderMainContent() {
    const el = this.shadowRoot.getElementById("cc-main");
    if (!el) return;

    if (this._loading) {
      el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
      return;
    }

    if (this._view === "month")  this._renderMonthView(el);
    if (this._view === "week")   this._renderWeekView(el);
    if (this._view === "agenda") this._renderAgendaView(el);
    this._bindSwipe(el);
  }

  // ── Month view ───────────────────────────────────────────────────────────

  _renderMonthView(el) {
    const cfg   = this._config || {};
    const fdow  = cfg.firstDayOfWeek ?? 0;
    const year  = this._cursor.getFullYear();
    const month = this._cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    // Day names in correct order
    const dayLabels = [];
    for (let i = 0; i < 7; i++) dayLabels.push(DAY_NAMES_SHORT[(fdow + i) % 7]);

    // Grid cells: pad to start on correct weekday
    const startPad = (firstDay.getDay() - fdow + 7) % 7;
    const totalCells = startPad + lastDay.getDate();
    const numRows = Math.ceil(totalCells / 7);

    const cells = [];
    for (let i = 0; i < numRows * 7; i++) {
      const offset = i - startPad;
      const d = new Date(year, month, 1 + offset);
      cells.push(d);
    }

    el.innerHTML = `
      <div class="month-view">
        <div class="weekday-header">
          ${dayLabels.map(n => `<div class="weekday-label">${n}</div>`).join("")}
        </div>
        <div class="month-grid ${numRows === 5 ? "five-rows" : ""}">
          ${this._chunkArray(cells, 7).map(week => `
            <div class="week-row">
              ${week.map(day => this._renderDayCell(day, month)).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    `;

    // Bind click events
    el.querySelectorAll(".day-cell").forEach(cell => {
      cell.addEventListener("click", () => {
        const iso = cell.dataset.date;
        this._openCreateModal(new Date(iso + "T12:00:00"));
      });
    });
    el.querySelectorAll(".event-chip").forEach(chip => {
      chip.addEventListener("click", e => {
        e.stopPropagation();
        const idx = parseInt(chip.dataset.idx);
        this._openDetailModal(this._filteredEvents()[idx]);
      });
    });
    el.querySelectorAll(".more-events").forEach(more => {
      more.addEventListener("click", e => {
        e.stopPropagation();
        // Switch to day/week on that date
        const iso = more.closest(".day-cell")?.dataset.date;
        if (iso) {
          this._cursor = new Date(iso + "T12:00:00");
          this._switchView("week");
        }
      });
    });
  }

  _renderDayCell(day, currentMonth) {
    const isToday      = isSameDay(day, this._today);
    const isOtherMonth = day.getMonth() !== currentMonth;
    const events       = this._eventsOnDay(day);
    const allEvents    = this._filteredEvents();
    const MAX_VISIBLE  = 3;

    const chips = events.slice(0, MAX_VISIBLE).map(ev => {
      const idx = allEvents.indexOf(ev);
      const isAllDay = !ev.start?.dateTime;
      const color = ev._color;
      const textColor = textOnBg(color);
      if (isAllDay) {
        return `<div class="all-day-bar" style="background:${color};"></div>`;
      }
      const startTime = ev.start?.dateTime ? formatTime(new Date(ev.start.dateTime), this._config?.timeFormat === "24h") : "";
      return `<div class="event-chip" data-idx="${idx}" style="background:${color}22; color:${color}; border-left:3px solid ${color};"
        title="${ev.summary || "Event"}">${startTime ? `<span style="opacity:0.7;font-size:10px;">${startTime} </span>` : ""}${ev.summary || "Event"}</div>`;
    }).join("");

    const overflow = events.length > MAX_VISIBLE
      ? `<div class="more-events">+${events.length - MAX_VISIBLE} more</div>`
      : "";

    return `
      <div class="day-cell ${isToday?"today":""} ${isOtherMonth?"other-month":""}"
           data-date="${day.toISOString().slice(0,10)}">
        <div class="day-number">${day.getDate()}</div>
        <div class="event-chips">${chips}${overflow}</div>
      </div>
    `;
  }

  // ── Week view ────────────────────────────────────────────────────────────

  _renderWeekView(el) {
    const cfg  = this._config || {};
    const fdow = cfg.firstDayOfWeek ?? 0;
    const use24 = cfg.timeFormat === "24h";
    const ws   = startOfWeek(this._cursor, fdow);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const HOUR_HEIGHT = 60; // px per hour

    const dayHeaders = days.map(d => {
      const isToday = isSameDay(d, this._today);
      return `
        <div class="week-day-col-header" data-date="${d.toISOString().slice(0,10)}">
          <div class="week-day-name">${DAY_NAMES_SHORT[d.getDay()]}</div>
          <div class="week-day-num ${isToday?"today":""}">${d.getDate()}</div>
        </div>
      `;
    }).join("");

    // All-day events
    const allDayByDay = days.map(d =>
      this._eventsOnDay(d).filter(ev => !ev.start?.dateTime)
    );

    const allDayCells = allDayByDay.map((evs, i) => `
      <div class="week-all-day-cell">
        ${evs.map(ev => {
          const color = ev._color;
          const textColor = textOnBg(color);
          return `<div class="week-all-day-event" style="background:${color};color:${textColor};">${ev.summary||"Event"}</div>`;
        }).join("")}
      </div>
    `).join("");

    // Time slots
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const timeGutter = hours.map(h => {
      if (h === 0) return `<div class="time-label"></div>`;
      const label = use24 ? `${String(h).padStart(2,"0")}:00` : (h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`);
      return `<div class="time-label">${label}</div>`;
    }).join("");

    // Now line
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;
    const todayIdx = days.findIndex(d => isSameDay(d, this._today));

    const timeCols = days.map((d, di) => {
      const timedEvents = this._eventsOnDay(d).filter(ev => !!ev.start?.dateTime);
      const eventBlocks = timedEvents.map(ev => {
        const s = new Date(ev.start.dateTime);
        const e = ev.end?.dateTime ? new Date(ev.end.dateTime) : addDays(s, 1/24);
        const startMin = s.getHours() * 60 + s.getMinutes();
        const durMin   = Math.max(30, (e - s) / 60000);
        const top      = (startMin / 60) * HOUR_HEIGHT;
        const height   = (durMin / 60) * HOUR_HEIGHT;
        const color    = ev._color;
        const textColor = textOnBg(color);
        const startLabel = formatTime(s, use24);
        return `
          <div class="week-event" style="top:${top}px;height:${height}px;background:${color};color:${textColor};"
               data-evjson="${encodeURIComponent(JSON.stringify(ev))}">
            <div class="week-event-title">${ev.summary||"Event"}</div>
            ${height > 40 ? `<div class="week-event-time">${startLabel}</div>` : ""}
          </div>
        `;
      }).join("");

      const nowLine = di === todayIdx ? `<div class="now-line" style="top:${nowTop}px;"></div>` : "";
      const hourLines = hours.map(h => `<div class="hour-line" style="top:${h*HOUR_HEIGHT}px;"></div>`).join("");
      return `<div class="week-day-time-col" style="height:${24*HOUR_HEIGHT}px;" data-date="${d.toISOString().slice(0,10)}">${hourLines}${nowLine}${eventBlocks}</div>`;
    }).join("");

    const gridCols = `grid-template-columns: repeat(7, 1fr)`;
    el.innerHTML = `
      <div class="week-view">
        <div class="week-day-header" style="${gridCols}">${dayHeaders}</div>
        <div class="week-all-day-row" style="display:grid;${gridCols};">${allDayCells}</div>
        <div class="week-time-grid">
          <div class="time-gutter">${timeGutter}</div>
          <div class="week-days-grid" style="${gridCols}">${timeCols}</div>
        </div>
      </div>
    `;

    // Scroll to 7am on load
    setTimeout(() => {
      const tg = el.querySelector(".week-time-grid");
      if (tg) tg.scrollTop = 7 * HOUR_HEIGHT;
    }, 50);

    // Bind week event clicks
    el.querySelectorAll(".week-event").forEach(evEl => {
      evEl.addEventListener("click", e => {
        e.stopPropagation();
        try {
          const ev = JSON.parse(decodeURIComponent(evEl.dataset.evjson));
          this._openDetailModal(ev);
        } catch {}
      });
    });
    el.querySelectorAll(".week-all-day-event").forEach(evEl => {
      evEl.addEventListener("click", e => e.stopPropagation());
    });
    // Click on empty time slot → create
    el.querySelectorAll(".week-day-time-col").forEach(col => {
      col.addEventListener("click", evt => {
        if (evt.target.classList.contains("week-event")) return;
        const rect = col.getBoundingClientRect();
        const y    = evt.clientY - rect.top;
        const hour = Math.floor(y / HOUR_HEIGHT);
        const date = new Date(col.dataset.date + "T00:00:00");
        date.setHours(hour, 0, 0, 0);
        this._openCreateModal(date);
      });
    });
    el.querySelectorAll(".week-day-col-header").forEach(h => {
      h.addEventListener("click", () => {
        this._cursor = new Date(h.dataset.date + "T12:00:00");
        this._openCreateModal(new Date(h.dataset.date + "T12:00:00"));
      });
    });
  }

  // ── Agenda view ──────────────────────────────────────────────────────────

  _renderAgendaView(el) {
    const events = this._filteredEvents().sort((a, b) => {
      const sa = parseEventDT(a.start), sb = parseEventDT(b.start);
      return (sa||0) - (sb||0);
    });

    if (!events.length) {
      el.innerHTML = `<div class="agenda-view"><div class="agenda-empty">No upcoming events.<br>Tap + Add Event to get started.</div></div>`;
      return;
    }

    // Group by date
    const groups = {};
    for (const ev of events) {
      const d = parseEventDT(ev.start);
      if (!d) continue;
      const key = d.toISOString().slice(0,10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }

    const use24 = this._config?.timeFormat === "24h";
    const today = this._today;

    const html = Object.entries(groups).map(([key, dayEvents]) => {
      const d = new Date(key + "T12:00:00");
      const isToday = isSameDay(d, today);
      const isTomorrow = isSameDay(d, addDays(today, 1));
      let label = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
      if (isToday) label = `Today · ${label}`;
      if (isTomorrow) label = `Tomorrow · ${label}`;

      const evHtml = dayEvents.map(ev => {
        const s = parseEventDT(ev.start);
        const e = parseEventDT(ev.end);
        const isAllDay = !ev.start?.dateTime;
        const timeStr  = isAllDay ? "All day" : `${formatTime(s, use24)}${e ? " – " + formatTime(e, use24) : ""}`;
        const color = ev._color;
        const who   = this._whoName(ev._who);
        const allEvents = this._filteredEvents();
        const idx = allEvents.indexOf(ev);
        return `
          <div class="agenda-event" data-idx="${idx}">
            <div class="agenda-event-color" style="background:${color};"></div>
            <div class="agenda-event-info">
              <div class="agenda-event-title">${ev.summary||"(No title)"}</div>
              <div class="agenda-event-time">${ICON.clock} ${timeStr}</div>
              <div class="agenda-event-who" style="color:${color};">${who}</div>
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="agenda-date-group">
          <div class="agenda-date-label ${isToday?"today-label":""}">${label}</div>
          ${evHtml}
        </div>
      `;
    }).join("");

    el.innerHTML = `<div class="agenda-view">${html}</div>`;

    el.querySelectorAll(".agenda-event").forEach(evEl => {
      evEl.addEventListener("click", () => {
        const idx = parseInt(evEl.dataset.idx);
        this._openDetailModal(this._filteredEvents()[idx]);
      });
    });
  }

  // ── Settings drawer ──────────────────────────────────────────────────────

  _renderDrawer() {
    const cfg = this._config || {};
    const drawerEl = this.shadowRoot.getElementById("cc-drawer");
    if (!drawerEl) return;

    drawerEl.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title">${ICON.settings} Settings</div>
        <button class="close-btn" id="cc-drawer-close">${ICON.close}</button>
      </div>
      <div class="drawer-body">
        <div class="settings-section">
          <div class="settings-section-title">Partner 1</div>
          <div class="settings-row">
            <label>Name</label>
            <input type="text" id="s-a-name" value="${cfg.personA?.name||"Partner 1"}">
          </div>
          <div class="settings-section-title" style="font-size:11px;margin-bottom:8px;">Color</div>
          <div class="color-swatch-row" id="s-a-colors">
            ${COLOR_PRESETS.map(c => `<div class="color-swatch ${c===cfg.personA?.color?"selected":""}" data-color="${c}" style="background:${c};"></div>`).join("")}
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Partner 2</div>
          <div class="settings-row">
            <label>Name</label>
            <input type="text" id="s-b-name" value="${cfg.personB?.name||"Partner 2"}">
          </div>
          <div class="settings-section-title" style="font-size:11px;margin-bottom:8px;">Color</div>
          <div class="color-swatch-row" id="s-b-colors">
            ${COLOR_PRESETS.map(c => `<div class="color-swatch ${c===cfg.personB?.color?"selected":""}" data-color="${c}" style="background:${c};"></div>`).join("")}
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Together / Shared</div>
          <div class="settings-section-title" style="font-size:11px;margin-bottom:8px;">Color</div>
          <div class="color-swatch-row" id="s-j-colors">
            ${COLOR_PRESETS.map(c => `<div class="color-swatch ${c===cfg.joint?.color?"selected":""}" data-color="${c}" style="background:${c};"></div>`).join("")}
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
            <label>Time Format</label>
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
        </div>

        <button class="save-btn" id="cc-save-settings" style="background:${cfg.personA?.color||"#818CF8"};">
          Save Changes
        </button>
      </div>
    `;

    // Color swatch selection
    ["a","b","j"].forEach(who => {
      drawerEl.querySelectorAll(`#s-${who}-colors .color-swatch`).forEach(sw => {
        sw.addEventListener("click", () => {
          drawerEl.querySelectorAll(`#s-${who}-colors .color-swatch`).forEach(s => s.classList.remove("selected"));
          sw.classList.add("selected");
        });
      });
    });

    drawerEl.querySelector("#cc-drawer-close").addEventListener("click", () => this._closeDrawer());
    drawerEl.querySelector("#cc-save-settings").addEventListener("click", () => this._saveSettings());
  }

  _openDrawer() {
    this._drawerOpen = true;
    this.shadowRoot.getElementById("cc-drawer-overlay").classList.add("open");
    this.shadowRoot.getElementById("cc-drawer").classList.add("open");
  }

  _closeDrawer() {
    this._drawerOpen = false;
    this.shadowRoot.getElementById("cc-drawer-overlay").classList.remove("open");
    this.shadowRoot.getElementById("cc-drawer").classList.remove("open");
  }

  _saveSettings() {
    const dr = this.shadowRoot.getElementById("cc-drawer");
    const aName  = dr.querySelector("#s-a-name")?.value;
    const bName  = dr.querySelector("#s-b-name")?.value;
    const aColor = dr.querySelector("#s-a-colors .selected")?.dataset.color;
    const bColor = dr.querySelector("#s-b-colors .selected")?.dataset.color;
    const jColor = dr.querySelector("#s-j-colors .selected")?.dataset.color;
    const theme  = dr.querySelector("#s-theme")?.value;
    const timeF  = dr.querySelector("#s-time")?.value;
    const fdow   = dr.querySelector("#s-fdow")?.value;

    const local = {
      ...(aName  && { personAName: aName }),
      ...(bName  && { personBName: bName }),
      ...(aColor && { personAColor: aColor }),
      ...(bColor && { personBColor: bColor }),
      ...(jColor && { jointColor: jColor }),
      ...(theme  && { theme }),
    };
    this._saveLocalSettings(local);

    if (this._config) {
      if (aName)  this._config.personA.name  = aName;
      if (bName)  this._config.personB.name  = bName;
      if (aColor) this._config.personA.color = aColor;
      if (bColor) this._config.personB.color = bColor;
      if (jColor) this._config.joint.color   = jColor;
      if (theme)  this._config.theme          = theme;
      if (timeF)  this._config.timeFormat     = timeF;
      if (fdow)   this._config.firstDayOfWeek = parseInt(fdow);
    }

    this._closeDrawer();
    this._render();    // full re-render with new colors/theme
    this._fetchEvents();
  }

  // ── Event modals ─────────────────────────────────────────────────────────

  _openDetailModal(ev) {
    if (!ev) return;
    this._selectedEvent = ev;
    const cfg   = this._config || {};
    const color = ev._color;
    const textColor = textOnBg(color);
    const use24 = cfg.timeFormat === "24h";
    const isAllDay = !ev.start?.dateTime;
    const s = parseEventDT(ev.start);
    const e = parseEventDT(ev.end);
    const who = this._whoName(ev._who);

    let dateStr = "";
    if (s) {
      dateStr = s.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      if (!isAllDay && e) {
        dateStr += `  ·  ${formatTime(s, use24)} – ${formatTime(e, use24)}`;
      } else if (isAllDay) {
        dateStr += "  ·  All day";
      }
    }

    const modal = this.shadowRoot.getElementById("cc-modal");
    const overlay = this.shadowRoot.getElementById("cc-modal-overlay");

    modal.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-color-bar" style="background:${color};"></div>
        <div class="modal-title">${ev.summary || "(No title)"}</div>
        <button class="close-btn" id="cc-modal-close">${ICON.close}</button>
      </div>
      <div class="modal-body">
        <div class="modal-meta">${ICON.clock} ${dateStr}</div>
        <div class="modal-meta">${ICON.person}
          <span class="modal-who-badge" style="background:${color}22; color:${color};">${who}</span>
        </div>
        ${ev.description ? `<div class="modal-description">${ev.description}</div>` : ""}
      </div>
    `;

    overlay.classList.add("open");
    modal.classList.add("open");
    modal.querySelector("#cc-modal-close").addEventListener("click", () => this._closeModal());
    overlay.addEventListener("click", e => { if (e.target === overlay) this._closeModal(); }, { once: true });
  }

  _openCreateModal(date) {
    this._createDate = date || new Date();
    const cfg  = this._config || {};
    const use24 = cfg.timeFormat === "24h";

    const d = this._createDate;
    const dateLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const hourStr   = String(d.getHours()).padStart(2,"0");
    const startTime = `${hourStr}:00`;
    const endHour   = String((d.getHours() + 1) % 24).padStart(2,"0");
    const endTime   = `${endHour}:00`;

    const aColor = cfg.personA?.color || "#818CF8";
    const bColor = cfg.personB?.color || "#F472B6";
    const jColor = cfg.joint?.color   || "#34D399";
    const aName  = cfg.personA?.name  || "Partner 1";
    const bName  = cfg.personB?.name  || "Partner 2";

    const modal   = this.shadowRoot.getElementById("cc-modal");
    const overlay = this.shadowRoot.getElementById("cc-modal-overlay");

    modal.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-color-bar" style="background:${aColor};"></div>
        <div class="modal-title">New Event</div>
        <button class="close-btn" id="cc-modal-close">${ICON.close}</button>
      </div>
      <div class="modal-body">
        <div class="create-form">
          <div class="form-field">
            <label>Event Title</label>
            <input type="text" id="cf-title" placeholder="What are you doing?" autofocus>
          </div>
          <div class="form-field">
            <label>Who</label>
            <div class="who-selector">
              <div class="who-option selected" data-who="a" style="border-color:${aColor};color:${aColor};">${aName}</div>
              <div class="who-option" data-who="b" style="color:${bColor};">${bName}</div>
              <div class="who-option" data-who="joint" style="color:${jColor};">Together ${ICON.heart}</div>
            </div>
          </div>
          <div class="form-field">
            <label>Date</label>
            <input type="date" id="cf-date" value="${dateLocal}">
          </div>
          <div class="form-field" id="cf-time-row">
            <label>Time</label>
            <div style="display:flex;gap:10px;align-items:center;">
              <input type="time" id="cf-start" value="${startTime}" style="flex:1;">
              <span style="color:#888;">to</span>
              <input type="time" id="cf-end"   value="${endTime}"   style="flex:1;">
            </div>
          </div>
          <div class="form-field">
            <div style="display:flex;align-items:center;gap:12px;">
              <input type="checkbox" id="cf-allday" style="width:20px;height:20px;cursor:pointer;">
              <label for="cf-allday" style="text-transform:none;font-size:15px;font-weight:500;cursor:pointer;">All day event</label>
            </div>
          </div>
          <div class="form-field">
            <label>Description (optional)</label>
            <textarea id="cf-desc" placeholder="Add a note..."></textarea>
          </div>
          <div class="form-actions">
            <button class="btn-secondary" id="cc-cancel-create">Cancel</button>
            <button class="btn-primary" id="cc-save-create" style="background:${aColor};">Add Event</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");
    modal.classList.add("open");

    // Who selector
    let selectedWho = "a";
    modal.querySelectorAll(".who-option").forEach(opt => {
      opt.addEventListener("click", () => {
        modal.querySelectorAll(".who-option").forEach(o => {
          o.classList.remove("selected");
          o.style.borderColor = "";
        });
        opt.classList.add("selected");
        const colors = { a: aColor, b: bColor, joint: jColor };
        opt.style.borderColor = colors[opt.dataset.who];
        selectedWho = opt.dataset.who;
        // Update save button color
        const saveBtn = modal.querySelector("#cc-save-create");
        if (saveBtn) saveBtn.style.background = colors[selectedWho];
      });
    });

    // All-day toggle
    const alldayCb = modal.querySelector("#cf-allday");
    const timeRow  = modal.querySelector("#cf-time-row");
    alldayCb.addEventListener("change", () => {
      timeRow.style.display = alldayCb.checked ? "none" : "";
    });

    modal.querySelector("#cc-modal-close").addEventListener("click", () => this._closeModal());
    modal.querySelector("#cc-cancel-create").addEventListener("click", () => this._closeModal());
    modal.querySelector("#cc-save-create").addEventListener("click", async () => {
      await this._createEvent(modal, selectedWho);
    });
    overlay.addEventListener("click", e => { if (e.target === overlay) this._closeModal(); }, { once: true });
  }

  async _createEvent(modal, who) {
    const title   = modal.querySelector("#cf-title")?.value?.trim();
    if (!title) {
      modal.querySelector("#cf-title")?.focus();
      return;
    }
    const date    = modal.querySelector("#cf-date")?.value;
    const start   = modal.querySelector("#cf-start")?.value;
    const end     = modal.querySelector("#cf-end")?.value;
    const allDay  = modal.querySelector("#cf-allday")?.checked;
    const desc    = modal.querySelector("#cf-desc")?.value;

    const calMap = { a: this._config?.personA?.calendar, b: this._config?.personB?.calendar, joint: this._config?.joint?.calendar };
    const entityId = calMap[who];
    if (!entityId) {
      alert(`No calendar configured for "${this._whoName(who)}". Check your settings.`);
      return;
    }

    const saveBtn = modal.querySelector("#cc-save-create");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

    try {
      const svcData = {
        entity_id: entityId,
        summary:   title,
        ...(desc && { description: desc }),
      };
      if (allDay) {
        svcData.start_date = date;
        svcData.end_date   = date;
      } else {
        svcData.start_date_time = `${date}T${start}:00`;
        svcData.end_date_time   = `${date}T${end}:00`;
      }
      await this._hass.callService("calendar", "create_event", svcData);
      this._closeModal();
      setTimeout(() => this._fetchEvents(), 800);
    } catch (e) {
      console.error("[CoupleCalendar] Create event failed:", e);
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Add Event"; }
      alert("Failed to create event. Check the console for details.");
    }
  }

  _closeModal() {
    this.shadowRoot.getElementById("cc-modal-overlay")?.classList.remove("open");
    this.shadowRoot.getElementById("cc-modal")?.classList.remove("open");
    setTimeout(() => {
      const m = this.shadowRoot.getElementById("cc-modal");
      if (m) m.innerHTML = "";
    }, 300);
  }

  // ── Touch / swipe ────────────────────────────────────────────────────────

  _bindSwipe(el) {
    el.addEventListener("pointerdown", e => {
      this._touchStartX = e.clientX;
      this._touchStartY = e.clientY;
    }, { passive: true });

    el.addEventListener("pointerup", e => {
      const dx = e.clientX - this._touchStartX;
      const dy = e.clientY - this._touchStartY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        this._navigate(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  // ── Static event bindings ────────────────────────────────────────────────

  _bindStaticEvents() {
    this.shadowRoot.getElementById("cc-drawer-overlay")?.addEventListener("click", () => this._closeDrawer());
  }

  // ── Clock tick (refresh today marker, update now-line) ───────────────────

  _startClock() {
    setInterval(() => {
      const newToday = startOfDay(new Date());
      if (!isSameDay(newToday, this._today)) {
        this._today = newToday;
        this._renderMainContent();
      } else if (this._view === "week") {
        // Refresh week view to move the now-line
        this._renderMainContent();
      }
    }, 60_000);
  }

  // ── localStorage helpers ─────────────────────────────────────────────────

  _loadLocalSettings() {
    try {
      return JSON.parse(localStorage.getItem("couple_calendar_settings") || "{}");
    } catch { return {}; }
  }

  _saveLocalSettings(data) {
    try {
      const current = this._loadLocalSettings();
      const merged  = { ...current, ...data };
      localStorage.setItem("couple_calendar_settings", JSON.stringify(merged));
      this._localSettings = merged;
    } catch {}
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }
}

customElements.define("couple-calendar-panel", CoupleCalendarPanel);

// Register in HA's panel registry (required for panel_custom)
window.customPanelTypes = window.customPanelTypes || [];
window.customPanelTypes.push({ name: "couple-calendar-panel" });
