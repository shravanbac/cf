/**
 * Article Links block — bottom nav cards.
 * Authored rows:
 *   Rows 0+ (3 cols): label | title | URL
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];

  const cardsHTML = rows.map((row) => {
    const cols = [...row.children];
    const label = cols[0]?.textContent.trim() || '';
    const title = cols[1]?.textContent.trim() || '';
    const link = cols[2]?.querySelector('a');
    const href = link?.href || cols[2]?.textContent.trim() || '#';
    return `
      <a href="${href}" class="article-links-card">
        <span class="article-links-label">${label}</span>
        <span class="article-links-title">${title}</span>
      </a>`;
  }).join('');

  block.textContent = '';
  block.innerHTML = `<div class="article-links-grid">${cardsHTML}</div>`;
}
