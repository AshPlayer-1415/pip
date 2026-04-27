const { contextBridge, ipcRenderer, webUtils } = require('electron');

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
  getFilePath: (file) => webUtils.getPathForFile(file),
  dropStorageFiles: (paths) => ipcRenderer.invoke('storage:dropFiles', paths),
  getStoragePrompt: () => ipcRenderer.invoke('storage:getPrompt'),
  answerStoragePrompt: (action) => ipcRenderer.invoke('storage:answerPrompt', action),
  startStorageDrag: (payload) => ipcRenderer.send('storage:startDrag', payload),
  showStorageShelfMenu: (payload) => ipcRenderer.invoke('storage:shelfMenu', payload),
  openStorageFile: (payload) => ipcRenderer.invoke('storage:open', payload),
  revealStorageFile: (payload) => ipcRenderer.invoke('storage:reveal', payload),
  deleteStorageFile: (payload) => ipcRenderer.invoke('storage:delete', payload),
  moveStoragePermanent: (id) => ipcRenderer.invoke('storage:movePermanent', id),
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
  },
  onPanelAnchorChanged: (callback) => {
    const listener = (_event, side) => callback(side);
    ipcRenderer.on('panel:anchor', listener);
    return () => ipcRenderer.removeListener('panel:anchor', listener);
  },
  onStoragePromptChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('storage-prompt:changed', listener);
    return () => ipcRenderer.removeListener('storage-prompt:changed', listener);
  },
  onShelfAnchorChanged: (callback) => {
    const listener = (_event, side) => callback(side);
    ipcRenderer.on('shelf:anchor', listener);
    return () => ipcRenderer.removeListener('shelf:anchor', listener);
  }
});
