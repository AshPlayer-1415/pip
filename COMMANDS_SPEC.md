# Winsy AI Internal Commands Spec

This is the planned command schema for future assistant features. It is not implemented in v0.5.

## Shared Shape

```json
{
  "command": "command_name",
  "parameters": {},
  "request_id": "local-generated-id"
}
```

## set_reminder

Purpose: Create a local reminder.

Required parameters: `title`, `time`, `type`

Risk level: low

Confirmation required: no, unless reminder text contains sensitive content while Private Mode is off.

```json
{
  "command": "set_reminder",
  "parameters": {
    "title": "Call Sam",
    "time": "16:30",
    "type": "task"
  }
}
```

## list_reminders

Purpose: Show current local reminders.

Required parameters: none

Risk level: low

Confirmation required: no

```json
{
  "command": "list_reminders",
  "parameters": {}
}
```

## open_app

Purpose: Open a local macOS application.

Required parameters: `app_name`

Risk level: medium

Confirmation required: no for common apps, yes for security-sensitive apps.

```json
{
  "command": "open_app",
  "parameters": {
    "app_name": "Notes"
  }
}
```

## open_file

Purpose: Open a local file.

Required parameters: `path` or `storage_id`

Risk level: medium

Confirmation required: yes for sensitive documents.

```json
{
  "command": "open_file",
  "parameters": {
    "storage_id": "quick-storage-item-id"
  }
}
```

## reveal_file

Purpose: Reveal a local file in Finder.

Required parameters: `path` or `storage_id`

Risk level: low

Confirmation required: no, unless the path is sensitive.

```json
{
  "command": "reveal_file",
  "parameters": {
    "storage_id": "quick-storage-item-id"
  }
}
```

## search_quick_storage

Purpose: Search Quick Storage metadata.

Required parameters: `query`

Risk level: low

Confirmation required: no

```json
{
  "command": "search_quick_storage",
  "parameters": {
    "query": "invoice"
  }
}
```

## summarize_text

Purpose: Summarize user-provided text locally.

Required parameters: `text`

Risk level: medium

Confirmation required: no for local-only summary, yes before sharing externally.

```json
{
  "command": "summarize_text",
  "parameters": {
    "text": "Long text pasted by the user..."
  }
}
```

## draft_email

Purpose: Prepare an email draft.

Required parameters: `to`, `subject`, `body`

Risk level: high

Confirmation required: yes before creating/sending through any connector.

```json
{
  "command": "draft_email",
  "parameters": {
    "to": "person@example.com",
    "subject": "Follow up",
    "body": "Draft body..."
  }
}
```

## read_email_summary

Purpose: Summarize email metadata/content from an approved connector.

Required parameters: `account_id`, `query`

Risk level: high

Confirmation required: yes before accessing email content.

```json
{
  "command": "read_email_summary",
  "parameters": {
    "account_id": "local-connector-account",
    "query": "unread from today"
  }
}
```

## create_note

Purpose: Create or prepare a local note.

Required parameters: `title`, `body`

Risk level: medium

Confirmation required: yes before writing into another app.

```json
{
  "command": "create_note",
  "parameters": {
    "title": "Meeting notes",
    "body": "Draft note content..."
  }
}
```

## lock_screen

Purpose: Lock the Mac screen.

Required parameters: none

Risk level: medium

Confirmation required: yes

```json
{
  "command": "lock_screen",
  "parameters": {}
}
```
