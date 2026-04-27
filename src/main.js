const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');
const { randomUUID } = require('crypto');
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  shell,
  Tray,
  screen
} = require('electron');
const { createStore } = require('./storage');
const { messageBank, nudgeLabels, pickMessage } = require('./messages');
const packageJson = require('../package.json');

const APP_NAME = 'Winsy AI';
const OLD_APP_NAME = 'Pip';
const DEFAULT_COMPANION_NAME = 'Winsy';
const NUDGE_KEYS = ['water', 'eyeBreak', 'stretch', 'motivation'];
const BUBBLE_SIZES = {
  small: 58,
  medium: 72,
  large: 90
};
const PANEL_SIZE = { width: 420, height: 640 };
const PANEL_GAP = 14;
const SHELF_SIZE = { width: 214, height: 108 };
const SHELF_COLLAPSED_SIZE = { width: 58, height: 58 };
const SHELF_GAP = 8;
const QUICK_MENU_SIZE = { width: 318, height: 254 };
const ASSISTANT_SIZE = { width: 318, height: 206 };
const CHECK_INTERVAL_MS = 30 * 1000;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.heic']);
const QUICK_ACTION_OPTIONS = {
  assistant: { id: 'assistant', label: 'Winsy Assistant', icon: '✦' },
  screenshot: { id: 'screenshot', label: 'Screenshot', icon: '⌘' },
  notes: { id: 'notes', label: 'Open Notes', icon: '✎' },
  lock: { id: 'lock', label: 'Lock Screen', icon: '🔒' },
  downloads: { id: 'downloads', label: 'Open Downloads', icon: '↓' },
  applications: { id: 'applications', label: 'Open Applications', icon: '▦' },
  focus: { id: 'focus', label: 'Focus Instructions', icon: '☾' }
};
const DEFAULT_QUICK_MENU = {
  actionCount: 6,
  actions: ['assistant', 'screenshot', 'notes', 'lock']
};

const defaultState = {
  onboardingComplete: false,
  companionName: DEFAULT_COMPANION_NAME,
  personality: 'cozy',
  privateMode: false,
  presentationSafeMode: false,
  appearance: {
    bubbleSize: 'medium',
    bubblePosition: null,
    avatarMode: 'emoji',
    customAvatarPath: null,
    storageShelfCollapsed: false
  },
  quickMenu: {
    actionCount: DEFAULT_QUICK_MENU.actionCount,
    actions: [...DEFAULT_QUICK_MENU.actions]
  },
  quickStorage: {
    temp: [],
    permanent: []
  },
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
let storagePromptWindow;
let shelfWindow;
let quickMenuWindow;
let assistantWindow;
let scheduler;
let lastReminderCheckAt;
let appNotice = null;
let storagePrompt = null;
let panelAnchorSide = 'right';
let storagePromptAnchorSide = 'right';
let shelfAnchorSide = 'right';
let quickMenuAnchorSide = 'right';
let assistantAnchorSide = 'right';
let requestedPanelView = 'dashboard';

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

function setNotice(message, tone = 'info') {
  appNotice = {
    id: randomUUID(),
    message,
    tone,
    createdAt: new Date().toISOString()
  };
}

function clearNotice() {
  appNotice = null;
}

function appDataDirectory(name) {
  return path.join(app.getPath('appData'), name);
}

function configureUserDataPath() {
  const newUserData = appDataDirectory(APP_NAME);
  const oldUserData = appDataDirectory(OLD_APP_NAME);

  try {
    if (!fs.existsSync(newUserData) && fs.existsSync(oldUserData)) {
      fs.cpSync(oldUserData, newUserData, { recursive: true });
    }
  } catch (error) {
    console.error('Unable to migrate old local app data:', error);
  }

  app.setPath('userData', newUserData);
}

function saveState() {
  if (!store.write(state)) {
    setNotice(store.getLastError() || `${APP_NAME} could not save changes locally.`, 'error');
  }
  broadcastState();
  updateShelfVisibility();
  buildTrayMenu();
}

function bubbleDimension(size = state.appearance.bubbleSize) {
  return BUBBLE_SIZES[size] || BUBBLE_SIZES.medium;
}

function displayForPoint(x, y) {
  return screen.getDisplayNearestPoint({
    x: Math.round(Number(x) || 0),
    y: Math.round(Number(y) || 0)
  });
}

function bubbleCenterPoint() {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    const bounds = bubbleWindow.getBounds();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }

  return screen.getCursorScreenPoint();
}

function clampBubblePosition(position, size = state.appearance.bubbleSize) {
  const dimension = bubbleDimension(size);
  const fallbackDisplay = screen.getDisplayNearestPoint(bubbleCenterPoint());
  const fallback = {
    x: fallbackDisplay.workArea.x + fallbackDisplay.workArea.width - dimension - 24,
    y: fallbackDisplay.workArea.y + fallbackDisplay.workArea.height - dimension - 24
  };

  const point = position && Number.isFinite(Number(position.x)) && Number.isFinite(Number(position.y))
    ? { x: Number(position.x), y: Number(position.y) }
    : fallback;

  const display = displayForPoint(point.x + dimension / 2, point.y + dimension / 2);
  const { x, y, width, height } = display.workArea;
  return {
    x: Math.round(Math.min(Math.max(point.x, x), x + width - dimension)),
    y: Math.round(Math.min(Math.max(point.y, y), y + height - dimension))
  };
}

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function parseReminderTime(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ''));
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

function scheduledDateForToday(time, now = new Date()) {
  const parsed = parseReminderTime(time);
  if (!parsed) {
    return null;
  }

  const scheduled = new Date(now);
  scheduled.setHours(parsed.hours, parsed.minutes, 0, 0);
  return scheduled;
}

function scheduledDateForReminder(reminder, now = new Date()) {
  const scheduled = scheduledDateForToday(reminder.time, now);
  if (!scheduled) {
    return null;
  }

  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
}

function displayTime(date) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getNextReminder() {
  const now = new Date();
  const upcoming = state.reminders
    .filter((reminder) => reminder.enabled)
    .map((reminder) => ({
      reminder,
      scheduledAt: scheduledDateForReminder(reminder, now)
    }))
    .filter((item) => item.scheduledAt)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)[0];

  if (!upcoming) {
    return null;
  }

  return {
    id: upcoming.reminder.id,
    title: upcoming.reminder.title,
    type: upcoming.reminder.type,
    time: upcoming.reminder.time,
    displayTime: displayTime(upcoming.scheduledAt),
    dateKey: localDateKey(upcoming.scheduledAt)
  };
}

function getSnoozedCount(now = Date.now()) {
  return NUDGE_KEYS.filter((key) => {
    const config = state.nudges[key];
    return config.enabled && config.snoozedUntil && (config.snoozedUntil === 'off' || new Date(config.snoozedUntil).getTime() > now);
  }).length;
}

function getModeSummary() {
  const snoozedCount = getSnoozedCount();

  if (state.presentationSafeMode) {
    return { label: 'Presentation Safe', detail: 'Notifications are quiet.', tone: 'safe' };
  }

  if (state.privateMode) {
    return { label: 'Private', detail: 'Notifications hide reminder text.', tone: 'private' };
  }

  if (snoozedCount > 0) {
    return { label: 'Snoozed', detail: `${snoozedCount} nudge${snoozedCount === 1 ? '' : 's'} paused.`, tone: 'snoozed' };
  }

  return { label: 'Normal', detail: 'Gentle nudges are active.', tone: 'normal' };
}

function quickMenuItems() {
  const customActions = state.quickMenu.actions
    .filter((id) => QUICK_ACTION_OPTIONS[id])
    .slice(0, Math.max(1, state.quickMenu.actionCount - 2))
    .map((id) => QUICK_ACTION_OPTIONS[id]);

  return [
    { id: 'home', label: 'Winsy Home', icon: '⌂' },
    { id: 'storage', label: 'Storage', icon: '◫' },
    ...customActions
  ].slice(0, state.quickMenu.actionCount);
}

function normalizeState(nextState) {
  const normalized = deepMerge(defaultState, nextState || {});

  normalized.companionName = String(normalized.companionName || DEFAULT_COMPANION_NAME).trim().slice(0, 28) || DEFAULT_COMPANION_NAME;
  if (normalized.companionName === OLD_APP_NAME && !(nextState && nextState.onboardingComplete)) {
    normalized.companionName = DEFAULT_COMPANION_NAME;
  }
  if (!messageBank[normalized.personality]) {
    normalized.personality = 'cozy';
  }
  if (!BUBBLE_SIZES[normalized.appearance.bubbleSize]) {
    normalized.appearance.bubbleSize = 'medium';
  }
  normalized.appearance.avatarMode = normalized.appearance.avatarMode === 'custom' ? 'custom' : 'emoji';
  if (normalized.appearance.customAvatarPath && !fs.existsSync(normalized.appearance.customAvatarPath)) {
    normalized.appearance.customAvatarPath = null;
    normalized.appearance.avatarMode = 'emoji';
  }
  normalized.appearance.storageShelfCollapsed = Boolean(normalized.appearance.storageShelfCollapsed);
  normalized.appearance.bubblePosition = normalized.appearance.bubblePosition
    ? clampBubblePosition(normalized.appearance.bubblePosition, normalized.appearance.bubbleSize)
    : null;
  normalized.quickMenu.actionCount = [3, 4, 5, 6].includes(Number(normalized.quickMenu.actionCount))
    ? Number(normalized.quickMenu.actionCount)
    : DEFAULT_QUICK_MENU.actionCount;
  normalized.quickMenu.actions = Array.isArray(normalized.quickMenu.actions)
    ? normalized.quickMenu.actions.filter((id) => QUICK_ACTION_OPTIONS[id]).slice(0, 4)
    : [...DEFAULT_QUICK_MENU.actions];
  for (const id of DEFAULT_QUICK_MENU.actions) {
    if (normalized.quickMenu.actions.length >= 4) {
      break;
    }
    if (!normalized.quickMenu.actions.includes(id)) {
      normalized.quickMenu.actions.push(id);
    }
  }
  normalized.quickStorage.temp = Array.isArray(normalized.quickStorage.temp)
    ? normalized.quickStorage.temp.filter((item) => item && item.storedPath && fs.existsSync(item.storedPath))
    : [];
  normalized.quickStorage.permanent = Array.isArray(normalized.quickStorage.permanent)
    ? normalized.quickStorage.permanent.filter((item) => item && item.storedPath && fs.existsSync(item.storedPath))
    : [];

  for (const key of NUDGE_KEYS) {
    const config = normalized.nudges[key];
    config.enabled = Boolean(config.enabled);
    config.frequencyMinutes = Math.min(480, Math.max(5, Number(config.frequencyMinutes) || defaultState.nudges[key].frequencyMinutes));

    if (config.snoozedUntil && config.snoozedUntil !== 'off') {
      const snoozedUntil = new Date(config.snoozedUntil).getTime();
      if (!Number.isFinite(snoozedUntil)) {
        config.snoozedUntil = null;
      }
    }

    if (config.lastFiredAt && !Number.isFinite(new Date(config.lastFiredAt).getTime())) {
      config.lastFiredAt = null;
    }
  }

  normalized.reminders = normalized.reminders
    .filter((reminder) => reminder && String(reminder.title || '').trim() && parseReminderTime(reminder.time))
    .map((reminder) => ({
      id: reminder.id || randomUUID(),
      title: String(reminder.title).trim().slice(0, 80),
      time: reminder.time,
      type: ['pills', 'birthday', 'task', 'custom'].includes(reminder.type) ? reminder.type : 'custom',
      enabled: reminder.enabled !== false,
      createdAt: reminder.createdAt || new Date().toISOString(),
      lastDeliveredDate: reminder.lastDeliveredDate || null
    }));

  normalized.missedQueue = Array.isArray(normalized.missedQueue) ? normalized.missedQueue.slice(0, 30) : [];
  normalized.currentNudge = null;
  return normalized;
}

function publicState() {
  const personality = messageBank[state.personality] || messageBank.cozy;
  const customAvatarUrl = state.appearance.avatarMode === 'custom' && state.appearance.customAvatarPath
    ? pathToFileURL(state.appearance.customAvatarPath).toString()
    : null;
  return {
    ...clone(state),
    appearance: {
      ...clone(state.appearance),
      customAvatarUrl,
      bubbleSizes: Object.keys(BUBBLE_SIZES)
    },
    personalityMeta: {
      label: personality.label,
      accent: personality.accent,
      mark: personality.mark,
      id: state.personality
    },
    personalityOptions: Object.entries(messageBank).map(([id, meta]) => ({
      id,
      label: meta.label,
      accent: meta.accent,
      mark: meta.mark
    })),
    nudgeLabels,
    appInfo: {
      name: APP_NAME,
      version: packageJson.version,
      description: 'A local-first macOS assistant companion for reminders, storage, and quick actions.',
      privacy: 'Local-first. No account. No cloud sync.'
    },
    notice: appNotice,
    quickStorageShelf: getQuickStorageShelfItems(),
    quickMenuItems: quickMenuItems(),
    quickActionOptions: Object.values(QUICK_ACTION_OPTIONS),
    today: {
      mode: getModeSummary(),
      nextReminder: getNextReminder(),
      missedCount: state.missedQueue.length,
      snoozedCount: getSnoozedCount()
    }
  };
}

function broadcastState() {
  const snapshot = publicState();
  for (const win of [bubbleWindow, panelWindow, shelfWindow, quickMenuWindow]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('state:changed', snapshot);
    }
  }
}

function sendShelfAnchor() {
  if (shelfWindow && !shelfWindow.isDestroyed()) {
    shelfWindow.webContents.send('shelf:anchor', shelfAnchorSide);
  }
}

function sendQuickMenuAnchor() {
  if (quickMenuWindow && !quickMenuWindow.isDestroyed()) {
    quickMenuWindow.webContents.send('quick-menu:anchor', quickMenuAnchorSide);
  }
}

function sendAssistantAnchor() {
  if (assistantWindow && !assistantWindow.isDestroyed()) {
    assistantWindow.webContents.send('assistant:anchor', assistantAnchorSide);
  }
}

function sendPanelAnchor() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.webContents.send('panel:anchor', panelAnchorSide);
  }
}

function broadcastStoragePrompt() {
  if (storagePromptWindow && !storagePromptWindow.isDestroyed()) {
    storagePromptWindow.webContents.send('storage-prompt:changed', {
      prompt: storagePrompt,
      anchorSide: storagePromptAnchorSide
    });
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

  tray.setToolTip(`${state.companionName || DEFAULT_COMPANION_NAME} is running locally`);
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: quickMenuWindow && quickMenuWindow.isVisible() ? `Hide ${DEFAULT_COMPANION_NAME} Menu` : `Open ${DEFAULT_COMPANION_NAME} Menu`,
      click: toggleQuickMenu
    },
    {
      label: 'Presentation Safe Mode',
      type: 'checkbox',
      checked: Boolean(state.presentationSafeMode),
      click: (item) => setPresentationSafeMode(item.checked)
    },
    { type: 'separator' },
    {
      label: `Quit ${APP_NAME}`,
      click: () => app.quit()
    }
  ]));
}

function buildApplicationMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: APP_NAME,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide', label: `Hide ${APP_NAME}` },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: `Quit ${APP_NAME}` }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    }
  ]));
}

function positionBubble() {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) {
    return;
  }

  const dimension = bubbleDimension();
  const position = clampBubblePosition(state.appearance.bubblePosition, state.appearance.bubbleSize);
  state.appearance.bubblePosition = position;
  bubbleWindow.setBounds({
    width: dimension,
    height: dimension,
    x: position.x,
    y: position.y
  });
  positionShelf();
  positionQuickMenu();
  positionAssistant();
  positionStoragePrompt();
  if (panelWindow && !panelWindow.isDestroyed() && panelWindow.isVisible()) {
    positionPanel();
  }
}

function anchoredWindowBounds({ width, height, preferLeft = true }) {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const workArea = display.workArea;
    return {
      bounds: {
        width,
        height,
        x: Math.round(workArea.x + workArea.width - width - 24),
        y: Math.round(workArea.y + workArea.height - height - 24)
      },
      side: 'right'
    };
  }

  const bubbleBounds = bubbleWindow.getBounds();
  const bubbleCenterX = bubbleBounds.x + bubbleBounds.width / 2;
  const bubbleCenterY = bubbleBounds.y + bubbleBounds.height / 2;
  const display = displayForPoint(bubbleCenterX, bubbleCenterY);
  const workArea = display.workArea;
  const availableLeft = bubbleBounds.x - workArea.x;
  const availableRight = workArea.x + workArea.width - (bubbleBounds.x + bubbleBounds.width);
  const side = preferLeft && availableLeft >= width + PANEL_GAP
    ? 'right'
    : (!preferLeft && availableRight >= width + PANEL_GAP
      ? 'left'
      : (availableLeft >= availableRight ? 'right' : 'left'));
  const rawX = side === 'right'
    ? bubbleBounds.x - width - PANEL_GAP
    : bubbleBounds.x + bubbleBounds.width + PANEL_GAP;
  const rawY = bubbleCenterY - height / 2;

  return {
    bounds: {
      width,
      height,
      x: Math.round(Math.min(Math.max(rawX, workArea.x), workArea.x + workArea.width - width)),
      y: Math.round(Math.min(Math.max(rawY, workArea.y), workArea.y + workArea.height - height))
    },
    side
  };
}

function positionPanel() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    return;
  }

  const display = bubbleWindow && !bubbleWindow.isDestroyed()
    ? displayForPoint(
      bubbleWindow.getBounds().x + bubbleWindow.getBounds().width / 2,
      bubbleWindow.getBounds().y + bubbleWindow.getBounds().height / 2
    )
    : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const panelHeight = Math.min(PANEL_SIZE.height, display.workArea.height - 48);
  const result = anchoredWindowBounds({
    width: PANEL_SIZE.width,
    height: panelHeight,
    preferLeft: true
  });
  panelAnchorSide = result.side;
  panelWindow.setBounds(result.bounds);
  sendPanelAnchor();
}

function createBubbleWindow() {
  const dimension = bubbleDimension();
  bubbleWindow = new BrowserWindow({
    width: dimension,
    height: dimension,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  bubbleWindow.setAlwaysOnTop(true, 'floating');
  bubbleWindow.loadFile(path.join(__dirname, 'bubble.html'));
  bubbleWindow.once('ready-to-show', () => {
    positionBubble();
    bubbleWindow.showInactive();
  });
}

function getQuickStorageShelfItems() {
  const tempItems = state.quickStorage.temp
    .filter((item) => item.storedPath && fs.existsSync(item.storedPath))
    .sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
    .map((item) => ({ ...item, kind: 'temp' }));
  const permanentItems = state.quickStorage.permanent
    .filter((item) => item.storedPath && fs.existsSync(item.storedPath))
    .sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
    .map((item) => ({ ...item, kind: 'permanent' }));

  return [...tempItems, ...permanentItems].slice(0, 4).map((item) => {
    const extension = path.extname(item.filename || item.storedPath).toLowerCase();
    const isImage = IMAGE_EXTENSIONS.has(extension);
    return {
      id: item.id,
      kind: item.kind,
      filename: item.filename,
      isImage,
      previewUrl: isImage ? pathToFileURL(item.storedPath).toString() : null,
      addedAt: item.addedAt,
      expiresAt: item.expiresAt
    };
  });
}

function findQuickStorageItem(kind, id) {
  if (kind !== 'temp' && kind !== 'permanent') {
    return null;
  }

  return state.quickStorage[kind].find((entry) => entry.id === id) || null;
}

function positionShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed() || !bubbleWindow || bubbleWindow.isDestroyed()) {
    return;
  }

  const items = getQuickStorageShelfItems();
  if (!items.length) {
    shelfWindow.hide();
    return;
  }

  const shelfSize = state.appearance.storageShelfCollapsed ? SHELF_COLLAPSED_SIZE : SHELF_SIZE;
  const bubbleBounds = bubbleWindow.getBounds();
  const bubbleCenterX = bubbleBounds.x + bubbleBounds.width / 2;
  const bubbleCenterY = bubbleBounds.y + bubbleBounds.height / 2;
  const workArea = displayForPoint(bubbleCenterX, bubbleCenterY).workArea;
  const availableLeft = bubbleBounds.x - workArea.x;
  const availableRight = workArea.x + workArea.width - (bubbleBounds.x + bubbleBounds.width);
  const side = availableLeft >= shelfSize.width + SHELF_GAP || availableLeft >= availableRight ? 'right' : 'left';
  const rawX = side === 'right'
    ? bubbleBounds.x - shelfSize.width - SHELF_GAP
    : bubbleBounds.x + bubbleBounds.width + SHELF_GAP;
  const rawY = bubbleCenterY - shelfSize.height / 2;

  shelfAnchorSide = side;
  shelfWindow.setBounds({
    width: shelfSize.width,
    height: shelfSize.height,
    x: Math.round(Math.min(Math.max(rawX, workArea.x), workArea.x + workArea.width - shelfSize.width)),
    y: Math.round(Math.min(Math.max(rawY, workArea.y), workArea.y + workArea.height - shelfSize.height))
  });
  sendShelfAnchor();
}

function updateShelfVisibility() {
  if (!shelfWindow || shelfWindow.isDestroyed()) {
    return;
  }

  positionShelf();
  if (getQuickStorageShelfItems().length) {
    shelfWindow.showInactive();
  } else {
    shelfWindow.hide();
  }
}

function createShelfWindow() {
  shelfWindow = new BrowserWindow({
    width: SHELF_SIZE.width,
    height: SHELF_SIZE.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  shelfWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  shelfWindow.setAlwaysOnTop(true, 'floating');
  shelfWindow.loadFile(path.join(__dirname, 'storage-shelf.html'));
  shelfWindow.webContents.on('did-finish-load', () => {
    sendShelfAnchor();
    broadcastState();
    updateShelfVisibility();
  });
}

function positionQuickMenu() {
  if (!quickMenuWindow || quickMenuWindow.isDestroyed()) {
    return;
  }

  const result = anchoredWindowBounds({
    width: QUICK_MENU_SIZE.width,
    height: QUICK_MENU_SIZE.height,
    preferLeft: true
  });
  quickMenuAnchorSide = result.side;
  quickMenuWindow.setBounds(result.bounds);
  sendQuickMenuAnchor();
}

function createQuickMenuWindow() {
  quickMenuWindow = new BrowserWindow({
    width: QUICK_MENU_SIZE.width,
    height: QUICK_MENU_SIZE.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  quickMenuWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  quickMenuWindow.setAlwaysOnTop(true, 'floating');
  quickMenuWindow.loadFile(path.join(__dirname, 'quick-menu.html'));
  quickMenuWindow.webContents.on('did-finish-load', () => {
    sendQuickMenuAnchor();
    broadcastState();
  });
  quickMenuWindow.on('blur', () => {
    if (quickMenuWindow && quickMenuWindow.isVisible()) {
      quickMenuWindow.hide();
      buildTrayMenu();
    }
  });
}

function showQuickMenu() {
  if (!state.onboardingComplete) {
    showPanel('dashboard');
    return;
  }

  if (!quickMenuWindow || quickMenuWindow.isDestroyed()) {
    createQuickMenuWindow();
  }

  closeStoragePrompt();
  hideAssistant();
  positionQuickMenu();
  quickMenuWindow.show();
  app.focus({ steal: true });
  quickMenuWindow.focus();
  broadcastState();
  buildTrayMenu();
}

function toggleQuickMenu() {
  if (!state.onboardingComplete) {
    showPanel('dashboard');
    return;
  }

  if (!quickMenuWindow || quickMenuWindow.isDestroyed()) {
    createQuickMenuWindow();
  }

  if (quickMenuWindow.isVisible()) {
    quickMenuWindow.hide();
    buildTrayMenu();
  } else {
    showQuickMenu();
  }
}

function hideAssistant() {
  if (assistantWindow && !assistantWindow.isDestroyed()) {
    assistantWindow.hide();
  }
}

function positionAssistant() {
  if (!assistantWindow || assistantWindow.isDestroyed()) {
    return;
  }

  const result = anchoredWindowBounds({
    width: ASSISTANT_SIZE.width,
    height: ASSISTANT_SIZE.height,
    preferLeft: true
  });
  assistantAnchorSide = result.side;
  assistantWindow.setBounds(result.bounds);
  sendAssistantAnchor();
}

function createAssistantWindow() {
  assistantWindow = new BrowserWindow({
    width: ASSISTANT_SIZE.width,
    height: ASSISTANT_SIZE.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  assistantWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  assistantWindow.setAlwaysOnTop(true, 'floating');
  assistantWindow.loadFile(path.join(__dirname, 'assistant.html'));
  assistantWindow.webContents.on('did-finish-load', () => {
    sendAssistantAnchor();
  });
  assistantWindow.on('blur', () => {
    hideAssistant();
  });
}

function showAssistant() {
  if (!assistantWindow || assistantWindow.isDestroyed()) {
    createAssistantWindow();
  }

  positionAssistant();
  assistantWindow.show();
  app.focus({ steal: true });
  assistantWindow.focus();
}

function positionStoragePrompt() {
  if (!storagePromptWindow || storagePromptWindow.isDestroyed() || !bubbleWindow || bubbleWindow.isDestroyed()) {
    return;
  }

  const promptWidth = 286;
  const promptHeight = 190;
  const result = anchoredWindowBounds({
    width: promptWidth,
    height: promptHeight,
    preferLeft: true
  });
  storagePromptAnchorSide = result.side;
  storagePromptWindow.setBounds(result.bounds);
  broadcastStoragePrompt();
}

function closeStoragePrompt() {
  storagePrompt = null;
  if (storagePromptWindow && !storagePromptWindow.isDestroyed()) {
    storagePromptWindow.hide();
    broadcastStoragePrompt();
  }
}

function createStoragePromptWindow() {
  storagePromptWindow = new BrowserWindow({
    width: 286,
    height: 190,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  storagePromptWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  storagePromptWindow.setAlwaysOnTop(true, 'floating');
  storagePromptWindow.loadFile(path.join(__dirname, 'storage-prompt.html'));
  storagePromptWindow.webContents.on('did-finish-load', () => {
    broadcastStoragePrompt();
  });
  storagePromptWindow.on('blur', () => {
    if (storagePrompt && storagePrompt.kind === 'drop') {
      closeStoragePrompt();
    }
  });
}

function showStoragePrompt(prompt) {
  if (storagePrompt && storagePrompt.id === prompt.id) {
    positionStoragePrompt();
    if (storagePromptWindow && !storagePromptWindow.isDestroyed()) {
      storagePromptWindow.showInactive();
    }
    return;
  }

  storagePrompt = prompt;
  if (!storagePromptWindow || storagePromptWindow.isDestroyed()) {
    createStoragePromptWindow();
  }

  positionStoragePrompt();
  storagePromptWindow.showInactive();
  broadcastStoragePrompt();
}

function hidePanel() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.hide();
    buildTrayMenu();
  }
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
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  panelWindow.setAlwaysOnTop(true, 'floating');
  panelWindow.loadFile(path.join(__dirname, 'panel.html'));
  panelWindow.webContents.on('did-finish-load', () => {
    sendPanelAnchor();
    panelWindow.webContents.send('panel:view', requestedPanelView);
    broadcastState();
  });
  panelWindow.on('blur', () => {
    if (panelWindow && panelWindow.isVisible()) {
      hidePanel();
    }
  });
}

function showPanel(view = 'dashboard') {
  requestedPanelView = view || 'dashboard';
  if (!panelWindow || panelWindow.isDestroyed()) {
    createPanelWindow();
  }

  if (quickMenuWindow && !quickMenuWindow.isDestroyed()) {
    quickMenuWindow.hide();
  }
  hideAssistant();
  positionPanel();
  panelWindow.show();
  app.focus({ steal: true });
  panelWindow.focus();
  panelWindow.webContents.send('panel:view', requestedPanelView);
  broadcastState();
  buildTrayMenu();
}

function togglePanel() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    createPanelWindow();
  }

  if (panelWindow.isVisible()) {
    hidePanel();
  } else {
    showPanel();
  }
  buildTrayMenu();
}

function resizeBubble(expanded) {
  if (expanded) {
    return;
  }
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

function consumeExpiredSnooze(config, now = Date.now()) {
  if (!config.snoozedUntil || config.snoozedUntil === 'off') {
    return false;
  }

  const snoozedUntil = new Date(config.snoozedUntil).getTime();
  if (!Number.isFinite(snoozedUntil)) {
    config.snoozedUntil = null;
    return false;
  }

  if (snoozedUntil <= now) {
    config.snoozedUntil = null;
    return true;
  }

  return false;
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
    setNotice('Notifications are unavailable on this Mac right now.', 'warning');
    broadcastState();
    return;
  }

  let notification;
  try {
    notification = new Notification({
      title: state.privateMode ? `${DEFAULT_COMPANION_NAME} reminder` : title,
      body: state.privateMode ? genericBody : body,
      silent: false
    });
  } catch (error) {
    console.error('Unable to create notification:', error);
    setNotice(`${APP_NAME} could not create a notification.`, 'warning');
    broadcastState();
    return;
  }

  notification.on('click', () => {
    if (onClick) {
      onClick();
    } else {
      showPanel();
    }
  });

  try {
    notification.show();
  } catch (error) {
    console.error('Unable to show notification:', error);
    setNotice(`${APP_NAME} could not show a notification. Check macOS notification settings.`, 'warning');
    broadcastState();
  }
}

function showNudge(category, options = {}) {
  const message = pickMessage(state.personality, category);
  const item = {
    id: randomUUID(),
    kind: 'nudge',
    category,
    label: nudgeLabels[category],
    message,
    source: options.source || 'scheduled',
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
    title: `${state.companionName || DEFAULT_COMPANION_NAME} check-in`,
    body: message,
    genericBody: 'A gentle check-in is ready.',
    onClick: showPanel
  });
}

function triggerManualNudge(category) {
  if (!NUDGE_KEYS.includes(category)) {
    return;
  }

  showNudge(category, { source: 'manual' });
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
    title: state.privateMode ? `${state.companionName || DEFAULT_COMPANION_NAME} reminder` : `${state.companionName || DEFAULT_COMPANION_NAME} reminder`,
    body: reminder.title,
    genericBody: 'A private reminder is ready.',
    onClick: showPanel
  });
}

function checkNudges() {
  const now = Date.now();

  for (const category of NUDGE_KEYS) {
    const config = state.nudges[category];
    const snoozeExpired = consumeExpiredSnooze(config, now);
    if (!config.enabled || isSnoozed(config, now)) {
      continue;
    }

    const last = config.lastFiredAt ? new Date(config.lastFiredAt).getTime() : 0;
    const frequencyMs = Math.max(5, Number(config.frequencyMinutes) || 30) * 60 * 1000;

    if (snoozeExpired || !last || now - last >= frequencyMs) {
      showNudge(category);
      break;
    }
  }
}

function checkReminders() {
  const now = new Date();
  const previousCheck = lastReminderCheckAt || new Date(now.getTime() - CHECK_INTERVAL_MS);
  const today = localDateKey(now);
  let changed = false;

  for (const reminder of state.reminders) {
    const scheduledAt = scheduledDateForToday(reminder.time, now);
    if (
      !reminder.enabled ||
      !scheduledAt ||
      scheduledAt <= previousCheck ||
      scheduledAt > now ||
      reminder.lastDeliveredDate === today
    ) {
      continue;
    }

    reminder.lastDeliveredDate = today;
    changed = true;
    showReminder(reminder);
  }

  if (changed) {
    saveState();
  }
  lastReminderCheckAt = now;
}

function runScheduler() {
  if (!state.onboardingComplete) {
    lastReminderCheckAt = new Date();
    checkQuickStorage();
    return;
  }

  checkReminders();
  checkNudges();
  checkQuickStorage();
}

function scheduleChecks() {
  clearInterval(scheduler);
  scheduler = setInterval(runScheduler, CHECK_INTERVAL_MS);
  setTimeout(runScheduler, 2000);
}

function setPresentationSafeMode(enabled) {
  state.presentationSafeMode = Boolean(enabled);
  if (state.presentationSafeMode) {
    state.currentNudge = null;
  }
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
  const time = parseReminderTime(input.time) ? input.time : null;

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

function customAvatarDirectory() {
  return path.join(app.getPath('userData'), 'avatars');
}

function copyCustomAvatar(sourcePath) {
  const extension = path.extname(sourcePath).toLowerCase();
  const safeExtension = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extension) ? extension : '.png';
  fs.mkdirSync(customAvatarDirectory(), { recursive: true });
  const destination = path.join(customAvatarDirectory(), `custom-avatar${safeExtension}`);
  fs.copyFileSync(sourcePath, destination);
  return destination;
}

function quickStorageDirectory(kind) {
  return path.join(app.getPath('userData'), 'quick-storage', kind);
}

function sanitizeFilename(name) {
  return String(name || 'file').replace(/[/:\\?%*"<>|]/g, '-').slice(0, 120) || 'file';
}

function copyQuickStorageFile(sourcePath, kind) {
  const stat = fs.statSync(sourcePath);
  if (!stat.isFile()) {
    throw new Error('Only files can be stored in Quick Storage.');
  }

  const directory = quickStorageDirectory(kind);
  fs.mkdirSync(directory, { recursive: true });
  const id = randomUUID();
  const filename = sanitizeFilename(path.basename(sourcePath));
  const storedPath = path.join(directory, `${id}-${filename}`);
  fs.copyFileSync(sourcePath, storedPath);
  const addedAt = new Date().toISOString();
  return {
    id,
    filename,
    originalPath: sourcePath,
    storedPath,
    addedAt,
    expiresAt: kind === 'temp' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    reminderCount: 0,
    nextReminderAt: null,
    awaitingExpiryResponse: false
  };
}

function removeQuickStorageFile(item) {
  if (item && item.storedPath) {
    fs.rmSync(item.storedPath, { force: true });
  }
}

function deleteQuickStorageItem(kind, id) {
  const list = state.quickStorage[kind];
  if (!Array.isArray(list)) {
    return false;
  }

  const item = list.find((entry) => entry.id === id);
  if (!item) {
    return false;
  }

  removeQuickStorageFile(item);
  state.quickStorage[kind] = list.filter((entry) => entry.id !== id);
  return true;
}

function moveQuickStorageItemToPermanent(id) {
  const item = state.quickStorage.temp.find((entry) => entry.id === id);
  if (!item) {
    return false;
  }

  const directory = quickStorageDirectory('permanent');
  fs.mkdirSync(directory, { recursive: true });
  const storedPath = path.join(directory, `${randomUUID()}-${sanitizeFilename(item.filename)}`);
  fs.renameSync(item.storedPath, storedPath);
  state.quickStorage.temp = state.quickStorage.temp.filter((entry) => entry.id !== id);
  state.quickStorage.permanent.unshift({
    ...item,
    id: randomUUID(),
    storedPath,
    expiresAt: null,
    reminderCount: 0,
    nextReminderAt: null,
    awaitingExpiryResponse: false
  });
  return true;
}

function addQuickStorageFiles(paths, kind) {
  const copied = [];
  for (const sourcePath of paths) {
    try {
      copied.push(copyQuickStorageFile(sourcePath, kind));
    } catch (error) {
      console.error('Unable to add Quick Storage file:', error);
      setNotice(`${APP_NAME} could not store one of those files.`, 'warning');
    }
  }

  if (copied.length) {
    state.quickStorage[kind].unshift(...copied);
    saveState();
  } else {
    broadcastState();
  }
}

function showDropStoragePrompt(paths) {
  const validPaths = paths.filter((filePath) => {
    try {
      return filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  });

  if (!validPaths.length) {
    setNotice(`Drop a file onto ${DEFAULT_COMPANION_NAME} to save it.`, 'warning');
    broadcastState();
    return;
  }

  showStoragePrompt({
    id: randomUUID(),
    kind: 'drop',
    paths: validPaths,
    title: validPaths.length === 1 ? 'Save this to Quick Storage?' : `Save ${validPaths.length} files to Quick Storage?`,
    detail: validPaths.length === 1 ? path.basename(validPaths[0]) : 'Files stay local on this Mac.',
    actions: [
      { id: 'temp', label: 'Temp 24h' },
      { id: 'permanent', label: 'Permanent' },
      { id: 'cancel', label: 'Cancel' }
    ]
  });
}

function showTempExpiryPrompt(item) {
  showStoragePrompt({
    id: randomUUID(),
    kind: 'temp-expiry',
    itemId: item.id,
    title: 'Still need this file?',
    detail: item.filename,
    actions: [
      { id: 'keep', label: 'Keep 24h more' },
      { id: 'permanent', label: 'Move to Permanent' },
      { id: 'delete', label: 'Delete' }
    ]
  });
}

function checkQuickStorage() {
  const now = Date.now();
  let changed = false;

  for (const item of [...state.quickStorage.temp]) {
    if (!fs.existsSync(item.storedPath)) {
      state.quickStorage.temp = state.quickStorage.temp.filter((entry) => entry.id !== item.id);
      changed = true;
      continue;
    }

    const expiresAt = new Date(item.expiresAt || 0).getTime();
    const nextReminderAt = item.nextReminderAt ? new Date(item.nextReminderAt).getTime() : 0;
    if (!Number.isFinite(expiresAt) || now < expiresAt) {
      continue;
    }

    if (item.awaitingExpiryResponse && nextReminderAt && now >= nextReminderAt) {
      item.awaitingExpiryResponse = false;
      if (item.reminderCount >= 3) {
        deleteQuickStorageItem('temp', item.id);
      } else {
        item.nextReminderAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      }
      changed = true;
      closeStoragePrompt();
      continue;
    }

    if (!item.awaitingExpiryResponse && (!nextReminderAt || now >= nextReminderAt)) {
      if (item.reminderCount >= 3) {
        deleteQuickStorageItem('temp', item.id);
        changed = true;
        continue;
      }

      if (!storagePrompt) {
        item.reminderCount += 1;
        item.awaitingExpiryResponse = true;
        item.nextReminderAt = new Date(now + 10 * 60 * 1000).toISOString();
        showTempExpiryPrompt(item);
        changed = true;
      }
    }
  }

  if (changed) {
    saveState();
  }
}

function resetPip() {
  try {
    fs.rmSync(customAvatarDirectory(), { recursive: true, force: true });
    fs.rmSync(path.join(app.getPath('userData'), 'quick-storage'), { recursive: true, force: true });
  } catch (error) {
    console.error(`Unable to clear ${APP_NAME} local storage files:`, error);
  }
  state = normalizeState(defaultState);
  lastReminderCheckAt = new Date();
  clearNotice();
  saveState();
  resizeBubble(false);
  showPanel();
}

function applyOnboardingPayload(payload = {}, options = {}) {
  const personality = messageBank[payload.personality]
    ? payload.personality
    : (options.complete ? 'cozy' : (messageBank[state.personality] ? state.personality : 'cozy'));
  state.companionName = String(payload.companionName || state.companionName || DEFAULT_COMPANION_NAME).trim().slice(0, 28) || DEFAULT_COMPANION_NAME;
  state.personality = personality;

  if (typeof payload.privateMode === 'boolean') {
    state.privateMode = payload.privateMode;
  }

  if (payload.nudges && typeof payload.nudges === 'object') {
    for (const key of NUDGE_KEYS) {
      const incoming = payload.nudges[key];
      if (!incoming) {
        continue;
      }
      if (typeof incoming.enabled === 'boolean') {
        state.nudges[key].enabled = incoming.enabled;
      }
      if (incoming.frequencyMinutes !== undefined) {
        state.nudges[key].frequencyMinutes = Math.min(480, Math.max(5, Number(incoming.frequencyMinutes) || defaultState.nudges[key].frequencyMinutes));
      }
    }
  }

  if (options.complete) {
    state.onboardingComplete = true;
    const now = new Date().toISOString();
    for (const key of NUDGE_KEYS) {
      state.nudges[key].lastFiredAt = now;
    }
    lastReminderCheckAt = new Date();
  }
}

function runCommand(file, args = [], fallbackMessage = `${APP_NAME} could not complete that action.`, fallbackView = null) {
  execFile(file, args, (error) => {
    if (error) {
      console.error('Quick action failed:', error);
      setNotice(fallbackMessage, 'warning');
      broadcastState();
      if (fallbackView) {
        showPanel(fallbackView);
      }
    }
  });
}

function openPathOrNotice(targetPath, fallbackMessage) {
  shell.openPath(targetPath).then((error) => {
    if (error) {
      setNotice(fallbackMessage, 'warning');
      broadcastState();
    }
  });
}

function performQuickAction(actionId) {
  if (quickMenuWindow && !quickMenuWindow.isDestroyed()) {
    quickMenuWindow.hide();
  }

  if (actionId === 'home') {
    showPanel('dashboard');
    return publicState();
  }

  if (actionId === 'storage') {
    showPanel('storage');
    return publicState();
  }

  if (actionId === 'assistant') {
    showAssistant();
    return publicState();
  }

  if (actionId === 'screenshot') {
    runCommand('/usr/bin/open', ['-a', 'Screenshot'], 'Press Command-Shift-5 to open macOS Screenshot.', 'dashboard');
    return publicState();
  }

  if (actionId === 'notes') {
    runCommand('/usr/bin/open', ['-a', 'Notes'], `${APP_NAME} could not open Notes.`, 'dashboard');
    return publicState();
  }

  if (actionId === 'lock') {
    runCommand('/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession', ['-suspend'], 'Use Control-Command-Q to lock this Mac.', 'dashboard');
    return publicState();
  }

  if (actionId === 'downloads') {
    openPathOrNotice(app.getPath('downloads'), `${APP_NAME} could not open Downloads.`);
    return publicState();
  }

  if (actionId === 'applications') {
    openPathOrNotice('/Applications', `${APP_NAME} could not open Applications.`);
    return publicState();
  }

  if (actionId === 'focus') {
    setNotice('Use Control Center to adjust Focus or Do Not Disturb.', 'info');
    showPanel('settings');
    return publicState();
  }

  return publicState();
}

function registerIpc() {
  ipcMain.handle('app:getState', () => publicState());
  ipcMain.handle('app:togglePanel', () => togglePanel());
  ipcMain.handle('app:toggleQuickMenu', () => toggleQuickMenu());
  ipcMain.handle('app:showPanel', (_event, view) => showPanel(view));
  ipcMain.handle('app:closePanel', () => hidePanel());
  ipcMain.handle('app:closeAssistant', () => {
    hideAssistant();
    return publicState();
  });
  ipcMain.handle('quickMenu:action', (_event, actionId) => performQuickAction(actionId));
  ipcMain.handle('app:clearNotice', () => {
    clearNotice();
    broadcastState();
    return publicState();
  });
  ipcMain.handle('bubble:setExpanded', (_event, expanded) => resizeBubble(expanded));
  ipcMain.handle('bubble:setPosition', (_event, payload = {}) => {
    state.appearance.bubblePosition = clampBubblePosition(payload.position || payload, state.appearance.bubbleSize);
    positionBubble();
    if (payload.persist !== false && panelWindow && !panelWindow.isDestroyed() && panelWindow.isVisible()) {
      hidePanel();
    }
    if (payload.persist !== false) {
      saveState();
    }
    return publicState();
  });
  ipcMain.handle('storage:dropFiles', (_event, paths = []) => {
    showDropStoragePrompt(Array.isArray(paths) ? paths : []);
    return publicState();
  });
  ipcMain.handle('storage:getPrompt', () => storagePrompt);
  ipcMain.handle('storage:answerPrompt', (_event, action) => {
    if (!storagePrompt) {
      return publicState();
    }

    const prompt = storagePrompt;
    closeStoragePrompt();

    if (prompt.kind === 'drop') {
      if (action === 'temp') {
        addQuickStorageFiles(prompt.paths, 'temp');
      } else if (action === 'permanent') {
        addQuickStorageFiles(prompt.paths, 'permanent');
      }
      return publicState();
    }

    if (prompt.kind === 'temp-expiry') {
      const item = state.quickStorage.temp.find((entry) => entry.id === prompt.itemId);
      if (!item) {
        return publicState();
      }

      if (action === 'keep') {
        item.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        item.awaitingExpiryResponse = false;
        item.nextReminderAt = null;
        item.reminderCount = 0;
      } else if (action === 'permanent') {
        moveQuickStorageItemToPermanent(item.id);
      } else if (action === 'delete') {
        deleteQuickStorageItem('temp', item.id);
      }
      saveState();
    }

    return publicState();
  });

  ipcMain.handle('settings:previewOnboarding', (_event, payload = {}) => {
    if (!state.onboardingComplete) {
      applyOnboardingPayload(payload);
      broadcastState();
      buildTrayMenu();
    }
    return publicState();
  });

  ipcMain.handle('settings:completeOnboarding', (_event, payload = {}) => {
    applyOnboardingPayload(payload, { complete: true });
    saveState();
    return publicState();
  });

  ipcMain.handle('settings:update', (_event, patch = {}) => {
    if (typeof patch.companionName === 'string') {
      state.companionName = patch.companionName.trim().slice(0, 28) || DEFAULT_COMPANION_NAME;
    }
    if (messageBank[patch.personality]) {
      state.personality = patch.personality;
    }
    if (typeof patch.privateMode === 'boolean') {
      state.privateMode = patch.privateMode;
    }
    if (typeof patch.presentationSafeMode === 'boolean') {
      state.presentationSafeMode = patch.presentationSafeMode;
      if (state.presentationSafeMode) {
        state.currentNudge = null;
      }
    }
    if (patch.appearance && typeof patch.appearance === 'object') {
      if (BUBBLE_SIZES[patch.appearance.bubbleSize]) {
        state.appearance.bubbleSize = patch.appearance.bubbleSize;
        state.appearance.bubblePosition = clampBubblePosition(state.appearance.bubblePosition, state.appearance.bubbleSize);
        positionBubble();
      }
      if (patch.appearance.avatarMode === 'emoji' || patch.appearance.avatarMode === 'custom') {
        state.appearance.avatarMode = patch.appearance.avatarMode;
        if (state.appearance.avatarMode === 'custom' && !state.appearance.customAvatarPath) {
          state.appearance.avatarMode = 'emoji';
          setNotice('Choose a custom avatar image first.', 'warning');
        }
      }
      if (typeof patch.appearance.storageShelfCollapsed === 'boolean') {
        state.appearance.storageShelfCollapsed = patch.appearance.storageShelfCollapsed;
        positionShelf();
      }
    }

    if (patch.quickMenu && typeof patch.quickMenu === 'object') {
      if ([3, 4, 5, 6].includes(Number(patch.quickMenu.actionCount))) {
        state.quickMenu.actionCount = Number(patch.quickMenu.actionCount);
      }
      if (Array.isArray(patch.quickMenu.actions)) {
        const nextActions = patch.quickMenu.actions.filter((id) => QUICK_ACTION_OPTIONS[id]).slice(0, 4);
        for (const id of DEFAULT_QUICK_MENU.actions) {
          if (nextActions.length >= 4) {
            break;
          }
          if (!nextActions.includes(id)) {
            nextActions.push(id);
          }
        }
        state.quickMenu.actions = nextActions;
      }
    }

    if (patch.nudges && typeof patch.nudges === 'object') {
      for (const key of NUDGE_KEYS) {
        const incoming = patch.nudges[key];
        if (!incoming) {
          continue;
        }

        const wasActive = state.nudges[key].enabled && state.nudges[key].snoozedUntil !== 'off';

        if (Object.prototype.hasOwnProperty.call(incoming, 'snoozedUntil')) {
          if (incoming.snoozedUntil === 'off' || incoming.snoozedUntil === null) {
            state.nudges[key].snoozedUntil = incoming.snoozedUntil;
          } else if (Number.isFinite(new Date(incoming.snoozedUntil).getTime())) {
            state.nudges[key].snoozedUntil = incoming.snoozedUntil;
          }
        }

        if (typeof incoming.enabled === 'boolean') {
          state.nudges[key].enabled = incoming.enabled;
          if (!incoming.enabled && state.currentNudge && state.currentNudge.category === key) {
            state.currentNudge = null;
          }
        }

        const isActive = state.nudges[key].enabled && state.nudges[key].snoozedUntil !== 'off';
        if (isActive && !wasActive) {
          state.nudges[key].lastFiredAt = new Date().toISOString();
        }

        if (incoming.frequencyMinutes !== undefined) {
          state.nudges[key].frequencyMinutes = Math.min(480, Math.max(5, Number(incoming.frequencyMinutes) || 30));
        }
      }
    }

    saveState();
    return publicState();
  });

  ipcMain.handle('avatar:chooseCustom', async () => {
    const parentWindow = panelWindow && !panelWindow.isDestroyed() ? panelWindow : undefined;
    const options = {
      title: `Choose ${DEFAULT_COMPANION_NAME} Avatar`,
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
      ]
    };
    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || !result.filePaths[0]) {
      return publicState();
    }

    try {
      state.appearance.customAvatarPath = copyCustomAvatar(result.filePaths[0]);
      state.appearance.avatarMode = 'custom';
      saveState();
    } catch (error) {
      console.error('Unable to copy custom avatar:', error);
      setNotice(`${APP_NAME} could not save that avatar image locally.`, 'error');
      broadcastState();
    }

    return publicState();
  });

  ipcMain.handle('nudge:snooze', (_event, payload = {}) => {
    snoozeCategory(payload.category, payload.option);
    return publicState();
  });

  ipcMain.handle('nudge:trigger', (_event, category) => {
    triggerManualNudge(category);
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

  ipcMain.handle('storage:open', async (_event, { kind, id } = {}) => {
    const item = findQuickStorageItem(kind, id);
    if (item && fs.existsSync(item.storedPath)) {
      const error = await shell.openPath(item.storedPath);
      if (error) {
        setNotice(`${APP_NAME} could not open that file.`, 'warning');
        broadcastState();
      }
    } else if (item && (kind === 'temp' || kind === 'permanent')) {
      deleteQuickStorageItem(kind, id);
      setNotice('That stored file is no longer available.', 'warning');
      saveState();
    }
    return publicState();
  });

  ipcMain.handle('storage:reveal', (_event, { kind, id } = {}) => {
    const item = findQuickStorageItem(kind, id);
    if (item && fs.existsSync(item.storedPath)) {
      shell.showItemInFolder(item.storedPath);
    } else if (item && (kind === 'temp' || kind === 'permanent')) {
      deleteQuickStorageItem(kind, id);
      setNotice('That stored file is no longer available.', 'warning');
      saveState();
    }
    return publicState();
  });

  ipcMain.on('storage:startDrag', (event, { kind, id } = {}) => {
    const item = findQuickStorageItem(kind, id);
    if (!item || !fs.existsSync(item.storedPath)) {
      if (item && (kind === 'temp' || kind === 'permanent')) {
        deleteQuickStorageItem(kind, id);
        setNotice('That stored file is no longer available.', 'warning');
        saveState();
      }
      return;
    }

    const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png'));
    try {
      event.sender.startDrag({
        file: item.storedPath,
        icon: icon.isEmpty() ? nativeImage.createEmpty() : icon
      });
    } catch (error) {
      console.error('Unable to start Quick Storage drag:', error);
      shell.showItemInFolder(item.storedPath);
    }
  });

  ipcMain.handle('storage:shelfMenu', (event, { kind, id } = {}) => {
    const item = findQuickStorageItem(kind, id);
    if (!item || !fs.existsSync(item.storedPath)) {
      if (item && (kind === 'temp' || kind === 'permanent')) {
        deleteQuickStorageItem(kind, id);
        setNotice('That stored file is no longer available.', 'warning');
        saveState();
      }
      return publicState();
    }

    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    Menu.buildFromTemplate([
      {
        label: 'Reveal in Finder',
        click: () => shell.showItemInFolder(item.storedPath)
      },
      {
        label: 'Open',
        click: async () => {
          const error = await shell.openPath(item.storedPath);
          if (error) {
            setNotice(`${APP_NAME} could not open that file.`, 'warning');
            broadcastState();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Delete from Quick Storage',
        click: () => {
          deleteQuickStorageItem(kind, id);
          saveState();
        }
      }
    ]).popup({ window: sourceWindow });
    return publicState();
  });

  ipcMain.handle('storage:delete', (_event, { kind, id } = {}) => {
    if (kind === 'temp' || kind === 'permanent') {
      deleteQuickStorageItem(kind, id);
      saveState();
    }
    return publicState();
  });

  ipcMain.handle('storage:movePermanent', (_event, id) => {
    moveQuickStorageItemToPermanent(id);
    saveState();
    return publicState();
  });

  ipcMain.handle('reminders:add', (_event, payload = {}) => {
    const reminder = sanitizeReminder(payload);
    if (!reminder) {
      setNotice('Add a title and valid time before saving the reminder.', 'error');
      return {
        ok: false,
        error: 'Add a title and valid time before saving the reminder.',
        state: publicState()
      };
    }

    state.reminders.unshift(reminder);
    saveState();
    return { ok: true, state: publicState() };
  });

  ipcMain.handle('reminders:delete', (_event, id) => {
    state.reminders = state.reminders.filter((reminder) => reminder.id !== id);
    saveState();
    return publicState();
  });

  ipcMain.handle('reminders:toggle', (_event, { id, enabled } = {}) => {
    const reminder = state.reminders.find((item) => item.id === id);
    if (reminder) {
      reminder.enabled = Boolean(enabled);
      saveState();
    }
    return publicState();
  });

  ipcMain.handle('app:reset', () => {
    resetPip();
    return publicState();
  });
}

app.setName(APP_NAME);

app.whenReady().then(() => {
  app.setName(APP_NAME);
  configureUserDataPath();
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: packageJson.version,
    version: packageJson.version
  });
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  store = createStore(app);
  state = normalizeState(store.read(defaultState));
  if (store.getLastError()) {
    setNotice(store.getLastError(), 'error');
  }
  lastReminderCheckAt = new Date();

  buildApplicationMenu();
  tray = new Tray(createTrayImage());
  tray.on('click', toggleQuickMenu);
  buildTrayMenu();

  registerIpc();
  createBubbleWindow();
  createShelfWindow();
  createQuickMenuWindow();
  createAssistantWindow();
  createPanelWindow();
  createStoragePromptWindow();
  screen.on('display-metrics-changed', () => {
    positionBubble();
    positionShelf();
    positionQuickMenu();
    positionAssistant();
    positionPanel();
    positionStoragePrompt();
  });

  scheduleChecks();

  if (!state.onboardingComplete) {
    setTimeout(showPanel, 600);
  }
});

app.on('window-all-closed', () => {
  // Winsy AI is a menu bar companion, so closing windows should not quit the app.
});

app.on('before-quit', () => {
  clearInterval(scheduler);
});
