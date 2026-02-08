/**
 * Team member definitions.
 */
const TEAM_MEMBERS = [
  {
    initial: 'P',
    name: 'Princy',
    role: 'Enterprise Architect',
    desc: 'Led enterprise architecture strategy, ensuring ContentFlow integrates seamlessly with security and scalability across client ecosystems.',
  },
  {
    initial: 'A',
    name: 'Andreaas',
    role: 'EDS Architect',
    desc: 'Designed the Edge Delivery Services architecture — page templates, custom blocks, Admin API integrations, and multi-environment deployment.',
  },
  {
    initial: 'S',
    name: 'Shravan Bachu',
    role: 'Workfront Architect',
    desc: 'Built end-to-end workflow automation — Fusion scenarios, I/O Runtime proxy, DA.live Library plugins, and the review-to-publish pipeline.',
  },
];

const ORG_LINE = 'Representing <strong>Cognizant Technology Solutions</strong> · Adobe Practice';

/**
 * Decorates the team block.
 * Expects authored rows:
 *   Row 0: label text
 *   Row 1: heading (H2)
 *   Row 2: subtitle paragraph
 * Team cards are auto-generated.
 * @param {Element} block The team block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  block.id = 'team';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Team');

  const labelRow = rows[0];
  const headingRow = rows[1];
  const subtitleRow = rows[2];

  const labelText = labelRow ? labelRow.textContent.trim() : 'The Team';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>Key contributors.</h2>';
  const subtitleText = subtitleRow ? subtitleRow.textContent.trim() : '';

  const cardsHTML = TEAM_MEMBERS.map((m, i) => `
    <div class="team-card sr sr-d${i + 1}">
      <div class="team-avatar">${m.initial}</div>
      <h3>${m.name}</h3>
      <span class="team-role">${m.role}</span>
      <p>${m.desc}</p>
    </div>
  `).join('');

  block.textContent = '';
  block.innerHTML = `
    <div class="sr">
      <span class="label team-label-center">${labelText}</span>
      ${headingHTML}
      <p class="subtitle team-subtitle">${subtitleText}</p>
    </div>
    <div class="team-grid">${cardsHTML}</div>
    <div class="team-org sr sr-d4">${ORG_LINE}</div>
  `;
}
