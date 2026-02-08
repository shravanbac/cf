/**
 * Tech stack items — Adobe mnemonic icon cards.
 */
const TECH_ITEMS = [
  { abbr: 'Da', name: 'DA.live', role: 'Author' },
  { abbr: 'Ed', name: 'Edge Delivery', role: 'Deliver' },
  { abbr: 'Wf', name: 'Workfront', role: 'Govern' },
  { abbr: 'Fn', name: 'Fusion', role: 'Automate' },
  { abbr: 'Io', name: 'I/O Runtime', role: 'Secure' },
  { abbr: 'Fi', name: 'Firefly', role: 'Generate' },
];

/**
 * Decorates the technology block.
 * Expects authored rows:
 *   Row 0: label text
 *   Row 1: heading (H2) — may contain gradient-text
 *   Row 2: subtitle paragraph
 * Tech items are auto-generated.
 * @param {Element} block The technology block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  block.id = 'technology';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Technology');

  const labelRow = rows[0];
  const headingRow = rows[1];
  const subtitleRow = rows[2];

  const labelText = labelRow ? labelRow.textContent.trim() : 'Technology';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl
    ? headingEl.outerHTML
    : '<h2>Powered by the <span class="gradient-text">Adobe ecosystem.</span></h2>';
  const subtitleText = subtitleRow ? subtitleRow.textContent.trim() : '';

  const itemsHTML = TECH_ITEMS.map((t) => `
    <div class="tech-item">
      <div class="tech-icon">${t.abbr}</div>
      <h4>${t.name}</h4>
      <p>${t.role}</p>
    </div>
  `).join('');

  block.textContent = '';
  block.innerHTML = `
    <div class="sr">
      <span class="label tech-label-center">${labelText}</span>
      ${headingHTML}
      <p class="subtitle tech-subtitle">${subtitleText}</p>
    </div>
    <div class="tech-row sr sr-d2">${itemsHTML}</div>
  `;
}
