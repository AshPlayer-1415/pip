# Winsy AI

Winsy AI is a local-first macOS assistant companion for reminders, quick storage, and lightweight desktop actions.

Winsy lives in the menu bar, keeps a small movable companion bubble on your desktop, and opens an Assistive Touch-style quick menu for common actions. This phase is a rebrand and stability release before real AI is added.

## Status

Winsy AI is currently moving through a `v0.4.0` beta branch. It is local-first, simple, and intentionally does not include a real LLM, email connector, cloud sync, or online assistant API yet.

## Features

- Movable macOS companion bubble with saved position and size controls
- Assistive Touch-style quick menu for Winsy Home, Storage, and desktop actions
- Quick Storage for temporary and permanent local files
- Collapsible Quick Storage shelf near the floating bubble
- Emoji avatars or local custom image avatars
- First-time onboarding for companion name, personality, reminders, and privacy preference
- Local reminders for pills, birthdays, tasks, and custom items
- Apple-style compact reminder time picker
- Today dashboard with mode, next reminder, missed count, and quick nudges
- Private Mode for generic notification titles and bodies
- Presentation Safe Mode to suppress notifications and bubble popups
- Reset option and in-app About section

## Privacy

Winsy AI is local-first:

- No account or login
- No cloud sync
- No remote database
- No real AI model or online assistant API in this phase
- No email reading, email drafting, or cloud connectors exist yet
- Settings, reminders, avatar images, and Quick Storage files are stored locally in Electron's `userData` folder

See [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md) for more detail.

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for current beta limitations.

## Run Locally

```bash
npm install
npm start
```

On first launch, Winsy AI opens onboarding. After setup, the floating bubble can be moved and will restore its saved position.

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
src/panel.html           Home panel shell
src/panel.js             Onboarding, dashboard, reminders, settings, About, Reset
src/bubble.html          Floating companion bubble shell
src/bubble.js            Bubble popup behavior and quick menu toggle
src/quick-menu.html      Assistive Touch-style quick menu shell
src/quick-menu.js        Quick menu behavior
src/assistant.html       Winsy Assistant placeholder shell
src/assistant.js         Winsy Assistant placeholder behavior
src/storage-shelf.html   Quick Storage shelf shell
src/storage-shelf.js     Quick Storage shelf behavior
src/storage-prompt.html  Quick Storage prompt shell
src/storage-prompt.js    Quick Storage prompt behavior
src/styles.css           Shared premium dark theme and CSS avatars
src/messages.js          Hardcoded personality message bank
src/storage.js           Local JSON persistence helper
```

## Roadmap

- Optional local assistant via Ollama or a bundled small model
- Voice input and output
- App actions with explicit user approval
- Email reading and draft support with user approval
- Online connectors later

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md).
