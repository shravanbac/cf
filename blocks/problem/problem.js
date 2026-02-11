/**
 * Decorates the problem block.
 * Expects authored rows:
 *   Row 0 (1 col): section label
 *   Row 1 (1 col): heading (H2)
 *   Row 2 (1 col): subtitle paragraph
 *   Rows 3+ (3 cols each): stat | title | description
 * @param {Element} block The problem block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Set block ID for anchor navigation
  block.id = 'problem';
  const labelRow = rows[0];
  const headingRow = rows[1];
  const subtitleRow = rows[2];
  const cardRows = rows.slice(3);

  // Extract content
  const labelText = labelRow ? labelRow.textContent.trim() : 'The Problem';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>DA.live authoring lacks governance.</h2>';
  const subtitleText = subtitleRow ? subtitleRow.textContent.trim() : '';

  // Build cards
  const cardsHTML = cardRows.map((row, i) => {
    const cols = [...row.children];
    const stat = cols[0] ? cols[0].textContent.trim() : '';
    const title = cols[1] ? cols[1].textContent.trim() : '';
    const desc = cols[2] ? cols[2].textContent.trim() : '';
    return `
      <div class="problem-card sr sr-d${i + 1}">
        <div class="problem-stat">${stat}</div>
        <h3>${title}</h3>
        <p>${desc}</p>
      </div>
    `;
  }).join('');

  block.textContent = '';
  block.innerHTML = `
    <div class="problem-header sr">
      <span class="label">${labelText}</span>
      ${headingHTML}
      <p class="subtitle">${subtitleText}</p>
    </div>
    <div class="problem-grid">${cardsHTML}</div>
  `;
}
