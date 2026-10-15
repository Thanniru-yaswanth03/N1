import { BoardElement, BoardRoomSummary } from '@n1/shared';

/**
 * Downloads a Blob directly in the user's browser.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports current board elements to a PNG image file.
 */
export async function exportBoardAsPng(
  elements: BoardElement[],
  title: string = 'Study_Board',
  themeBackground: boolean = true
): Promise<void> {
  if (elements.length === 0) {
    alert('Canvas is empty. Add elements before exporting.');
    return;
  }

  // Calculate bounding box of all elements
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(el => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width || 0));
    maxY = Math.max(maxY, el.y + (el.height || 0));

    if (el.points) {
      el.points.forEach(p => {
        minX = Math.min(minX, el.x + p.x);
        minY = Math.min(minY, el.y + p.y);
        maxX = Math.max(maxX, el.x + p.x);
        maxY = Math.max(maxY, el.y + p.y);
      });
    }
  });

  const padding = 60;
  const width = Math.max(800, maxX - minX + padding * 2);
  const height = Math.max(600, maxY - minY + padding * 2);

  const canvas = document.createElement('canvas');
  const dpr = 2; // High-resolution 2x export
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);

  // Background
  if (themeBackground) {
    ctx.fillStyle = '#09090f';
    ctx.fillRect(0, 0, width, height);

    // Subtle dark dot grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = 0; x < width; x += 24) {
      for (let y = 0; y < height; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Offset elements by minX/minY + padding
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  // Render elements in zIndex order
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  sorted.forEach(el => {
    ctx.save();
    ctx.translate(el.x + offsetX, el.y + offsetY);

    ctx.strokeStyle = el.color || '#a855f7';
    ctx.fillStyle = el.fillColor || 'transparent';
    ctx.lineWidth = el.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (el.type) {
      case 'stroke': {
        if (el.points && el.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(el.points[0]?.x || 0, el.points[0]?.y || 0);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i]?.x || 0, el.points[i]?.y || 0);
          }
          ctx.stroke();
        }
        break;
      }

      case 'sticky': {
        // Sticky note shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = el.fillColor || 'rgba(251, 191, 36, 0.2)';
        ctx.strokeStyle = el.color || '#fbbf24';
        ctx.beginPath();
        ctx.roundRect(0, 0, el.width, el.height, 8);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();

        // Pin accent
        ctx.fillStyle = el.color;
        ctx.beginPath();
        ctx.arc(el.width / 2, 10, 3, 0, Math.PI * 2);
        ctx.fill();

        // Content text
        if (el.content) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `${el.fontSize || 13}px sans-serif`;
          const lines = el.content.split('\n');
          lines.forEach((line, idx) => {
            ctx.fillText(line, 12, 28 + idx * 18);
          });
        }
        break;
      }

      case 'shape': {
        const w = el.width;
        const h = el.height;
        ctx.beginPath();

        if (el.shapeType === 'rounded-rectangle') {
          ctx.roundRect(0, 0, w, h, 8);
        } else if (el.shapeType === 'circle' || el.shapeType === 'ellipse') {
          ctx.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
        } else if (el.shapeType === 'diamond') {
          ctx.moveTo(w / 2, 0);
          ctx.lineTo(w, h / 2);
          ctx.lineTo(w / 2, h);
          ctx.lineTo(0, h / 2);
          ctx.closePath();
        } else if (el.shapeType === 'triangle') {
          ctx.moveTo(w / 2, 0);
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
        } else if (el.shapeType === 'cylinder') {
          const capHeight = 16;
          ctx.ellipse(w / 2, capHeight / 2, w / 2, capHeight / 2, 0, 0, Math.PI * 2);
          ctx.moveTo(0, capHeight / 2);
          ctx.lineTo(0, h - capHeight / 2);
          ctx.ellipse(w / 2, h - capHeight / 2, w / 2, capHeight / 2, 0, 0, Math.PI);
          ctx.lineTo(w, capHeight / 2);
        } else if (el.shapeType === 'star') {
          const spikes = 5;
          const outerR = Math.min(w, h) / 2;
          const innerR = outerR / 2;
          let rot = (Math.PI / 2) * 3;
          const cx = w / 2;
          const cy = h / 2;
          const step = Math.PI / spikes;
          ctx.moveTo(cx, cy - outerR);
          for (let i = 0; i < spikes; i++) {
            let x = cx + Math.cos(rot) * outerR;
            let y = cy + Math.sin(rot) * outerR;
            ctx.lineTo(x, y);
            rot += step;
            x = cx + Math.cos(rot) * innerR;
            y = cy + Math.sin(rot) * innerR;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.closePath();
        } else {
          ctx.rect(0, 0, w, h);
        }

        if (el.fillColor && el.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();

        if (el.content) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `${el.fontSize || 13}px ${el.fontFamily === 'mono' ? 'monospace' : 'sans-serif'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const lines = el.content.split('\n');
          const startY = h / 2 - ((lines.length - 1) * 16) / 2;
          lines.forEach((l, idx) => {
            ctx.fillText(l, w / 2, startY + idx * 16);
          });
        }
        break;
      }

      case 'line':
      case 'arrow': {
        const w = el.width;
        const h = el.height;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(h, w);
        const headLength = 12;
        ctx.beginPath();
        ctx.moveTo(w, h);
        ctx.lineTo(w - headLength * Math.cos(angle - Math.PI / 6), h - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(w - headLength * Math.cos(angle + Math.PI / 6), h - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = el.color || '#a855f7';
        ctx.fill();
        break;
      }

      case 'text': {
        if (el.content) {
          ctx.fillStyle = el.color || '#ffffff';
          ctx.font = `${el.fontSize || 16}px ${el.fontFamily === 'mono' ? 'monospace' : 'sans-serif'}`;
          const lines = el.content.split('\n');
          lines.forEach((l, idx) => {
            ctx.fillText(l, 0, 16 + idx * 20);
          });
        }
        break;
      }
    }

    ctx.restore();
  });

  // Footer branding
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '11px sans-serif';
  ctx.fillText(`N1 Study Board • ${title}`, 20, height - 20);

  canvas.toBlob(blob => {
    if (blob) {
      const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      triggerDownload(blob, `n1_board_${sanitized}_${Date.now()}.png`);
    }
  }, 'image/png');
}

/**
 * Exports current board elements to SVG vector format.
 */
export function exportBoardAsSvg(
  elements: BoardElement[],
  title: string = 'Study_Board'
): void {
  if (elements.length === 0) {
    alert('Canvas is empty. Add elements before exporting.');
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(el => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width || 0));
    maxY = Math.max(maxY, el.y + (el.height || 0));
  });

  const padding = 60;
  const width = Math.max(800, maxX - minX + padding * 2);
  const height = Math.max(600, maxY - minY + padding * 2);
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  const svgParts: string[] = [];
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`
  );
  svgParts.push(`<rect width="${width}" height="${height}" fill="#09090f"/>`);

  elements.forEach(el => {
    const x = el.x + offsetX;
    const y = el.y + offsetY;
    const color = el.color || '#a855f7';
    const fill = el.fillColor || 'none';
    const sw = el.strokeWidth || 2;

    if (el.type === 'shape' || el.type === 'sticky') {
      svgParts.push(
        `<rect x="${x}" y="${y}" width="${el.width}" height="${el.height}" rx="8" fill="${fill}" stroke="${color}" stroke-width="${sw}"/>`
      );
      if (el.content) {
        const lines = el.content.split('\n');
        lines.forEach((l, idx) => {
          svgParts.push(
            `<text x="${x + 12}" y="${y + 24 + idx * 16}" fill="#ffffff" font-size="${el.fontSize || 13}" font-family="sans-serif">${escapeXml(l)}</text>`
          );
        });
      }
    } else if (el.type === 'line' || el.type === 'arrow') {
      svgParts.push(
        `<line x1="${x}" y1="${y}" x2="${x + el.width}" y2="${y + el.height}" stroke="${color}" stroke-width="${sw}"/>`
      );
    } else if (el.type === 'text' && el.content) {
      const lines = el.content.split('\n');
      lines.forEach((l, idx) => {
        svgParts.push(
          `<text x="${x}" y="${y + 16 + idx * 20}" fill="${color}" font-size="${el.fontSize || 16}" font-family="sans-serif">${escapeXml(l)}</text>`
        );
      });
    }
  });

  svgParts.push(`</svg>`);

  const blob = new Blob([svgParts.join('\n')], { type: 'image/svg+xml' });
  const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  triggerDownload(blob, `n1_board_${sanitized}_${Date.now()}.svg`);
}

/**
 * Exports board as JSON file.
 */
export function exportBoardAsJson(
  elements: BoardElement[],
  room: BoardRoomSummary | { code: string; title: string; template: string }
): void {
  const payload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    room,
    elements,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const sanitized = room.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  triggerDownload(blob, `n1_board_${sanitized}_${Date.now()}.json`);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
