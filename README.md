# Pip

Pip is a local-first macOS desktop companion for gentle hydration, screen break, stretch, motivation, and personal reminders.

The MVP is intentionally simple: no login, no cloud storage, no AI dependency, and no remote database. Settings and reminders are saved to Electron's local `userData` folder as JSON.

## Features

- macOS menu bar app with a small floating companion bubble
- Compact control panel opened from the bubble or menu bar
- Minimal onboarding with companion name and personality selection
- Personality message banks for:
  - Cozy Friend
  - Strict Coach
  - Space Buddy
  - Dark Guardian
  - Funny Gremlin
- Native Electron notifications
- Private Mode for generic notification text
- Presentation Safe Mode to suppress notifications and bubble popups
- Silent queue for missed nudges while safe mode is enabled
- Snooze options: 15 minutes, 1 hour, until tomorrow, or until turned back on
- Local reminder creation for pills, birthdays, tasks, and custom reminders
- Local JSON storage only

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

On first launch, Pip opens the onboarding panel. After setup, the floating bubble stays near the bottom-right of the active display.

## Package for macOS

```bash
npm run build:mac
```

The DMG output is written by `electron-builder` to the `dist` folder.

## Project Structure

```text
src/main.js       Electron app lifecycle, tray, windows, storage, scheduling
src/preload.js    Safe IPC bridge exposed to renderer windows
src/panel.html    Compact control panel shell
src/panel.js      Onboarding, dashboard, reminders, and settings UI
src/bubble.html   Floating companion bubble shell
src/bubble.js     Bubble popup behavior and panel toggle
src/styles.css    Shared premium dark theme
src/messages.js   Hardcoded personality message bank
src/storage.js    Local JSON persistence helper
```

## Privacy Notes

Pip does not send reminder data anywhere. Native notifications can reveal message text unless Private Mode is enabled. When Private Mode is on, notification text is generic.
