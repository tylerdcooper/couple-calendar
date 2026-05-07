"""Config flow for Family Calendar."""
from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    DOMAIN, CONF_CALENDARS,
    DEFAULT_CALENDAR_COLORS,
    # v1 legacy keys used only in migration
    CONF_PERSON_A_NAME, CONF_PERSON_A_CALENDAR,
    CONF_PERSON_B_NAME, CONF_PERSON_B_CALENDAR,
    CONF_JOINT_CALENDAR,
)


def _calendar_options(hass):
    return [
        {"value": e, "label": e.replace("calendar.", "").replace("_", " ").title()}
        for e in sorted(hass.states.async_entity_ids("calendar"))
    ]


class FamilyCalendarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Initial setup: create the first calendar entry."""
    VERSION = 2

    async def async_step_user(self, user_input=None):
        errors = {}
        options = _calendar_options(self.hass)
        if not options:
            errors["base"] = "no_calendars"

        if user_input is not None and not errors:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            entities = user_input["entities"]
            if isinstance(entities, str):
                entities = [entities]
            calendars = [{
                "id": "cal_0",
                "name": user_input["name"],
                "color": DEFAULT_CALENDAR_COLORS[0],
                "entities": entities,
            }]
            return self.async_create_entry(
                title="Family Calendar",
                data={CONF_CALENDARS: calendars},
            )

        return self.async_show_form(
            step_id="user",
            errors=errors,
            data_schema=vol.Schema({
                vol.Required("name", default="My Calendar"): str,
                vol.Required("entities"): selector.selector({
                    "select": {"options": options, "mode": "list", "multiple": True}
                }),
            }),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return FamilyCalendarOptionsFlow(config_entry)


class FamilyCalendarOptionsFlow(config_entries.OptionsFlow):
    """Allow reconfiguring the calendar entity assignments from HA UI.

    Full calendar management (names, colors, add/remove) is handled
    in the in-app settings drawer and saved via WebSocket.
    """
    def __init__(self, config_entry):
        self._entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        data    = {**self._entry.data, **self._entry.options}
        options = _calendar_options(self.hass)
        cals    = data.get(CONF_CALENDARS, [])

        # Show a simple "which entities" picker for each existing calendar
        schema_fields = {}
        for cal in cals:
            key = f"entities_{cal['id']}"
            current = cal.get("entities", [])
            schema_fields[vol.Optional(key, default=current)] = selector.selector({
                "select": {"options": options, "mode": "list", "multiple": True}
            })

        return self.async_show_form(
            step_id="init",
            description_placeholders={"hint": "To add/remove/rename calendars, use the ☰ settings drawer in the app."},
            data_schema=vol.Schema(schema_fields),
        )


async def async_migrate_entry(hass, config_entry):
    """Migrate v1 (personA/personB/joint) config to v2 (calendars list)."""
    if config_entry.version < 2:
        old    = dict(config_entry.data)
        colors = DEFAULT_CALENDAR_COLORS
        cals   = []
        idx    = 0

        def _to_list(v):
            if not v: return []
            return v if isinstance(v, list) else [v]

        if old.get(CONF_PERSON_A_CALENDAR):
            cals.append({
                "id": f"cal_{idx}",
                "name": old.get(CONF_PERSON_A_NAME, "Partner 1"),
                "color": colors[idx],
                "entities": _to_list(old[CONF_PERSON_A_CALENDAR]),
            }); idx += 1

        if old.get(CONF_PERSON_B_CALENDAR):
            cals.append({
                "id": f"cal_{idx}",
                "name": old.get(CONF_PERSON_B_NAME, "Partner 2"),
                "color": colors[idx],
                "entities": _to_list(old[CONF_PERSON_B_CALENDAR]),
            }); idx += 1

        if old.get(CONF_JOINT_CALENDAR):
            cals.append({
                "id": f"cal_{idx}",
                "name": "Together",
                "color": colors[idx] if idx < len(colors) else "#34D399",
                "entities": _to_list(old[CONF_JOINT_CALENDAR]),
            })

        if not cals:
            cals = [{"id": "cal_0", "name": "My Calendar",
                     "color": colors[0], "entities": []}]

        hass.config_entries.async_update_entry(
            config_entry,
            data={CONF_CALENDARS: cals},
            version=2,
        )

    return True
