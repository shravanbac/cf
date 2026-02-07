/*
 * ContentFlow — EDS Core Scripts
 * Handles: block loading, section metadata, lazy loading, scroll reveal
 */

/**
 * Sanitises a string for use as class name.
 */
export function toClassName(name) {
  return typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';
}

/**
 * Sanitises a string for use as a js property name.
 */
export function toCamelCase(name) {
  return toClassName(name).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Retrieves the content of metadata tags.
 */
export function getMetadata(name) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = [...document.querySelectorAll(`meta[${attr}="${name}"]`)].map((m) => m.content).join(', ');
  return meta || '';
}

/**
 * Add <link rel="stylesheet" href="..."> to <head>.
 */
export function loadCSS(href) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`head > link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.append(link);
    } else {
      resolve();
    }
  });
}

/**
 * Load a <script> tag.
 */
export function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`head > script[src="${src}"]`)) {
      const script = document.createElement('script');
      script.src = src;
      Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    } else {
      resolve();
    }
  });
}

/**
 * Returns a path that is relative to the current site.
 */
export function makeRelative(href) {
  const url = new URL(href, window.location.href);
  const host = window.location.hostname;
  if (url.hostname === host) return url.pathname + url.search + url.hash;
  return href;
}

/**
 * Wraps images with links if preceded by an anchor.
 */
function decorateButtons(el) {
  el.querySelectorAll('a').forEach((a) => {
    a.title = a.title || a.textContent;
    const up = a.parentElement;
    const twoup = a.parentElement.parentElement;
    if (!a.querySelector('img')) {
      if (up.childNodes.length === 1 && (up.tagName === 'P' || up.tagName === 'DIV')) {
        a.className = 'button primary';
        up.classList.add('button-container');
      }
      if (up.childNodes.length === 1 && up.tagName === 'STRONG'
        && twoup.childNodes.length === 1 && twoup.tagName === 'P') {
        a.className = 'button primary';
        twoup.classList.add('button-container');
      }
      if (up.childNodes.length === 1 && up.tagName === 'EM'
        && twoup.childNodes.length === 1 && twoup.tagName === 'P') {
        a.className = 'button secondary';
        twoup.classList.add('button-container');
      }
    }
  });
}

/**
 * Adds section metadata from a 'section-metadata' block.
 */
function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((el) => {
      if (el.tagName === 'DIV' && el.classList.length > 0) {
        // block
        if (defaultContent) {
          defaultContent = false;
        }
        wrappers.push(el);
      } else {
        // default content
        if (!defaultContent) {
          const wrapper = document.createElement('div');
          wrapper.className = 'default-content-wrapper';
          wrappers.push(wrapper);
          defaultContent = true;
        }
        wrappers[wrappers.length - 1].append(el);
      }
    });
    wrappers.forEach((wrapper) => section.append(wrapper));
    section.classList.add('section');

    // section metadata
    const sectionMeta = section.querySelector('div.section-metadata');
    if (sectionMeta) {
      const meta = {};
      [...sectionMeta.children].forEach((row) => {
        const key = toClassName(row.children[0]?.textContent);
        const value = row.children[1]?.textContent;
        if (key && value) meta[key] = value;
      });
      Object.entries(meta).forEach(([key, value]) => {
        if (key === 'style') {
          value.split(',').map((s) => s.trim()).forEach((s) => section.classList.add(s));
        } else {
          section.dataset[toCamelCase(key)] = value;
        }
      });
      sectionMeta.remove();
    }
  });
}

/**
 * Decorate blocks in a container element.
 */
function decorateBlocks(main) {
  main.querySelectorAll('div.section > div').forEach((block) => {
    const classes = [...block.classList];
    if (classes.length === 0 || classes.every((c) => c === 'default-content-wrapper')) return;
    const blockName = classes[0];
    if (!blockName) return;
    block.classList.add('block');
    block.dataset.blockName = blockName;
    const blockStatus = block.dataset.blockStatus || 'loading';
    block.dataset.blockStatus = blockStatus;

    // decorate block children as rows / cols
    const rows = [...block.children];
    rows.forEach((row) => {
      row.classList.add(`${blockName}-row`);
      [...row.children].forEach((col) => {
        col.classList.add(`${blockName}-col`);
      });
    });
  });
}

/**
 * Loads a block's JS and CSS, then calls decorate().
 */
async function loadBlock(block) {
  const { blockName } = block.dataset;
  if (!blockName || block.dataset.blockStatus === 'loaded') return block;
  block.dataset.blockStatus = 'loading';
  try {
    const cssLoaded = loadCSS(`/blocks/${blockName}/${blockName}.css`);
    const mod = await import(`/blocks/${blockName}/${blockName}.js`);
    if (mod.default) await mod.default(block);
    await cssLoaded;
    block.dataset.blockStatus = 'loaded';
  } catch (err) {
    block.dataset.blockStatus = 'error';
    // eslint-disable-next-line no-console
    console.error(`Failed to load block: ${blockName}`, err);
  }
  return block;
}

/**
 * Loads JS and CSS for all blocks in a container.
 */
export async function loadBlocks(main) {
  const blocks = [...main.querySelectorAll('div.block')];
  for (let i = 0; i < blocks.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await loadBlock(blocks[i]);
  }
}

/**
 * Load the header block.
 */
async function loadHeader(header) {
  const headerBlock = document.createElement('div');
  headerBlock.classList.add('header', 'block');
  headerBlock.dataset.blockName = 'header';
  header.append(headerBlock);
  await loadBlock(headerBlock);
}

/**
 * Load the footer block.
 */
async function loadFooter(footer) {
  const footerBlock = document.createElement('div');
  footerBlock.classList.add('footer', 'block');
  footerBlock.dataset.blockName = 'footer';
  footer.append(footerBlock);
  await loadBlock(footerBlock);
}

/**
 * Sets up scroll-triggered reveal animations.
 */
function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('vis');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.sr').forEach((el) => observer.observe(el));
}

/**
 * Global animation pause/play system.
 */
window.animPaused = false;
window.animTimeouts = [];

export function animTimeout(fn, ms) {
  const id = setTimeout(() => {
    if (!window.animPaused) fn();
  }, ms);
  window.animTimeouts.push(id);
  return id;
}

export function clearAnimTimeouts() {
  window.animTimeouts.forEach((id) => clearTimeout(id));
  window.animTimeouts = [];
}

function toggleAnimations() {
  window.animPaused = !window.animPaused;
  const btn = document.getElementById('animToggle');
  if (btn) {
    btn.classList.toggle('paused', window.animPaused);
    btn.querySelector('.anim-toggle-label').textContent = window.animPaused ? 'Play animations' : 'Pause animations';
  }
  if (window.animPaused) {
    clearAnimTimeouts();
  } else {
    // Dispatch resume event for blocks to listen to
    document.dispatchEvent(new CustomEvent('animations:resume'));
  }
}

/**
 * Builds the floating animation toggle button.
 */
function buildAnimToggle() {
  const btn = document.createElement('button');
  btn.className = 'anim-toggle';
  btn.id = 'animToggle';
  btn.setAttribute('aria-label', 'Pause animations');
  btn.innerHTML = `
    <span class="anim-toggle-label">Pause animations</span>
    <svg class="icon-pause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
    <svg class="icon-play" viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>
  `;
  btn.addEventListener('click', toggleAnimations);
  document.body.append(btn);
}

/**
 * Decorates the main element (exported for fragment block).
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateButtons(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Decorates the page.
 */
async function loadPage() {
  const main = document.querySelector('main');
  if (main) {
    decorateMain(main);

    // load LCP block(s) first
    const lcpBlocks = [...main.querySelectorAll('.hero.block, .pipeline.block')];
    for (let i = 0; i < lcpBlocks.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await loadBlock(lcpBlocks[i]);
    }

    // load remaining blocks
    await loadBlocks(main);

    // load header/footer
    await loadHeader(document.querySelector('header'));
    await loadFooter(document.querySelector('footer'));

    // scroll reveal
    setupScrollReveal();

    // animation toggle
    buildAnimToggle();

    // mark page as loaded
    document.body.classList.add('appear');
  }
}

/**
 * Loads styles and kicks off page decoration.
 */
async function loadEager() {
  document.documentElement.lang = 'en';
  await loadCSS('/styles/styles.css');
  await loadPage();
}

loadEager();
