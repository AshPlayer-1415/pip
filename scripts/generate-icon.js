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

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function setPixel(buffer, x, y, rgba) {
  const index = (y * size + x) * 4;
  buffer[index] = rgba[0];
  buffer[index + 1] = rgba[1];
  buffer[index + 2] = rgba[2];
  buffer[index + 3] = rgba[3];
}

function blendPixel(buffer, x, y, rgba, coverage = 1) {
  if (x < 0 || x >= size || y < 0 || y >= size || coverage <= 0) {
    return;
  }

  const index = (y * size + x) * 4;
  const sourceAlpha = clamp((rgba[3] / 255) * coverage);
  const targetAlpha = buffer[index + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outputAlpha <= 0) {
    return;
  }

  buffer[index] = Math.round((rgba[0] * sourceAlpha + buffer[index] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
  buffer[index + 1] = Math.round((rgba[1] * sourceAlpha + buffer[index + 1] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
  buffer[index + 2] = Math.round((rgba[2] * sourceAlpha + buffer[index + 2] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
  buffer[index + 3] = Math.round(outputAlpha * 255);
}

function colorMix(start, end, t) {
  return [
    mix(start[0], end[0], t),
    mix(start[1], end[1], t),
    mix(start[2], end[2], t),
    mix(start[3] ?? 255, end[3] ?? 255, t)
  ];
}

function drawRoundedRect(buffer, x0, y0, width, height, radius, colorFn) {
  const minX = Math.max(0, Math.floor(x0 - 2));
  const maxX = Math.min(size - 1, Math.ceil(x0 + width + 2));
  const minY = Math.max(0, Math.floor(y0 - 2));
  const maxY = Math.min(size - 1, Math.ceil(y0 + height + 2));
  const cx = x0 + width / 2;
  const cy = y0 + height / 2;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const qx = Math.abs(x + 0.5 - cx) - (halfWidth - radius);
      const qy = Math.abs(y + 0.5 - cy) - (halfHeight - radius);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const inside = Math.min(Math.max(qx, qy), 0);
      const distance = outside + inside - radius;
      const coverage = clamp(0.5 - distance);
      if (coverage > 0) {
        blendPixel(buffer, x, y, colorFn(x, y), coverage);
      }
    }
  }
}

function drawEllipse(buffer, cx, cy, rx, ry, colorFn) {
  const minX = Math.max(0, Math.floor(cx - rx - 2));
  const maxX = Math.min(size - 1, Math.ceil(cx + rx + 2));
  const minY = Math.max(0, Math.floor(cy - ry - 2));
  const maxY = Math.min(size - 1, Math.ceil(cy + ry + 2));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const distance = Math.hypot(nx, ny);
      const coverage = clamp((1 - distance) * Math.min(rx, ry));
      if (coverage > 0) {
        blendPixel(buffer, x, y, colorFn(x, y, nx, ny), coverage);
      }
    }
  }
}

function drawSoftEllipse(buffer, cx, cy, rx, ry, rgba) {
  const minX = Math.max(0, Math.floor(cx - rx * 2));
  const maxX = Math.min(size - 1, Math.ceil(cx + rx * 2));
  const minY = Math.max(0, Math.floor(cy - ry * 2));
  const maxY = Math.min(size - 1, Math.ceil(cy + ry * 2));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const falloff = Math.exp(-(nx * nx + ny * ny));
      blendPixel(buffer, x, y, rgba, falloff * (rgba[3] / 255));
    }
  }
}

function drawSmile(buffer) {
  for (let x = 410; x <= 614; x += 1) {
    const dx = x - 512;
    const curveY = 622 - 0.0024 * dx * dx;
    for (let y = Math.floor(curveY - 8); y <= Math.ceil(curveY + 8); y += 1) {
      const distance = Math.abs(y - curveY);
      const coverage = clamp(1 - distance / 4.5);
      blendPixel(buffer, x, y, [42, 39, 44, 190], coverage);
    }
  }
}

function applyRoundedMask(buffer, x0, y0, width, height, radius) {
  const cx = x0 + width / 2;
  const cy = y0 + height / 2;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const qx = Math.abs(x + 0.5 - cx) - (halfWidth - radius);
      const qy = Math.abs(y + 0.5 - cy) - (halfHeight - radius);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const inside = Math.min(Math.max(qx, qy), 0);
      const distance = outside + inside - radius;
      const coverage = clamp(0.5 - distance);
      const index = (y * size + x) * 4;
      if (coverage <= 0) {
        buffer[index] = 0;
        buffer[index + 1] = 0;
        buffer[index + 2] = 0;
        buffer[index + 3] = 0;
      } else if (coverage < 1) {
        buffer[index + 3] = Math.round(buffer[index + 3] * coverage);
      }
    }
  }
}

function createPng() {
  const pixels = Buffer.alloc(size * size * 4);

  drawRoundedRect(pixels, 82, 82, 860, 860, 212, (x, y) => {
    const vertical = clamp((y - 82) / 860);
    const diagonal = clamp((x + y) / (size * 2));
    const base = colorMix([26, 29, 39, 255], [10, 12, 17, 255], vertical);
    const premium = colorMix(base, [38, 31, 54, 255], diagonal * 0.36);
    return premium;
  });

  drawSoftEllipse(pixels, 340, 275, 300, 220, [138, 215, 255, 70]);
  drawSoftEllipse(pixels, 705, 780, 360, 260, [215, 185, 142, 62]);
  drawRoundedRect(pixels, 132, 132, 760, 760, 176, () => [255, 255, 255, 14]);
  drawRoundedRect(pixels, 156, 156, 712, 712, 158, () => [7, 9, 13, 88]);

  drawSoftEllipse(pixels, 512, 548, 315, 285, [215, 185, 142, 78]);
  drawEllipse(pixels, 512, 520, 285, 258, (_x, y, nx, ny) => {
    const vertical = clamp((y - 265) / 516);
    const edge = clamp(Math.hypot(nx, ny));
    const face = colorMix([255, 226, 178, 255], [210, 166, 116, 255], vertical);
    return colorMix(face, [170, 126, 93, 255], edge * 0.22);
  });

  drawEllipse(pixels, 512, 376, 184, 58, (_x, y) => {
    const t = clamp((y - 318) / 116);
    return colorMix([255, 244, 214, 84], [255, 244, 214, 0], t);
  });

  drawEllipse(pixels, 407, 475, 42, 58, () => [28, 28, 36, 255]);
  drawEllipse(pixels, 617, 475, 42, 58, () => [28, 28, 36, 255]);
  drawEllipse(pixels, 393, 452, 12, 16, () => [255, 255, 246, 225]);
  drawEllipse(pixels, 603, 452, 12, 16, () => [255, 255, 246, 225]);
  drawEllipse(pixels, 407, 530, 68, 20, () => [166, 115, 105, 48]);
  drawEllipse(pixels, 617, 530, 68, 20, () => [166, 115, 105, 48]);
  drawSmile(pixels);

  drawEllipse(pixels, 512, 778, 170, 44, () => [8, 10, 14, 72]);
  applyRoundedMask(pixels, 82, 82, 860, 860, 212);

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
