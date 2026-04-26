const path = require('path');
const { randomUUID } = require('crypto');
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  Tray,
  screen
} = require('electron');
const { createStore } = require('./storage');
const { messageBank, nudgeLabels, pickMessage } = require('./messages');

const NUDGE_KEYS = ['water', 'eyeBreak', 'stretch', 'motivation'];
const BUBBLE_SIZE = { collapsed: [86, 86], expanded: [300, 118] };
const PANEL_SIZE = { width: 420, height: 640 };
const CHECK_INTERVAL_MS = 30 * 1000;

const defaultState = {
  onboardingComplete: false,
  companionName: 'Pip',
  personality: 'cozy',
  privateMode: false,
  presentationSafeMode: false,
  missedQueue: [],
  currentNudge: null,
  nudges: {
    water: { enabled: true, frequencyMinutes: 60, lastFiredAt: null, snoozedUntil: null },
    eyeBreak: { enabled: true, frequencyMinutes: 20, lastFiredAt: null, snoozedUntil: null },
    stretch: { enabled: true, frequencyMinutes: 90, lastFiredAt: null, snoozedUntil: null },
    motivation: { enabled: true, frequencyMinutes: 120, lastFiredAt: null, snoozedUntil: null }
  },
  reminders: []
};

let store;
let state;
let tray;
let bubbleWindow;
let panelWindow;
let scheduler;
let bubbleExpanded = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(defaultValue, storedValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(storedValue) ? storedValue : clone(defaultValue);
  }

  if (defaultValue && typeof defaultValue === 'object') {
    const result = clone(defaultValue);
    if (storedValue && typeof storedValue === 'object') {
      for (const [key, value] of Object.entries(storedValue)) {
        result[key] = deepMerge(defaultValue[key], value);
      }
    }
    return result;
  }

  return storedValue === undefined ? defaultValue : storedValue;
}

function saveState() {
  store.write(state);
  broadcastState();
  buildTrayMenu();
}

function publicState() {
  const personality = messageBank[state.personality] || messageBank.cozy;
  return {
    ...clone(state),
    personalityMeta: {
      label: personality.label,
      accent: personality.accent,
      mark: personality.mark
    },
    personalityOptions: Object.entries(messageBank).map(([id, meta]) => ({
      id,
      label: meta.label,
      accent: meta.accent,
      mark: meta.mark
    })),
    nudgeLabels
  };
}

function broadcastState() {
  const snapshot = publicState();
  for (const win of [bubbleWindow, panelWindow]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('state:changed', snapshot);
    }
  }
}

function createTrayImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="13" fill="black"/>
      <circle cx="13" cy="15" r="2" fill="white"/>
      <circle cx="23" cy="15" r="2" fill="white"/>
      <path d="M13 22c2.6 2.2 7.4 2.2 10 0" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  image.setTemplateImage(true);
  return image;
}

function buildTrayMenu() {
  if (!tray) {
    return;
  }

  tray.setToolTip(`${state.companionName || 'Pip'} is running locally`);
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: panelWindow && panelWindow.isVisible() ? 'Hide Control Panel' : 'Open Control Panel',
      click: togglePanel
    },
    {
      label: 'Presentation Safe Mode',
      type: 'checkbox',
      checked: Boolean(state.presentationSafeMode),
      click: (item) => setPresentationSafeMode(item.checked)
    },
    { type: 'separator' },
    {
      label: 'Quit Pip',
      click: () => app.quit()
    }
  ]));
}

function positionBubble() {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) {
    return;
  }

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;
  const [windowWidth, windowHeight] = bubbleExpanded ? BUBBLE_SIZE.expanded : BUBBLE_SIZE.collapsed;
  bubbleWindow.setBounds({
    width: windowWidth,
    height: windowHeight,
    x: Math.round(x + width - windowWidth - 24),
    y: Math.round(y + height - windowHeight - 24)
  });
}

function positionPanel() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    return;
  }

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;
  const panelHeight = Math.min(PANEL_SIZE.height, height - 48);
  panelWindow.setBounds({
    width: PANEL_SIZE.width,
    height: panelHeight,
    x: Math.round(x + width - PANEL_SIZE.width - 24),
    y: Math.round(y + height - panelHeight - 126)
  });
}

function createBubbleWindow() {
  bubbleWindow = new BrowserWindow({
    width: BUBBLE_SIZE.collapsed[0],
    height: BUBBLE_SIZE.collapsed[1],
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  bubbleWindow.loadFile(path.join(__dirname, 'bubble.html'));
  bubbleWindow.once('ready-to-show', () => {
    positionBubble();
    bubbleWindow.showInactive();
  });
}

function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width: PANEL_SIZE.width,
    height: PANEL_SIZE.height,
    minWidth: 360,
    minHeight: 520,
    frame: false,
    transparent: true,
    resizable: true,
    show: false,
    skipTaskbar: true,
    title: 'Pip',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.loadFile(path.join(__dirname, 'panel.html'));
  panelWindow.on('blur', () => {
    if (panelWindow && panelWindow.isVisible()) {
      panelWindow.hide();
      buildTrayMenu();
    }
  });
}

function showPanel() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    createPanelWindow();
  }

  positionPanel();
  panelWindow.show();
  panelWindow.focus();
  broadcastState();
  buildTrayMenu();
}

function togglePanel() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    createPanelWindow();
  }

  if (panelWindow.isVisible()) {
    panelWindow.hide();
  } else {
    showPanel();
  }
  buildTrayMenu();
}

function resizeBubble(expanded) {
  bubbleExpanded = Boolean(expanded);
  positionBubble();
}

function isSnoozed(config, now = Date.now()) {
  if (!config.snoozedUntil) {
    return false;
  }

  if (config.snoozedUntil === 'off') {
    return true;
  }

  return new Date(config.snoozedUntil).getTime() > now;
}

function markNudgeFired(category) {
  state.nudges[category].lastFiredAt = new Date().toISOString();
}

function enqueueMissed(item) {
  state.missedQueue.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    ...item
  });
  state.missedQueue = state.missedQueue.slice(0, 30);
}

function sendNativeNotification({ title, body, genericBody = 'You have a private reminder.', onClick }) {
  if (!Notification.isSupported()) {
    return;
  }

  const notification = new Notification({
    title: state.privateMode ? `${state.companionName || 'Pip'} reminder` : title,
    body: state.privateMode ? genericBody : body,
    silent: false
  });

  notification.on('click', () => {
    if (onClick) {
      onClick();
    } else {
      showPanel();
    }
  });

  notification.show();
}

function showNudge(category) {
  const message = pickMessage(state.personality, category);
  const item = {
    id: randomUUID(),
    kind: 'nudge',
    category,
    label: nudgeLabels[category],
    message,
    createdAt: new Date().toISOString()
  };

  if (state.presentationSafeMode) {
    enqueueMissed(item);
    markNudgeFired(category);
    saveState();
    return;
  }

  state.currentNudge = item;
  markNudgeFired(category);
  saveState();

  sendNativeNotification({
    title: `${state.companionName || 'Pip'} check-in`,
    body: message,
    genericBody: 'A gentle check-in is ready.',
    onClick: showPanel
  });
}

function showReminder(reminder) {
  const item = {
    id: randomUUID(),
    kind: 'reminder',
    reminderId: reminder.id,
    category: reminder.type,
    label: 'Reminder',
    message: reminder.title,
    createdAt: new Date().toISOString()
  };

  if (state.presentationSafeMode) {
    enqueueMissed(item);
    return;
  }

  state.currentNudge = item;
  sendNativeNotification({
    title: state.privateMode ? `${state.companionName || 'Pip'} reminder` : `${state.companionName || 'Pip'} reminder`,
    body: reminder.title,
    genericBody: 'A private reminder is ready.',
    onClick: showPanel
  });
}

function checkNudges() {
  const now = Date.now();

  for (const category of NUDGE_KEYS) {
    const config = state.nudges[category];
    if (!config.enabled || isSnoozed(config, now)) {
      continue;
    }

    const last = config.lastFiredAt ? new Date(config.lastFiredAt).getTime() : 0;
    const frequencyMs = Math.max(5, Number(config.frequencyMinutes) || 30) * 60 * 1000;

    if (!last || now - last >= frequencyMs) {
      showNudge(category);
      break;
    }
  }
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function checkReminders() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = todayKey(now);
  let changed = false;

  for (const reminder of state.reminders) {
    if (!reminder.enabled || reminder.time !== currentTime || reminder.lastDeliveredDate === today) {
      continue;
    }

    reminder.lastDeliveredDate = today;
    changed = true;
    showReminder(reminder);
  }

  if (changed) {
    saveState();
  }
}

function runScheduler() {
  checkReminders();
  checkNudges();
}

function scheduleChecks() {
  clearInterval(scheduler);
  scheduler = setInterval(runScheduler, CHECK_INTERVAL_MS);
  setTimeout(runScheduler, 2000);
}

function setPresentationSafeMode(enabled) {
  state.presentationSafeMode = Boolean(enabled);
  saveState();

  if (enabled) {
    resizeBubble(false);
  }
}

function snoozeCategory(category, option) {
  const config = state.nudges[category];
  if (!config) {
    return;
  }

  const now = new Date();
  if (option === '15m') {
    config.snoozedUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  } else if (option === '1h') {
    config.snoozedUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  } else if (option === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    config.snoozedUntil = tomorrow.toISOString();
  } else if (option === 'off') {
    config.snoozedUntil = 'off';
  }

  if (state.currentNudge && state.currentNudge.category === category) {
    state.currentNudge = null;
  }

  saveState();
}

function sanitizeReminder(input) {
  const title = String(input.title || '').trim().slice(0, 80);
  const type = ['pills', 'birthday', 'task', 'custom'].includes(input.type) ? input.type : 'custom';
  const time = /^\d{2}:\d{2}$/.test(input.time || '') ? input.time : null;

  if (!title || !time) {
    return null;
  }

  return {
    id: randomUUID(),
    title,
    time,
    type,
    enabled: true,
    createdAt: new Date().toISOString(),
    lastDeliveredDate: null
  };
}

function registerIpc() {
  ipcMain.handle('app:getState', () => publicState());
  ipcMain.handle('app:togglePanel', () => togglePanel());
  ipcMain.handle('app:showPanel', () => showPanel());
  ipcMain.handle('app:closePanel', () => panelWindow && panelWindow.hide());
  ipcMain.handle('bubble:setExpanded', (_event, expanded) => resizeBubble(expanded));

  ipcMain.handle('settings:completeOnboarding', (_event, payload) => {
    const personality = messageBank[payload.personality] ? payload.personality : 'cozy';
    state.companionName = String(payload.companionName || 'Pip').trim().slice(0, 28) || 'Pip';
    state.personality = personality;
    state.onboardingComplete = true;
    saveState();
    return publicState();
  });

  ipcMain.handle('settings:update', (_event, patch) => {
    if (typeof patch.companionName === 'string') {
      state.companionName = patch.companionName.trim().slice(0, 28) || 'Pip';
    }
    if (messageBank[patch.personality]) {
      state.personality = patch.personality;
    }
    if (typeof patch.privateMode === 'boolean') {
      state.privateMode = patch.privateMode;
    }
    if (typeof patch.presentationSafeMode === 'boolean') {
      state.presentationSafeMode = patch.presentationSafeMode;
    }

    if (patch.nudges && typeof patch.nudges === 'object') {
      for (const key of NUDGE_KEYS) {
        if (!patch.nudges[key]) {
          continue;
        }
        if (typeof patch.nudges[key].enabled === 'boolean') {
          state.nudges[key].enabled = patch.nudges[key].enabled;
          if (patch.nudges[key].enabled && state.nudges[key].snoozedUntil === 'off') {
            state.nudges[key].snoozedUntil = null;
          }
        }
        if (patch.nudges[key].frequencyMinutes !== undefined) {
          state.nudges[key].frequencyMinutes = Math.min(480, Math.max(5, Number(patch.nudges[key].frequencyMinutes) || 30));
        }
      }
    }

    saveState();
    return publicState();
  });

  ipcMain.handle('nudge:snooze', (_event, payload) => {
    snoozeCategory(payload.category, payload.option);
    return publicState();
  });

  ipcMain.handle('nudge:dismiss', () => {
    state.currentNudge = null;
    saveState();
    return publicState();
  });

  ipcMain.handle('queue:clear', () => {
    state.missedQueue = [];
    saveState();
    return publicState();
  });

  ipcMain.handle('reminders:add', (_event, payload) => {
    const reminder = sanitizeReminder(payload);
    if (reminder) {
      state.reminders.unshift(reminder);
      saveState();
    }
    return publicState();
  });

  ipcMain.handle('reminders:delete', (_event, id) => {
    state.reminders = state.reminders.filter((reminder) => reminder.id !== id);
    saveState();
    return publicState();
  });

  ipcMain.handle('reminders:toggle', (_event, { id, enabled }) => {
    const reminder = state.reminders.find((item) => item.id === id);
    if (reminder) {
      reminder.enabled = Boolean(enabled);
      saveState();
    }
    return publicState();
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  store = createStore(app);
  state = deepMerge(defaultState, store.read(defaultState));

  tray = new Tray(createTrayImage());
  tray.on('click', togglePanel);
  buildTrayMenu();

  registerIpc();
  createBubbleWindow();
  createPanelWindow();
  screen.on('display-metrics-changed', () => {
    positionBubble();
    positionPanel();
  });

  scheduleChecks();

  if (!state.onboardingComplete) {
    setTimeout(showPanel, 600);
  }
});

app.on('window-all-closed', () => {
  // Pip is a menu bar companion, so closing windows should not quit the app.
});

app.on('before-quit', () => {
  clearInterval(scheduler);
});
