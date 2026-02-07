/**
 * Footer Block
 * Fetches /footer content from DA.live.
 */
export default async function decorate(block) {
  const resp = await fetch('/footer.plain.html');
  if (!resp.ok) return;
  const html = await resp.text();

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  // Build footer matching V4 design
  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  footer.innerHTML = `
    <div class="footer-l">${fragment.innerHTML}</div>
    <div class="footer-r">AEM Rockstar 2026</div>
  `;

  block.textContent = '';
  block.append(footer);
}
