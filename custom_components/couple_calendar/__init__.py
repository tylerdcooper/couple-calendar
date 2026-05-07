"""Family Calendar — beautiful shared calendar for Home Assistant."""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.components.frontend import async_register_built_in_panel, async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.components import websocket_api

from .const import (
    DOMAIN, PANEL_URL, PANEL_TITLE, PANEL_ICON, STATIC_PATH, CONF_CALENDARS,
    DEFAULT_CALENDAR_COLORS,
    CONF_PERSON_A_NAME, CONF_PERSON_A_CALENDAR,
    CONF_PERSON_B_NAME, CONF_PERSON_B_CALENDAR,
    CONF_JOINT_CALENDAR,
)

_LOGGER = logging.getLogger(__name__)
FRONTEND_DIR = Path(__file__).parent / "frontend"
JS_FILE = FRONTEND_DIR / "couple-calendar-panel.js"


def _js_hash() -> str:
    return hashlib.md5(JS_FILE.read_bytes()).hexdigest()[:12]


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Migrate v1 (personA/personB/joint) config to v2 (calendars list)."""
    if config_entry.version >= 2:
        return True

    _LOGGER.info("Migrating Family Calendar config from v1 to v2")
    old = dict(config_entry.data)

    def _to_list(v):
        if not v: return []
        return v if isinstance(v, list) else [v]

    cals = []
    idx  = 0
    if old.get(CONF_PERSON_A_CALENDAR):
        cals.append({
            "id": f"cal_{idx}",
            "name": old.get(CONF_PERSON_A_NAME, "Partner 1"),
            "color": DEFAULT_CALENDAR_COLORS[idx],
            "entities": _to_list(old[CONF_PERSON_A_CALENDAR]),
        }); idx += 1

    if old.get(CONF_PERSON_B_CALENDAR):
        cals.append({
            "id": f"cal_{idx}",
            "name": old.get(CONF_PERSON_B_NAME, "Partner 2"),
            "color": DEFAULT_CALENDAR_COLORS[idx],
            "entities": _to_list(old[CONF_PERSON_B_CALENDAR]),
        }); idx += 1

    if old.get(CONF_JOINT_CALENDAR):
        cals.append({
            "id": f"cal_{idx}",
            "name": "Together",
            "color": DEFAULT_CALENDAR_COLORS[idx % len(DEFAULT_CALENDAR_COLORS)],
            "entities": _to_list(old[CONF_JOINT_CALENDAR]),
        })

    if not cals:
        cals = [{"id": "cal_0", "name": "My Calendar",
                 "color": DEFAULT_CALENDAR_COLORS[0], "entities": []}]

    hass.config_entries.async_update_entry(
        config_entry,
        data={CONF_CALENDARS: cals},
        version=2,
    )
    _LOGGER.info("Migration complete: %d calendars", len(cals))
    return True


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["entry_id"] = entry.entry_id

    await hass.http.async_register_static_paths([
        StaticPathConfig(f"/{STATIC_PATH}", str(FRONTEND_DIR), cache_headers=True)
    ])

    js_hash    = await hass.async_add_executor_job(_js_hash)
    module_url = f"/{STATIC_PATH}/couple-calendar-panel.js?v={js_hash}"

    data      = {**entry.data, **entry.options}
    calendars = data.get(CONF_CALENDARS, [])

    async_register_built_in_panel(
        hass,
        "custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL,
        config={
            "_panel_custom": {
                "name":                  "couple-calendar-panel",
                "module_url":            module_url,
                "embed_iframe":          False,
                "trust_external_script": False,
            },
            "calendars":        calendars,
            "firstDayOfWeek":   0,
            "timeFormat":       "12h",
            "defaultView":      "month",
            "theme":            "dark",
        },
        require_admin=False,
    )

    # Register WebSocket command so the in-app settings drawer can
    # persist calendar changes back to the HA config entry.
    websocket_api.async_register_command(hass, ws_update_calendars)

    entry.async_on_unload(entry.add_update_listener(_async_entry_updated))
    return True


async def _async_entry_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    try:
        async_remove_panel(hass, PANEL_URL)
    except Exception:
        pass
    hass.data[DOMAIN].pop("entry_id", None)
    return True


# ── WebSocket command ──────────────────────────────────────────────────────────

@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/update_calendars",
    vol.Required("calendars"): list,
})
@callback
def ws_update_calendars(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Persist calendar config changes from the in-app settings drawer."""
    entry_id = hass.data.get(DOMAIN, {}).get("entry_id")
    if not entry_id:
        connection.send_error(msg["id"], "not_found", "Integration not configured")
        return
    entry = hass.config_entries.async_get_entry(entry_id)
    if not entry:
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    hass.config_entries.async_update_entry(
        entry,
        data={CONF_CALENDARS: msg["calendars"]},
    )
    connection.send_result(msg["id"], {"success": True})
