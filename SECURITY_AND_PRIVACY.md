# Security and Privacy

Pip v0.2.0 beta is designed as a local-first macOS desktop app.

## Data Stored Locally

Pip stores local settings and reminders in Electron's `userData` folder as JSON. This can include:

- companion name
- selected personality/avatar
- reminder settings and frequencies
- reminder titles, times, and types
- Private Mode and Presentation Safe Mode preferences
- missed quiet-mode nudge queue
- Quick Storage metadata and copied local files

## No Cloud Sync

Pip does not sync data to a server. There is no remote database in v0.2.0 beta.

## Quick Storage

Quick Storage copies files you choose into Pip's local app data folder. Temporary files are stored under `quick-storage/temp` and are designed to expire after 24 hours with a small local reminder flow. Permanent files are stored under `quick-storage/permanent` until you delete them. Quick Storage files are not uploaded or synced.

## No Account or Login

Pip does not require an account, login, email address, or user profile.

## Notifications and Private Mode

Native macOS notifications may be visible on screen or in Notification Center. When Private Mode is enabled, Pip uses generic notification text so reminder details are not shown in the notification body.

## Presentation Safe Mode Limitations

Presentation Safe Mode suppresses Pip notifications and bubble popups while it is enabled. It does not control notifications from other apps, hide already visible macOS notifications, or detect every possible screen-sharing state automatically.

## Local Device Security

Because Pip stores data locally, anyone with access to your Mac account and local app data may be able to inspect that data. Use macOS account security, disk encryption, and screen lock settings to protect local files.
