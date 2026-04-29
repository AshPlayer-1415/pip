const APP_ALIASES = new Map([
  ['chrome', 'Google Chrome'],
  ['google chrome', 'Google Chrome'],
  ['safari', 'Safari'],
  ['notes', 'Notes'],
  ['apple notes', 'Notes'],
  ['finder', 'Finder'],
  ['calendar', 'Calendar'],
  ['mail', 'Mail'],
  ['messages', 'Messages'],
  ['terminal', 'Terminal'],
  ['settings', 'System Settings'],
  ['system settings', 'System Settings']
]);

function cleanText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeForMatch(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[.!?]+$/g, '');
}

function buildResult({ ok, command, message, requiresConfirmation = false, confirmationPayload, items }) {
  const result = {
    ok: Boolean(ok),
    command: command || 'unknown',
    message: message || '',
    requiresConfirmation: Boolean(requiresConfirmation)
  };

  if (confirmationPayload && typeof confirmationPayload === 'object') {
    result.confirmationPayload = confirmationPayload;
  }

  if (Array.isArray(items) && items.length) {
    result.items = items;
  }

  return result;
}

function normalizeReminderTime(hourValue, minuteValue = '0', periodValue = '') {
  const rawHour = Number(hourValue);
  const rawMinute = Number(minuteValue || 0);
  const period = String(periodValue || '').toLowerCase().replace(/\./g, '');

  if (!Number.isInteger(rawHour) || !Number.isInteger(rawMinute) || rawMinute < 0 || rawMinute > 59) {
    return null;
  }

  if (period) {
    if (!['am', 'pm'].includes(period) || rawHour < 1 || rawHour > 12) {
      return null;
    }

    let hours = rawHour;
    if (period === 'am' && rawHour === 12) {
      hours = 0;
    } else if (period === 'pm' && rawHour !== 12) {
      hours += 12;
    }

    return `${String(hours).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')}`;
  }

  if (rawHour < 0 || rawHour > 23) {
    return null;
  }

  return `${String(rawHour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')}`;
}

function formatTime12(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ''));
  if (!match) {
    return 'the selected time';
  }

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

function inferReminderType(title) {
  const normalized = normalizeForMatch(title);
  if (/\b(pill|pills|med|meds|medicine|medication)\b/.test(normalized)) {
    return 'pills';
  }

  if (/\b(birthday|bday)\b/.test(normalized)) {
    return 'birthday';
  }

  return 'task';
}

function parseReminderCommand(input) {
  const match = /^(?:remind me(?: to)?|set reminder(?: to)?|set a reminder(?: to)?|reminder to)\s+(.+)$/i.exec(input);
  if (!match) {
    return null;
  }

  const body = cleanText(match[1]);
  const timeMatch = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\b/i.exec(body);
  if (!timeMatch) {
    return buildResult({
      ok: false,
      command: 'set_reminder',
      message: 'Add a time, like "at 7 PM".'
    });
  }

  const time = normalizeReminderTime(timeMatch[1], timeMatch[2] || '0', timeMatch[3] || '');
  if (!time) {
    return buildResult({
      ok: false,
      command: 'set_reminder',
      message: 'Use a valid reminder time.'
    });
  }

  const title = cleanText(`${body.slice(0, timeMatch.index)} ${body.slice(timeMatch.index + timeMatch[0].length)}`)
    .replace(/^to\s+/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();

  if (!title) {
    return buildResult({
      ok: false,
      command: 'set_reminder',
      message: 'Add a reminder title.'
    });
  }

  return {
    command: 'set_reminder',
    payload: {
      title,
      time,
      type: inferReminderType(title)
    }
  };
}

function parseTextCommand(input) {
  const original = cleanText(input);
  const normalized = normalizeForMatch(original);

  if (!normalized) {
    return buildResult({
      ok: false,
      command: 'unknown',
      message: 'Type a command for Winsy.'
    });
  }

  const reminder = parseReminderCommand(original);
  if (reminder) {
    return reminder;
  }

  if (/^(list|show)\s+(my\s+)?reminders$/.test(normalized)) {
    return { command: 'list_reminders', payload: {} };
  }

  if (/^lock\s+(screen|mac|computer)$/.test(normalized) || normalized === 'lock screen') {
    return {
      command: 'lock_screen',
      payload: {},
      requiresConfirmation: true
    };
  }

  if (/^(show|open)\s+(my\s+)?downloads$/.test(normalized)) {
    return { command: 'open_downloads', payload: {} };
  }

  if (/^(show|open)\s+(my\s+)?applications$/.test(normalized)) {
    return { command: 'open_applications', payload: {} };
  }

  const storageMatch = /^(?:search|find)(?:\s+(?:quick\s+)?storage(?:\s+for)?|\s+in\s+(?:quick\s+)?storage)\s+(.+)$/i.exec(original);
  if (storageMatch) {
    const query = cleanText(storageMatch[1]).replace(/[.!?]+$/g, '');
    if (!query) {
      return buildResult({
        ok: false,
        command: 'search_quick_storage',
        message: 'Add something to search for.'
      });
    }

    return {
      command: 'search_quick_storage',
      payload: { query }
    };
  }

  const openAppMatch = /^open\s+(.+)$/i.exec(original);
  if (openAppMatch) {
    const requestedApp = cleanText(openAppMatch[1]).replace(/[.!?]+$/g, '');
    if (!requestedApp) {
      return buildResult({
        ok: false,
        command: 'open_app',
        message: 'Tell Winsy which app to open.'
      });
    }

    const appName = APP_ALIASES.get(normalizeForMatch(requestedApp)) || requestedApp;
    return {
      command: 'open_app',
      payload: { appName }
    };
  }

  return buildResult({
    ok: false,
    command: 'unknown',
    message: 'Winsy does not know that command yet.'
  });
}

async function maybeCall(handler, payload) {
  if (typeof handler !== 'function') {
    return undefined;
  }

  return handler(payload);
}

function countMessage(value, singular, plural) {
  if (Array.isArray(value)) {
    return value.length === 1 ? `1 ${singular}` : `${value.length} ${plural}`;
  }

  if (Number.isInteger(value)) {
    return value === 1 ? `1 ${singular}` : `${value} ${plural}`;
  }

  return null;
}

function commandData(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return { value };
}

function createCommandEngine(handlers = {}, options = {}) {
  const previewOnly = options.previewOnly === true;

  async function handleTextCommand(input) {
    const parsed = parseTextCommand(input);

    if (parsed.ok === false) {
      return parsed;
    }

    if (parsed.requiresConfirmation) {
      return buildResult({
        ok: true,
        command: parsed.command,
        message: 'Confirm before Winsy locks the screen.',
        requiresConfirmation: true,
        confirmationPayload: {
          command: parsed.command,
          parameters: parsed.payload || {}
        }
      });
    }

    try {
      switch (parsed.command) {
        case 'set_reminder': {
          if (previewOnly) {
            return buildResult({
              ok: true,
              command: parsed.command,
              message: `Ready to set a reminder for ${formatTime12(parsed.payload.time)}.`
            });
          }

          const data = commandData(await maybeCall(handlers.setReminder, parsed.payload));
          return buildResult({
            ok: true,
            command: parsed.command,
            message: data.message || `Reminder set for ${formatTime12(parsed.payload.time)}.`,
            items: data.items
          });
        }

        case 'list_reminders': {
          const data = commandData(await maybeCall(handlers.listReminders, parsed.payload));
          const reminders = data.items || data.value;
          const count = countMessage(reminders, 'reminder', 'reminders');
          return buildResult({
            ok: true,
            command: parsed.command,
            message: data.message || (count ? `You have ${count}.` : 'No reminders yet.'),
            items: data.items
          });
        }

        case 'open_app': {
          if (previewOnly) {
            return buildResult({
              ok: true,
              command: parsed.command,
              message: `Ready to open ${parsed.payload.appName}.`
            });
          }

          const data = commandData(await maybeCall(handlers.openApp, parsed.payload));
          return buildResult({
            ok: true,
            command: parsed.command,
            message: data.message || `Opening ${parsed.payload.appName}.`
          });
        }

        case 'open_downloads': {
          if (previewOnly) {
            return buildResult({
              ok: true,
              command: parsed.command,
              message: 'Ready to show Downloads.'
            });
          }

          const data = commandData(await maybeCall(handlers.openDownloads, parsed.payload));
          return buildResult({
            ok: true,
            command: parsed.command,
            message: data.message || 'Opening Downloads.'
          });
        }

        case 'open_applications': {
          if (previewOnly) {
            return buildResult({
              ok: true,
              command: parsed.command,
              message: 'Ready to show Applications.'
            });
          }

          const data = commandData(await maybeCall(handlers.openApplications, parsed.payload));
          return buildResult({
            ok: true,
            command: parsed.command,
            message: data.message || 'Opening Applications.'
          });
        }

        case 'search_quick_storage': {
          const data = commandData(await maybeCall(handlers.searchQuickStorage, parsed.payload));
          const matches = data.items || data.value;
          const count = countMessage(matches, 'match', 'matches');
          return buildResult({
            ok: true,
            command: parsed.command,
            message: data.message || (count ? `Found ${count} in Quick Storage.` : `No Quick Storage matches for "${parsed.payload.query}".`),
            items: data.items
          });
        }

        default:
          return buildResult({
            ok: false,
            command: parsed.command || 'unknown',
            message: 'Winsy does not know that command yet.'
          });
      }
    } catch (error) {
      return buildResult({
        ok: false,
        command: parsed.command,
        message: error && error.message ? error.message : 'Winsy could not complete that command.'
      });
    }
  }

  return { handleTextCommand };
}

module.exports = {
  createCommandEngine,
  formatTime12,
  normalizeReminderTime,
  parseTextCommand
};
