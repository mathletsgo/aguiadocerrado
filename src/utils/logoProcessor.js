import logoCentauroRaw from '../../logo-centauro.png';
import logoRegionalRaw from '../../logo-regional.jpeg';

let cachedLogos = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function processCentauroWhite(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2],
        a = d[i + 3];

      let alpha = 0;
      if (a > 20) {
        if (r > 242 && g > 242 && b > 242) {
          alpha = 0;
        } else if (a < 250) {
          alpha = a;
        } else {
          const whiteness = Math.min(g, b);
          alpha = Math.max(0, Math.min(255, Math.round(((250 - whiteness) / 200) * 255)));
        }
      }

      if (alpha > 15) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = alpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (maxX <= minX || maxY <= minY) return logoCentauroRaw;

  const pad = 6;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return out.toDataURL('image/png');
}

function processRegionalShield(img) {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  const scale = Math.min(1, 420 / Math.max(origW, origH));
  const w = Math.round(origW * scale);
  const h = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0,
    tail = 0;

  const isBgPixel = (idx4) => {
    const r = d[idx4],
      g = d[idx4 + 1],
      b = d[idx4 + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    return minC > 205 && maxC - minC < 32;
  };

  const enqueue = (x, y) => {
    const pos = y * w + x;
    if (!visited[pos] && isBgPixel(pos * 4)) {
      visited[pos] = 1;
      queue[tail++] = pos;
    }
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  while (head < tail) {
    const pos = queue[head++];
    const idx4 = pos * 4;
    d[idx4 + 3] = 0;

    const x = pos % w;
    const y = (pos - x) / w;
    if (x > 0) enqueue(x - 1, y);
    if (x < w - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < h - 1) enqueue(x, y + 1);
  }

  // Suaviza borda externa contra halo branco e encontra bounding box
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pos = y * w + x;
      if (visited[pos]) continue;
      const idx4 = pos * 4;

      const touchesBg =
        (x > 0 && visited[pos - 1]) ||
        (x < w - 1 && visited[pos + 1]) ||
        (y > 0 && visited[pos - w]) ||
        (y < h - 1 && visited[pos + w]);

      if (touchesBg) {
        const minC = Math.min(d[idx4], d[idx4 + 1], d[idx4 + 2]);
        if (minC > 180) {
          d[idx4 + 3] = Math.max(0, Math.round(((245 - minC) / 65) * 180));
        }
      }

      if (d[idx4 + 3] > 20) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (maxX <= minX || maxY <= minY) return logoRegionalRaw;

  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return out.toDataURL('image/png');
}

export async function getProcessedLogos() {
  if (cachedLogos) return cachedLogos;
  try {
    const [imgCent, imgReg] = await Promise.all([
      loadImage(logoCentauroRaw),
      loadImage(logoRegionalRaw),
    ]);
    cachedLogos = {
      centauroWhite: processCentauroWhite(imgCent),
      regionalClean: processRegionalShield(imgReg),
    };
    return cachedLogos;
  } catch (err) {
    console.warn('Fallback to raw logos:', err);
    return {
      centauroWhite: logoCentauroRaw,
      regionalClean: logoRegionalRaw,
    };
  }
}

export { logoCentauroRaw, logoRegionalRaw };
