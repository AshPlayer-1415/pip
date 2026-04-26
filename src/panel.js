const app = document.getElementById('app');

let state;
let view = 'dashboard';
let draftPersonality = 'cozy';

const typeLabels = {
  pills: 'Pills',
  birthday: 'Birthday',
  task: 'Task',
  custom: 'Custom'
};

const personalityNotes = {
  cozy: 'Warm, calm, low-pressure nudges.',
  strict: 'Direct prompts with a clear edge.',
  space: 'Mission-style check-ins.',
  guardian: 'Quiet, focused, protective.',
  gremlin: 'Dry jokes with useful timing.'
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function accentStyle(accent) {
  return `--accent: ${accent}; --accent-soft: ${accent}22;`;
}

function renderTopbar() {
  const meta = state.personalityMeta;
  return `
    <header class="topbar" style="${accentStyle(meta.accent)}">
      <div class="brand">
        <div class="avatar">${escapeHtml(meta.mark)}</div>
        <div class="brand-copy">
          <div class="eyebrow">${escapeHtml(meta.label)}</div>
          <h1 class="title">${escapeHtml(state.companionName || 'Pip')}</h1>
        </div>
      </div>
      <div class="top-actions">
        ${state.onboardingComplete ? '<button class="icon-button" data-view="settings" title="Settings">...</button>' : ''}
        <button class="icon-button" data-action="close" title="Close">x</button>
      </div>
    </header>
  `;
}

function renderPersonalityOptions(selected) {
  return `
    <div class="personality-grid">
      ${state.personalityOptions.map((option) => `
        <button
          class="personality-option ${selected === option.id ? 'is-selected' : ''}"
          style="${accentStyle(option.accent)}"
          data-personality="${option.id}"
          type="button"
        >
          <span class="option-top">
            <span class="mini-mark">${escapeHtml(option.mark)}</span>
            <span class="option-label">${escapeHtml(option.label)}</span>
          </span>
          <span class="option-note">${escapeHtml(personalityNotes[option.id] || '')}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderOnboarding() {
  const selected = draftPersonality || state.personality || 'cozy';
  return `
    ${renderTopbar()}
    <section class="content">
      <div class="onboarding">
        <div>
          <h1>Set up your companion</h1>
          <p>Choose a name and a tone. Everything stays on this Mac.</p>
        </div>
        <form class="form" data-form="onboarding">
          <label class="field">
            <span>Name</span>
            <input class="input" name="companionName" maxlength="28" value="${escapeHtml(state.companionName || 'Pip')}" />
          </label>
          <div class="field">
            <label>Personality</label>
            ${renderPersonalityOptions(selected)}
            <input type="hidden" name="personality" value="${escapeHtml(selected)}" />
          </div>
          <button class="button primary" type="submit">Start</button>
        </form>
      </div>
    </section>
  `;
}

function renderCurrentNudge() {
  const nudge = state.currentNudge;

  if (!nudge) {
    return `
      <section class="card hero-card">
        <div class="nudge-label">Quiet right now</div>
        <p class="empty-copy">No active check-ins.</p>
      </section>
    `;
  }

  const canSnooze = nudge.kind === 'nudge' && state.nudges[nudge.category];
  return `
    <section class="card hero-card">
      <div class="nudge-label">${escapeHtml(nudge.label || 'Check-in')}</div>
      <p class="nudge-message">${escapeHtml(nudge.message)}</p>
      <div class="button-row">
        ${canSnooze ? `
          <button class="button" data-snooze="${nudge.category}" data-option="15m">15 min</button>
          <button class="button" data-snooze="${nudge.category}" data-option="1h">1 hour</button>
          <button class="button" data-snooze="${nudge.category}" data-option="tomorrow">Tomorrow</button>
          <button class="button ghost" data-snooze="${nudge.category}" data-option="off">Turn off</button>
        ` : ''}
        <button class="button ghost" data-action="dismiss">Done</button>
      </div>
    </section>
  `;
}

function renderQueue() {
  if (!state.missedQueue.length) {
    return '';
  }

  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Missed while safe</h2>
        <button class="button ghost" data-action="clearQueue">Clear</button>
      </div>
      <div class="list">
        ${state.missedQueue.slice(0, 4).map((item) => `
          <div class="list-item">
            <div class="item-main">
              <p class="item-title">${escapeHtml(item.label || 'Reminder')}</p>
              <div class="item-meta">${escapeHtml(state.privateMode ? 'Private check-in' : item.message)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderReminders() {
  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Reminders</h2>
        <button class="button" data-view="add">Add</button>
      </div>
      <div class="list">
        ${state.reminders.length ? state.reminders.map((reminder) => `
          <div class="list-item">
            <div class="item-main">
              <p class="item-title">${escapeHtml(state.privateMode ? 'Private reminder' : reminder.title)}</p>
              <div class="item-meta">${escapeHtml(typeLabels[reminder.type] || 'Custom')} at ${escapeHtml(reminder.time)}</div>
            </div>
            <div class="button-row">
              <button class="toggle ${reminder.enabled ? 'is-on' : ''}" data-reminder-toggle="${reminder.id}" data-enabled="${reminder.enabled ? 'false' : 'true'}" title="Toggle reminder"></button>
              <button class="icon-button" data-reminder-delete="${reminder.id}" title="Delete">x</button>
            </div>
          </div>
        `).join('') : '<p class="empty-copy">No reminders yet.</p>'}
      </div>
    </section>
  `;
}

function renderDashboard() {
  return `
    ${renderTopbar()}
    <section class="content">
      <div class="stack">
        ${renderCurrentNudge()}
        <div class="quick-actions">
          <button class="button ${state.presentationSafeMode ? 'safe-on' : ''}" data-action="toggleSafe">
            Safe Mode
          </button>
          <button class="button" data-view="add">Add Reminder</button>
          <button class="button" data-view="settings">Settings</button>
        </div>
        ${renderQueue()}
        ${renderReminders()}
      </div>
    </section>
  `;
}

function renderAddReminder() {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String((now.getMinutes() + 5) % 60).padStart(2, '0')}`;

  return `
    ${renderTopbar()}
    <section class="content">
      <div class="stack">
        <div class="section-head">
          <h2 class="section-title">Add Reminder</h2>
          <button class="button ghost" data-view="dashboard">Back</button>
        </div>
        <form class="form card" data-form="reminder">
          <label class="field">
            <span>Title</span>
            <input class="input" name="title" maxlength="80" required />
          </label>
          <label class="field">
            <span>Time</span>
            <input class="input" name="time" type="time" value="${time}" required />
          </label>
          <label class="field">
            <span>Type</span>
            <select class="select" name="type">
              <option value="pills">Pills</option>
              <option value="birthday">Birthday</option>
              <option value="task">Task</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <button class="button primary" type="submit">Save Reminder</button>
        </form>
      </div>
    </section>
  `;
}

function renderSettings() {
  const selected = state.personality || 'cozy';
  return `
    ${renderTopbar()}
    <section class="content">
      <div class="stack">
        <div class="section-head">
          <h2 class="section-title">Settings</h2>
          <button class="button ghost" data-view="dashboard">Back</button>
        </div>
        <form class="form" data-form="settings">
          <div class="card form">
            <label class="field">
              <span>Name</span>
              <input class="input" name="companionName" maxlength="28" value="${escapeHtml(state.companionName || 'Pip')}" />
            </label>
            <div class="field">
              <label>Personality</label>
              ${renderPersonalityOptions(selected)}
              <input type="hidden" name="personality" value="${escapeHtml(selected)}" />
            </div>
          </div>

          <div class="card form">
            ${Object.entries(state.nudges).map(([key, config]) => `
              <div class="setting-row">
                <div>
                  <p class="item-title">${escapeHtml(state.nudgeLabels[key])}</p>
                  <div class="item-meta">Every <input class="input frequency" name="${key}-frequency" type="number" min="5" max="480" step="5" value="${config.frequencyMinutes}" /> min</div>
                </div>
                <button class="toggle ${config.enabled && config.snoozedUntil !== 'off' ? 'is-on' : ''}" data-nudge-toggle="${key}" type="button"></button>
              </div>
            `).join('')}
          </div>

          <div class="card form">
            <div class="setting-row">
              <div>
                <p class="item-title">Presentation Safe Mode</p>
                <div class="item-meta">Suppresses notifications and bubble popups.</div>
              </div>
              <button class="toggle ${state.presentationSafeMode ? 'is-on' : ''}" data-setting-toggle="presentationSafeMode" type="button"></button>
            </div>
            <div class="setting-row">
              <div>
                <p class="item-title">Private Mode</p>
                <div class="item-meta">Native notifications use generic text.</div>
              </div>
              <button class="toggle ${state.privateMode ? 'is-on' : ''}" data-setting-toggle="privateMode" type="button"></button>
            </div>
          </div>

          <button class="button primary" type="submit">Save Settings</button>
        </form>
      </div>
    </section>
  `;
}

function render() {
  if (!state) {
    return;
  }

  document.documentElement.style.cssText = accentStyle(state.personalityMeta.accent);

  if (!state.onboardingComplete) {
    app.innerHTML = renderOnboarding();
    return;
  }

  if (view === 'add') {
    app.innerHTML = renderAddReminder();
  } else if (view === 'settings') {
    app.innerHTML = renderSettings();
  } else {
    app.innerHTML = renderDashboard();
  }
}

async function refresh(nextState) {
  state = nextState || await window.pipAPI.getState();
  draftPersonality = state.personality;
  render();
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target || !state) {
    return;
  }

  if (target.dataset.action === 'close') {
    await window.pipAPI.closePanel();
    return;
  }

  if (target.dataset.view) {
    view = target.dataset.view;
    render();
    return;
  }

  if (target.dataset.personality) {
    const form = target.closest('form');
    const personality = target.dataset.personality;
    const hidden = form && form.querySelector('input[name="personality"]');
    draftPersonality = personality;
    if (hidden) {
      hidden.value = personality;
    }
    state.personality = personality;
    state.personalityMeta = state.personalityOptions.find((option) => option.id === personality) || state.personalityMeta;
    render();
    return;
  }

  if (target.dataset.action === 'toggleSafe') {
    await refresh(await window.pipAPI.updateSettings({ presentationSafeMode: !state.presentationSafeMode }));
    return;
  }

  if (target.dataset.action === 'dismiss') {
    await refresh(await window.pipAPI.dismissNudge());
    return;
  }

  if (target.dataset.action === 'clearQueue') {
    await refresh(await window.pipAPI.clearQueue());
    return;
  }

  if (target.dataset.snooze) {
    await refresh(await window.pipAPI.snoozeNudge({
      category: target.dataset.snooze,
      option: target.dataset.option
    }));
    return;
  }

  if (target.dataset.reminderDelete) {
    await refresh(await window.pipAPI.deleteReminder(target.dataset.reminderDelete));
    return;
  }

  if (target.dataset.reminderToggle) {
    await refresh(await window.pipAPI.toggleReminder({
      id: target.dataset.reminderToggle,
      enabled: target.dataset.enabled === 'true'
    }));
    return;
  }

  if (target.dataset.nudgeToggle) {
    const key = target.dataset.nudgeToggle;
    const next = structuredClone(state.nudges);
    next[key].enabled = !(next[key].enabled && next[key].snoozedUntil !== 'off');
    if (next[key].enabled) {
      next[key].snoozedUntil = null;
    }
    await refresh(await window.pipAPI.updateSettings({ nudges: next }));
    return;
  }

  if (target.dataset.settingToggle) {
    const key = target.dataset.settingToggle;
    await refresh(await window.pipAPI.updateSettings({ [key]: !state[key] }));
  }
});

app.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = formData(form);

  if (form.dataset.form === 'onboarding') {
    await refresh(await window.pipAPI.completeOnboarding({
      companionName: data.companionName,
      personality: data.personality || draftPersonality
    }));
    view = 'dashboard';
    return;
  }

  if (form.dataset.form === 'reminder') {
    await refresh(await window.pipAPI.addReminder(data));
    view = 'dashboard';
    render();
    return;
  }

  if (form.dataset.form === 'settings') {
    const nudges = structuredClone(state.nudges);
    for (const key of Object.keys(nudges)) {
      const value = Number(data[`${key}-frequency`]);
      nudges[key].frequencyMinutes = Number.isFinite(value) ? value : nudges[key].frequencyMinutes;
    }
    await refresh(await window.pipAPI.updateSettings({
      companionName: data.companionName,
      personality: data.personality || draftPersonality,
      nudges
    }));
    view = 'dashboard';
    render();
  }
});

window.pipAPI.onStateChanged((nextState) => {
  state = nextState;
  render();
});

refresh();
