# Winsy AI Assistant Roadmap

This roadmap is intentionally staged so Winsy AI can stay stable and local-first while assistant capabilities are added.

## v0.5: Architecture Docs Only

- Define local assistant architecture.
- Define command schema.
- Define safety and confirmation rules.
- Define assistant UI direction.
- No LLM integration.
- No Ollama integration.
- No voice.
- No email or online connectors.

## v0.6: Command Parser Without LLM

- Add a deterministic command parser for a small set of typed commands.
- Route parsed commands through the same safety/confirmation layer planned for AI.
- Keep all assistant behavior local and non-generative.

## v0.7: Ollama Local Assistant Integration

- Detect whether Ollama is installed.
- Allow the user to opt in to local assistant mode.
- Check model availability before enabling the assistant.
- Keep reminders and Quick Storage independent from the model.

## v0.8: Voice Input/Output Prototype

- Add optional microphone input prototype.
- Add optional spoken output prototype.
- Keep voice off by default.
- Respect Private Mode and Presentation Safe Mode.

## v0.9: Email Read/Draft Connector

- Add email read/draft support with explicit user approval.
- Require confirmation before sending, deleting, moving, or sharing anything.
- Keep connector permissions narrow and visible.

## Later

- Optional online connectors for ChatGPT, Claude, Gmail, Calendar, and similar services.
- Clear connector settings and revocation controls.
- Per-connector privacy disclosures.
