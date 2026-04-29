const assert = require('assert');
const {
  createCommandEngine,
  normalizeReminderTime,
  parseTextCommand
} = require('../src/command-engine');

async function run() {
  const calls = [];
  const engine = createCommandEngine({
    setReminder(payload) {
      calls.push({ type: 'setReminder', payload });
    },
    listReminders() {
      calls.push({ type: 'listReminders' });
      return [{ id: 'one' }, { id: 'two' }];
    },
    openApp(payload) {
      calls.push({ type: 'openApp', payload });
    },
    openDownloads() {
      calls.push({ type: 'openDownloads' });
    },
    openApplications() {
      calls.push({ type: 'openApplications' });
    },
    searchQuickStorage(payload) {
      calls.push({ type: 'searchQuickStorage', payload });
      return [{ id: 'resume' }];
    }
  });

  assert.strictEqual(normalizeReminderTime('12', '0', 'am'), '00:00');
  assert.strictEqual(normalizeReminderTime('12', '0', 'pm'), '12:00');
  assert.strictEqual(normalizeReminderTime('7', '5', 'pm'), '19:05');
  assert.strictEqual(normalizeReminderTime('23', '15'), '23:15');
  assert.strictEqual(normalizeReminderTime('25', '0'), null);

  let result = await engine.handleTextCommand('remind me to drink water at 7 pm');
  assert.deepStrictEqual(result, {
    ok: true,
    command: 'set_reminder',
    message: 'Reminder set for 7:00 PM.',
    requiresConfirmation: false
  });
  assert.deepStrictEqual(calls.pop(), {
    type: 'setReminder',
    payload: {
      title: 'drink water',
      time: '19:00',
      type: 'task'
    }
  });

  result = await engine.handleTextCommand('set reminder take pills at 8:30 am');
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(calls.pop(), {
    type: 'setReminder',
    payload: {
      title: 'take pills',
      time: '08:30',
      type: 'pills'
    }
  });

  result = await engine.handleTextCommand('open chrome');
  assert.deepStrictEqual(result, {
    ok: true,
    command: 'open_app',
    message: 'Opening Google Chrome.',
    requiresConfirmation: false
  });
  assert.deepStrictEqual(calls.pop(), {
    type: 'openApp',
    payload: { appName: 'Google Chrome' }
  });

  result = await engine.handleTextCommand('open notes');
  assert.strictEqual(result.message, 'Opening Notes.');
  assert.deepStrictEqual(calls.pop(), {
    type: 'openApp',
    payload: { appName: 'Notes' }
  });

  result = await engine.handleTextCommand('lock screen');
  assert.deepStrictEqual(result, {
    ok: true,
    command: 'lock_screen',
    message: 'Lock your Mac?',
    requiresConfirmation: true,
    confirmationPayload: {
      command: 'lock_screen',
      riskLevel: 'medium',
      actionSummary: 'Lock your Mac?',
      description: 'Winsy will lock the current macOS session.',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      parameters: {}
    }
  });
  assert.strictEqual(calls.some((call) => call.type === 'lockScreen'), false);

  result = await engine.handleTextCommand('show downloads');
  assert.strictEqual(result.command, 'open_downloads');
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(calls.pop(), { type: 'openDownloads' });

  result = await engine.handleTextCommand('open applications');
  assert.strictEqual(result.command, 'open_applications');
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(calls.pop(), { type: 'openApplications' });

  result = await engine.handleTextCommand('list reminders');
  assert.deepStrictEqual(result, {
    ok: true,
    command: 'list_reminders',
    message: 'You have 2 reminders.',
    requiresConfirmation: false
  });
  assert.deepStrictEqual(calls.pop(), { type: 'listReminders' });

  result = await engine.handleTextCommand('search storage resume');
  assert.deepStrictEqual(result, {
    ok: true,
    command: 'search_quick_storage',
    message: 'Found 1 match in Quick Storage.',
    requiresConfirmation: false
  });
  assert.deepStrictEqual(calls.pop(), {
    type: 'searchQuickStorage',
    payload: { query: 'resume' }
  });

  result = parseTextCommand('remind me to at 7 pm');
  assert.deepStrictEqual(result, {
    ok: false,
    command: 'set_reminder',
    message: 'Add a reminder title.',
    requiresConfirmation: false
  });

  result = parseTextCommand('remind me at 7 pm');
  assert.deepStrictEqual(result, {
    ok: false,
    command: 'set_reminder',
    message: 'Add a reminder title.',
    requiresConfirmation: false
  });

  result = parseTextCommand('winsy please make me coffee');
  assert.deepStrictEqual(result, {
    ok: false,
    command: 'unknown',
    message: 'Winsy does not know that command yet.',
    requiresConfirmation: false
  });

  const previewCalls = [];
  const previewEngine = createCommandEngine({
    openApp(payload) {
      previewCalls.push(payload);
    }
  }, { previewOnly: true });

  result = await previewEngine.handleTextCommand('open notes');
  assert.deepStrictEqual(result, {
    ok: true,
    command: 'open_app',
    message: 'Ready to open Notes.',
    requiresConfirmation: false
  });
  assert.deepStrictEqual(previewCalls, []);

  console.log('Command engine tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
