/**
 * Countdown Banner block — sticky top bar with live countdown.
 * Authored rows:
 *   Row 0 (1 col): duration in seconds (e.g. "120")
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const duration = parseInt(rows[0]?.textContent.trim(), 10) || 120;

  block.textContent = '';
  block.innerHTML = `
    <div class="countdown-banner-inner">
      <span class="countdown-banner-dot"></span>
      <span>Flash Campaign — Expires in</span>
      <span class="countdown-banner-timer">--:--</span>
    </div>`;

  const timerEl = block.querySelector('.countdown-banner-timer');
  let remaining = duration;

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    if (remaining <= 0) {
      block.classList.add('expired');
      block.querySelector('.countdown-banner-inner').innerHTML = '<span>This flash campaign has expired</span>';
      return;
    }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    timerEl.textContent = `${pad(m)}:${pad(s)}`;
    remaining -= 1;
    setTimeout(tick, 1000);
  }

  tick();
}
