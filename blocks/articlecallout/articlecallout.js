/**
 * Article Callout block.
 * Authored rows:
 *   Row 0 (1 col): label text e.g. "Key Metric"
 *   Row 1 (1 col): callout paragraph
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const label = rows[0]?.textContent.trim() || '';
  const text = rows[1]?.textContent.trim() || '';

  block.textContent = '';
  block.innerHTML = `
    <div class="article-callout-label">${label}</div>
    <p>${text}</p>`;
}
