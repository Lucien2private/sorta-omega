# School-day weather

Today displays weather for Rasta, Lørenskog (59.91882, 10.95436). The town was selected by the owner; no GPS permission, home address, school content or timetable is sent to the weather service.

Open-Meteo provides hourly temperature, apparent temperature, precipitation probability, wind in m/s, daylight state and WMO weather code. Sources: https://open-meteo.com/en/docs and https://geocoding-api.open-meteo.com/v1/search?name=Rasta&count=10&countryCode=NO . Choose the Rasta result in Lørenskog, not Stor-Elvdal.

Times use Europe/Oslo and UTC instants, including daylight-saving transitions. Before school is 30 minutes before today's earliest timed school event or lesson. After school is the latest timed class end. Deadlines and tests do not extend the school day. Missing timetables produce explicitly labelled Morning 07:00 and Afternoon 16:00 forecasts, not invented class times. The actual hourly forecast time is shown separately from the requested school time. Timetable freshness is limited by the existing calendar import.

The server coalesces requests, caches for 20 minutes, retries upstream failures no more than once a minute, and only serves explicitly marked stale data up to an hour. Null weather fields remain unavailable. The browser reloads every 15 minutes and when returning to the page. No background worker or model is needed.

Design: inside the existing design system, ENERGY 1 / RHYTHM 1 / MOTION 1. A single section above today's work keeps departure weather visible without a new navigation item. Two periods sit beside each other when readable, and stack on narrow screens. Existing typography, paper and ink tokens preserve continuity. Existing weather glyphs represent physical conditions, with visible condition labels; no decorative icon backgrounds or animation. Neutral ink lets temperature and conditions carry the hierarchy. Explicit loading, error and unavailable states avoid fabricated forecasts.

Focused tests cover provider validation, caching, expiration, outages, calendar selection, missing schedules, Oslo DST, missing weather values, and condition-icon mapping. Build and rendered checks are required before deployment is called verified.
