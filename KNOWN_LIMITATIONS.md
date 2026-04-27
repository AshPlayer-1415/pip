# Known Limitations

Pip v0.2.0 beta is a focused local-first desktop beta. Current limitations:

- Presentation Safe Mode is manual. Pip does not automatically detect every screen-sharing or presentation state.
- macOS notification delivery depends on system notification permissions, Focus modes, and Notification Center behavior.
- Local settings, reminders, and Quick Storage files are not separately encrypted by Pip. They rely on macOS account security and disk protection.
- Reminders are simple daily time-based reminders. Pip does not yet support complex recurrence rules.
- Quick Storage supports local files dragged onto Pip. Folders are ignored in this beta.
- Temporary Quick Storage cleanup runs while Pip is open.
- The app is packaged for macOS. Other platforms are not part of the v0.2.0 beta.
- The local DMG build is not notarized unless valid Apple Developer notarization credentials are configured.
- There is no cloud sync, account system, web dashboard, or AI service integration.
