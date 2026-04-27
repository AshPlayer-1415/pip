const shelfRoot = document.getElementById('storageShelf');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fileInitial(filename) {
  const extension = String(filename || '').split('.').pop();
  return extension && extension !== filename ? extension.slice(0, 3).toUpperCase() : 'DOC';
}

function renderShelf(state) {
  const currentItems = (state.quickStorageShelf || []).slice(0, 4);
  const collapsed = Boolean(state.appearance && state.appearance.storageShelfCollapsed);
  document.body.classList.toggle('is-collapsed', collapsed);

  if (!currentItems.length) {
    shelfRoot.innerHTML = '';
    return;
  }

  if (collapsed) {
    shelfRoot.innerHTML = `
      <section class="storage-shelf-tray is-collapsed">
        <button class="storage-shelf-collapse" data-action="expandShelf" type="button" title="Show Quick Storage">
          <span class="storage-shelf-badge">${currentItems.length}</span>
        </button>
      </section>
    `;
    return;
  }

  shelfRoot.innerHTML = `
    <section class="storage-shelf-tray">
      <button class="storage-shelf-toggle" data-action="collapseShelf" type="button" title="Collapse Quick Storage">-</button>
      <div class="storage-shelf-items">
        ${currentItems.map((item) => `
          <button
            class="storage-shelf-item ${item.kind === 'temp' ? 'is-temp' : ''}"
            draggable="true"
            title="${escapeHtml(item.filename)}"
            data-title="${escapeHtml(item.filename)}"
            data-kind="${escapeHtml(item.kind)}"
            data-id="${escapeHtml(item.id)}"
            type="button"
            aria-label="Reveal ${escapeHtml(item.filename)}"
          >
            ${item.isImage && item.previewUrl
              ? `<img src="${escapeHtml(item.previewUrl)}" alt="" draggable="false" />`
              : `<span class="storage-file-icon">${escapeHtml(fileInitial(item.filename))}</span>`}
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function storagePayloadFromTarget(target) {
  const item = target.closest('[data-kind][data-id]');
  if (!item) {
    return null;
  }

  return {
    kind: item.dataset.kind,
    id: item.dataset.id
  };
}

shelfRoot.addEventListener('dragstart', (event) => {
  const payload = storagePayloadFromTarget(event.target);
  if (!payload) {
    event.preventDefault();
    return;
  }

  event.dataTransfer.effectAllowed = 'copy';
  window.pipAPI.startStorageDrag(payload);
});

shelfRoot.addEventListener('click', async (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (actionButton && actionButton.dataset.action === 'collapseShelf') {
    await window.pipAPI.updateSettings({ appearance: { storageShelfCollapsed: true } });
    return;
  }
  if (actionButton && actionButton.dataset.action === 'expandShelf') {
    await window.pipAPI.updateSettings({ appearance: { storageShelfCollapsed: false } });
    return;
  }

  const payload = storagePayloadFromTarget(event.target);
  if (payload) {
    await window.pipAPI.revealStorageFile(payload);
  }
});

shelfRoot.addEventListener('contextmenu', async (event) => {
  event.preventDefault();
  const payload = storagePayloadFromTarget(event.target);
  if (payload) {
    await window.pipAPI.showStorageShelfMenu(payload);
  }
});

window.pipAPI.onStateChanged(renderShelf);
window.pipAPI.onShelfAnchorChanged((side) => {
  document.body.classList.toggle('anchor-left', side === 'left');
  document.body.classList.toggle('anchor-right', side !== 'left');
});
window.pipAPI.getState().then(renderShelf);
