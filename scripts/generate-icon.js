const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const pngPath = path.join(assetsDir, 'icon.png');
const size = 1024;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function setPixel(buffer, x, y, rgba) {
  const index = (y * size + x) * 4;
  buffer[index] = rgba[0];
  buffer[index + 1] = rgba[1];
  buffer[index + 2] = rgba[2];
  buffer[index + 3] = rgba[3];
}

function drawCircle(buffer, cx, cy, radius, rgba) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(size - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(size - 1, Math.ceil(cy + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(buffer, x, y, rgba);
      }
    }
  }
}

function drawRoundedRect(buffer, x0, y0, width, height, radius, rgba) {
  for (let y = y0; y < y0 + height; y += 1) {
    for (let x = x0; x < x0 + width; x += 1) {
      const dx = Math.max(x0 - x, 0, x - (x0 + width - 1));
      const dy = Math.max(y0 - y, 0, y - (y0 + height - 1));
      const cornerX = x < x0 + radius ? x0 + radius : x > x0 + width - radius ? x0 + width - radius : x;
      const cornerY = y < y0 + radius ? y0 + radius : y > y0 + height - radius ? y0 + height - radius : y;
      const cx = x - cornerX;
      const cy = y - cornerY;
      if ((dx === 0 && dy === 0) || cx * cx + cy * cy <= radius * radius) {
        setPixel(buffer, x, y, rgba);
      }
    }
  }
}

function createPng() {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = (x + y) / (size * 2);
      setPixel(pixels, x, y, [
        mix(19, 9, t),
        mix(22, 13, t),
        mix(31, 18, t),
        255
      ]);
    }
  }

  drawCircle(pixels, 512, 512, 332, [216, 185, 142, 255]);
  drawCircle(pixels, 404, 444, 38, [17, 18, 24, 255]);
  drawCircle(pixels, 620, 444, 38, [17, 18, 24, 255]);
  drawRoundedRect(pixels, 372, 596, 280, 46, 23, [17, 18, 24, 255]);
  drawCircle(pixels, 366, 594, 54, [216, 185, 142, 255]);
  drawCircle(pixels, 658, 594, 54, [216, 185, 142, 255]);

  const rawRows = [];
  for (let y = 0; y < size; y += 1) {
    rawRows.push(Buffer.from([0]));
    rawRows.push(pixels.subarray(y * size * 4, (y + 1) * size * 4));
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rawRows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(pngPath, createPng());
