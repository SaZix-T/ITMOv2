const fs = require('node:fs');
const path = require('node:path');

module.exports = async () => {
  const base = path.join(__dirname, '..', '..', 'data', 'e2e.db');
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(base + suffix);
    } catch {}
  }
};
