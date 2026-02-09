/**
 * Product Listing block — reads product-directory.json from GitHub (no preview needed).
 * @param {Element} block
 */
export default async function decorate(block) {
  block.textContent = '';
  block.innerHTML = '<p class="product-listing-loading">Loading products…</p>';

  try {
    const resp = await fetch('https://raw.githubusercontent.com/shravanbac/cf/main/product-directory.json');
    if (!resp.ok) throw new Error('Product directory not found');
    const products = await resp.json();

    if (!products.length) {
      block.innerHTML = '<p class="product-listing-empty">No products launched yet. Use the <strong>Launch Product</strong> form to create one.</p>';
      return;
    }

    // Newest first
    const reversed = [...products].reverse();

    const cardsHTML = reversed.map((item) => `
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
        <p class="product-listing-count">${reversed.length} product${reversed.length > 1 ? 's' : ''} launched</p>
      </div>
      <div class="product-listing-grid">${cardsHTML}</div>`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Product listing error:', err);
    block.innerHTML = '<p class="product-listing-empty">Unable to load products. Please try again.</p>';
  }
}
