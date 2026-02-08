/**
 * Terminal lines for the docs generator mockup.
 */
const TERMINAL_HTML = `
  <div class="tc"># ContentFlow Documentation Generator</div>
  <div class="tc"># Powered by Workfront Fusion + EDS Admin API</div>
  <br>
  <div><span class="tp"></span><span class="tcmd">contentflow generate --docs</span></div>
  <br>
  <div class="ti">\u2192 Creating Workfront project: "ContentFlow Docs"</div>
  <div class="ti">\u2192 Generating pages via EDS Admin API...</div>
  <br>
  <div class="tok">  \u2713 <span class="tf">/docs/architecture</span>      created</div>
  <div class="tok">  \u2713 <span class="tf">/docs/implementation</span>    created</div>
  <div class="tok">  \u2713 <span class="tf">/docs/fusion-scenarios</span>  created</div>
  <div class="tok">  \u2713 <span class="tf">/docs/da-live-plugins</span>  created</div>
  <div class="tok">  \u2713 <span class="tf">/docs/api-reference</span>    created</div>
  <div class="tok">  \u2713 <span class="tf">/docs/resources</span>        created</div>
  <br>
  <div class="ti">\u2192 6 pages generated in 8.2s</div>
  <div class="ti">\u2192 Workfront tasks assigned for review</div>
  <br>
  <div><span class="tp"></span><span class="cursor">_</span></div>
`;

const DOCS_TEXT_HEADING = 'Every great accelerator deserves great documentation.';
const DOCS_TEXT_PARA = 'One click triggers a Fusion workflow that generates complete site documentation — architecture, Fusion scenarios, DA.live plugin docs, API references, and step-by-step implementation guides.';
const DOCS_NOTE = 'The documentation pages don\u2019t exist yet. Click the button below and watch ContentFlow create them in real-time — the same way it creates product pages.';
const CTA_LABEL = 'Generate Site Documentation';
const CTA_SUB = 'One click \u00B7 Six pages \u00B7 Full documentation via Fusion';

const BOOK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';

/**
 * Decorates the docs block (Behind the Build).
 * Expects authored rows:
 *   Row 0: label text
 *   Row 1: heading (H2)
 *   Row 2: subtitle paragraph
 * Terminal and content are auto-generated.
 * @param {Element} block The docs block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  block.id = 'docs';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Behind the Build');

  const labelRow = rows[0];
  const headingRow = rows[1];
  const subtitleRow = rows[2];

  const labelText = labelRow ? labelRow.textContent.trim() : 'Behind the Build';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>How was this site built?</h2>';
  const subtitleText = subtitleRow ? subtitleRow.textContent.trim() : '';

  block.textContent = '';
  block.innerHTML = `
    <div class="sr">
      <span class="label">${labelText}</span>
      ${headingHTML}
      <p class="subtitle">${subtitleText}</p>
    </div>
    <div class="docs-grid">
      <div class="docs-text sr sr-d1">
        <h3>${DOCS_TEXT_HEADING}</h3>
        <p>${DOCS_TEXT_PARA}</p>
        <div class="docs-note">${DOCS_NOTE}</div>
      </div>
      <div class="terminal sr sr-d2">
        <div class="terminal-top">
          <div class="dot dot-r"></div>
          <div class="dot dot-y"></div>
          <div class="dot dot-g"></div>
          <div class="terminal-title">contentflow \u2014 docs generator</div>
        </div>
        <div class="terminal-body">${TERMINAL_HTML}</div>
      </div>
    </div>
    <div class="docs-cta sr">
      <button class="btn-docs" id="btnGenDocs">
        ${BOOK_ICON}
        ${CTA_LABEL}
      </button>
      <p class="docs-cta-sub">${CTA_SUB}</p>
    </div>
  `;

  // CTA button — placeholder for future Fusion webhook
  const btn = block.querySelector('#btnGenDocs');
  if (btn) {
    btn.addEventListener('click', () => {
      // eslint-disable-next-line no-alert
      window.alert('Docs generation via Fusion webhook coming soon!');
    });
  }
}
