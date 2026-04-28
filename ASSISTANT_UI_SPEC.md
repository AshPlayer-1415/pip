# Winsy AI Assistant UI Spec

This document describes the future assistant UI. It is planning only; no real assistant is implemented in v0.5.

## Direction

The assistant should feel like a compact desktop companion, not a web chatbot.

The visual direction should be Siri-like in spirit but original:

- soft dark glass
- compact panel from the Winsy bubble
- rounded forms
- subtle motion
- calm status indicators
- minimal text

## Entry Point

The assistant opens from the Winsy bubble or quick menu.

It should appear as a compact voice/text panel anchored to the floating bubble.

## Core Elements

- local model status indicator
- text input
- optional microphone button later
- short response cards
- confirmation cards for high-risk actions
- command preview for actions Winsy is preparing
- clear cancel/confirm controls

## Model Status

The assistant should clearly show local model status:

- Off
- Checking
- Available
- Not installed
- Needs model
- Error

The local model should be disabled by default.

## Confirmation Cards

High-risk actions should use compact confirmation cards with:

- action summary
- affected item/account/file
- risk label
- Confirm button
- Cancel button

Winsy should never hide the meaningful consequence of a confirmed action.

## Private Mode

When Private Mode is enabled:

- hide sensitive titles/content in compact surfaces
- use generic notification text
- avoid displaying sensitive assistant output unless the user opens the full assistant panel

## Presentation Safe Mode

When Presentation Safe Mode is enabled:

- suppress assistant popups
- avoid showing assistant response cards over shared screens
- queue or defer non-urgent assistant prompts

## Not a Chat App

The assistant should avoid:

- full-screen chat layout
- long threaded history as the primary UI
- large web-app style sidebars
- noisy onboarding or marketing copy

Winsy should feel like a desktop control surface with short, useful responses.
