/**
 * Product Listing block — reads product directory from DA.live page via .plain.html
 * Data source: /product-directory.plain.html
 * @param {Element} block
 */
export default async function decorate(block) {
  block.textContent = '';
  block.innerHTML = '<p class="product-listing-loading">Loading products…</p>';

  try {
    const resp = await fetch('/product-directory.plain.html');
    if (!resp.ok) throw new Error('Product directory not found');
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // The product-directory block renders as nested divs
    // Each row: direct child div of the block wrapper
    const wrapper = doc.querySelector('.product-directory');
    if (!wrapper) throw new Error('No product-directory block found');

    const rows = [...wrapper.children];
    const products = rows.map((row) => {
      const cells = [...row.children];
      if (cells.length < 2) return null;

      // Image: could be <img>, <picture>, <a>, or plain text URL
      let image = '';
      if (cells[3]) {
        const img = cells[3].querySelector('img');
        const anchor = cells[3].querySelector('a');
        if (img) {
          image = img.src;
        } else if (anchor) {
          image = anchor.href || anchor.textContent.trim();
        } else {
          image = cells[3].textContent.trim();
        }
      }

      return {
        path: cells[0]?.textContent.trim() || '',
        title: cells[1]?.textContent.trim() || '',
        description: cells[2]?.textContent.trim() || '',
        image,
        audience: cells[4]?.textContent.trim() || '',
      };
    }).filter((p) => p && p.path && p.path.startsWith('/'));

    if (!products.length) {
      block.innerHTML = '<p class="product-listing-empty">No products launched yet. Use the <strong>Launch Product</strong> form to create one.</p>';
      return;
    }

    // Newest first
    products.reverse();

    const cardsHTML = products.map((item) => `
      <a href="${item.path}" class="product-listing-card sr">
        ${item.image ? `<div class="product-listing-card-img"><img src="${item.image}" alt="${item.title}" loading="lazy"></div>` : '<div class="product-listing-card-img product-listing-card-placeholder"></div>'}
        <div class="product-listing-card-body">
          <div class="product-listing-card-meta">
            ${item.audience ? `<span class="product-listing-card-audience">${item.audience}</span>` : ''}
          </div>
          <h3 class="product-listing-card-title">${item.title}</h3>
          ${item.description ? `<p class="product-listing-card-desc">${item.description}</p>` : ''}
          <span class="product-listing-card-link">View Product →</span>
        </div>
      </a>`).join('');

    block.innerHTML = `
      <div class="product-listing-header">
        <h2>All Products</h2>
        <p class="product-listing-count">${products.length} product${products.length > 1 ? 's' : ''} launched</p>
      </div>
      <div class="product-listing-grid">${cardsHTML}</div>`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Product listing error:', err);
    block.innerHTML = '<p class="product-listing-empty">Unable to load products. Please try again.</p>';
  }
}
