/**
 * Related Content block.
 * Authored rows:
 *   Rows 0+ (4 cols each): type | title | description | URL
 *   type = "Article" | "Campaign" | "PDF Download"
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];

  const iconMap = {
    article: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    campaign: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'pdf download': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  };

  const cardsHTML = rows.map((row, i) => {
    const cols = [...row.children];
    const type = cols[0]?.textContent.trim() || 'Article';
    const title = cols[1]?.textContent.trim() || '';
    const desc = cols[2]?.textContent.trim() || '';
    const link = cols[3]?.querySelector('a');
    const href = link?.href || cols[3]?.textContent.trim() || '#';
    const icon = iconMap[type.toLowerCase()] || iconMap.article;
    const isPdf = type.toLowerCase().includes('pdf');

    return `
      <a href="${href}" class="related-content-card sr sr-d${Math.min(i + 1, 3)}"${isPdf ? ' download' : ''}>
        <div class="related-content-icon">${icon}</div>
        <span class="related-content-tag">${type}</span>
        <span class="related-content-title">${title}</span>
        <span class="related-content-desc">${desc}</span>
      </a>`;
  }).join('');

  block.textContent = '';
  block.innerHTML = `
    <h2 class="sr">Related Content</h2>
    <div class="related-content-grid">${cardsHTML}</div>`;
}
