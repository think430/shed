# Shed

A lightweight, gamified Progressive Web App that helps you break habits.

## Features

- **Habit tracking**: Add habits you want to break and see how many days you have stayed clean.
- **Gamification**: Earn XP every day you keep a streak going, level up, and chase weekly milestones.
- **Local-first storage**: Your progress is stored on your device with `localStorage`; nothing leaves your browser.
- **Export & open progress**: Save your data to a `.shed` file, then reopen it later on any device.
- **Fluent Design**: Acrylic material, depth, rounded surfaces, and smooth motion.
- **Responsive**: Works on desktop, tablet, and mobile.
- **Offline support**: Service worker caches core assets so the app works without a network connection.

## Running locally

Shed is a static PWA. Open `index.html` in any modern browser, or serve the folder with a local server:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Files

- `index.html` — app shell
- `styles.css` — Fluent-inspired responsive styles
- `app.js` — habit tracking, gamification, storage, export/import
- `manifest.json` — PWA manifest
- `service-worker.js` — offline caching
- `favicon.svg`, `icon-192.png`, `icon-512.png` — app icons