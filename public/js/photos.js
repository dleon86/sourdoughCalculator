// Photo helpers: shrink in the browser, upload, show thumbnails, view big.
import { request } from './api.js';
import { fill, h, toast } from './ui.js';

const MAX_EDGE = 1600;

export const photoUrl = (photo) => `/api/photos/${photo.id}`;

// Phone photos are 3–6 MB. A 1600 px JPEG is ~300 KB and plenty for a
// crumb shot, and keeps uploads under the server's size limit.
async function shrink(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  return { blob, width: canvas.width, height: canvas.height };
}

export async function uploadPhoto(bakeId, file) {
  const { blob, width, height } = await shrink(file);
  return request('POST', `/bakes/${bakeId}/photos?w=${width}&h=${height}`, blob, { raw: true });
}

// Full-size viewer in a native <dialog>; tap anywhere or press Esc to close.
let viewer;
export function viewPhoto(src) {
  viewer ??= document.body.appendChild(h('dialog', { class: 'photo-viewer', onclick: () => viewer.close() }, h('img', { alt: '' })));
  viewer.querySelector('img').src = src;
  viewer.showModal();
}

// Thumbnail grid with add and remove. With no bakeId yet (a new bake),
// picked files wait in `pending` until the bake is saved.
export function photoField({ bakeId = null, photos = [] }) {
  const pending = [];
  const grid = h('div', { class: 'photo-grid' });
  const input = h('input', {
    type: 'file', accept: 'image/*', multiple: true, class: 'sr-only', id: 'photo-input',
    onchange: async (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      if (!bakeId) {
        pending.push(...files);
        draw();
        return;
      }
      for (const file of files) {
        const tile = h('div', { class: 'photo-tile uploading' }, h('span', {}, 'Uploading…'));
        grid.insertBefore(tile, addButton);
        try {
          photos.push(await uploadPhoto(bakeId, file));
        } catch (err) {
          toast(err.message || 'Couldn’t upload that photo', { error: true });
        }
        draw();
      }
    },
  });
  const addButton = h('label', { class: 'photo-tile add', for: 'photo-input' }, '+ Add photos');

  function draw() {
    fill(grid,
      photos.map((p) => h('div', { class: 'photo-tile' },
        h('button', { type: 'button', class: 'thumb', onclick: () => viewPhoto(photoUrl(p)), 'aria-label': 'View photo' },
          h('img', { src: photoUrl(p), alt: '', loading: 'lazy' })),
        h('button', {
          type: 'button', class: 'icon-btn remove', 'aria-label': 'Delete photo',
          onclick: async () => {
            if (!confirm('Delete this photo?')) return;
            try {
              await request('DELETE', `/photos/${p.id}`);
              photos.splice(photos.indexOf(p), 1);
              draw();
            } catch (err) { toast(err.message, { error: true }); }
          },
        }, '×'))),
      pending.map((file) => {
        const url = URL.createObjectURL(file);
        return h('div', { class: 'photo-tile' },
          h('img', { src: url, alt: '', onload: () => URL.revokeObjectURL(url) }),
          h('button', {
            type: 'button', class: 'icon-btn remove', 'aria-label': 'Remove photo',
            onclick: () => { pending.splice(pending.indexOf(file), 1); draw(); },
          }, '×'));
      }),
      addButton);
  }
  draw();

  return {
    node: h('div', { class: 'photos' }, grid, input),
    // Upload anything picked before the bake had an id.
    async flush(id) {
      let failed = 0;
      for (const file of pending.splice(0)) {
        try { await uploadPhoto(id, file); } catch { failed += 1; }
      }
      if (failed) toast(`${failed} photo${failed === 1 ? '' : 's'} didn’t upload. Open the bake to try again.`, { error: true });
    },
  };
}
