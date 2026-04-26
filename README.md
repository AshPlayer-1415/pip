# Pip

Pip is a calm, local-first macOS desktop companion for gentle reminders, hydration, screen breaks, stretching, and motivation.

It is intentionally private and simple: no account, no cloud sync, no AI dependency, and no remote database. Settings and reminders are stored locally in Electron's `userData` folder.

## Screenshots

> Screenshot placeholder: first-time onboarding

> Screenshot placeholder: Today dashboard

> Screenshot placeholder: compact companion bubble

## Features

- macOS menu bar app
- Floating companion bubble near the bottom-right of the active display
- Compact dashboard panel with:
  - active mode: Normal, Private, Presentation Safe, or Snoozed
  - next upcoming reminder
  - missed quiet-mode count
  - quick actions for water, eye break, stretch, and motivation
- First-time onboarding for:
  - welcome
  - companion name
  - avatar/personality
  - reminder preferences
  - Private Mode preference
- CSS-based avatar styles for each personality
- Personality message banks with warm, short, local-only nudges
- Local reminders for pills, birthdays, tasks, and custom items
- Native Electron notifications
- Private Mode for generic notification titles and bodies
- Presentation Safe Mode to suppress notifications and bubble popups
- Silent queue for missed nudges while Presentation Safe Mode is enabled
- Snooze options: 15 minutes, 1 hour, until tomorrow, or until turned back on
- Local JSON storage only

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

On first launch, Pip opens onboarding. After setup, the floating bubble stays near the bottom-right of the active display.

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
src/styles.css    Shared premium dark theme and CSS avatars
src/messages.js   Hardcoded personality message bank
src/storage.js    Local JSON persistence helper
```

## Privacy

Pip does not send reminder data anywhere. When Private Mode is enabled, native notifications use generic text so reminder details are not shown on screen.
