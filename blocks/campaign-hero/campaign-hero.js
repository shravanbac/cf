/**
 * Campaign Hero block.
 * Authored rows:
 *   Row 0 (1 col): flash tag text e.g. "Flash Campaign · 2 Min"
 *   Row 1 (1 col): heading (H1)
 *   Row 2 (1 col): tagline
 *   Row 3 (1 col): description
 *   Row 4 (1 col): duration in seconds e.g. "120"
 *   Row 5 (2 cols): primary CTA text | primary CTA URL
 *   Row 6 (2 cols, optional): secondary CTA text | secondary CTA URL
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const flashTag = rows[0]?.textContent.trim() || 'Flash Campaign';
  const headingEl = rows[1]?.querySelector('h1, h2');
  const headingHTML = headingEl ? headingEl.outerHTML : '<h1>Campaign</h1>';
  const tagline = rows[2]?.textContent.trim() || '';
  const desc = rows[3]?.textContent.trim() || '';
  const duration = parseInt(rows[4]?.textContent.trim(), 10) || 120;

  const cta1Cols = rows[5] ? [...rows[5].children] : [];
  const cta1Text = cta1Cols[0]?.textContent.trim() || '';
  const cta1Link = cta1Cols[1]?.querySelector('a');
  const cta1Href = cta1Link?.href || cta1Cols[1]?.textContent.trim() || '#';

  const cta2Cols = rows[6] ? [...rows[6].children] : [];
  const cta2Text = cta2Cols[0]?.textContent.trim() || '';
  const cta2Link = cta2Cols[1]?.querySelector('a');
  const cta2Href = cta2Link?.href || cta2Cols[1]?.textContent.trim() || '#';

  block.textContent = '';
  block.innerHTML = `
    <div class="campaign-hero-grid">
      <div class="campaign-hero-content">
        <div class="campaign-hero-flash-tag sr"><span></span>${flashTag}</div>
        <div class="sr sr-d1">${headingHTML}</div>
        ${tagline ? `<p class="campaign-hero-tagline sr sr-d2">${tagline}</p>` : ''}
        ${desc ? `<p class="campaign-hero-desc sr sr-d2">${desc}</p>` : ''}
        <div class="campaign-hero-actions sr sr-d3">
          ${cta1Text ? `<a href="${cta1Href}" class="btn btn-primary">${cta1Text}</a>` : ''}
          ${cta2Text ? `<a href="${cta2Href}" class="btn btn-secondary">${cta2Text}</a>` : ''}
        </div>
      </div>
      <div class="campaign-hero-timer-card sr sr-d2">
        <div class="campaign-hero-timer-label">Campaign expires in</div>
        <div class="campaign-hero-timer-digits">
          <div class="campaign-hero-timer-unit">
            <div class="campaign-hero-timer-num" id="chTimerMin">--</div>
            <span class="campaign-hero-timer-unit-label">Min</span>
          </div>
          <div class="campaign-hero-timer-sep">:</div>
          <div class="campaign-hero-timer-unit">
            <div class="campaign-hero-timer-num" id="chTimerSec">--</div>
            <span class="campaign-hero-timer-unit-label">Sec</span>
          </div>
        </div>
        <div class="campaign-hero-timer-status" id="chTimerStatus">Status: <strong>Live</strong></div>
        <div class="campaign-hero-timer-progress">
          <div class="campaign-hero-timer-bar" id="chTimerBar" style="width:100%"></div>
        </div>
      </div>
    </div>
    <div class="campaign-hero-expired-overlay" id="chExpiredOverlay">
      <div class="campaign-hero-expired-card">
        <div class="campaign-hero-expired-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h2>Campaign Expired</h2>
        <p>This flash campaign has ended. The page will be automatically unpublished by ContentFlow's Fusion automation.</p>
        ${cta1Href !== '#' ? `<a href="${cta1Href}">Go to Product Page →</a>` : ''}
      </div>
    </div>`;

  // Timer logic
  const minEl = block.querySelector('#chTimerMin');
  const secEl = block.querySelector('#chTimerSec');
  const barEl = block.querySelector('#chTimerBar');
  const statusEl = block.querySelector('#chTimerStatus');
  const overlayEl = block.querySelector('#chExpiredOverlay');
  let remaining = duration;

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    minEl.textContent = pad(m);
    secEl.textContent = pad(s);

    const pct = (remaining / duration) * 100;
    barEl.style.width = `${pct}%`;

    barEl.classList.remove('low', 'critical');
    minEl.classList.remove('urgent');
    secEl.classList.remove('urgent');

    if (remaining <= 30) {
      barEl.classList.add('critical');
      minEl.classList.add('urgent');
      secEl.classList.add('urgent');
    } else if (remaining <= 60) {
      barEl.classList.add('low');
    }

    if (remaining <= 0) {
      statusEl.innerHTML = 'Status: <strong>Expired</strong>';
      statusEl.classList.add('expired');
      setTimeout(() => { overlayEl.classList.add('show'); }, 800);
      return;
    }

    remaining -= 1;
    setTimeout(tick, 1000);
  }

  tick();
}
