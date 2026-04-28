# Winsy AI Assistant Safety Rules

Winsy can suggest, draft, summarize, and prepare. Winsy must not silently perform sensitive actions.

## Confirmation Required

Winsy must ask for confirmation before:

- sending emails
- deleting files
- moving files
- changing system settings
- opening sensitive documents
- running terminal commands

## Prohibited Silent Actions

Winsy should never silently:

- send
- delete
- purchase
- submit
- share
- publish
- move sensitive files
- change system settings

## External Communication

User approval is required for any external communication, including:

- sending email
- posting content
- uploading files
- calling online services
- sharing summaries with connectors

## Privacy Modes

Private Mode should hide sensitive assistant output in notifications and compact surfaces.

Presentation Safe Mode should suppress assistant popups and queue or defer assistant prompts where possible.

## Logs

Assistant logs should be local only or disabled by default. If logs are added later, users should be able to clear them.

## Command Router

Assistant output must pass through a command router that validates command shape, risk level, required confirmation, and target module before anything happens.
