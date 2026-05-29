# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Home Assistant custom integration that registers a single full-screen panel ("Family Calendar" in the sidebar — the domain is `couple_calendar` for legacy reasons). It is distributed via HACS. There is no app to run outside of Home Assistant; the only way to exercise changes is to load them inside a running HA instance.

## No build, no tests, no lint

- The frontend (`custom_components/couple_calendar/frontend/couple-calendar-panel.js`, ~2200 lines) is a single hand-written Web Component in vanilla JS. No bundler, no TypeScript, no framework, no node_modules. Edit the `.js` file directly.
- There is no test suite, linter, or CI configured in the repo. Verification is manual inside Home Assistant.
- Cache-busting is automatic: `__init__.py` MD5-hashes the JS file and appends the first 12 hex chars as a `?v=...` query to the module URL, so any edit invalidates the browser cache after a HA reload of the integration.

## Release / version bump

Every user-visible change ships as a new version. The convention (visible in `git log`) is:
- Bump `version` in `custom_components/couple_calendar/manifest.json` (semver, currently `2.7.x`).
- Commit message format: `vX.Y.Z: short description` (no body).
- HACS picks up releases from manifest version; no separate changelog file.

## Architecture

### Backend (Python, runs in Home Assistant)

`custom_components/couple_calendar/`
- `__init__.py` — registers the panel via `async_register_built_in_panel` with `_panel_custom`, serves the JS via `StaticPathConfig`, and exposes two WebSocket commands: `couple_calendar/update_calendars` and `couple_calendar/update_settings`. The latter merges arbitrary settings dicts into the config entry data so they sync across devices.
- `config_flow.py` — two-stage setup (initial flow + options flow). The options flow only re-picks calendar entities; names, colors, add/remove/reorder happen entirely in the in-app settings drawer and are saved via the WebSocket commands above.
- `const.py` — domain, panel URL/title/icon, default colors, and v1 legacy config keys kept only for migration.
- `async_migrate_entry` (also duplicated in `config_flow.py`) — migrates v1 schema (`person_a_*`, `person_b_*`, `joint_*`) to v2 schema (a single `calendars` list of `{id, name, color, entities[]}`). Touch both copies if you change the migration.
- `_inject_lovelace_resources` — at startup (or on reload if HA is already running), iterates `hass.data["lovelace"].resources` and calls `add_extra_js_url` for each module/js resource. This is what lets HACS sidebar cards (Mushroom, etc.) load on the panel without the user first visiting a Lovelace dashboard. Wrapped in try/except so it can't break setup.

### Frontend (`frontend/couple-calendar-panel.js`)

Single class `CoupleCalendarPanel extends HTMLElement` with shadow DOM. Key things to know:

- **Configuration precedence**: for settings, `localStorage` (`couple_calendar_settings` key) overrides the HA config entry only when explicitly set; for calendars, localStorage wins over panelConfig if non-empty, else panelConfig, else v1 migration fallback. See `_applyConfig`. Saving (`_saveLocalSettings` + `hass.callWS("couple_calendar/update_settings", ...)`) always writes localStorage first as a synchronous backup, then attempts the WS call.
- **HA APIs used**: `hass.callApi("GET", "calendars/<entity>?start=...&end=...")` to fetch events, `hass.callWS(...)` for settings persistence and `lovelace/resources` + `lovelace/config` lookup. The README still mentions `calendar.create_event` but the current frontend is read-only ("events are managed from your phone via Google Calendar" — see file header).
- **`set hass(...)`**: re-invoked by HA whenever state changes. The setter passes the new `hass` object down to embedded sidebar Lovelace cards (`this._sidebarCardEls`) so they get live state updates, and updates header badges in place without a full re-render. Only the first invocation triggers `_applyConfig`.
- **Three views** (month/week/agenda) share `_cursor` (the focused date) and `_events`. The month view has a custom slide animation when navigating between adjacent months (`anim-slide-left`/`anim-enter-right` etc.) and tries to smooth-scroll instead of re-rendering when possible.
- **Naming caveat**: the integration domain (`couple_calendar`), panel URL (`family-calendar`), and sidebar title ("Family Calendar") are all different. Don't "fix" this — it's the result of a rename that has to stay backward-compatible with existing installs. The CSS class name `CoupleCalendarPanel` and custom element `<couple-calendar-panel>` are also load-bearing (referenced in `_panel_custom.name`).

## Manual verification loop

After editing the JS or Python, the user needs to either reload the "Family Calendar" integration in HA (Settings → Devices & Services → ⋮ → Reload) or restart HA for Python changes. The browser will pull the new JS automatically thanks to the MD5 cache buster — no hard refresh needed.
