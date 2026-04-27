# Known Limitations

Winsy AI v0.4.0 beta is a focused local-first desktop beta. Current limitations:

- The Winsy Assistant panel is a placeholder only. No real LLM is bundled or connected yet.
- There are no email connectors, cloud connectors, ChatGPT connectors, Claude connectors, or online assistant APIs yet.
- Presentation Safe Mode is manual. Winsy AI does not automatically detect every screen-sharing or presentation state.
- macOS notification delivery depends on system notification permissions, Focus modes, and Notification Center behavior.
- Local settings, reminders, and Quick Storage files are not separately encrypted by Winsy AI. They rely on macOS account security and disk protection.
- Reminders are simple daily time-based reminders. Winsy AI does not yet support complex recurrence rules.
- Quick Storage supports local files dragged onto Winsy. Folders are ignored in this beta.
- Temporary Quick Storage cleanup runs while Winsy AI is open.
- The app is packaged for macOS. Other platforms are not part of the v0.4.0 beta.
- The local DMG build is not notarized unless valid Apple Developer notarization credentials are configured.
