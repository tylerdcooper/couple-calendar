# Couple Calendar for Home Assistant

A beautiful, touch-first shared calendar for two — designed for wall-mounted displays like a 21" touchscreen. Think of it as a Skylight alternative built specifically for couples, not families.

## Features

- **Three calendars** — Partner 1, Partner 2, and a shared "Together" calendar, all color-coded
- **Three views** — Month (overview), Week (time-grid), Agenda (upcoming events list)
- **Touch-optimized** — large tap targets, left/right swipe to navigate, tap to create events
- **Event creation** — tap any day or empty time slot to add an event directly to Google Calendar
- **Smart filters** — view all events, just yours, just theirs, or just "Together" events
- **Settings drawer** — change names, colors, theme, and time format without restarting
- **Beautiful dark theme** — ideal for wall displays; light and auto modes also available
- **No subscription** — runs entirely on your own Home Assistant instance

## Prerequisites

1. **Home Assistant** 2024.1 or newer
2. **HACS** installed
3. **Google Calendar integration** configured in Home Assistant (Settings → Integrations → Google)
   - You need one calendar entity per person, plus one for shared events
   - The built-in Google integration handles all the OAuth — no extra setup needed

## Installation

### Via HACS (recommended)

1. Open HACS → Integrations → ⋮ → Custom Repositories
2. Add `https://github.com/YOUR_USERNAME/couple-calendar` as an **Integration**
3. Find "Couple Calendar" and click **Download**
4. Restart Home Assistant

### Manual

1. Copy `custom_components/couple_calendar/` into your HA config's `custom_components/` folder
2. Restart Home Assistant

## Setup

1. Go to **Settings → Integrations → Add Integration**
2. Search for **Couple Calendar**
3. Follow the config flow:
   - Enter each partner's name and pick their color
   - Select which Google Calendar entity belongs to each partner and the shared calendar
   - Set your display preferences (time format, week start, theme)
4. "Couple Calendar" will appear in the Home Assistant sidebar

## Usage

| Action | Result |
|---|---|
| Tap a day cell | Open "New Event" form for that day |
| Tap an event chip | View event details |
| Swipe left/right | Navigate to next/previous month or week |
| Tap `‹` / `›` buttons | Navigate |
| Filter buttons (top) | Show All / Partner 1 / Partner 2 / Together |
| Month / Week / Agenda | Switch views |
| `+ Add Event` button | Create a new event (choose who it belongs to) |
| Hamburger (☰) | Open settings drawer |

## Settings (in-app)

Open the settings drawer (☰ icon) to change:
- Partner names and colors
- Theme (dark / light / auto)
- Time format (12h / 24h)
- First day of week

Changes are saved locally in the browser and survive page reloads. To change which calendar entities are linked, go to Settings → Integrations → Couple Calendar → Configure.

## Wall Display Tips (Apolosign 21.5" or similar)

- Set Home Assistant to **kiosk mode** — install the `kiosk-mode` HACS frontend card and add `?kiosk` to the URL to hide the HA header
- Use the **HA Companion app** on the Android display for auto-login and kiosk support
- Set display **auto-brightness** to keep it readable at night without being blinding
- Enable **Dark theme** on the calendar for a clean wall display look
- Set your **dashboard** as the default page so it loads on boot

## Architecture

```
custom_components/couple_calendar/
├── __init__.py          — Integration setup, panel registration, static file serving
├── manifest.json        — HA integration metadata
├── config_flow.py       — Setup wizard (2 steps: calendars, display prefs)
├── const.py             — Constants and defaults
├── strings.json         — UI string keys
├── translations/
│   └── en.json          — English translations
└── frontend/
    └── couple-calendar-panel.js   — Full calendar SPA (single Web Component)
```

The frontend is a self-contained Web Component (`<couple-calendar-panel>`) written in vanilla JavaScript — no build step, no framework. It communicates with Home Assistant via:
- `hass.callApi("GET", "calendars/<entity>?start=...&end=...")` to fetch events
- `hass.callService("calendar", "create_event", {...})` to create events

## Roadmap

- [ ] Todo / task lists per partner
- [ ] Recurring event support
- [ ] Event editing and deletion
- [ ] Weather integration (show forecast on calendar days)
- [ ] Anniversary / special date highlighting
- [ ] Pinch-to-zoom between views
- [ ] Notification badges for upcoming events

## Contributing

PRs welcome! Please open an issue first for large changes.

## License

MIT
