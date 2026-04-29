const form = document.getElementById('assistantForm');
const input = document.getElementById('assistantInput');
const sendButton = document.getElementById('assistantSend');
const response = document.getElementById('assistantResponse');
let pendingConfirmation = null;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function renderResponse(result) {
  const tone = result.ok ? 'ok' : 'error';
  const confirmation = result.requiresConfirmation ? '<span class="assistant-chip">Needs confirmation</span>' : '';
  const items = Array.isArray(result.items) ? result.items : [];
  pendingConfirmation = result.requiresConfirmation && result.confirmationPayload
    ? result.confirmationPayload
    : null;

  const confirmationMarkup = pendingConfirmation ? `
    <div class="assistant-confirmation">
      <div>
        <strong>${escapeHtml(pendingConfirmation.actionSummary || result.message || 'Confirm this action?')}</strong>
        ${pendingConfirmation.description ? `<span>${escapeHtml(pendingConfirmation.description)}</span>` : ''}
      </div>
      <div class="assistant-confirmation-actions">
        <button type="button" data-confirmation-cancel>${escapeHtml(pendingConfirmation.cancelLabel || 'Cancel')}</button>
        <button type="button" class="primary" data-confirmation-confirm>${escapeHtml(pendingConfirmation.confirmLabel || 'Confirm')}</button>
      </div>
    </div>
  ` : '';
  const itemMarkup = items.length ? `
    <div class="assistant-items">
      ${items.map((item, index) => `
        <article class="assistant-item">
          <div class="assistant-item-copy">
            <strong>${escapeHtml(item.title || 'Item')}</strong>
            ${item.meta ? `<span>${escapeHtml(item.meta)}</span>` : ''}
          </div>
          ${Array.isArray(item.actions) && item.actions.length ? `
            <div class="assistant-item-actions">
              ${item.actions.map((action) => `
                <button
                  type="button"
                  data-assistant-action="${escapeHtml(action.action)}"
                  data-kind="${escapeHtml(action.kind)}"
                  data-id="${escapeHtml(action.id)}"
                  data-index="${index}"
                >${escapeHtml(action.label)}</button>
              `).join('')}
            </div>
          ` : ''}
        </article>
      `).join('')}
    </div>
  ` : '';

  response.innerHTML = `
    <div class="assistant-response-card ${tone}">
      <div class="assistant-response-top">
        <span>${escapeHtml(result.command || 'command')}</span>
        ${confirmation}
      </div>
      <p>${escapeHtml(result.message || 'Winsy heard you.')}</p>
      ${confirmationMarkup}
      ${itemMarkup}
    </div>
  `;
}

async function submitCommand(commandText) {
  const command = String(commandText || '').trim();
  if (!command) {
    renderResponse({
      ok: false,
      command: 'unknown',
      message: 'Type a command for Winsy.',
      requiresConfirmation: false
    });
    return;
  }

  sendButton.disabled = true;
  response.innerHTML = '<p>Reading command...</p>';
  pendingConfirmation = null;

  try {
    const result = await window.pipAPI.runAssistantCommand(command);
    renderResponse(result);
  } catch (error) {
    renderResponse({
      ok: false,
      command: 'unknown',
      message: 'Winsy could not read that command.',
      requiresConfirmation: false
    });
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

document.getElementById('closeAssistant').addEventListener('click', () => {
  window.pipAPI.closeAssistant();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCommand(input.value);
});

document.querySelectorAll('[data-example]').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = button.dataset.example;
    input.focus();
  });
});

response.addEventListener('click', async (event) => {
  const confirmButton = event.target.closest('[data-confirmation-confirm]');
  if (confirmButton && pendingConfirmation) {
    confirmButton.disabled = true;
    try {
      const result = await window.pipAPI.confirmAssistantCommand(pendingConfirmation);
      renderResponse(result);
    } catch (error) {
      renderResponse({
        ok: false,
        command: pendingConfirmation.command || 'unknown',
        message: 'Winsy could not confirm that action.',
        requiresConfirmation: false
      });
    }
    return;
  }

  const cancelButton = event.target.closest('[data-confirmation-cancel]');
  if (cancelButton) {
    pendingConfirmation = null;
    renderResponse({
      ok: true,
      command: 'cancel',
      message: 'Cancelled.',
      requiresConfirmation: false
    });
    return;
  }

  const button = event.target.closest('[data-assistant-action]');
  if (!button) {
    return;
  }

  const payload = {
    kind: button.dataset.kind,
    id: button.dataset.id
  };

  button.disabled = true;
  try {
    if (button.dataset.assistantAction === 'openStorageFile') {
      await window.pipAPI.openStorageFile(payload);
    } else if (button.dataset.assistantAction === 'revealStorageFile') {
      await window.pipAPI.revealStorageFile(payload);
    }
  } finally {
    button.disabled = false;
  }
});

window.pipAPI.onAssistantAnchorChanged((side) => {
  document.body.classList.toggle('anchor-left', side === 'left');
  document.body.classList.toggle('anchor-right', side !== 'left');
});
