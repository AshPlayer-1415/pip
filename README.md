# Pip

Pip is a gentle macOS desktop companion for reminders, hydration nudges, screen breaks, stretching, and motivation.

It is built for people who want a calm reminder layer on their desktop without accounts, dashboards, cloud sync, or AI dependency. Pip lives in the menu bar, keeps a small companion bubble near the corner of the screen, and stores its data locally on your Mac.

## Status

Pip is currently a public `v0.1.0` beta. Expect a focused, local-first desktop app rather than a fully polished commercial release.

## Screenshots

> Screenshot placeholder: first-time onboarding

> Screenshot placeholder: Today dashboard

> Screenshot placeholder: compact companion bubble

## Features

- macOS menu bar app with a compact floating companion bubble
- First-time onboarding for name, personality, reminder rhythm, and privacy preference
- CSS-based companion avatars for each personality
- Today dashboard with:
  - active mode: Normal, Private, Presentation Safe, or Snoozed
  - next upcoming reminder
  - missed quiet-mode count
  - quick actions for Water, Eye Break, Stretch, and Motivate Me
- Local reminders for pills, birthdays, tasks, and custom items
- Warm local message banks for hydration, eye breaks, stretching, and motivation
- Native Electron notifications
- Private Mode for generic notification titles and bodies
- Presentation Safe Mode to suppress notifications and bubble popups
- Snooze options: 15 minutes, 1 hour, until tomorrow, or until turned back on
- In-app About section and Reset Pip option

## Privacy

Pip is local-first:

- No account or login
- No cloud sync
- No remote database
- No AI service dependency
- Settings and reminders are stored locally in Electron's `userData` folder

See [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md) for more detail.

## Run Locally

```bash
npm install
npm start
```

On first launch, Pip opens onboarding. After setup, the floating bubble stays near the bottom-right of the active display.

## Build the macOS DMG

```bash
npm run build:mac
```

The DMG output is written by `electron-builder` to the `dist` folder.

## Project Structure

```text
assets/icon.png          App icon source
scripts/generate-icon.js Local icon generator
src/main.js              Electron app lifecycle, tray, windows, storage, scheduling
src/preload.js           Safe IPC bridge exposed to renderer windows
src/panel.html           Compact control panel shell
src/panel.js             Onboarding, dashboard, reminders, settings, About, Reset
src/bubble.html          Floating companion bubble shell
src/bubble.js            Bubble popup behavior and panel toggle
src/styles.css           Shared premium dark theme and CSS avatars
src/messages.js          Hardcoded personality message bank
src/storage.js           Local JSON persistence helper
```

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md).
