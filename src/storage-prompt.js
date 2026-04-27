const promptRoot = document.getElementById('storagePrompt');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderPrompt(payload) {
  const prompt = payload && payload.prompt !== undefined ? payload.prompt : payload;
  const anchorSide = payload && payload.anchorSide === 'left' ? 'left' : 'right';
  document.body.classList.toggle('anchor-left', anchorSide === 'left');
  document.body.classList.toggle('anchor-right', anchorSide !== 'left');

  if (!prompt) {
    promptRoot.innerHTML = '';
    return;
  }

  promptRoot.innerHTML = `
    <section class="storage-prompt-card">
      <div>
        <h1>${escapeHtml(prompt.title)}</h1>
        <p>${escapeHtml(prompt.detail)}</p>
      </div>
      <div class="storage-prompt-actions">
        ${prompt.actions.map((action) => `
          <button class="button ${action.id === 'cancel' || action.id === 'delete' ? 'ghost' : 'primary'}" data-action="${escapeHtml(action.id)}" type="button">
            ${escapeHtml(action.label)}
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

promptRoot.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  await window.pipAPI.answerStoragePrompt(button.dataset.action);
});

window.pipAPI.onStoragePromptChanged(renderPrompt);
window.pipAPI.getStoragePrompt().then(renderPrompt);
