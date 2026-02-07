import { animTimeout, clearAnimTimeouts } from '../../scripts/scripts.js';

/**
 * Pipeline step definitions (hardcoded — not authored content).
 */
const PIPELINE_STEPS = [
  { name: 'Create Workfront Project', tool: 'Fusion' },
  { name: 'Generate Product Image', tool: 'Firefly' },
  { name: 'Create Product Page', tool: 'EDS API' },
  { name: 'Create Blog Article', tool: 'EDS API' },
  { name: 'Create Campaign', tool: 'EDS API' },
  { name: 'Generate Brochure PDF', tool: 'PDF Services' },
  { name: 'Assign Review Tasks', tool: 'Workfront' },
  { name: 'Publish Product Page', tool: 'Fusion' },
  { name: 'Unpublish Campaign', tool: 'Fusion' },
];

const PIPELINE_ASSETS = [
  {
    label: 'Product', color: '#4B9CF5', bg: 'rgb(20 115 230 / 0.08)', icon: 'doc',
  },
  {
    label: 'Article', color: '#B07CE8', bg: 'rgb(146 86 217 / 0.08)', icon: 'pen',
  },
  {
    label: 'Campaign', color: '#0FB5AE', bg: 'rgb(15 181 174 / 0.08)', icon: 'clock',
  },
  {
    label: 'Brochure', color: '#F5A623', bg: 'rgb(230 134 25 / 0.08)', icon: 'book',
  },
];

const ASSET_ICONS = {
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
};

/**
 * Builds the pipeline console HTML.
 * @returns {string}
 */
function buildPipelineHTML() {
  const stepsHTML = PIPELINE_STEPS.map((s) => `
    <div class="pl-step" data-time="${s.time}">
      <div class="pl-status waiting">\u25CB</div>
      <div class="pl-step-info">
        <div class="pl-step-name">${s.name} <span class="pl-tool">${s.tool}</span></div>
      </div>
      <div class="pl-step-time">\u2014</div>
    </div>
  `).join('');

  const assetsHTML = PIPELINE_ASSETS.map((a, i) => `
    <div class="pl-asset" id="plAsset${i}">
      <div class="pl-asset-icon" style="background:${a.bg}">
        <svg viewBox="0 0 24 24" fill="none" stroke="${a.color}" stroke-width="1.5">${ASSET_ICONS[a.icon]}</svg>
      </div>
      <div class="pl-asset-label">${a.label}</div>
    </div>
  `).join('');

  return `
    <div class="pipeline" id="pipeline">
      <div class="pipeline-chrome">
        <div class="pipeline-dots">
          <span style="background:#FF5F57"></span>
          <span style="background:#FFBD2E"></span>
          <span style="background:#28C840"></span>
        </div>
        <div class="pipeline-title">ContentFlow Pipeline</div>
        <div class="pipeline-live"><div class="pipeline-live-dot"></div>Live</div>
      </div>
      <div class="pipeline-body">
        <div class="pl-trigger" id="plTrigger">
          <div class="pl-trigger-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
              <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>
            </svg>
          </div>
          <div class="pl-trigger-text"><strong>webhook received</strong> \u2192 product: "Pulse" by Shravan Bachu</div>
        </div>
        <div class="pl-steps">${stepsHTML}</div>
        <div class="pl-div"></div>
        <div class="pl-output">${assetsHTML}</div>
        <div class="pl-summary" id="plSummary">
          <div class="pl-summary-left">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            Pipeline complete
          </div>
          <div class="pl-summary-right">9 steps \u00B7</div>
        </div>
        <button class="pl-replay" id="plReplay">\u21BB Replay</button>
      </div>
    </div>
  `;
}

/**
 * Runs the pipeline animation sequence.
 * @param {boolean} andLoop Whether to loop after completion
 * @param {boolean} isVisible Whether the pipeline is currently in viewport
 */
function runPipeline(andLoop, isVisible) {
  const trigger = document.getElementById('plTrigger');
  const steps = [...document.querySelectorAll('.pl-step')];
  const assets = PIPELINE_ASSETS.map((_, i) => document.getElementById(`plAsset${i}`));
  const summary = document.getElementById('plSummary');
  const replay = document.getElementById('plReplay');

  if (!trigger) return;

  // Reset all
  trigger.classList.remove('vis');
  steps.forEach((s) => {
    s.classList.remove('vis', 'active', 'done');
    const status = s.querySelector('.pl-status');
    status.className = 'pl-status waiting';
    status.textContent = '\u25CB';
    s.querySelector('.pl-step-time').textContent = '\u2014';
  });
  assets.forEach((a) => { if (a) a.classList.remove('vis'); });
  summary.classList.remove('vis');
  replay.classList.remove('vis');

  let delay = 300;

  animTimeout(() => trigger.classList.add('vis'), delay);
  delay += 600;

  steps.forEach((step, i) => {
    const time = step.getAttribute('data-time');
    const ms = parseFloat(time) * 1000;

    animTimeout(() => {
      step.classList.add('vis', 'active');
      const status = step.querySelector('.pl-status');
      status.className = 'pl-status running';
      status.textContent = '\u25C9';
    }, delay);

    animTimeout(() => {
      step.classList.remove('active');
      step.classList.add('done');
      const status = step.querySelector('.pl-status');
      status.className = 'pl-status done';
      status.textContent = '\u2713';
      step.querySelector('.pl-step-time').textContent = time;
      if (i === 2 && assets[0]) assets[0].classList.add('vis');
      if (i === 3 && assets[1]) assets[1].classList.add('vis');
      if (i === 4 && assets[2]) assets[2].classList.add('vis');
      if (i === 5 && assets[3]) assets[3].classList.add('vis');
    }, delay + ms);

    delay += ms + 150;
  });

  animTimeout(() => {
    summary.classList.add('vis');
    let total = 0;
    steps.forEach((s) => { total += parseFloat(s.getAttribute('data-time')); });
    const totalEl = document.getElementById('plTotal');
    if (totalEl) totalEl.textContent = `${total.toFixed(1)}s`;
  }, delay + 200);

  // Loop: hold complete state then restart
  if (andLoop) {
    animTimeout(() => {
      if (!window.animPaused && isVisible) runPipeline(true, true);
    }, delay + 3500);
  }
}

/**
 * Decorates the hero block.
 * Expects authored rows: eyebrow, heading, description, buttons.
 * Generates pipeline console on the right side.
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Mark parent section for full-bleed styling
  const section = block.closest('.section');
  if (section) section.classList.add('hero-section');

  // Extract authored content from DA.live rows
  const eyebrowRow = rows[0] || null;
  const headingRow = rows[1] || null;
  const descRow = rows[2] || null;
  const buttonsRow = rows[3] || null;

  // Extract text content
  const eyebrowHTML = eyebrowRow ? eyebrowRow.querySelector('div')?.innerHTML || '' : '';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl ? headingEl.outerHTML : '<h1>ContentFlow</h1>';
  const descHTML = descRow ? descRow.querySelector('div')?.innerHTML || '' : '';

  // Extract buttons
  let buttonsHTML = '';
  if (buttonsRow) {
    const links = [...buttonsRow.querySelectorAll('a')];
    buttonsHTML = links.map((a, i) => {
      const cls = i === 0 ? 'btn btn-blue' : 'btn btn-outline';
      return `<a href="${a.getAttribute('href')}" class="${cls}">${a.textContent}</a>`;
    }).join('');
  }

  // Build hero structure
  block.textContent = '';
  block.innerHTML = `
    <div class="hero-grid">
      <div class="hero-content">
        <div class="hero-eyebrow">
          <div class="hero-eyebrow-dot"></div>
          <span>${eyebrowHTML}</span>
        </div>
        ${headingHTML}
        <div class="hero-desc">${descHTML}</div>
        <div class="hero-actions">${buttonsHTML}</div>
      </div>
      <div class="hero-visual">${buildPipelineHTML()}</div>
    </div>
    <div class="scroll-hint">
      <span>Scroll</span>
      <div class="scroll-hint-bar"></div>
    </div>
  `;

  // Style the h1 em tags
  const h1 = block.querySelector('h1');
  if (h1) {
    h1.innerHTML = h1.innerHTML.replace(/<em>(.*?)<\/em>/g, '<em>$1</em>');
  }

  // Replay button
  const replayBtn = block.querySelector('#plReplay');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      clearAnimTimeouts();
      runPipeline(true, true);
    });
  }

  // Pipeline visibility observer — start/stop animation on scroll
  let plVisible = false;
  const pipelineEl = block.querySelector('#pipeline');
  if (pipelineEl) {
    const observer = new IntersectionObserver((entries) => {
      plVisible = entries[0].isIntersecting;
      if (plVisible && !window.animPaused) {
        clearAnimTimeouts();
        runPipeline(true, true);
      }
      if (!plVisible) clearAnimTimeouts();
    }, { threshold: 0.2 });
    observer.observe(pipelineEl);
  }

  // Listen for animation resume event (from global toggle)
  document.addEventListener('animations:resume', () => {
    if (plVisible) {
      clearAnimTimeouts();
      runPipeline(true, true);
    }
  });
}
