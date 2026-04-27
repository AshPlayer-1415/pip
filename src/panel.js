const app = document.getElementById('app');

let state;
let view = 'dashboard';
let onboardingStep = 0;
let onboardingDraft;
let resetConfirming = false;

const typeLabels = {
  pills: 'Pills',
  birthday: 'Birthday',
  task: 'Task',
  custom: 'Custom'
};

const personalityNotes = {
  cozy: 'Warm and calm.',
  strict: 'Clear and direct.',
  space: 'Light mission energy.',
  guardian: 'Quiet and focused.',
  gremlin: 'Dry and playful.'
};

const bubbleSizeLabels = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large'
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

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultReminderTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatStorageDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function selectedPersonalityMeta(id) {
  return state.personalityOptions.find((option) => option.id === id) || state.personalityOptions[0] || state.personalityMeta;
}

function ensureOnboardingDraft() {
  if (onboardingDraft) {
    return;
  }

  onboardingDraft = {
    companionName: state.companionName || 'Pip',
    personality: state.personality || 'cozy',
    privateMode: Boolean(state.privateMode),
    nudges: cloneState(state.nudges)
  };
}

function updateOnboardingDraftFromForm() {
  const form = app.querySelector('[data-onboarding-form]');
  if (!form || !onboardingDraft) {
    return;
  }

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  if (data.companionName !== undefined) {
    onboardingDraft.companionName = String(data.companionName).trim().slice(0, 28) || 'Pip';
  }

  for (const key of Object.keys(onboardingDraft.nudges)) {
    const value = Number(data[`${key}-frequency`]);
    if (Number.isFinite(value)) {
      onboardingDraft.nudges[key].frequencyMinutes = Math.min(480, Math.max(5, value));
    }
  }
}

function renderAvatar(className, meta, size = '', customUrl = null) {
  if (customUrl) {
    return `<div class="${className} ${size} has-image" style="background-image: url('${escapeHtml(customUrl)}')"></div>`;
  }

  return `<div class="${className} personality-${escapeHtml(meta.id || 'cozy')} ${size}">${escapeHtml(meta.mark)}</div>`;
}

function currentAvatarUrl() {
  return state.onboardingComplete && state.appearance && state.appearance.avatarMode === 'custom'
    ? state.appearance.customAvatarUrl
    : null;
}

function renderTopbar() {
  const meta = !state.onboardingComplete && onboardingDraft
    ? selectedPersonalityMeta(onboardingDraft.personality || 'cozy')
    : state.personalityMeta;
  const companionName = !state.onboardingComplete && onboardingDraft
    ? onboardingDraft.companionName
    : state.companionName;
  return `
    <header class="topbar" style="${accentStyle(meta.accent)}">
      <div class="brand">
        ${renderAvatar('avatar', meta, '', currentAvatarUrl())}
        <div class="brand-copy">
          <div class="eyebrow">${escapeHtml(meta.label)}</div>
          <h1 class="title">${escapeHtml(companionName || 'Pip')}</h1>
        </div>
      </div>
      <div class="top-actions">
        ${state.onboardingComplete ? '<button class="icon-button" data-view="settings" title="Settings">...</button>' : ''}
        <button class="icon-button" data-action="close" title="Close">x</button>
      </div>
    </header>
  `;
}

function renderNotice() {
  if (!state.notice) {
    return '';
  }

  return `
    <section class="notice notice-${escapeHtml(state.notice.tone || 'info')}">
      <span>${escapeHtml(state.notice.message)}</span>
      <button class="icon-button notice-close" data-action="clearNotice" title="Dismiss">x</button>
    </section>
  `;
}

function renderPersonalityOptions(selected) {
  return `
    <div class="personality-grid">
      ${state.personalityOptions.map((option) => `
        <button
          class="personality-option personality-${escapeHtml(option.id)} ${selected === option.id ? 'is-selected' : ''}"
          style="${accentStyle(option.accent)}"
          data-personality="${option.id}"
          type="button"
        >
          <span class="option-top">
            ${renderAvatar('mini-mark', option)}
            <span class="option-label">${escapeHtml(option.label)}</span>
          </span>
          <span class="option-note">${escapeHtml(personalityNotes[option.id] || '')}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderOnboardingNav(primaryLabel, showBack = true) {
  return `
    <div class="button-row onboarding-nav">
      ${showBack ? '<button class="button ghost" data-action="onboardingBack" type="button">Back</button>' : ''}
      <button class="button primary" data-action="${primaryLabel === 'Start Pip' ? 'finishOnboarding' : 'onboardingNext'}" type="button">${primaryLabel}</button>
    </div>
  `;
}

function renderOnboardingPreferences() {
  return `
    <div class="card form">
      ${Object.entries(onboardingDraft.nudges).map(([key, config]) => `
        <div class="setting-row">
          <div>
            <p class="item-title">${escapeHtml(state.nudgeLabels[key])}</p>
            <div class="item-meta">Every <input class="input frequency" name="${key}-frequency" type="number" min="5" max="480" step="5" value="${config.frequencyMinutes}" /> min</div>
          </div>
          <button class="toggle ${config.enabled ? 'is-on' : ''}" data-onboard-nudge-toggle="${key}" type="button"></button>
        </div>
      `).join('')}
    </div>
    <div class="card form">
      <div class="setting-row">
        <div>
          <p class="item-title">Private Mode</p>
          <div class="item-meta">Notifications hide reminder text.</div>
        </div>
        <button class="toggle ${onboardingDraft.privateMode ? 'is-on' : ''}" data-action="toggleOnboardingPrivate" type="button"></button>
      </div>
      <p class="empty-copy">Presentation Safe Mode silences popups while you share your screen.</p>
    </div>
  `;
}

function renderOnboarding() {
  ensureOnboardingDraft();
  const selectedMeta = selectedPersonalityMeta(onboardingDraft.personality);
  state.personalityMeta = selectedMeta;
  document.documentElement.style.cssText = accentStyle(selectedMeta.accent);

  const steps = [
    `
      <div class="onboarding-card">
        ${renderAvatar('avatar hero-avatar', selectedMeta)}
        <div>
          <h1>Meet Pip</h1>
          <p>Small reminders. Quiet presence.</p>
        </div>
        ${renderOnboardingNav('Get started', false)}
      </div>
    `,
    `
      <form class="form onboarding-card" data-onboarding-form>
        <div>
          <h1>Name your companion</h1>
          <p>Change it anytime.</p>
        </div>
        <label class="field">
          <span>Name</span>
          <input class="input" name="companionName" maxlength="28" value="${escapeHtml(onboardingDraft.companionName)}" autofocus />
        </label>
        ${renderOnboardingNav('Continue')}
      </form>
    `,
    `
      <div class="form onboarding-card" data-onboarding-form>
        <div>
          <h1>Choose a personality</h1>
          <p>Pick a tone.</p>
        </div>
        ${renderPersonalityOptions(onboardingDraft.personality)}
        ${renderOnboardingNav('Continue')}
      </div>
    `,
    `
      <form class="form onboarding-card" data-onboarding-form>
        <div>
          <h1>Set your rhythm</h1>
          <p>Start gentle.</p>
        </div>
        ${renderOnboardingPreferences()}
        ${renderOnboardingNav('Start Pip')}
      </form>
    `
  ];

  return `
    ${renderTopbar()}
    <section class="content">
      <div class="onboarding">
        <div class="step-dots" aria-hidden="true">
          ${steps.map((_step, index) => `<span class="${index === onboardingStep ? 'is-active' : ''}"></span>`).join('')}
        </div>
        ${renderNotice()}
        ${steps[onboardingStep]}
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
        <p class="empty-copy">All clear.</p>
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
          <button class="button ghost" data-snooze="${nudge.category}" data-option="off">Until turned on</button>
        ` : ''}
        <button class="button ghost" data-action="dismiss">Done</button>
      </div>
    </section>
  `;
}

function renderTodayDashboard() {
  const today = state.today || {};
  const nextReminder = today.nextReminder;
  const mode = today.mode || { label: 'Normal', detail: 'Gentle nudges are active.', tone: 'normal' };

  return `
    <section class="today-panel">
      <div class="section-head">
        <h2 class="section-title">Today</h2>
        <span class="mode-pill mode-${escapeHtml(mode.tone)}">${escapeHtml(mode.label)}</span>
      </div>
      <div class="today-grid">
        <div class="today-stat">
          <span class="stat-label">Mode</span>
          <strong>${escapeHtml(mode.label)}</strong>
          <span>${escapeHtml(mode.detail)}</span>
        </div>
        <div class="today-stat">
          <span class="stat-label">Next</span>
          <strong>${nextReminder ? escapeHtml(nextReminder.displayTime) : 'None'}</strong>
          <span>${nextReminder ? escapeHtml(state.privateMode ? 'Private reminder' : nextReminder.title) : 'Nothing scheduled.'}</span>
        </div>
        <div class="today-stat">
          <span class="stat-label">Missed</span>
          <strong>${Number(today.missedCount || 0)}</strong>
          <span>Held quietly.</span>
        </div>
      </div>
      <div class="quick-actions quick-actions-four">
        <button class="button" data-trigger-nudge="water">Water</button>
        <button class="button" data-trigger-nudge="eyeBreak">Eye Break</button>
        <button class="button" data-trigger-nudge="stretch">Stretch</button>
        <button class="button" data-trigger-nudge="motivation">Motivate Me</button>
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
        <h2 class="section-title">Queued while safe</h2>
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
        `).join('') : '<p class="empty-copy">No reminders.</p>'}
      </div>
    </section>
  `;
}

function renderStorageList(kind, items) {
  if (!items.length) {
    return '<p class="empty-copy">Empty.</p>';
  }

  return `
    <div class="list">
      ${items.map((item) => `
        <div class="list-item storage-item">
          <div class="item-main">
            <p class="item-title">${escapeHtml(item.filename)}</p>
            <div class="item-meta">${kind === 'temp' ? `Until ${escapeHtml(formatStorageDate(item.expiresAt))}` : `Saved ${escapeHtml(formatStorageDate(item.addedAt))}`}</div>
          </div>
          <div class="button-row storage-actions">
            <button class="button" data-storage-open="${escapeHtml(item.id)}" data-kind="${kind}" type="button">Open</button>
            <button class="button" data-storage-reveal="${escapeHtml(item.id)}" data-kind="${kind}" type="button">Show</button>
            ${kind === 'temp' ? `<button class="button" data-storage-move="${escapeHtml(item.id)}" type="button">Move</button>` : ''}
            <button class="button ghost" data-storage-delete="${escapeHtml(item.id)}" data-kind="${kind}" type="button">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderQuickStorage() {
  const quickStorage = state.quickStorage || { temp: [], permanent: [] };

  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Quick Storage</h2>
        <span class="item-meta">Drop files on Pip</span>
      </div>
      <div class="storage-grid">
        <div class="card storage-card">
          <div class="section-head">
            <h3 class="card-title">Temp</h3>
            <span class="item-meta">24h</span>
          </div>
          ${renderStorageList('temp', quickStorage.temp || [])}
        </div>
        <div class="card storage-card">
          <div class="section-head">
            <h3 class="card-title">Permanent</h3>
          </div>
          ${renderStorageList('permanent', quickStorage.permanent || [])}
        </div>
      </div>
    </section>
  `;
}

function renderAvatarSettings() {
  const appearance = state.appearance || {};
  const isCustom = appearance.avatarMode === 'custom' && appearance.customAvatarUrl;
  const meta = state.personalityMeta;

  return `
    <div class="card form">
      <div class="section-head">
        <div>
          <h3 class="card-title">Pip Bubble</h3>
          <p class="empty-copy">Size and avatar.</p>
        </div>
        ${renderAvatar('avatar', meta, '', isCustom ? appearance.customAvatarUrl : null)}
      </div>
      <div class="field">
        <label>Size</label>
        <div class="segmented">
          ${Object.entries(bubbleSizeLabels).map(([value, label]) => `
            <button class="segment ${appearance.bubbleSize === value ? 'is-selected' : ''}" data-bubble-size="${value}" type="button">${label}</button>
          `).join('')}
        </div>
      </div>
      <div class="field">
        <label>Avatar</label>
        <div class="button-row">
          <button class="button ${appearance.avatarMode !== 'custom' ? 'safe-on' : ''}" data-action="useEmojiAvatar" type="button">Emoji</button>
          <button class="button ${appearance.avatarMode === 'custom' ? 'safe-on' : ''}" data-action="chooseCustomAvatar" type="button">Custom Image</button>
        </div>
      </div>
    </div>
  `;
}

function renderDashboard() {
  return `
    ${renderTopbar()}
    <section class="content">
      <div class="stack">
        ${renderNotice()}
        ${renderTodayDashboard()}
        ${renderCurrentNudge()}
        <div class="quick-actions">
          <button class="button ${state.presentationSafeMode ? 'safe-on' : ''}" data-action="toggleSafe">
            Safe Mode
          </button>
          <button class="button ${state.privateMode ? 'safe-on' : ''}" data-action="togglePrivate">
            Private
          </button>
          <button class="button" data-view="add">Add Reminder</button>
          <button class="button" data-view="settings">Settings</button>
        </div>
        ${renderQuickStorage()}
        ${renderQueue()}
        ${renderReminders()}
      </div>
    </section>
  `;
}

function renderAddReminder() {
  const time = defaultReminderTime();

  return `
    ${renderTopbar()}
    <section class="content">
      <div class="stack">
        ${renderNotice()}
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
        ${renderNotice()}
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

          ${renderAvatarSettings()}

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
                <div class="item-meta">Silences notifications and bubble popups.</div>
              </div>
              <button class="toggle ${state.presentationSafeMode ? 'is-on' : ''}" data-setting-toggle="presentationSafeMode" type="button"></button>
            </div>
            <div class="setting-row">
              <div>
                <p class="item-title">Private Mode</p>
                <div class="item-meta">Notifications show generic text only.</div>
              </div>
              <button class="toggle ${state.privateMode ? 'is-on' : ''}" data-setting-toggle="privateMode" type="button"></button>
            </div>
          </div>

          <section class="card form">
            <div>
              <h3 class="card-title">About Pip</h3>
              <p class="empty-copy">${escapeHtml(state.appInfo.name)} ${escapeHtml(state.appInfo.version)}</p>
              <p class="empty-copy">${escapeHtml(state.appInfo.description)}</p>
              <p class="empty-copy">${escapeHtml(state.appInfo.privacy)}</p>
            </div>
          </section>

          <section class="card form danger-zone">
            <div>
              <h3 class="card-title">Reset Pip</h3>
              <p class="empty-copy">Clears local settings and reminders, then returns to onboarding.</p>
            </div>
            ${resetConfirming ? `
              <div class="button-row">
                <button class="button danger" data-action="confirmReset" type="button">Reset Pip</button>
                <button class="button ghost" data-action="cancelReset" type="button">Cancel</button>
              </div>
            ` : '<button class="button danger" data-action="beginReset" type="button">Reset Pip</button>'}
          </section>

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
  if (!onboardingDraft) {
    ensureOnboardingDraft();
  }
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

  if (target.dataset.action === 'clearNotice') {
    await refresh(await window.pipAPI.clearNotice());
    return;
  }

  if (target.dataset.action === 'onboardingNext') {
    ensureOnboardingDraft();
    updateOnboardingDraftFromForm();
    onboardingDraft.personality = onboardingDraft.personality || 'cozy';
    onboardingStep = Math.min(3, onboardingStep + 1);
    render();
    return;
  }

  if (target.dataset.action === 'onboardingBack') {
    ensureOnboardingDraft();
    updateOnboardingDraftFromForm();
    onboardingStep = Math.max(0, onboardingStep - 1);
    render();
    return;
  }

  if (target.dataset.action === 'finishOnboarding') {
    ensureOnboardingDraft();
    updateOnboardingDraftFromForm();
    onboardingDraft.personality = onboardingDraft.personality || 'cozy';
    await refresh(await window.pipAPI.completeOnboarding(onboardingDraft));
    view = 'dashboard';
    return;
  }

  if (target.dataset.view) {
    view = target.dataset.view;
    render();
    return;
  }

  if (target.dataset.personality) {
    ensureOnboardingDraft();
    const form = target.closest('[data-onboarding-form], form');
    const personality = target.dataset.personality;
    const hidden = form && form.querySelector('input[name="personality"]');
    if (onboardingDraft && !state.onboardingComplete) {
      onboardingDraft.personality = personality;
    }
    if (hidden) {
      hidden.value = personality;
    }
    state.personality = personality;
    state.personalityMeta = selectedPersonalityMeta(personality);
    if (window.pipAPI.previewOnboarding && onboardingDraft && !state.onboardingComplete) {
      await refresh(await window.pipAPI.previewOnboarding({
        companionName: onboardingDraft.companionName,
        personality: onboardingDraft.personality || 'cozy'
      }));
    }
    render();
    return;
  }

  if (target.dataset.action === 'toggleSafe') {
    await refresh(await window.pipAPI.updateSettings({ presentationSafeMode: !state.presentationSafeMode }));
    return;
  }

  if (target.dataset.action === 'beginReset') {
    resetConfirming = true;
    render();
    return;
  }

  if (target.dataset.action === 'cancelReset') {
    resetConfirming = false;
    render();
    return;
  }

  if (target.dataset.action === 'confirmReset') {
    resetConfirming = false;
    onboardingDraft = null;
    onboardingStep = 0;
    view = 'dashboard';
    await refresh(await window.pipAPI.resetPip());
    return;
  }

  if (target.dataset.action === 'togglePrivate') {
    await refresh(await window.pipAPI.updateSettings({ privateMode: !state.privateMode }));
    return;
  }

  if (target.dataset.bubbleSize) {
    await refresh(await window.pipAPI.updateSettings({
      appearance: { bubbleSize: target.dataset.bubbleSize }
    }));
    return;
  }

  if (target.dataset.action === 'useEmojiAvatar') {
    await refresh(await window.pipAPI.updateSettings({
      appearance: { avatarMode: 'emoji' }
    }));
    return;
  }

  if (target.dataset.action === 'chooseCustomAvatar') {
    await refresh(await window.pipAPI.chooseCustomAvatar());
    return;
  }

  if (target.dataset.action === 'toggleOnboardingPrivate') {
    onboardingDraft.privateMode = !onboardingDraft.privateMode;
    render();
    return;
  }

  if (target.dataset.onboardNudgeToggle) {
    updateOnboardingDraftFromForm();
    const key = target.dataset.onboardNudgeToggle;
    onboardingDraft.nudges[key].enabled = !onboardingDraft.nudges[key].enabled;
    render();
    return;
  }

  if (target.dataset.triggerNudge) {
    await refresh(await window.pipAPI.triggerNudge(target.dataset.triggerNudge));
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

  if (target.dataset.storageOpen) {
    await refresh(await window.pipAPI.openStorageFile({
      kind: target.dataset.kind,
      id: target.dataset.storageOpen
    }));
    return;
  }

  if (target.dataset.storageReveal) {
    await refresh(await window.pipAPI.revealStorageFile({
      kind: target.dataset.kind,
      id: target.dataset.storageReveal
    }));
    return;
  }

  if (target.dataset.storageDelete) {
    await refresh(await window.pipAPI.deleteStorageFile({
      kind: target.dataset.kind,
      id: target.dataset.storageDelete
    }));
    return;
  }

  if (target.dataset.storageMove) {
    await refresh(await window.pipAPI.moveStoragePermanent(target.dataset.storageMove));
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
    const next = cloneState(state.nudges);
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

  if (Object.prototype.hasOwnProperty.call(form.dataset, 'onboardingForm')) {
    ensureOnboardingDraft();
    updateOnboardingDraftFromForm();
    onboardingDraft.personality = onboardingDraft.personality || 'cozy';
    if (onboardingStep < 3) {
      onboardingStep += 1;
      render();
    } else {
      await refresh(await window.pipAPI.completeOnboarding(onboardingDraft));
      view = 'dashboard';
    }
    return;
  }

  if (form.dataset.form === 'reminder') {
    const result = await window.pipAPI.addReminder(data);
    await refresh(result.state || result);
    if (result.ok !== false) {
      view = 'dashboard';
      render();
    }
    return;
  }

  if (form.dataset.form === 'settings') {
    const nudges = cloneState(state.nudges);
    for (const key of Object.keys(nudges)) {
      const value = Number(data[`${key}-frequency`]);
      nudges[key].frequencyMinutes = Number.isFinite(value) ? value : nudges[key].frequencyMinutes;
    }
    await refresh(await window.pipAPI.updateSettings({
      companionName: data.companionName,
      personality: data.personality || state.personality,
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
