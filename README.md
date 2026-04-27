# Pip

Pip is a gentle macOS desktop companion for reminders, hydration nudges, screen breaks, stretching, and motivation.

It is built for people who want a calm reminder layer on their desktop without accounts, dashboards, cloud sync, or AI dependency. Pip lives in the menu bar, keeps a small companion bubble near the corner of the screen, and stores its data locally on your Mac.

## Status

Pip is currently moving through a `v0.2.0` beta branch. Expect a focused, local-first desktop app rather than a fully polished commercial release.

## Screenshots

Planned launch screenshots:

- `marketing/screenshots/01-onboarding-welcome.png`
- `marketing/screenshots/02-personality-picker.png`
- `marketing/screenshots/03-today-dashboard.png`
- `marketing/screenshots/04-reminder-creation.png`
- `marketing/screenshots/05-private-mode.png`
- `marketing/screenshots/06-presentation-safe-mode.png`

See [marketing/SCREENSHOT_GUIDE.md](./marketing/SCREENSHOT_GUIDE.md) for capture notes.

## Features

- macOS menu bar app with a compact floating companion bubble
- Movable Pip bubble with saved position and size controls
- Assistive Touch-style quick menu for Pip Home, Storage, and desktop actions
- Emoji avatars or local custom image avatars
- Anchored message-style panel that opens from the Pip bubble
- First-time onboarding for name, personality, reminder rhythm, and privacy preference
- CSS-based companion avatars for each personality
- Today dashboard with:
  - active mode: Normal, Private, Presentation Safe, or Snoozed
  - next upcoming reminder
  - missed quiet-mode count
  - quick actions for Water, Eye Break, Stretch, and Motivate Me
- Local reminders for pills, birthdays, tasks, and custom items
- Apple-style compact reminder time picker
- Quick Storage for files dropped onto Pip:
  - Temp 24h storage with local cleanup reminders
  - Permanent local storage
  - Open, reveal in Finder, delete, and move-to-permanent actions
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
- Settings, reminders, avatar images, and Quick Storage files are stored locally in Electron's `userData` folder

See [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md) for more detail.

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for current beta limitations.

## Run Locally

```bash
npm install
npm start
```

On first launch, Pip opens onboarding. After setup, the floating bubble can be moved and will restore its saved position.

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
src/bubble.js            Bubble popup behavior and quick menu toggle
src/quick-menu.html      Assistive Touch-style quick menu shell
src/quick-menu.js        Quick menu behavior
src/assistant.html       Pip Assistant placeholder shell
src/assistant.js         Pip Assistant placeholder behavior
src/storage-shelf.html   Quick Storage shelf shell
src/storage-shelf.js     Quick Storage shelf behavior
src/storage-prompt.html  Quick Storage prompt shell
src/storage-prompt.js    Quick Storage prompt behavior
src/styles.css           Shared premium dark theme and CSS avatars
src/messages.js          Hardcoded personality message bank
src/storage.js           Local JSON persistence helper
```

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md).

## Roadmap

- Local assistant planned as optional offline model support.
