/**
 * Product Listing block — lists all product pages from DA.live list API.
 * Authored rows: none required (self-populating)
 * @param {Element} block
 */
export default async function decorate(block) {
  block.textContent = '';
  block.innerHTML = '<p class="product-listing-loading">Loading products…</p>';

  // Extract org/repo from hostname: main--cf--shravanbac.aem.page
  const { hostname } = window.location;
  const parts = hostname.split('.')[0].split('--');
  const repo = parts[1] || 'cf';
  const org = parts[2] || 'shravanbac';

  try {
    // Fetch product list from DA.live list API
    const listResp = await fetch(`https://admin.da.live/list/${org}/${repo}/products`);
    if (!listResp.ok) throw new Error('Failed to load product list');
    const items = await listResp.json();

    // Filter only .html files, exclude index
    const pages = items.filter((item) => {
      const name = item.name || '';
      return name.endsWith('.html') && name !== 'index.html';
    });

    if (!pages.length) {
      block.innerHTML = '<p class="product-listing-empty">No products launched yet. Use the <strong>Launch Product</strong> form to create one.</p>';
      return;
    }

    // Fetch each product page to extract metadata
    const cards = await Promise.all(pages.map(async (page) => {
      const slug = page.name.replace('.html', '');
      const pagePath = `/products/${slug}`;

      try {
        const pageResp = await fetch(pagePath);
        if (!pageResp.ok) return null;
        const html = await pageResp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('meta[property="og:title"]')?.content
          || doc.querySelector('title')?.textContent
          || slug;
        const description = doc.querySelector('meta[name="description"]')?.content || '';
        const image = doc.querySelector('meta[property="og:image"]')?.content || '';
        const audience = doc.querySelector('meta[name="audience"]')?.content || '';

        return {
          slug, title, description, image, audience, path: pagePath,
        };
      } catch {
        return {
          slug, title: slug, description: '', image: '', audience: '', path: pagePath,
        };
      }
    }));

    const validCards = cards.filter(Boolean);

    if (!validCards.length) {
      block.innerHTML = '<p class="product-listing-empty">No products launched yet.</p>';
      return;
    }

    const cardsHTML = validCards.map((item) => `
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
        <p class="product-listing-count">${validCards.length} product${validCards.length > 1 ? 's' : ''} launched</p>
      </div>
      <div class="product-listing-grid">${cardsHTML}</div>`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Product listing error:', err);
    block.innerHTML = '<p class="product-listing-empty">Unable to load products. Please try again.</p>';
  }
}
