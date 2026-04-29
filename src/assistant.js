const form = document.getElementById('assistantForm');
const input = document.getElementById('assistantInput');
const sendButton = document.getElementById('assistantSend');
const response = document.getElementById('assistantResponse');

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
  response.innerHTML = `
    <div class="assistant-response-card ${tone}">
      <div class="assistant-response-top">
        <span>${escapeHtml(result.command || 'command')}</span>
        ${confirmation}
      </div>
      <p>${escapeHtml(result.message || 'Winsy heard you.')}</p>
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

window.pipAPI.onAssistantAnchorChanged((side) => {
  document.body.classList.toggle('anchor-left', side === 'left');
  document.body.classList.toggle('anchor-right', side !== 'left');
});
