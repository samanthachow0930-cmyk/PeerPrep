'use client';
import { useEffect, useRef } from 'react';

const SCALE = 2;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /(https?:\/\/|www\.|linkedin\.|github\.com|gitlab\.com|behance\.net|[a-z0-9-]+\.(com|io|net|org|me|dev|hk|co)(\/|\b))/i;
const PHONE = /\+?\d[\d\s().-]{6,}\d/;
const DATE_RANGE = /^\s*(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\s*$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function isPhone(s) {
  const m = s.match(PHONE);
  if (!m || DATE_RANGE.test(m[0])) return false;
  return m[0].replace(/\D/g, '').length >= 8;
}

export async function scanPdf(file, fullName = '') {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  if (pdf.numPages > 5) throw new Error('Please upload a PDF of at most 5 pages.');

  const tokens = fullName.trim().split(/\s+/).filter((t) => t.length >= 2);
  const nameRe = tokens.length ? new RegExp('\\b(' + tokens.map(esc).join('|') + ')\\b', 'i') : null;

  const pages = [];
  let textFound = false;
  let allText = '';

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const tc = await page.getTextContent();
    const items = tc.items
      .filter((i) => i.str && i.str.trim())
      .map((i) => {
        const t = pdfjs.Util.transform(viewport.transform, i.transform);
        const fs = Math.hypot(t[2], t[3]);
        return { str: i.str, fs, x: t[4], y: t[5] - fs * 0.95, w: i.width * SCALE, h: fs * 1.3 };
      });
    if (items.length) textFound = true;
    allText += items.map((i) => i.str).join(' ') + ' ';

    const flagged = new Set();
    items.forEach((it) => {
      if (EMAIL.test(it.str) || URL_RE.test(it.str) || isPhone(it.str) || (nameRe && nameRe.test(it.str))) flagged.add(it);
    });

    if (n === 1 && items.length) {
      const top = items.filter((it) => it.y < canvas.height * 0.3);
      const sizes = items.map((it) => it.fs).sort((a, b) => a - b);
      const median = sizes[Math.floor(sizes.length / 2)];
      const maxFs = top.length ? Math.max(...top.map((it) => it.fs)) : 0;
      if (maxFs > median * 1.2) top.filter((it) => it.fs >= maxFs * 0.92).forEach((it) => flagged.add(it));
    }

    const boxes = [...flagged].map((it) => ({ x: it.x - 3, y: it.y - 2, w: it.w + 6, h: it.h + 4, auto: true }));
    pages.push({ canvas, w: canvas.width, h: canvas.height, boxes });
  }
  return { pages, textFound, text: allText };
}

export async function exportRedactedPdf(pages) {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  for (const p of pages) {
    const c = document.createElement('canvas');
    c.width = p.w; c.height = p.h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, p.w, p.h);
    ctx.drawImage(p.canvas, 0, 0);
    ctx.fillStyle = '#000';
    p.boxes.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
    const img = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const page = doc.addPage([p.w / SCALE, p.h / SCALE]);
    page.drawImage(img, { x: 0, y: 0, width: p.w / SCALE, height: p.h / SCALE });
  }
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

const rectFrom = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

export function PageEditor({ page, index, onBoxes }) {
  const ref = useRef(null);
  const drag = useRef(null);

  const paint = (preview) => {
    const c = ref.current;
    if (!c) return;
    c.width = page.w; c.height = page.h;
    const ctx = c.getContext('2d');
    ctx.drawImage(page.canvas, 0, 0);
    page.boxes.forEach((b) => {
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = b.auto ? '#ff4d4f' : '#2457d6';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });
    if (preview) {
      ctx.fillStyle = 'rgba(36,87,214,0.35)';
      ctx.fillRect(preview.x, preview.y, preview.w, preview.h);
    }
  };

  useEffect(() => { paint(); });

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * page.w) / r.width, y: ((e.clientY - r.top) * page.h) / r.height };
  };

  const down = (e) => { ref.current.setPointerCapture(e.pointerId); drag.current = { start: pos(e) }; };
  const move = (e) => { if (drag.current) paint(rectFrom(drag.current.start, pos(e))); };
  const up = (e) => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    const end = pos(e);
    const r = rectFrom(d.start, end);
    if (r.w < 10 && r.h < 10) {
      const hit = page.boxes.map((b, k) => k).reverse()
        .find((k) => { const b = page.boxes[k]; return end.x >= b.x && end.x <= b.x + b.w && end.y >= b.y && end.y <= b.y + b.h; });
      if (hit !== undefined) onBoxes(index, page.boxes.filter((_, k) => k !== hit));
      else paint();
    } else onBoxes(index, [...page.boxes, { ...r, auto: false }]);
  };

  return <canvas ref={ref} className="editor-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} />;
}