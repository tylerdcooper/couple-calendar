"""Config flow for Couple Calendar."""
from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    DOMAIN,
    CONF_PERSON_A_NAME, CONF_PERSON_A_COLOR, CONF_PERSON_A_CALENDAR,
    CONF_PERSON_B_NAME, CONF_PERSON_B_COLOR, CONF_PERSON_B_CALENDAR,
    CONF_JOINT_CALENDAR, CONF_JOINT_COLOR,
    CONF_FIRST_DAY_OF_WEEK, CONF_TIME_FORMAT, CONF_DEFAULT_VIEW, CONF_THEME,
    DEFAULT_PERSON_A_COLOR, DEFAULT_PERSON_B_COLOR, DEFAULT_JOINT_COLOR,
    DEFAULT_FIRST_DAY_OF_WEEK, DEFAULT_TIME_FORMAT, DEFAULT_DEFAULT_VIEW, DEFAULT_THEME,
)


def _calendar_selector(hass):
    """Return a selector pre-populated with available calendar entities."""
    calendars = sorted(
        entity_id
        for entity_id in hass.states.async_entity_ids("calendar")
    )
    options = [{"value": e, "label": e.replace("calendar.", "").replace("_", " ").title()} for e in calendars]
    return selector.selector({"select": {"options": options, "mode": "dropdown"}})


class CoupleCalendarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle the initial config flow."""

    VERSION = 1
    _data: dict = {}

    async def async_step_user(self, user_input=None):
        errors = {}
        calendars = self.hass.states.async_entity_ids("calendar")
        if not calendars:
            errors["base"] = "no_calendars"

        if user_input is not None and not errors:
            self._data.update(user_input)
            return await self.async_step_display()

        cal_selector = _calendar_selector(self.hass)

        return self.async_show_form(
            step_id="user",
            errors=errors,
            data_schema=vol.Schema({
                vol.Required(CONF_PERSON_A_NAME, default="Partner 1"): str,
                vol.Required(CONF_PERSON_A_COLOR, default=DEFAULT_PERSON_A_COLOR): str,
                vol.Required(CONF_PERSON_A_CALENDAR): cal_selector,
                vol.Required(CONF_PERSON_B_NAME, default="Partner 2"): str,
                vol.Required(CONF_PERSON_B_COLOR, default=DEFAULT_PERSON_B_COLOR): str,
                vol.Required(CONF_PERSON_B_CALENDAR): cal_selector,
                vol.Optional(CONF_JOINT_CALENDAR): cal_selector,
                vol.Required(CONF_JOINT_COLOR, default=DEFAULT_JOINT_COLOR): str,
            }),
        )

    async def async_step_display(self, user_input=None):
        if user_input is not None:
            self._data.update(user_input)
            return self.async_create_entry(
                title="Couple Calendar",
                data=self._data,
            )

        return self.async_show_form(
            step_id="display",
            data_schema=vol.Schema({
                vol.Required(CONF_FIRST_DAY_OF_WEEK, default=str(DEFAULT_FIRST_DAY_OF_WEEK)): selector.selector({
                    "select": {
                        "options": [
                            {"value": "0", "label": "Sunday"},
                            {"value": "1", "label": "Monday"},
                        ],
                        "mode": "dropdown",
                    }
                }),
                vol.Required(CONF_TIME_FORMAT, default=DEFAULT_TIME_FORMAT): selector.selector({
                    "select": {
                        "options": [
                            {"value": "12h", "label": "12-hour (3:00 PM)"},
                            {"value": "24h", "label": "24-hour (15:00)"},
                        ],
                        "mode": "dropdown",
                    }
                }),
                vol.Required(CONF_DEFAULT_VIEW, default=DEFAULT_DEFAULT_VIEW): selector.selector({
                    "select": {
                        "options": [
                            {"value": "month", "label": "Month"},
                            {"value": "week", "label": "Week"},
                            {"value": "agenda", "label": "Agenda"},
                        ],
                        "mode": "dropdown",
                    }
                }),
                vol.Required(CONF_THEME, default=DEFAULT_THEME): selector.selector({
                    "select": {
                        "options": [
                            {"value": "dark", "label": "Dark"},
                            {"value": "light", "label": "Light"},
                            {"value": "auto", "label": "Auto (follows system)"},
                        ],
                        "mode": "dropdown",
                    }
                }),
            }),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return CoupleCalendarOptionsFlow(config_entry)


class CoupleCalendarOptionsFlow(config_entries.OptionsFlow):
    """Allow editing settings after initial setup."""

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
                vol.Required(CONF_PERSON_A_COLOR, default=data.get(CONF_PERSON_A_COLOR, DEFAULT_PERSON_A_COLOR)): str,
                vol.Required(CONF_PERSON_A_CALENDAR, default=data.get(CONF_PERSON_A_CALENDAR)): cal_selector,
                vol.Required(CONF_PERSON_B_NAME, default=data.get(CONF_PERSON_B_NAME, "Partner 2")): str,
                vol.Required(CONF_PERSON_B_COLOR, default=data.get(CONF_PERSON_B_COLOR, DEFAULT_PERSON_B_COLOR)): str,
                vol.Required(CONF_PERSON_B_CALENDAR, default=data.get(CONF_PERSON_B_CALENDAR)): cal_selector,
                vol.Optional(CONF_JOINT_CALENDAR, default=data.get(CONF_JOINT_CALENDAR)): cal_selector,
                vol.Required(CONF_JOINT_COLOR, default=data.get(CONF_JOINT_COLOR, DEFAULT_JOINT_COLOR)): str,
                vol.Required(CONF_FIRST_DAY_OF_WEEK, default=str(data.get(CONF_FIRST_DAY_OF_WEEK, DEFAULT_FIRST_DAY_OF_WEEK))): selector.selector({
                    "select": {"options": [{"value": "0", "label": "Sunday"}, {"value": "1", "label": "Monday"}], "mode": "dropdown"}
                }),
                vol.Required(CONF_TIME_FORMAT, default=data.get(CONF_TIME_FORMAT, DEFAULT_TIME_FORMAT)): selector.selector({
                    "select": {"options": [{"value": "12h", "label": "12-hour"}, {"value": "24h", "label": "24-hour"}], "mode": "dropdown"}
                }),
                vol.Required(CONF_DEFAULT_VIEW, default=data.get(CONF_DEFAULT_VIEW, DEFAULT_DEFAULT_VIEW)): selector.selector({
                    "select": {"options": [{"value": "month", "label": "Month"}, {"value": "week", "label": "Week"}, {"value": "agenda", "label": "Agenda"}], "mode": "dropdown"}
                }),
                vol.Required(CONF_THEME, default=data.get(CONF_THEME, DEFAULT_THEME)): selector.selector({
                    "select": {"options": [{"value": "dark", "label": "Dark"}, {"value": "light", "label": "Light"}, {"value": "auto", "label": "Auto"}], "mode": "dropdown"}
                }),
            }),
        )
