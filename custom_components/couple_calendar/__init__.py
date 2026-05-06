"""Couple Calendar — beautiful shared calendar for two."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.frontend import async_register_built_in_panel

from .const import (
    DOMAIN, PANEL_URL, PANEL_TITLE, PANEL_ICON, STATIC_PATH,
    CONF_PERSON_A_NAME, CONF_PERSON_A_COLOR, CONF_PERSON_A_CALENDAR,
    CONF_PERSON_B_NAME, CONF_PERSON_B_COLOR, CONF_PERSON_B_CALENDAR,
    CONF_JOINT_CALENDAR, CONF_JOINT_COLOR,
    CONF_FIRST_DAY_OF_WEEK, CONF_TIME_FORMAT, CONF_DEFAULT_VIEW, CONF_THEME,
)

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).parent / "frontend"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["config"] = {**entry.data, **entry.options}

    # Serve our frontend JS files
    hass.http.register_static_path(
        f"/{STATIC_PATH}",
        str(FRONTEND_DIR),
        cache_headers=False,
    )

    # Build the panel config passed to the frontend custom element
    panel_config = _build_panel_config(hass, entry)

    # Register the sidebar panel
    hass.components.frontend.async_register_built_in_panel(
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL,
        config={
            "_panel_custom": {
                "name": "couple-calendar-panel",
                "module_url": f"/{STATIC_PATH}/couple-calendar-panel.js",
                "embed_iframe": False,
                "trust_external_script": False,
                "js_url": f"/{STATIC_PATH}/couple-calendar-panel.js",
            },
            **panel_config,
        },
        require_admin=False,
    )

    entry.async_on_unload(entry.add_update_listener(_async_entry_updated))
    return True


async def _async_entry_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload on options update so panel config refreshes."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.components.frontend.async_remove_panel(PANEL_URL)
    hass.data[DOMAIN].pop("config", None)
    return True


def _build_panel_config(hass: HomeAssistant, entry: ConfigEntry) -> dict:
    data = {**entry.data, **entry.options}
    return {
        "personA": {
            "name": data.get(CONF_PERSON_A_NAME, "Partner 1"),
            "color": data.get(CONF_PERSON_A_COLOR, "#818CF8"),
            "calendar": data.get(CONF_PERSON_A_CALENDAR, ""),
        },
        "personB": {
            "name": data.get(CONF_PERSON_B_NAME, "Partner 2"),
            "color": data.get(CONF_PERSON_B_COLOR, "#F472B6"),
            "calendar": data.get(CONF_PERSON_B_CALENDAR, ""),
        },
        "joint": {
            "color": data.get(CONF_JOINT_COLOR, "#34D399"),
            "calendar": data.get(CONF_JOINT_CALENDAR, ""),
        },
        "firstDayOfWeek": int(data.get(CONF_FIRST_DAY_OF_WEEK, 0)),
        "timeFormat": data.get(CONF_TIME_FORMAT, "12h"),
        "defaultView": data.get(CONF_DEFAULT_VIEW, "month"),
        "theme": data.get(CONF_THEME, "dark"),
    }
