import { animTimeout, clearAnimTimeouts } from '../../scripts/scripts.js';

/**
 * Solution step definitions — hardcoded visual content.
 */
const SOLUTION_STEPS = [
  {
    num: '01',
    title: 'Submit',
    desc: 'Fill one form with product details — name, tagline, features. Fusion creates everything automatically.',
    color: '#4B9CF5',
    icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12h6M12 9v6"/>',
  },
  {
    num: '02',
    title: 'Auto-Create',
    desc: 'Fusion creates a Workfront project, product page, article, and brochure with Google Imagen hero images.',
    color: '#B07CE8',
    icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
  },
  {
    num: '03',
    title: 'Review & Approve',
    desc: 'Authors send for review from DA.live. Workfront manages the approval workflow with full audit trail.',
    color: '#F5A623',
    icon: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  },
  {
    num: '04',
    title: 'Auto-Publish',
    desc: 'Approved pages auto-publish via EDS Admin API. Rejected pages route back to author with comments.',
    color: '#33AB84',
    icon: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  },
];

/**
 * Builds the solution steps HTML.
 * @returns {string}
 */
function buildStepsHTML() {
  const stepsHTML = SOLUTION_STEPS.map((s) => `
    <div class="sol-step">
      <div class="sol-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="${s.color}" stroke-width="1.5" stroke-linecap="round">${s.icon}</svg>
      </div>
      <div class="sol-num">${s.num}</div>
      <h3>${s.title}</h3>
      <p>${s.desc}</p>
    </div>
  `).join('');

  return `
    <div class="sol-progress" id="solProgress"></div>
    <div class="sol-pulse" id="solPulse"></div>
    ${stepsHTML}
  `;
}

/**
 * Runs the solution step animation — pulse travels, steps light up sequentially.
 * @param {boolean} andLoop Whether to loop
 * @param {boolean} isVisible Whether the block is in viewport
 */
function runSolAnimation(andLoop, isVisible) {
  const steps = [...document.querySelectorAll('.sol-step')];
  const progress = document.getElementById('solProgress');
  const pulse = document.getElementById('solPulse');

  if (!progress || !pulse || steps.length === 0) return;

  const rights = ['62.5%', '37.5%', '20%', 'calc(12.5% + 10px)'];

  // Reset
  steps.forEach((s) => s.classList.remove('lit'));
  progress.style.right = 'calc(87.5% - 10px)';
  pulse.className = 'sol-pulse';

  steps.forEach((step, i) => {
    animTimeout(() => { pulse.className = `sol-pulse s${i}`; }, i * 700 + 200);
    animTimeout(() => {
      step.classList.add('lit');
      progress.style.right = rights[i];
    }, i * 700 + 500);
  });

  animTimeout(() => { pulse.className = 'sol-pulse done'; }, 3200);

  if (andLoop) {
    animTimeout(() => {
      if (!window.animPaused && isVisible) runSolAnimation(true, true);
    }, 6000);
  }
}

/**
 * Decorates the solution block.
 * Expects authored rows:
 *   Row 0: label text
 *   Row 1: heading (H2) — may contain gradient-text span
 *   Row 2: subtitle paragraph
 * Steps are auto-generated (not authored).
 * @param {Element} block The solution block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Set block ID for anchor navigation
  block.id = 'solution';

  const labelRow = rows[0];
  const headingRow = rows[1];
  const subtitleRow = rows[2];

  const labelText = labelRow ? labelRow.textContent.trim() : 'The Solution';
  const headingEl = headingRow ? headingRow.querySelector('h1, h2, h3') : null;
  const headingHTML = headingEl ? headingEl.outerHTML : '<h2>One request.<br><span class="gradient-text">Everything automated.</span></h2>';
  const subtitleText = subtitleRow ? subtitleRow.textContent.trim() : '';

  block.textContent = '';
  block.innerHTML = `
    <div class="solution-header sr">
      <div>
        <span class="label">${labelText}</span>
        ${headingHTML}
      </div>
      <p class="subtitle">${subtitleText}</p>
    </div>
    <div class="solution-steps sr sr-d2" id="solSteps">
      ${buildStepsHTML()}
    </div>
  `;

  // Animated progress — observe visibility
  let solVisible = false;
  const stepsEl = block.querySelector('#solSteps');
  if (stepsEl) {
    const observer = new IntersectionObserver((entries) => {
      solVisible = entries[0].isIntersecting;
      if (solVisible && !window.animPaused) {
        clearAnimTimeouts();
        runSolAnimation(true, true);
      }
    }, { threshold: 0.3 });
    observer.observe(stepsEl);
  }

  // Resume on global toggle
  document.addEventListener('animations:resume', () => {
    if (solVisible) {
      clearAnimTimeouts();
      runSolAnimation(true, true);
    }
  });
}
