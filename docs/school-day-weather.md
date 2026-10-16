# School-day weather

Today displays weather for Rasta, Lørenskog (59.91882, 10.95436). The town was selected by the owner; no GPS permission, home address, school content or timetable is sent to the weather service.

Open-Meteo provides hourly temperature, apparent temperature, precipitation probability, wind in m/s, daylight state and WMO weather code. Sources: https://open-meteo.com/en/docs and https://geocoding-api.open-meteo.com/v1/search?name=Rasta&count=10&countryCode=NO . Choose the Rasta result in Lørenskog, not Stor-Elvdal.

Times use Europe/Oslo and UTC instants, including daylight-saving transitions. Before school is 30 minutes before today's earliest timed school event or lesson. After school is the latest timed class end. Deadlines and tests do not extend the school day. Missing timetables produce explicitly labelled Morning 07:00 and Afternoon 16:00 forecasts, not invented class times. The actual hourly forecast time is shown separately from the requested school time. Timetable freshness is limited by the existing calendar import.

The server coalesces requests, caches for 20 minutes, retries upstream failures no more than once a minute, and only serves explicitly marked stale data up to an hour. Null weather fields remain unavailable. The browser reloads every 15 minutes and when returning to the page. No background worker or model is needed.

Design: inside the existing design system, ENERGY 1 / RHYTHM 1 / MOTION 1. A single section above today's work keeps departure weather visible without a new navigation item. Two periods sit beside each other when readable, and stack on narrow screens. Existing typography, paper and ink tokens preserve continuity. Existing weather glyphs represent physical conditions, with visible condition labels; no decorative icon backgrounds or animation. Neutral ink lets temperature and conditions carry the hierarchy. Explicit loading, error and unavailable states avoid fabricated forecasts.

Focused tests cover provider validation, caching, expiration, outages, calendar selection, missing schedules, Oslo DST, missing weather values, and condition-icon mapping. Build and rendered checks are required before deployment is called verified.

## Verified delivery, 16 October 2026

- Build PASS: API and web builds locally; full production workspace build on Node 22, healthy app container.
- Tests PASS: 4 provider/cache tests, 16 time/icon tests, 3 rendered loading/error/stale-state tests.
- R-02, R-15, R-16 PASS: direct sentence-case copy, no generated marketing language or em dashes in this component.
- R-03 PASS: rendered at 390, 768 and 1280 px. Periods stack on phone and sit side by side on tablet/desktop; weather fits the available width.
- R-17, R-18, R-36, R-38 PASS: live provider response, no invented readings. Missing values and expired cache fail explicitly.
- R-23 PASS: user requested weather icons; glyphs use the existing icon family. No new identity or illustration assets.
- R-24, R-26 PASS: Today opens the weather section; attribution opened the provider site and its temporary tab was closed.
- R-25 PASS: ink on paper 17.41:1; detail text on paper 7.80:1. Icons share ink; conditions also have text labels.
- R-27 PASS: loading, error, unavailable-hour and stale states tested. Live loading-to-forecast transition observed.
- R-28 PASS: no FAQ added.
- R-32 PASS: source link supports keyboard activation, Tab navigation and a visible ink focus outline, observed on phone.
- R-33 PASS: component and styles edited directly with patches.
- R-34 PASS: no theme added or changed; existing app palette preserved.
- R-35 PASS: physical Codex browser checks at phone/tablet/desktop, source-link interaction completed, no browser error logs.
- R-37 PASS: existing product design system retained, with declared calm dials above.
- Purpose gate PASS: condition icons convey weather; divider separates departure and return; no decorative gradients, glow, animation or imagery added.
- Liveliness PASS: temperature and weather state form the focal point inside the section; the surrounding app retains its existing accent, type and spacing.
- Craftsmanship PASS: one weather section, no nested cards or extra setup controls; scanner found zero code-certain design issues in the new component and stylesheet.

Live timetable check: before school 07:45, after school 15:30; actual hourly forecast times 08:00 and 15:00 were shown separately. Phone and desktop screenshot evidence is saved under `C:\Users\viktor\.codex\artifacts\school-weather-20261016`.
