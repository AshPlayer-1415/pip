document.getElementById('closeAssistant').addEventListener('click', () => {
  window.pipAPI.closeAssistant();
});

window.pipAPI.onAssistantAnchorChanged((side) => {
  document.body.classList.toggle('anchor-left', side === 'left');
  document.body.classList.toggle('anchor-right', side !== 'left');
});
