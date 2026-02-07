import { getMetadata } from '../../scripts/aem.js';

/**
 * Decorates the header block — ContentFlow navigation.
 * Fetches /nav authored in DA.live.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // Fetch nav content
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const resp = await fetch(`${navPath}.plain.html`);
  if (!resp.ok) return;

  const html = await resp.text();
  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  // Extract links from authored nav (expected: a <ul> with navigation links)
  const links = [...fragment.querySelectorAll('ul a')];

  // Build nav
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="/" class="nav-brand">
        <div class="nav-logo">CF</div>
        <span class="nav-name">ContentFlow</span>
      </a>
      <ul class="nav-links" id="navLinks">
        ${links.map((a) => `<li><a href="${a.getAttribute('href')}">${a.textContent}</a></li>`).join('')}
      </ul>
      <div class="nav-right">
        <span class="nav-tag">AEM Rockstar 2026</span>
        <a href="#launch" class="nav-cta">Launch Product →</a>
      </div>
      <button class="hamburger" id="hamburgerBtn" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;

  // Mobile drawer
  const drawer = document.createElement('div');
  drawer.className = 'mobile-drawer';
  drawer.id = 'mobileDrawer';
  drawer.innerHTML = `
    <span class="mob-tag">AEM Rockstar 2026</span>
    ${links.map((a) => `<a href="${a.getAttribute('href')}">${a.textContent}</a>`).join('')}
    <a href="#launch" class="mob-cta">Launch Product →</a>
  `;

  block.textContent = '';
  block.append(nav);
  block.append(drawer);

  // Hamburger toggle
  const hamburger = nav.querySelector('#hamburgerBtn');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    drawer.classList.toggle('open');
  });

  // Close drawer on link click
  drawer.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      drawer.classList.remove('open');
    });
  });
}
