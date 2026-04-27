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

const quickActionFallbacks = {
  assistant: 'Winsy Assistant',
  screenshot: 'Screenshot',
  notes: 'Open Notes',
  lock: 'Lock Screen',
  downloads: 'Open Downloads',
  applications: 'Open Applications',
  focus: 'Focus Instructions'
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

function parseTimeParts(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  const hours = match ? Math.min(23, Math.max(0, Number(match[1]))) : 9;
  const minutes = match ? Math.min(59, Math.max(0, Number(match[2]))) : 0;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return {
    hour: hour12,
    minute: minutes,
    period
  };
}

function timePartsToValue({ hour, minute, period }) {
  const normalizedHour = Math.min(12, Math.max(1, Number(hour) || 12));
  const normalizedMinute = Math.min(59, Math.max(0, Number(minute) || 0));
  let hours = normalizedHour % 12;
  if (period === 'PM') {
    hours += 12;
  }

  return `${String(hours).padStart(2, '0')}:${String(normalizedMinute).padStart(2, '0')}`;
}

function displayReminderTime(value) {
  const parts = parseTimeParts(value);
  return `${parts.hour}:${String(parts.minute).padStart(2, '0')} ${parts.period}`;
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
    companionName: state.companionName || 'Winsy',
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
    onboardingDraft.companionName = String(data.companionName).trim().slice(0, 28) || 'Winsy';
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
          <h1 class="title">${escapeHtml(companionName || 'Winsy')}</h1>
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
      <button class="button primary" data-action="${primaryLabel === 'Start Winsy' ? 'finishOnboarding' : 'onboardingNext'}" type="button">${primaryLabel}</button>
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
          <h1>Meet Winsy</h1>
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
        ${renderOnboardingNav('Start Winsy')}
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
              <div class="item-meta">${escapeHtml(typeLabels[reminder.type] || 'Custom')} at ${escapeHtml(displayReminderTime(reminder.time))}</div>
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

function renderTimePicker(time) {
  const parts = parseTimeParts(time);
  const value = timePartsToValue(parts);
  return `
    <div
      class="time-picker"
      data-time-picker
      data-hour="${parts.hour}"
      data-minute="${parts.minute}"
      data-period="${parts.period}"
    >
      <input type="hidden" name="time" value="${escapeHtml(value)}" required />
      <div class="time-wheel" data-time-wheel="hour" tabindex="0" aria-label="Hour">
        <button class="time-step" data-time-step="hour" data-direction="-1" type="button" aria-label="Previous hour">^</button>
        <button class="time-value" data-time-value="hour" data-time-step="hour" data-direction="1" type="button">${parts.hour}</button>
        <button class="time-step" data-time-step="hour" data-direction="1" type="button" aria-label="Next hour">v</button>
      </div>
      <div class="time-separator">:</div>
      <div class="time-wheel" data-time-wheel="minute" tabindex="0" aria-label="Minute">
        <button class="time-step" data-time-step="minute" data-direction="-1" type="button" aria-label="Previous minute">^</button>
        <button class="time-value" data-time-value="minute" data-time-step="minute" data-direction="1" type="button">${String(parts.minute).padStart(2, '0')}</button>
        <button class="time-step" data-time-step="minute" data-direction="1" type="button" aria-label="Next minute">v</button>
      </div>
      <div class="period-toggle" aria-label="AM or PM">
        <button class="period-option ${parts.period === 'AM' ? 'is-selected' : ''}" data-time-period="AM" type="button">AM</button>
        <button class="period-option ${parts.period === 'PM' ? 'is-selected' : ''}" data-time-period="PM" type="button">PM</button>
      </div>
    </div>
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
        <span class="item-meta">Drop files on Winsy</span>
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
          <h3 class="card-title">Winsy Bubble</h3>
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

function renderQuickMenuSettings() {
  const quickMenu = state.quickMenu || { actionCount: 6, actions: ['assistant', 'screenshot', 'notes', 'lock'] };
  const actionOptions = state.quickActionOptions || [];
  const slotCount = Math.max(1, Number(quickMenu.actionCount || 6) - 2);
  const actions = [...(quickMenu.actions || [])];
  while (actions.length < 4) {
    actions.push(Object.keys(quickActionFallbacks)[actions.length] || 'assistant');
  }

  return `
    <div class="card form">
      <div class="section-head">
        <div>
          <h3 class="card-title">Quick Menu</h3>
          <p class="empty-copy">Assistive shortcuts.</p>
        </div>
      </div>
      <div class="field">
        <label>Actions</label>
        <div class="segmented">
          ${[3, 4, 5, 6].map((count) => `
            <button class="segment ${Number(quickMenu.actionCount) === count ? 'is-selected' : ''}" data-quick-count="${count}" type="button">${count}</button>
          `).join('')}
        </div>
      </div>
      <div class="quick-menu-fixed">
        <span>Winsy Home</span>
        <span>Storage</span>
      </div>
      ${Array.from({ length: slotCount }).map((_item, index) => `
        <label class="field">
          <span>Slot ${index + 3}</span>
          <select class="select" data-quick-slot="${index}">
            ${actionOptions.map((option) => `
              <option value="${escapeHtml(option.id)}" ${actions[index] === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>
            `).join('')}
          </select>
        </label>
      `).join('')}
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

function renderStoragePanel() {
  return `
    ${renderTopbar()}
    <section class="content">
      <div class="stack">
        ${renderNotice()}
        <div class="section-head">
          <h2 class="section-title">Storage</h2>
          <button class="button ghost" data-view="dashboard">Back</button>
        </div>
        ${renderQuickStorage()}
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
          <div class="field">
            <span>Time</span>
            ${renderTimePicker(time)}
          </div>
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
              <input class="input" name="companionName" maxlength="28" value="${escapeHtml(state.companionName || 'Winsy')}" />
            </label>
            <div class="field">
              <label>Personality</label>
              ${renderPersonalityOptions(selected)}
              <input type="hidden" name="personality" value="${escapeHtml(selected)}" />
            </div>
          </div>

          ${renderAvatarSettings()}

          ${renderQuickMenuSettings()}

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
              <h3 class="card-title">About Winsy AI</h3>
              <p class="empty-copy">${escapeHtml(state.appInfo.name)} ${escapeHtml(state.appInfo.version)}</p>
              <p class="empty-copy">${escapeHtml(state.appInfo.description)}</p>
              <p class="empty-copy">${escapeHtml(state.appInfo.privacy)}</p>
            </div>
          </section>

          <section class="card form danger-zone">
            <div>
              <h3 class="card-title">Reset Winsy AI</h3>
              <p class="empty-copy">Clears local settings and reminders, then returns to onboarding.</p>
            </div>
            ${resetConfirming ? `
              <div class="button-row">
                <button class="button danger" data-action="confirmReset" type="button">Reset Winsy AI</button>
                <button class="button ghost" data-action="cancelReset" type="button">Cancel</button>
              </div>
            ` : '<button class="button danger" data-action="beginReset" type="button">Reset Winsy AI</button>'}
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
  } else if (view === 'storage') {
    app.innerHTML = renderStoragePanel();
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

function readTimePickerParts(picker) {
  return {
    hour: Number(picker.dataset.hour) || 12,
    minute: Number(picker.dataset.minute) || 0,
    period: picker.dataset.period === 'PM' ? 'PM' : 'AM'
  };
}

function updateTimePicker(picker, nextParts) {
  const parts = {
    ...readTimePickerParts(picker),
    ...nextParts
  };

  parts.hour = ((Number(parts.hour) - 1 + 12) % 12) + 1;
  parts.minute = ((Number(parts.minute) % 60) + 60) % 60;
  parts.period = parts.period === 'PM' ? 'PM' : 'AM';

  picker.dataset.hour = String(parts.hour);
  picker.dataset.minute = String(parts.minute);
  picker.dataset.period = parts.period;

  const hourValue = picker.querySelector('[data-time-value="hour"]');
  const minuteValue = picker.querySelector('[data-time-value="minute"]');
  const input = picker.querySelector('input[name="time"]');
  if (hourValue) {
    hourValue.textContent = String(parts.hour);
  }
  if (minuteValue) {
    minuteValue.textContent = String(parts.minute).padStart(2, '0');
  }
  if (input) {
    input.value = timePartsToValue(parts);
  }

  for (const button of picker.querySelectorAll('[data-time-period]')) {
    button.classList.toggle('is-selected', button.dataset.timePeriod === parts.period);
  }
}

function stepTimePicker(picker, part, direction) {
  const parts = readTimePickerParts(picker);
  if (part === 'hour') {
    parts.hour += direction;
  } else if (part === 'minute') {
    parts.minute += direction;
  }
  updateTimePicker(picker, parts);
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

  if (target.dataset.timeStep) {
    const picker = target.closest('[data-time-picker]');
    if (picker) {
      stepTimePicker(picker, target.dataset.timeStep, Number(target.dataset.direction) || 1);
    }
    return;
  }

  if (target.dataset.timePeriod) {
    const picker = target.closest('[data-time-picker]');
    if (picker) {
      updateTimePicker(picker, { period: target.dataset.timePeriod });
    }
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

  if (target.dataset.quickCount) {
    await refresh(await window.pipAPI.updateSettings({
      quickMenu: {
        actionCount: Number(target.dataset.quickCount),
        actions: state.quickMenu.actions
      }
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

app.addEventListener('wheel', (event) => {
  const wheel = event.target.closest('[data-time-wheel]');
  if (!wheel) {
    return;
  }

  const picker = wheel.closest('[data-time-picker]');
  if (!picker) {
    return;
  }

  event.preventDefault();
  stepTimePicker(picker, wheel.dataset.timeWheel, event.deltaY > 0 ? 1 : -1);
}, { passive: false });

app.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-quick-slot]');
  if (!select || !state) {
    return;
  }

  const actions = [...(state.quickMenu.actions || [])];
  const index = Number(select.dataset.quickSlot);
  if (!Number.isInteger(index)) {
    return;
  }

  actions[index] = select.value;
  await refresh(await window.pipAPI.updateSettings({
    quickMenu: {
      actionCount: state.quickMenu.actionCount,
      actions
    }
  }));
});

app.addEventListener('keydown', (event) => {
  const wheel = event.target.closest('[data-time-wheel]');
  if (!wheel) {
    return;
  }

  const picker = wheel.closest('[data-time-picker]');
  if (!picker) {
    return;
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    stepTimePicker(picker, wheel.dataset.timeWheel, event.key === 'ArrowDown' ? 1 : -1);
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

if (window.pipAPI.onPanelAnchorChanged) {
  window.pipAPI.onPanelAnchorChanged((side) => {
    document.body.classList.toggle('anchor-left', side === 'left');
    document.body.classList.toggle('anchor-right', side !== 'left');
  });
}

if (window.pipAPI.onPanelView) {
  window.pipAPI.onPanelView((nextView) => {
    if (nextView) {
      view = nextView;
      render();
    }
  });
}

refresh();
