document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') e.preventDefault();
});
document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
document.addEventListener('touchend', function(e) {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
