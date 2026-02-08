/**
 * Features block.
 * Authored rows:
 *   Row 0 (1 col): heading (H2) e.g. "Key Features"
 *   Rows 1+ (2 cols each): title | description
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const headingEl = rows[0]?.querySelector('h2, h3');
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>Key Features</h2>';
  const cardRows = rows.slice(1);

  const icons = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  ];

  const cardsHTML = cardRows.map((row, i) => {
    const cols = [...row.children];
    const title = cols[0]?.textContent.trim() || '';
    const desc = cols[1]?.textContent.trim() || '';
    const icon = icons[i % icons.length];
    return `
      <div class="features-card sr sr-d${Math.min(i + 1, 4)}">
        <div class="features-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${desc}</p>
      </div>`;
  }).join('');

  const count = cardRows.length;
  block.textContent = '';
  block.innerHTML = `
    <div class="features-head">
      ${headingHTML}
      <span>${count} capabilities</span>
    </div>
    <div class="features-grid">${cardsHTML}</div>`;
}
