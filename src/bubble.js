const bubble = document.getElementById('bubble');
const bubbleMark = document.getElementById('bubbleMark');
const bubbleCallout = document.getElementById('bubbleCallout');

let activeId = null;
let collapseTimer;

function applyState(state) {
  const meta = state.personalityMeta;
  document.documentElement.style.cssText = `--accent: ${meta.accent}; --accent-soft: ${meta.accent}22;`;
  bubbleMark.textContent = meta.mark || 'P';

  const hasPopup = Boolean(state.currentNudge && !state.presentationSafeMode);
  bubble.classList.toggle('is-active', hasPopup);

  if (hasPopup && state.currentNudge.id !== activeId) {
    activeId = state.currentNudge.id;
    bubbleCallout.textContent = state.privateMode ? 'Private reminder' : state.currentNudge.message;
    bubble.classList.add('is-expanded');
    window.pipAPI.setBubbleExpanded(true);
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      bubble.classList.remove('is-expanded');
      window.pipAPI.setBubbleExpanded(false);
    }, 8000);
    return;
  }

  if (!hasPopup) {
    activeId = null;
    bubble.classList.remove('is-expanded');
    bubbleCallout.textContent = '';
    clearTimeout(collapseTimer);
    window.pipAPI.setBubbleExpanded(false);
  }
}

bubble.addEventListener('click', () => {
  window.pipAPI.togglePanel();
});

window.pipAPI.onStateChanged(applyState);
window.pipAPI.getState().then(applyState);
