# Common Room

A study room booking prototype with full CRUD for both rooms and bookings. Browse rooms by date, time, capacity, and features. Book a room, edit the reservation, or cancel it. The app prevents overlapping bookings in the same room.

**Live demo:** https://wjaas.github.io/study-room-booker/

## Run locally

Run `npm start` and visit <http://127.0.0.1:4174>. Run `npm test` to check booking validation and conflict handling.

## Prototype scope

Rooms and bookings are saved in browser `localStorage`. This means each browser has its own data; there is no shared account or central booking system. The sample rooms are editable and can be removed.

## AI development note

ChatGPT Codex helped design and implement the interface, CRUD flows, conflict detection, and tests. The booking rules were checked with automated tests. Create, read, update, delete, and reload persistence were checked in a local browser, and the published files were checked over HTTP. No passwords, API keys, or personal data are included.
