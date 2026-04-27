const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pipAPI', {
  getState: () => ipcRenderer.invoke('app:getState'),
  togglePanel: () => ipcRenderer.invoke('app:togglePanel'),
  showPanel: () => ipcRenderer.invoke('app:showPanel'),
  closePanel: () => ipcRenderer.invoke('app:closePanel'),
  clearNotice: () => ipcRenderer.invoke('app:clearNotice'),
  resetPip: () => ipcRenderer.invoke('app:reset'),
  setBubbleExpanded: (expanded) => ipcRenderer.invoke('bubble:setExpanded', expanded),
  setBubblePosition: (payload) => ipcRenderer.invoke('bubble:setPosition', payload),
  chooseCustomAvatar: () => ipcRenderer.invoke('avatar:chooseCustom'),
  previewOnboarding: (payload) => ipcRenderer.invoke('settings:previewOnboarding', payload),
  completeOnboarding: (payload) => ipcRenderer.invoke('settings:completeOnboarding', payload),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  snoozeNudge: (payload) => ipcRenderer.invoke('nudge:snooze', payload),
  triggerNudge: (category) => ipcRenderer.invoke('nudge:trigger', category),
  dismissNudge: () => ipcRenderer.invoke('nudge:dismiss'),
  clearQueue: () => ipcRenderer.invoke('queue:clear'),
  addReminder: (payload) => ipcRenderer.invoke('reminders:add', payload),
  deleteReminder: (id) => ipcRenderer.invoke('reminders:delete', id),
  toggleReminder: (payload) => ipcRenderer.invoke('reminders:toggle', payload),
  onStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state:changed', listener);
    return () => ipcRenderer.removeListener('state:changed', listener);
  }
});
