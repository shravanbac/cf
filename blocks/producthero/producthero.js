/**
 * Product Hero block.
 * Authored rows:
 *   Row 0 (1 col): eyebrow text  e.g. "New Product Launch"
 *   Row 1 (1 col): heading (H1)
 *   Row 2 (1 col): tagline paragraph
 *   Row 3 (2 cols): primary CTA link | secondary CTA link
 *   Row 4 (1 col): image (<picture> or <img>)
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const eyebrow = rows[0]?.textContent.trim() || 'New Product Launch';
  const headingEl = rows[1]?.querySelector('h1, h2');
  const headingHTML = headingEl ? headingEl.outerHTML : '<h1>Product</h1>';
  const tagline = rows[2]?.textContent.trim() || '';

  const ctaCols = rows[3] ? [...rows[3].children] : [];
  const primaryLink = ctaCols[0]?.querySelector('a');
  const secondaryLink = ctaCols[1]?.querySelector('a');

  const picture = rows[4]?.querySelector('picture');
  const img = rows[4]?.querySelector('img');

  const ctasHTML = `
    <div class="product-hero-actions">
      ${primaryLink ? `<a href="${primaryLink.href}" class="btn btn-primary">${primaryLink.textContent}</a>` : ''}
      ${secondaryLink ? `<a href="${secondaryLink.href}" class="btn btn-secondary">${secondaryLink.textContent}</a>` : ''}
    </div>`;

  let imageHTML = '';
  if (picture) {
    imageHTML = picture.outerHTML;
  } else if (img) {
    imageHTML = `<img src="${img.src}" alt="${img.alt || ''}" loading="eager">`;
  }

  block.textContent = '';
  block.innerHTML = `
    <div class="product-hero-grid">
      <div class="product-hero-content">
        <div class="product-hero-eyebrow sr">
          <span class="product-hero-dot"></span>
          <span>${eyebrow}</span>
        </div>
        <div class="sr sr-d1">${headingHTML}</div>
        <p class="product-hero-tagline sr sr-d2">${tagline}</p>
        <div class="sr sr-d3">${ctasHTML}</div>
      </div>
      <div class="product-hero-img sr sr-d2">
        <div class="product-hero-img-frame">${imageHTML}</div>
        <p class="product-hero-ai-badge"><em>Image generated using Google Imagen 3 model via Gemini API</em></p>
      </div>
    </div>`;
}
