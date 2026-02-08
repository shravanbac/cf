/**
 * Article Hero block.
 * Authored rows:
 *   Row 0 (2 cols): breadcrumb label | breadcrumb URL
 *   Row 1 (3 cols): tag text | date | author
 *   Row 2 (1 col): heading (H1)
 *   Row 3 (1 col): lead paragraph
 *   Row 4 (1 col, optional): image (<picture>)
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Breadcrumb
  const bcCols = rows[0] ? [...rows[0].children] : [];
  const bcLabel = bcCols[0]?.textContent.trim() || '';
  const bcLink = bcCols[1]?.querySelector('a');
  const bcHref = bcLink?.href || bcCols[1]?.textContent.trim() || '/';

  // Meta
  const metaCols = rows[1] ? [...rows[1].children] : [];
  const tag = metaCols[0]?.textContent.trim() || 'Article';
  const date = metaCols[1]?.textContent.trim() || '';
  const author = metaCols[2]?.textContent.trim() || '';

  // Heading & lead
  const headingEl = rows[2]?.querySelector('h1, h2');
  const headingHTML = headingEl ? headingEl.outerHTML : '<h1>Article</h1>';
  const lead = rows[3]?.textContent.trim() || '';

  // Image
  const picture = rows[4]?.querySelector('picture');
  const img = rows[4]?.querySelector('img');
  let imageHTML = '';
  if (picture) {
    imageHTML = picture.outerHTML;
  } else if (img) {
    imageHTML = `<img src="${img.src}" alt="${img.alt || ''}" loading="eager">`;
  }

  const imageSection = imageHTML
    ? `<div class="article-hero-img sr sr-d2">
        <div class="article-hero-img-frame">${imageHTML}</div>
        <p class="article-hero-ai-badge"><em>Image generated using Google Imagen 3 model via Gemini API</em></p>
      </div>`
    : '';

  block.textContent = '';
  block.innerHTML = `
    <div class="article-hero-inner">
      <div class="article-hero-breadcrumb sr"><a href="${bcHref}">${bcLabel}</a> / Article</div>
      <div class="article-hero-meta sr sr-d1">
        <span class="article-hero-tag">${tag}</span>
        <span class="article-hero-date">${date}</span>
        ${author ? `<span class="article-hero-author">by ${author}</span>` : ''}
      </div>
      <div class="sr sr-d1">${headingHTML}</div>
      ${lead ? `<p class="article-hero-lead sr sr-d2">${lead}</p>` : ''}
    </div>
    ${imageSection}`;
}
