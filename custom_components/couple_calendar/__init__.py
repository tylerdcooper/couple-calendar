"""Couple Calendar — beautiful shared calendar for two."""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.frontend import (
    async_register_built_in_panel,
    async_remove_panel,
)
from homeassistant.components.http import StaticPathConfig

from .const import (
    DOMAIN, PANEL_URL, PANEL_TITLE, PANEL_ICON, STATIC_PATH,
    CONF_PERSON_A_NAME, CONF_PERSON_A_CALENDAR,
    CONF_PERSON_B_NAME, CONF_PERSON_B_CALENDAR,
    CONF_JOINT_CALENDAR,
    DEFAULT_PERSON_A_COLOR, DEFAULT_PERSON_B_COLOR, DEFAULT_JOINT_COLOR,
)

_LOGGER = logging.getLogger(__name__)
FRONTEND_DIR = Path(__file__).parent / "frontend"
JS_FILE = FRONTEND_DIR / "couple-calendar-panel.js"


def _js_hash() -> str:
    """Return first 12 chars of the JS file's MD5 — used as cache-buster."""
    return hashlib.md5(JS_FILE.read_bytes()).hexdigest()[:12]


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.data.setdefault(DOMAIN, {})

    # Serve frontend JS — cache_headers=True so the browser caches aggressively.
    # Cache is busted automatically via the hash query-param in module_url below.
    await hass.http.async_register_static_paths([
        StaticPathConfig(f"/{STATIC_PATH}", str(FRONTEND_DIR), cache_headers=True)
    ])

    # Compute hash of the JS file on disk. Whenever the file changes (after a
    # HACS update + HA restart) the hash changes → new URL → browser fetches fresh.
    js_hash = await hass.async_add_executor_job(_js_hash)
    module_url = f"/{STATIC_PATH}/couple-calendar-panel.js?v={js_hash}"
    _LOGGER.debug("Couple Calendar JS URL: %s", module_url)

    data = {**entry.data, **entry.options}
    panel_config = {
        "personA": {
            "name":     data.get(CONF_PERSON_A_NAME, "Partner 1"),
            "color":    DEFAULT_PERSON_A_COLOR,
            "calendar": data.get(CONF_PERSON_A_CALENDAR, ""),
        },
        "personB": {
            "name":     data.get(CONF_PERSON_B_NAME, "Partner 2"),
            "color":    DEFAULT_PERSON_B_COLOR,
            "calendar": data.get(CONF_PERSON_B_CALENDAR, ""),
        },
        "joint": {
            "color":    DEFAULT_JOINT_COLOR,
            "calendar": data.get(CONF_JOINT_CALENDAR, ""),
        },
        "firstDayOfWeek": 0,
        "timeFormat":     "12h",
        "defaultView":    "month",
        "theme":          "dark",
    }

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
            **panel_config,
        },
        require_admin=False,
    )

    entry.async_on_unload(entry.add_update_listener(_async_entry_updated))
    return True


async def _async_entry_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    try:
        async_remove_panel(hass, PANEL_URL)
    except Exception:
        pass
    hass.data[DOMAIN].pop("config", None)
    return True
