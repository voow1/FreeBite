// Geometry is measured after returning the obscured result page to its top.
function landingScroll(photo, visibleBottom) {
  if (!photo || !Number.isFinite(photo.top) || !Number.isFinite(photo.height) || photo.height <= 0 || !(visibleBottom > 0)) return 0;
  const bottom = photo.top + photo.height;
  if (bottom <= visibleBottom) return 0;
  // Move only far enough to reveal the photo, accounting for the fixed navbar.
  return Math.max(0, Math.min(photo.top, bottom - visibleBottom + 12));
}
function centeredScroll(viewport, content, card) {
  if (![viewport, content, card].every(r => r && Number.isFinite(r.left) && r.width > 0)) return null;
  return Math.max(0, Math.min(content.width - viewport.width, card.left - content.left + card.width / 2 - viewport.width / 2));
}
module.exports = {landingScroll, centeredScroll};
