/**
 * Product Listing block — auto-lists all product pages from query-index.
 * Authored rows: none required (self-populating)
 * @param {Element} block
 */
export default async function decorate(block) {
  block.textContent = '';
  block.innerHTML = '<p class="product-listing-loading">Loading products…</p>';

  try {
    const resp = await fetch('/query-index.json');
    if (!resp.ok) throw new Error('Failed to load index');
    const json = await resp.json();

    const products = json.data.filter((item) => {
      const p = item.path || '';
      return p.startsWith('/products/') && p !== '/products/' && !p.endsWith('/nav');
    });

    if (!products.length) {
      block.innerHTML = '<p class="product-listing-empty">No products launched yet. Use the <strong>Launch Product</strong> form to create one.</p>';
      return;
    }

    // Sort by lastModified descending (newest first)
    products.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

    const cardsHTML = products.map((item) => {
      const title = item.title || 'Untitled Product';
      const desc = item.description || '';
      const image = item.image || '';
      const path = item.path || '#';
      const audience = item.audience || '';
      const date = item.lastModified
        ? new Date(item.lastModified * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

      return `
        <a href="${path}" class="product-listing-card sr">
          ${image ? `<div class="product-listing-card-img"><img src="${image}" alt="${title}" loading="lazy"></div>` : '<div class="product-listing-card-img product-listing-card-placeholder"></div>'}
          <div class="product-listing-card-body">
            <div class="product-listing-card-meta">
              ${audience ? `<span class="product-listing-card-audience">${audience}</span>` : ''}
              ${date ? `<span class="product-listing-card-date">${date}</span>` : ''}
            </div>
            <h3 class="product-listing-card-title">${title}</h3>
            ${desc ? `<p class="product-listing-card-desc">${desc}</p>` : ''}
            <span class="product-listing-card-link">View Product →</span>
          </div>
        </a>`;
    }).join('');

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
