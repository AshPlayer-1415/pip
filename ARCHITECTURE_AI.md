# Winsy AI Local Assistant Architecture

This document describes the planned local assistant architecture. It is a planning document only. Winsy AI does not include Ollama, bundled models, online APIs, voice, or connectors in this phase.

## Principles

- The core app remains lightweight.
- Reminders, Quick Storage, Private Mode, Presentation Safe Mode, and the floating bubble must work without AI.
- The assistant layer is optional and disabled by default.
- The first model integration should support Ollama if it is already installed by the user.
- A later release may offer an optional bundled small model.
- Target RAM budget while the assistant is active: 3-4 GB.
- The model manager must check availability before enabling assistant features.
- Assistant output should use safe internal commands rather than directly mutating app state.

## High-Level Layers

```text
Winsy Core App
  - Electron lifecycle
  - floating bubble and quick menu
  - reminders
  - Quick Storage
  - settings and local storage
  - private/safe modes

Assistant Shell
  - compact text panel
  - model status indicator
  - response cards
  - confirmation cards
  - command preview

Model Manager
  - disabled by default
  - checks Ollama availability
  - later checks bundled model availability
  - reports memory/status/errors

Command Router
  - validates command JSON
  - maps commands to existing app modules
  - enforces confirmation requirements
  - blocks unsupported or unsafe commands
```

## Model Availability

The model manager should not assume that a model is installed. It should check:

- whether local assistant mode is enabled
- whether Ollama is installed and reachable
- whether the requested local model exists
- whether the app can stay within the active RAM budget
- whether Presentation Safe Mode or Private Mode changes output behavior

If any check fails, Winsy should stay useful as a non-AI companion.

## Internal Command Flow

Future assistant responses should produce structured command proposals:

```text
user request -> assistant parser/model -> command proposal -> command router -> confirmation if needed -> existing app module
```

The command router should be the only path from assistant output to app actions. The assistant should communicate with reminder, Quick Storage, file/app action, and future connector modules through safe internal commands.

## Privacy Defaults

- Local model disabled by default.
- Logs local only or disabled by default.
- No prompt or file content sent to online APIs in the local assistant path.
- Private Mode hides sensitive text in assistant surfaces and notifications.
- Presentation Safe Mode suppresses assistant popups.
