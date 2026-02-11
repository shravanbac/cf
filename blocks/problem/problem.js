/**
 * Problem card definitions — hardcoded content focused on DA.live governance gap.
 */
const PROBLEM_CARDS = [
  {
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" stroke-linecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>`,
    title: 'No Review Gate',
    desc: 'DA.live authors can preview and publish pages directly — there is no approval step, no review task, and no way to enforce who can push content live.',
  },
  {
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" stroke-linecap="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/>
      <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
    title: 'No Workflow Integration',
    desc: 'DA.live has no connection to Workfront or any enterprise workflow tool. Reviews happen outside the system — via email threads, Slack messages, or spreadsheets.',
  },
  {
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" stroke-linecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
      <line x1="2" y1="2" x2="22" y2="22"/></svg>`,
    title: 'No Status Visibility',
    desc: 'Authors have no way to know if a page is in draft, under review, approved, or published. There is no status tracking within the DA.live authoring environment.',
  },
  {
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" stroke-linecap="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    title: 'Manual Publishing',
    desc: 'Even when content is reviewed and approved offline, someone must manually preview and publish in DA.live. There is no automated publish-on-approval workflow.',
  },
];

/**
 * Decorates the problem block.
 * Expects authored rows:
 *   Row 0 (1 col): section label
 *   Row 1 (1 col): heading (H2)
 *   Row 2 (1 col): subtitle paragraph
 * Cards are hardcoded (not authored).
 * @param {Element} block The problem block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  block.id = 'problem';
  const labelRow = rows[0];
  const headingRow = rows[1];
  const subtitleRow = rows[2];

  const labelText = labelRow ? labelRow.textContent.trim() : 'The Problem';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl
    ? headingEl.outerHTML
    : '<h2>DA.live authoring lacks <span class="gradient-text">content governance.</span></h2>';
  const subtitleText = subtitleRow
    ? subtitleRow.textContent.trim()
    : 'DA.live is the fastest way to author for Edge Delivery Services — but it has no review process, no approval workflow, and no connection to enterprise governance tools.';

  const cardsHTML = PROBLEM_CARDS.map((card, i) => `
    <div class="problem-card sr sr-d${i + 1}">
      <div class="problem-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <p>${card.desc}</p>
    </div>
  `).join('');

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
