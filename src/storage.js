const fs = require('fs');
const path = require('path');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStore(app) {
  const filePath = path.join(app.getPath('userData'), 'pip-data.json');
  const tempPath = `${filePath}.tmp`;

  function read(defaultState) {
    try {
      if (!fs.existsSync(filePath)) {
        return clone(defaultState);
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : clone(defaultState);
    } catch (error) {
      console.error('Unable to read Pip store:', error);
      return clone(defaultState);
    }
  }

  function write(state) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      console.error('Unable to write Pip store:', error);
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        console.error('Unable to clean Pip temp store:', cleanupError);
      }
    }
  }

  return { filePath, read, write };
}

module.exports = { createStore };
