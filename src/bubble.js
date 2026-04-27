const bubble = document.getElementById('bubble');
const bubbleMark = document.getElementById('bubbleMark');
const bubbleCallout = document.getElementById('bubbleCallout');

let activeId = null;
let dragStart = null;
let didDrag = false;

function renderBubbleAvatar(state) {
  const meta = state.personalityMeta;
  bubbleMark.className = `bubble-mark personality-${meta.id || 'cozy'}`;
  bubbleMark.textContent = '';
  bubbleMark.style.backgroundImage = '';

  if (state.appearance && state.appearance.avatarMode === 'custom' && state.appearance.customAvatarUrl) {
    bubbleMark.classList.add('has-image');
    bubbleMark.style.backgroundImage = `url("${state.appearance.customAvatarUrl}")`;
    return;
  }

  bubbleMark.classList.remove('has-image');
  bubbleMark.textContent = meta.mark || 'P';
}

function applyState(state) {
  const meta = state.personalityMeta;
  document.documentElement.style.cssText = `--accent: ${meta.accent}; --accent-soft: ${meta.accent}22;`;
  renderBubbleAvatar(state);

  const hasPopup = Boolean(state.currentNudge && !state.presentationSafeMode);
  bubble.classList.toggle('is-active', hasPopup);

  if (hasPopup && state.currentNudge.id !== activeId) {
    activeId = state.currentNudge.id;
    bubbleCallout.textContent = state.privateMode ? 'Private reminder' : state.currentNudge.message;
    return;
  }

  if (!hasPopup) {
    activeId = null;
    bubbleCallout.textContent = '';
    window.pipAPI.setBubbleExpanded(false);
  }
}

bubble.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return;
  }
  didDrag = false;
  dragStart = {
    pointerId: event.pointerId,
    screenX: event.screenX,
    screenY: event.screenY,
    windowX: window.screenX,
    windowY: window.screenY
  };
  bubble.setPointerCapture(event.pointerId);
});

bubble.addEventListener('pointermove', (event) => {
  if (!dragStart || event.pointerId !== dragStart.pointerId) {
    return;
  }

  const dx = event.screenX - dragStart.screenX;
  const dy = event.screenY - dragStart.screenY;
  if (Math.abs(dx) + Math.abs(dy) < 4) {
    return;
  }

  didDrag = true;
  window.pipAPI.setBubblePosition({
    position: {
      x: dragStart.windowX + dx,
      y: dragStart.windowY + dy
    },
    persist: false
  });
});

bubble.addEventListener('pointerup', (event) => {
  if (!dragStart || event.pointerId !== dragStart.pointerId) {
    return;
  }

  const dx = event.screenX - dragStart.screenX;
  const dy = event.screenY - dragStart.screenY;
  const shouldPersist = didDrag;
  const position = {
    x: dragStart.windowX + dx,
    y: dragStart.windowY + dy
  };
  dragStart = null;
  bubble.releasePointerCapture(event.pointerId);

  if (shouldPersist) {
    window.pipAPI.setBubblePosition({ position, persist: true });
  }
});

bubble.addEventListener('pointercancel', () => {
  dragStart = null;
});

bubble.addEventListener('click', (event) => {
  if (didDrag) {
    event.preventDefault();
    didDrag = false;
    return;
  }

  window.pipAPI.toggleQuickMenu();
});

bubble.addEventListener('dragover', (event) => {
  event.preventDefault();
  bubble.classList.add('is-drop-target');
});

bubble.addEventListener('dragleave', () => {
  bubble.classList.remove('is-drop-target');
});

bubble.addEventListener('drop', async (event) => {
  event.preventDefault();
  bubble.classList.remove('is-drop-target');
  const paths = Array.from(event.dataTransfer.files)
    .map((file) => {
      try {
        return window.pipAPI.getFilePath ? window.pipAPI.getFilePath(file) : file.path;
      } catch {
        return file.path;
      }
    })
    .filter(Boolean);
  if (paths.length) {
    await window.pipAPI.dropStorageFiles(paths);
  }
});

window.pipAPI.onStateChanged(applyState);
window.pipAPI.getState().then(applyState);
