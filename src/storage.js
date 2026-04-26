const fs = require('fs');
const path = require('path');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStore(app) {
  const filePath = path.join(app.getPath('userData'), 'pip-data.json');
  const tempPath = `${filePath}.tmp`;
  let lastError = null;

  function read(defaultState) {
    try {
      lastError = null;
      if (!fs.existsSync(filePath)) {
        return clone(defaultState);
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : clone(defaultState);
    } catch (error) {
      console.error('Unable to read Pip store:', error);
      lastError = 'Pip could not read local settings, so defaults were loaded.';
      return clone(defaultState);
    }
  }

  function write(state) {
    try {
      lastError = null;
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
      fs.renameSync(tempPath, filePath);
      return true;
    } catch (error) {
      console.error('Unable to write Pip store:', error);
      lastError = 'Pip could not save changes locally.';
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        console.error('Unable to clean Pip temp store:', cleanupError);
      }
      return false;
    }
  }

  function getLastError() {
    return lastError;
  }

  return { filePath, read, write, getLastError };
}

module.exports = { createStore };
