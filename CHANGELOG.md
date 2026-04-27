# Changelog

## v0.4.0 beta

Winsy AI v0.4 is a rebrand and stability release before real AI is added.

- Rebranded Pip to Winsy AI
- Changed the default assistant name to Winsy
- Added local app-data migration from the old Pip support folder when possible
- Updated app title, menu labels, About metadata, package metadata, and DMG naming
- Stabilized floating windows across app switching and macOS spaces
- Improved quick menu reliability from the floating bubble
- Polished the home panel, quick menu, and storage prompt glass styling
- Improved long filename truncation in Quick Storage prompts
- Replaced letter-only quick menu icons with cleaner symbolic icons
- Clarified docs that no LLM, email connector, cloud connector, or online assistant API exists yet

## v0.3.0 beta

Pip v0.3 introduces an Assistive Touch-style companion layer.

- Added a compact quick menu that opens from the Pip bubble
- Added Pip Home and Storage quick actions
- Added Pip Assistant placeholder for future optional local assistant support
- Added desktop quick actions for Screenshot, Notes, Lock Screen, Downloads, Applications, and Focus instructions
- Added Quick Menu settings for 3, 4, 5, or 6 visible actions
- Added customizable quick action slots while keeping Pip Home and Storage available
- Added collapsible Quick Storage shelf with local collapsed-state persistence
- Kept reminders, Quick Storage, Private Mode, Presentation Safe Mode, onboarding, and macOS DMG packaging intact

## v0.2.0 beta

Pip v0.2 moves the app toward a more minimal desktop companion.

- Added a movable floating Pip bubble with saved position
- Added Small, Medium, and Large bubble sizes
- Added emoji or local custom image avatar options
- Added anchored panel and Quick Storage prompt styling so Pip feels like it speaks from the bubble
- Added local Quick Storage for temporary and permanent files
- Added 24-hour temporary storage reminders and cleanup
- Added Quick Storage actions: open, reveal in Finder, delete, and move to permanent
- Added a compact Apple-style reminder time picker
- Improved app identity so packaged builds show Pip instead of Electron
- Refined dashboard, onboarding, settings, and bubble UI copy

## v0.1.0

Initial public beta release of Pip.

- Added macOS menu bar app behavior
- Added floating companion bubble
- Added first-time onboarding
- Added companion naming and personality/avatar choices
- Added local reminders for pills, birthdays, tasks, and custom items
- Added hydration, eye break, stretch, and motivation nudges
- Added warm personality message banks
- Added Today dashboard with mode, next reminder, missed count, and quick actions
- Added Private Mode for generic notification text
- Added Presentation Safe Mode for quiet screen sharing
- Added snooze options
- Added local JSON storage
- Added in-app About section
- Added Reset Pip option
- Added macOS DMG packaging
