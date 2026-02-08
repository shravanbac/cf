/**
 * Phase tab definitions — hardcoded content.
 */
const PHASES = [
  {
    num: 'Phase 1',
    name: 'Discovery',
    label: 'Phase 1 — Discovery',
    title: 'Identifying the Gap',
    desc: 'Analyzed content workflows across multiple EDS implementations. 80% of launch delays came from disconnected review processes. Teams were using 4+ tools just to get content from draft to published — email for approvals, Slack for status, spreadsheets for tracking, and manual publishing.',
  },
  {
    num: 'Phase 2',
    name: 'Architecture',
    label: 'Phase 2 — Architecture',
    title: 'Designing the Integration Layer',
    desc: 'Architected a secure, serverless solution using I/O Runtime as proxy, Fusion for orchestration, and EDS Admin API for publishing. The key insight: Workfront could serve as the governance hub while DA.live remained the authoring surface — connected through Fusion webhooks and custom Library plugins.',
  },
  {
    num: 'Phase 3',
    name: 'Build',
    label: 'Phase 3 — Build',
    title: 'Developing the Accelerator',
    desc: 'Custom DA.live Library plugins for review workflows, Fusion scenarios with environment routing, auto-generation pipelines, and Firefly integration for hero image creation. Each component was built to be modular and importable into any EDS project.',
  },
  {
    num: 'Phase 4',
    name: 'Ship',
    label: 'Phase 4 — Ship',
    title: 'Live & Battle-Tested',
    desc: 'Deployed across real enterprise workflows with open-source code and importable Fusion templates. The accelerator handles the full content lifecycle — from a single form submission through automatic page creation, review assignment, SEO scoring, approval, publishing, and scheduled expiry.',
  },
];

/**
 * Prose paragraphs + quote — hardcoded.
 */
const PROSE = [
  'Enterprise clients adopting AEM Edge Delivery Services kept hitting the same wall. DA.live delivered exceptional authoring speed, but the moment content needed governance — reviews, approvals, compliance checks, scheduled publishing — teams fell back to email chains, Slack threads, and spreadsheets.',
  'At Cognizant, we saw this pattern across industries — healthcare needing documented approval chains, financial services requiring compliance gates, and marketing teams running campaigns that demanded precise timing.',
  'ContentFlow was designed to be the missing integration layer — connecting DA.live\'s authoring experience to Workfront\'s workflow engine through Fusion automation, I/O Runtime security, and Firefly-powered image generation.',
];

const QUOTE = '"What if a customer could fill out one form and get a product page, a blog article, a campaign with auto-expiry, and a downloadable brochure — all without a single manual handoff?"';

/**
 * Shows a specific phase panel by index.
 * @param {number} idx Phase index
 * @param {NodeList} tabs All tab buttons
 * @param {NodeList} panels All panel elements
 */
function showPhase(idx, tabs, panels) {
  tabs.forEach((t) => t.classList.remove('active'));
  panels.forEach((p) => p.classList.remove('active'));
  tabs[idx].classList.add('active');
  panels[idx].classList.add('active');
}

/**
 * Decorates the backstory block.
 * Expects authored rows:
 *   Row 0: label text
 *   Row 1: heading (H2)
 * Prose, quote, and phases are auto-generated.
 * @param {Element} block The backstory block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  block.id = 'background';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Background');

  const labelRow = rows[0];
  const headingRow = rows[1];

  const labelText = labelRow ? labelRow.textContent.trim() : 'The Background';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>How ContentFlow was born.</h2>';

  const proseHTML = PROSE.map((p) => `<p>${p}</p>`).join('');

  const tabsHTML = PHASES.map((ph, i) => `
    <button class="phase-tab${i === 0 ? ' active' : ''}" data-phase="${i}">
      <span class="phase-tab-num">${ph.num}</span>
      <span class="phase-tab-name">${ph.name}</span>
    </button>
  `).join('');

  const panelsHTML = PHASES.map((ph, i) => `
    <div class="phase-panel${i === 0 ? ' active' : ''}">
      <div class="phase-panel-label">${ph.label}</div>
      <h4>${ph.title}</h4>
      <p>${ph.desc}</p>
    </div>
  `).join('');

  block.textContent = '';
  block.innerHTML = `
    <div class="sr">
      <span class="label">${labelText}</span>
      ${headingHTML}
    </div>
    <div class="backstory-grid">
      <div class="backstory-prose sr sr-d1">
        ${proseHTML}
        <div class="backstory-quote"><p>${QUOTE}</p></div>
      </div>
      <div class="sr sr-d3">
        <div class="phase-tabs">${tabsHTML}</div>
        <div class="phase-panels">${panelsHTML}</div>
      </div>
    </div>
  `;

  // Tab interaction
  const tabs = [...block.querySelectorAll('.phase-tab')];
  const panels = [...block.querySelectorAll('.phase-panel')];
  let phaseIdx = 0;
  let manual = false;
  let cycleId = null;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      phaseIdx = parseInt(tab.getAttribute('data-phase'), 10);
      showPhase(phaseIdx, tabs, panels);
      manual = true;
      if (cycleId) clearInterval(cycleId);
    });
  });

  // Auto-cycle phases every 4s
  function startCycle() {
    cycleId = setInterval(() => {
      if (window.animPaused || manual) return;
      phaseIdx = (phaseIdx + 1) % PHASES.length;
      showPhase(phaseIdx, tabs, panels);
    }, 4000);
  }

  // Observe visibility to start/stop cycle
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !manual) {
      startCycle();
    } else if (cycleId) {
      clearInterval(cycleId);
      cycleId = null;
    }
  }, { threshold: 0.2 });
  observer.observe(block);

  // Resume on global animation toggle
  document.addEventListener('animations:resume', () => {
    if (!manual) {
      if (cycleId) clearInterval(cycleId);
      startCycle();
    }
  });
}
