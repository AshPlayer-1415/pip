const quickMenuRoot = document.getElementById('quickMenu');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderQuickMenu(state) {
  const items = state.quickMenuItems || [];
  quickMenuRoot.innerHTML = `
    <section class="quick-menu-card">
      <div class="quick-menu-grid count-${items.length}">
        ${items.map((item) => `
          <button class="quick-menu-action" data-action-id="${escapeHtml(item.id)}" type="button">
            <span class="quick-menu-icon">${escapeHtml(item.icon)}</span>
            <span>${escapeHtml(item.label)}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

quickMenuRoot.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action-id]');
  if (button) {
    await window.pipAPI.runQuickAction(button.dataset.actionId);
  }
});

window.pipAPI.onStateChanged(renderQuickMenu);
window.pipAPI.onQuickMenuAnchorChanged((side) => {
  document.body.classList.toggle('anchor-left', side === 'left');
  document.body.classList.toggle('anchor-right', side !== 'left');
});
window.pipAPI.getState().then(renderQuickMenu);
