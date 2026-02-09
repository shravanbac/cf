/**
 * Product Listing block — reads product directory from DA.live page via .plain.html
 * Data source: /product-directory.plain.html (EDS plain content, no auth)
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

    // Parse table rows — each <tr> after header is a product
    const rows = [...doc.querySelectorAll('div > div')];
    if (rows.length < 1) {
      block.innerHTML = '<p class="product-listing-empty">No products launched yet. Use the <strong>Launch Product</strong> form to create one.</p>';
      return;
    }

    // Each row has 5 cells: path, title, description, image, audience
    const products = rows.map((row) => {
      const cells = [...row.children];
      if (cells.length < 2) return null;
      return {
        path: cells[0]?.textContent.trim() || '',
        title: cells[1]?.textContent.trim() || '',
        description: cells[2]?.textContent.trim() || '',
        image: cells[3]?.querySelector('img')?.src || cells[3]?.textContent.trim() || '',
        audience: cells[4]?.textContent.trim() || '',
      };
    }).filter((p) => p && p.path && p.path.startsWith('/'));

    if (!products.length) {
      block.innerHTML = '<p class="product-listing-empty">No products launched yet. Use the <strong>Launch Product</strong> form to create one.</p>';
      return;
    }

    // Reverse so newest appear first
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
