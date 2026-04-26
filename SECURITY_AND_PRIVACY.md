# Security and Privacy

Pip v0.1.0 is designed as a local-first macOS desktop app.

## Data Stored Locally

Pip stores local settings and reminders in Electron's `userData` folder as JSON. This can include:

- companion name
- selected personality/avatar
- reminder settings and frequencies
- reminder titles, times, and types
- Private Mode and Presentation Safe Mode preferences
- missed quiet-mode nudge queue

## No Cloud Sync

Pip does not sync data to a server. There is no remote database in v0.1.0.

## No Account or Login

Pip does not require an account, login, email address, or user profile.

## Notifications and Private Mode

Native macOS notifications may be visible on screen or in Notification Center. When Private Mode is enabled, Pip uses generic notification text so reminder details are not shown in the notification body.

## Presentation Safe Mode Limitations

Presentation Safe Mode suppresses Pip notifications and bubble popups while it is enabled. It does not control notifications from other apps, hide already visible macOS notifications, or detect every possible screen-sharing state automatically.

## Local Device Security

Because Pip stores data locally, anyone with access to your Mac account and local app data may be able to inspect that data. Use macOS account security, disk encryption, and screen lock settings to protect local files.
