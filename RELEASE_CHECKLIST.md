# Release Checklist

Use this checklist before publishing a Winsy AI beta build.

## Install Test

- Run `npm install`
- Confirm dependencies install without errors

## Onboarding Test

- Launch with `npm start`
- Complete welcome, name, personality, and reminder preference steps
- Confirm the dashboard appears after onboarding

## Reminder Test

- Add a custom reminder a few minutes in the future
- Confirm the reminder appears in the list
- Confirm the reminder fires at the expected time

## Snooze Test

- Trigger a nudge from Today quick actions
- Snooze for 15 minutes
- Confirm the active nudge clears

## Private Mode Test

- Enable Private Mode
- Trigger or wait for a notification
- Confirm notification text is generic and does not reveal reminder details

## Presentation Safe Mode Test

- Enable Presentation Safe Mode
- Trigger or wait for a nudge
- Confirm notifications and bubble popups are suppressed
- Confirm missed nudges are queued silently

## Reset Test

- Open Settings
- Use Reset Winsy AI
- Confirm the confirmation step appears
- Confirm local reminders/settings clear and onboarding returns

## DMG Build Test

- Run `npm run build:mac`
- Confirm `dist/Winsy AI-0.4.0-arm64.dmg` is produced
- Install from the DMG on a clean macOS user account when possible
