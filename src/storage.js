const fs = require('fs');
const path = require('path');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStore(app) {
  const filePath = path.join(app.getPath('userData'), 'pip-data.json');

  function read(defaultState) {
    try {
      if (!fs.existsSync(filePath)) {
        return clone(defaultState);
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      return {
        ...structuredClone(defaultState),
        ...JSON.parse(raw)
      };
    } catch (error) {
      console.error('Unable to read Pip store:', error);
      return clone(defaultState);
    }
  }

  function write(state) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Unable to write Pip store:', error);
    }
  }

  return { filePath, read, write };
}

module.exports = { createStore };
