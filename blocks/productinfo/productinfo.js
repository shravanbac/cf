/**
 * Product Info block — About text + metadata grid.
 * Authored rows:
 *   Row 0 (1 col): heading (H2) e.g. "About Pulse"
 *   Row 1 (1 col): description paragraph
 *   Rows 2+ (2 cols each): label | value
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const headingEl = rows[0]?.querySelector('h2, h3') || null;
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>About</h2>';
  const desc = rows[1]?.textContent.trim() || '';

  const metaRows = rows.slice(2);
  const metaCells = metaRows.map((row) => {
    const cols = [...row.children];
    const label = cols[0]?.textContent.trim() || '';
    const value = cols[1]?.textContent.trim() || '';
    return `
      <div class="product-info-meta-cell">
        <div class="product-info-meta-label">${label}</div>
        <div class="product-info-meta-value">${value}</div>
      </div>`;
  }).join('');

  block.textContent = '';
  block.innerHTML = `
    <div class="product-info-grid">
      <div class="product-info-about sr">
        ${headingHTML}
        <p>${desc}</p>
      </div>
      <div class="product-info-meta sr sr-d1">${metaCells}</div>
    </div>`;
}
