/**
 * Phase tab definitions — hardcoded content.
 */
const PHASES = [
  {
    num: 'Phase 1',
    name: 'DA.live Today',
    label: 'Phase 1 — DA.live Today',
    title: 'The Authoring Revolution',
    desc: 'DA.live has changed how content teams author for Edge Delivery Services. Browser-based, collaborative, and browser-agnostic — it removed the Chrome-only Sidekick dependency and made EDS authoring accessible to everyone. Organizations are rapidly adopting it as their primary authoring surface.',
  },
  {
    num: 'Phase 2',
    name: 'The Gap',
    label: 'Phase 2 — The Governance Gap',
    title: 'No Review, No Approval, No Control',
    desc: 'DA.live has no built-in review or approval workflow. Authors can preview and publish without any oversight. There is no integration with Workfront or any enterprise workflow tool. Status tracking, audit trails, and governance are completely absent — the approval and workflow layer is broken.',
  },
  {
    num: 'Phase 3',
    name: 'The Bridge',
    label: 'Phase 3 — Building the Bridge',
    title: 'Connecting DA.live to Workfront via Fusion',
    desc: 'Content Workflow creates the missing governance layer. Custom DA.live Library plugins let authors trigger reviews and check status without leaving the editor. Fusion scenarios connect to Workfront for project management, task-based approvals, and decision routing — all secured through I/O Runtime proxy endpoints.',
  },
  {
    num: 'Phase 4',
    name: 'Auto-Publish',
    label: 'Phase 4 — Automated Publishing',
    title: 'Approve Once, Publish Everywhere',
    desc: 'When a reviewer approves in Workfront, Fusion automatically publishes the page via the EDS Admin API. Rejected pages route back to the author with comments. Live URLs are tracked in Workfront. The full content lifecycle — from authoring to governance to publishing — runs without a single manual handoff.',
  },
];

/**
 * Prose paragraphs + quote — hardcoded.
 */
const PROSE = [
  'DA.live is the latest trend in EDS authoring — and for good reason. It gives content teams a browser-based, collaborative WYSIWYG editor that works on any browser, removing the Chrome-only Sidekick dependency that held back adoption. Organizations are moving to DA.live fast.',
  'But there is a critical gap. DA.live has no built-in governance layer. There is no review process, no approval workflow, no integration with enterprise workflow tools like Workfront. Authors can preview and publish without any oversight. The approval and workflow story is completely broken.',
  'Content Workflow solves this by bridging DA.live authoring to Workfront governance and EDS publishing automation — all orchestrated through Fusion, secured by I/O Runtime, with AI-powered page creation via Google Imagen.',
];

const QUOTE = '"DA.live is transforming how teams author for EDS — but without governance, review, and automated publishing, enterprise adoption hits a wall. Content Workflow builds the missing bridge."';

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
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>Why DA.live needs governance.</h2>';

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
