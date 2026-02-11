/**
 * Card definitions — each with unique browser-preview mockup.
 */
const DELIVERABLE_CARDS = [
  {
    url: 'sbtechlabs.com/products/pulse',
    badge: 'Auto-Created',
    badgeStyle: '',
    title: 'Product Page',
    desc: 'Hero, features grid, pricing, and CTAs — pre-filled from form.',
    preview: `
      <div class="mock-h" style="width:60%"></div>
      <div class="mock-line" style="width:85%"></div>
      <div class="mock-line" style="width:70%"></div>
      <div class="mock-blocks"><div class="mock-block"></div><div class="mock-block"></div><div class="mock-block"></div></div>
      <div class="mock-line" style="width:40%;margin-top:14px;height:12px;border-radius:6px;background:rgb(20 115 230 / 12%)"></div>`,
  },
  {
    url: 'sbtechlabs.com/blog/introducing-pulse',
    badge: 'Auto-Generated',
    badgeStyle: '',
    title: 'Blog Article',
    desc: 'Launch announcement drafted from product description.',
    preview: `
      <div class="mock-h" style="width:80%"></div>
      <div class="del-meta">
        <span class="del-tag">PRODUCT</span>
        <span class="del-date">Feb 6, 2026 · 4 min</span>
      </div>
      <div class="mock-line" style="width:100%"></div>
      <div class="mock-line" style="width:95%"></div>
      <div class="mock-line" style="width:90%"></div>
      <div class="mock-line" style="width:85%"></div>
      <div class="mock-line" style="width:65%"></div>`,
  },
  {
    url: 'sbtechlabs.com/resources/pulse-brochure.pdf',
    badge: 'Auto-Generated',
    badgeStyle: '',
    title: 'Product Brochure',
    desc: 'Branded PDF from template and product data. Print-ready.',
    preview: `
      <div class="del-pdf-layout">
        <div class="del-pdf-left">
          <div class="del-pdf-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgb(45 157 120 / 30%)" stroke-width="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="mock-line" style="width:70%"></div>
          <div class="mock-line" style="width:55%"></div>
        </div>
        <div class="del-pdf-right">
          <div class="mock-line" style="width:100%"></div>
          <div class="mock-line" style="width:90%"></div>
          <div class="mock-line" style="width:95%"></div>
          <div class="mock-line" style="width:75%"></div>
          <div class="mock-line" style="width:85%"></div>
        </div>
      </div>`,
  },
];

/**
 * Decorates the deliverables block.
 * Expects authored rows:
 *   Row 0: label text
 *   Row 1: heading (H2)
 *   Row 2: subtitle paragraph
 * Cards are auto-generated.
 * @param {Element} block The deliverables block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  block.id = 'deliverables';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Auto-Generated Assets');

  const labelRow = rows[0];
  const headingRow = rows[1];
  const subtitleRow = rows[2];

  const labelText = labelRow ? labelRow.textContent.trim() : 'Auto-Generated Assets';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>One Workflow. Three deliverables.</h2>';
  const subtitleText = subtitleRow ? subtitleRow.textContent.trim() : '';

  const cardsHTML = DELIVERABLE_CARDS.map((card, i) => {
    const badgeCls = card.badgeStyle ? `del-badge ${card.badgeStyle}` : 'del-badge';
    const previewAttr = card.previewStyle ? ` style="${card.previewStyle}"` : '';
    return `
      <div class="del-card sr sr-d${i + 1}">
        <div class="del-browser">
          <div class="dot dot-r"></div>
          <div class="dot dot-y"></div>
          <div class="dot dot-g"></div>
          <div class="del-url">${card.url}</div>
        </div>
        <div class="del-preview"${previewAttr}>
          <span class="${badgeCls}">${card.badge}</span>
          ${card.preview}
        </div>
        <div class="del-info">
          <div>
            <h3>${card.title}</h3>
            <p>${card.desc}</p>
          </div>
        </div>
      </div>`;
  }).join('');

  block.textContent = '';
  block.innerHTML = `
    <div class="deliverables-header sr">
      <span class="label">${labelText}</span>
      ${headingHTML}
      <p class="subtitle">${subtitleText}</p>
    </div>
    <div class="del-grid">${cardsHTML}</div>
  `;
}
