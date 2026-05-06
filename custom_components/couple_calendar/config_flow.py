"""Config flow for Couple Calendar."""
from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    DOMAIN,
    CONF_PERSON_A_NAME, CONF_PERSON_A_CALENDAR,
    CONF_PERSON_B_NAME, CONF_PERSON_B_CALENDAR,
    CONF_JOINT_CALENDAR,
)


def _calendar_selector(hass):
    calendars = sorted(hass.states.async_entity_ids("calendar"))
    options = [
        {"value": e, "label": e.replace("calendar.", "").replace("_", " ").title()}
        for e in calendars
    ]
    return selector.selector({"select": {"options": options, "mode": "dropdown"}})


class CoupleCalendarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        calendars = self.hass.states.async_entity_ids("calendar")
        if not calendars:
            errors["base"] = "no_calendars"

        if user_input is not None and not errors:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="Couple Calendar", data=user_input)

        cal_selector = _calendar_selector(self.hass)

        return self.async_show_form(
            step_id="user",
            errors=errors,
            data_schema=vol.Schema({
                vol.Required(CONF_PERSON_A_NAME, default="Partner 1"): str,
                vol.Required(CONF_PERSON_A_CALENDAR): cal_selector,
                vol.Required(CONF_PERSON_B_NAME, default="Partner 2"): str,
                vol.Required(CONF_PERSON_B_CALENDAR): cal_selector,
                vol.Optional(CONF_JOINT_CALENDAR): cal_selector,
            }),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return CoupleCalendarOptionsFlow(config_entry)


class CoupleCalendarOptionsFlow(config_entries.OptionsFlow):
    """Re-configure which calendar entities are assigned to each person."""

    def __init__(self, config_entry):
        self._entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        data = {**self._entry.data, **self._entry.options}
        cal_selector = _calendar_selector(self.hass)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required(CONF_PERSON_A_NAME, default=data.get(CONF_PERSON_A_NAME, "Partner 1")): str,
                vol.Required(CONF_PERSON_A_CALENDAR, default=data.get(CONF_PERSON_A_CALENDAR)): cal_selector,
                vol.Required(CONF_PERSON_B_NAME, default=data.get(CONF_PERSON_B_NAME, "Partner 2")): str,
                vol.Required(CONF_PERSON_B_CALENDAR, default=data.get(CONF_PERSON_B_CALENDAR)): cal_selector,
                vol.Optional(CONF_JOINT_CALENDAR, default=data.get(CONF_JOINT_CALENDAR)): cal_selector,
            }),
        )
