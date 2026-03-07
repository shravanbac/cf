/* eslint-disable no-use-before-define */
/* eslint-disable no-plusplus */
/**
 * Send For Review Plugin
 * DA.live Library integration for content review workflow
 * Uses Adobe I/O Runtime proxy for secure webhook authentication
 */

// ============================================
// CONFIGURATION - Using Adobe I/O Runtime Proxy
// ============================================
const CONFIG = Object.freeze({
  // Single unified router (handles both submit and status, routes by environment)
  proxyUrl: 'https://23750-539copperbadger.adobeioruntime.net/api/v1/web/default/send-for-review-proxy',
  emailStorageKey: 'sfr_user_email',
  defaultRef: 'main',
  logoPath: '/icons/logo.svg',
  pluginTitle: 'ContentFlow — Send For Review',
  seo: {
    titleMaxLength: 60,
    descriptionMaxLength: 200,
  },
});

const STATUS = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  READY_MINIMAL: 'ready-minimal',
  IN_REVIEW: 'in-review',
  COMPLETE: 'complete',
  SUCCESS: 'success',
  ERROR: 'error',
  NONE: 'none',
  BLOCKED: 'blocked',
  CHANGES_REQUESTED: 'changes-requested',
  REJECTED: 'rejected',
});

// Statuses where "Send for Review" should be BLOCKED (not actionable by author)
const BLOCKED_STATUSES = ['in-review', 'approved', 'published', 'scheduled'];

// Statuses where resubmission is allowed (with feedback shown, priority is locked)
const RESUBMIT_STATUSES = ['changes-requested'];

// Priority options for review submissions
// Note: Priority can only be set during initial submission (no review, authoring, draft statuses)
// Priority is locked and cannot be changed during resubmission or after publication
const PRIORITIES = Object.freeze({
  STANDARD: 'Standard',
  URGENT: 'Urgent',
  FUTURE_DEPLOYMENT: 'Future Deployment',
});

const DEFAULT_PRIORITY = PRIORITIES.STANDARD;

// ============================================
// STATE
// ============================================
const state = {
  context: null,
  analysis: null,
  debugLogs: [],
  daSDKInstance: null,
};

// ============================================
// UTILITIES
// ============================================
function log(message, data = null) {
  const timestamp = new Date().toISOString().slice(11, 19);
  const logEntry = data
    ? `[${timestamp}] ${message}: ${JSON.stringify(data).slice(0, 200)}`
    : `[${timestamp}] ${message}`;
  // eslint-disable-next-line no-console
  console.log(`[SFR ${timestamp}]`, message, data || '');
  state.debugLogs.push(logEntry);
}

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

function isValidEmail(email) {
  return Boolean(email && email.includes('@') && email.includes('.'));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function normalizePath(path) {
  return path
    .replace(/^\/+/, '')
    .replace(/\.html?$/, '')
    .replace(/\/index$/, '') || 'index';
}

function isIndexPage(path) {
  const normalized = normalizePath(path);
  return normalized === 'index' || normalized === '';
}

function buildUrlPath(path) {
  return isIndexPage(path) ? '/' : `/${normalizePath(path)}`;
}

function normalizeStatus(raw) {
  if (!raw || typeof raw !== 'string') return 'none';
  const s = raw.toLowerCase().trim().replace(/[\s_]+/g, '-');
  // Use exact matching to avoid false positives
  if (s === 'rejected' || s === 'not-relevant') return 'rejected';
  if (s.includes('changes')) return 'changes-requested';
  if (s === 'approved') return 'approved';
  if (s === 'in-review') return 'in-review';
  if (s === 'published') return 'published';
  if (s === 'scheduled') return 'scheduled';
  if (s === 'complete') return 'complete';
  if (s === 'authoring' || s === 'draft') return 'authoring';
  // Log unexpected status values for debugging
  if (s && s !== 'none') {
    // eslint-disable-next-line no-console
    console.warn('[SFR] Unexpected status value:', raw, '→ normalized to:', s);
  }
  return 'none';
}

function getStatusLabel(status) {
  const map = {
    authoring: 'Authoring',
    'in-review': 'In Review',
    approved: 'Approved',
    'changes-requested': 'Changes Requested',
    rejected: 'Not Relevant',
    published: 'Published',
    scheduled: 'Scheduled',
    complete: 'Complete',
  };
  return map[status] || status || 'Unknown';
}

function cleanFeedback(text) {
  if (!text) return '';
  return text.replace(/^Proof Comment:\s*/i, '').trim();
}

// ============================================
// STORAGE
// ============================================
const storage = {
  getEmail() {
    try {
      return localStorage.getItem(CONFIG.emailStorageKey) || '';
    } catch {
      return '';
    }
  },
  saveEmail(email) {
    try {
      localStorage.setItem(CONFIG.emailStorageKey, email);
    } catch {
      // Storage unavailable
    }
  },
};

// ============================================
// API - Using Runtime Proxy
// ============================================
async function checkReviewStatus(ctx) {
  log('Checking review status via proxy');
  try {
    const response = await fetch(CONFIG.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          action: 'check-status',
          pageIdentifier: ctx.pageIdentifier,
          org: ctx.org,
          site: ctx.site,
          ref: ctx.ref,
          path: ctx.path,
        },
      }),
    });

    if (!response.ok) {
      log('Status check failed', { status: response.status });
      return null;
    }

    const data = await response.json();
    log('Status response', data);
    // Handle nested message field with potentially malformed JSON
    if (data.message && typeof data.message === 'string') {
      try {
        // Fix malformed JSON: add quotes around unquoted status values
        const fixedMessage = data.message.replace(
          /"status":\s*([a-zA-Z-]+),/g,
          '"status": "$1",',
        );
        const parsedMessage = JSON.parse(fixedMessage);
        log('Parsed message from response', parsedMessage);
        return parsedMessage;
      } catch (parseError) {
        log('Failed to parse message field', parseError.message);
        // Try returning the original data if message parsing fails
        return data;
      }
    }
    return data;
  } catch (error) {
    log('Status check error', error.message);
    return null;
  }
}

async function submitReview(payload) {
  log('Submitting review via proxy', { pageIdentifier: payload.pageIdentifier });
  const response = await fetch(CONFIG.proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: payload }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Submission failed');
  }
  return true;
}

// ============================================
// CONTEXT DETECTION
// ============================================
function getContextFromURLParams() {
  const params = new URLSearchParams(window.location.search);
  const ctx = {
    ref: params.get('ref') || '',
    site: params.get('site') || params.get('repo') || '',
    org: params.get('org') || params.get('owner') || '',
    path: params.get('path') || '',
  };
  log('URL params context', ctx);
  return ctx;
}

function getContextFromReferrer() {
  if (!document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    log('Referrer URL', document.referrer);

    const daMatch = url.href.match(/da\.live\/edit#\/([^/]+)\/([^/]+)\/(.*)?/);
    if (daMatch) {
      const pagePath = daMatch[3] || 'index';
      log('DA.live referrer match', { org: daMatch[1], site: daMatch[2], path: pagePath });
      return {
        org: daMatch[1],
        site: daMatch[2],
        path: pagePath,
        ref: 'main',
        source: 'da.live-referrer',
      };
    }

    const aemMatch = url.host.match(/^([^-]+)--([^-]+)--([^.]+)\.aem\.(page|live)$/);
    if (aemMatch) {
      const pagePath = url.pathname.replace(/^\//, '') || 'index';
      log('AEM referrer match', {
        ref: aemMatch[1], site: aemMatch[2], org: aemMatch[3], path: pagePath,
      });
      return {
        ref: aemMatch[1],
        site: aemMatch[2],
        org: aemMatch[3],
        path: pagePath,
        source: 'aem-referrer',
      };
    }
  } catch (error) {
    log('Referrer parse error', error.message);
  }
  return null;
}

async function getContextFromDASDK() {
  try {
    // eslint-disable-next-line import/no-unresolved
    const DA_SDK = await import('https://da.live/nx/utils/sdk.js');
    const sdk = await DA_SDK.default;
    state.daSDKInstance = sdk;

    log('DA SDK raw context', sdk?.context);

    if (sdk?.context) {
      const sdkPath = sdk.context.path || '';

      return {
        org: sdk.context.org || sdk.context.owner || '',
        site: sdk.context.repo || '',
        ref: sdk.context.ref || 'main',
        path: sdkPath,
        email: sdk.context.email || sdk.context.user?.email || '',
        source: 'da-sdk',
      };
    }
  } catch (error) {
    log('DA SDK error', error.message);
  }
  return null;
}

function detectPluginOrigin() {
  const pluginHost = window.location.host;
  const aemMatch = pluginHost.match(/^(.+)\.aem\.(page|live)$/);
  if (aemMatch) {
    const parts = aemMatch[1].split('--');
    if (parts.length >= 3) {
      return {
        pluginRef: parts[0],
        pluginSite: parts[1],
        pluginOrg: parts.slice(2).join('--'),
      };
    }
  }
  return null;
}

async function getFullContext() {
  const urlParams = getContextFromURLParams();
  const referrerCtx = getContextFromReferrer();
  const sdkCtx = await getContextFromDASDK();
  const pluginOrigin = detectPluginOrigin();

  log('Context sources', {
    urlParams, referrerCtx, sdkCtx, pluginOrigin,
  });

  let path = sdkCtx?.path || referrerCtx?.path || urlParams.path || '';

  if (!path) {
    path = 'index';
  }

  if (path.includes('tools/send-for-review') || path.includes('send-for-review')) {
    log('Path contains plugin path, falling back', { originalPath: path });
    path = referrerCtx?.path || urlParams.path || 'index';
  }

  path = normalizePath(path);
  log('Final path after normalization', path);

  const ctx = {
    ref: sdkCtx?.ref || referrerCtx?.ref || urlParams.ref || CONFIG.defaultRef,
    site: sdkCtx?.site || referrerCtx?.site || urlParams.site || '',
    org: sdkCtx?.org || referrerCtx?.org || urlParams.org || '',
    path,
    email: sdkCtx?.email || '',
    source: sdkCtx?.source || referrerCtx?.source || 'url-params',
    ...pluginOrigin,
  };

  ctx.host = `${ctx.ref}--${ctx.site}--${ctx.org}.aem.page`;
  const urlPath = buildUrlPath(ctx.path);
  ctx.previewUrl = `https://${ctx.host}${urlPath}`;
  ctx.liveUrl = `https://${ctx.ref}--${ctx.site}--${ctx.org}.aem.live${urlPath}`;
  ctx.plainUrl = `https://${ctx.host}/${ctx.path}.plain.html`;

  if (ctx.pluginRef && ctx.pluginSite === ctx.site && ctx.pluginOrg === ctx.org) {
    ctx.sameOriginHost = `${ctx.pluginRef}--${ctx.site}--${ctx.org}.aem.page`;
    ctx.sameOriginPreviewUrl = `https://${ctx.sameOriginHost}${urlPath}`;
    ctx.sameOriginPlainUrl = `https://${ctx.sameOriginHost}/${ctx.path}.plain.html`;
    log('Same-origin URLs available', { sameOriginHost: ctx.sameOriginHost });
  }

  ctx.daContentUrl = `https://content.da.live/${ctx.org}/${ctx.site}/${ctx.path}`;
  ctx.daSourceUrl = `https://admin.da.live/source/${ctx.org}/${ctx.site}/${ctx.path}.html`;
  ctx.env = 'page';
  ctx.pageIdentifier = `${ctx.org}/${ctx.site}/${ctx.path}`;

  log('Final context', ctx);
  return ctx;
}

// ============================================
// CONTENT FETCHING
// ============================================
async function fetchFromSDK() {
  if (!state.daSDKInstance?.context) return null;
  try {
    log('Trying DA SDK content');
    const doc = state.daSDKInstance.context.doc || state.daSDKInstance.context.document;
    if (doc) {
      const html = typeof doc === 'string' ? doc : doc.outerHTML || doc.innerHTML;
      if (html) {
        log('DA SDK content found');
        return { html, source: 'da-sdk', isPlain: true };
      }
    }
  } catch (error) {
    log('DA SDK content error', error.message);
  }
  return null;
}

async function fetchFromUrl(url, source, options = {}) {
  try {
    log(`Trying ${source}`, url);
    const fetchOptions = {
      cache: 'no-store',
      ...(options.credentials && { credentials: options.credentials }),
    };
    const response = await fetch(url, fetchOptions);
    if (response.ok) {
      const html = await response.text();
      log(`${source} success`, { length: html.length });
      return { html, source, isPlain: options.isPlain ?? true };
    }
    log(`${source} returned`, response.status);
  } catch (error) {
    log(`${source} error`, error.message);
  }
  return null;
}

async function fetchContent(ctx) {
  const sdkContent = await fetchFromSDK();
  if (sdkContent) return sdkContent;

  const strategies = [];

  if (ctx.sameOriginPreviewUrl) {
    strategies.push({ url: ctx.sameOriginPreviewUrl, source: 'same-origin-full', isPlain: false });
  }

  strategies.push({ url: ctx.previewUrl, source: 'full-page', isPlain: false });

  if (ctx.sameOriginPlainUrl) {
    strategies.push({ url: ctx.sameOriginPlainUrl, source: 'same-origin-plain', isPlain: true });
  }
  strategies.push(
    { url: ctx.daContentUrl, source: 'content.da.live', isPlain: true },
    {
      url: ctx.daSourceUrl, source: 'admin.da.live', isPlain: true, credentials: 'include',
    },
    { url: ctx.plainUrl, source: 'plain.html', isPlain: true },
  );

  log('Fetch strategies', strategies.map((s) => s.source));

  // eslint-disable-next-line no-restricted-syntax
  for (const strategy of strategies) {
    // eslint-disable-next-line no-await-in-loop
    const content = await fetchFromUrl(strategy.url, strategy.source, strategy);
    if (content) {
      log('Content fetched successfully', { source: content.source, isPlain: content.isPlain });
      return content;
    }
  }

  log('All fetch strategies failed');
  return null;
}

// ============================================
// DOCUMENT ANALYSIS
// ============================================
function analyzeContentMetrics(root) {
  const text = root?.textContent || '';
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  return {
    wordCount: words.length,
    characterCount: cleanText.length,
    characterCountNoSpaces: cleanText.replace(/\s/g, '').length,
    sentenceCount: sentences.length,
    paragraphCount: root.querySelectorAll('p').length,
    avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
    readingTimeMinutes: Math.ceil(words.length / 200) || 1,
  };
}

function analyzeHeadings(root) {
  const headings = [];
  const counts = {
    h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0,
  };
  const issues = [];

  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const level = parseInt(h.tagName.charAt(1), 10);
    const tag = h.tagName.toLowerCase();
    // eslint-disable-next-line no-plusplus
    counts[tag]++;
    headings.push({
      level, tag, text: h.textContent?.trim() || '', id: h.id || '',
    });
  });

  if (counts.h1 === 0) {
    issues.push('Required: Add an attribute to the Total Headings field');
  } else if (counts.h1 > 1) {
    issues.push(`Multiple H1 headings found (${counts.h1})`);
  }

  let lastLevel = 0;
  headings.forEach((h) => {
    if (h.level > lastLevel + 1 && lastLevel > 0) {
      issues.push(`Skipped heading level: H${lastLevel} to H${h.level}`);
    }
    lastLevel = h.level;
  });

  return {
    headings, counts, total: headings.length, issues, isValid: issues.length === 0,
  };
}

function analyzeBlocks(root) {
  const sections = root.querySelectorAll(':scope > div');
  const blocks = [];
  const blockSummary = {};

  sections.forEach((section, index) => {
    section.querySelectorAll(':scope > div[class]').forEach((block) => {
      const name = block.classList[0] || 'unknown';
      const textContent = block.textContent?.trim() || '';
      blocks.push({
        name,
        section: index + 1,
        variants: Array.from(block.classList).slice(1),
        contentPreview: textContent.length > 100 ? `${textContent.substring(0, 100)}...` : textContent,
      });
      blockSummary[name] = (blockSummary[name] || 0) + 1;
    });
  });

  return {
    totalBlocks: blocks.length,
    totalSections: sections.length,
    blocks,
    blockNames: [...new Set(blocks.map((b) => b.name))],
    blockSummary,
  };
}

function analyzeSEO(doc) {
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  const description = doc.querySelector('meta[name="description"]')?.content?.trim() || '';
  const canonical = doc.querySelector('link[rel="canonical"]')?.href || '';
  const robots = doc.querySelector('meta[name="robots"]')?.content || '';
  const lang = doc.documentElement?.lang || doc.querySelector('html')?.lang || '';

  const issues = [];

  if (!title) {
    issues.push('Missing title');
  } else if (title.length > CONFIG.seo.titleMaxLength) {
    issues.push(`Title exceeds recommended length (${title.length} chars, maximum of ${CONFIG.seo.titleMaxLength} characters)`);
  }

  if (!description) {
    issues.push('Missing description');
  } else if (description.length > CONFIG.seo.descriptionMaxLength) {
    issues.push(`Meta description is recommended to be under ${CONFIG.seo.descriptionMaxLength} characters for optimal display (currently ${description.length} chars)`);
  }

  if (!canonical) issues.push('Missing canonical URL');
  if (!lang) issues.push('Required: Add an attribute to the Language field');

  return {
    title: { content: title, length: title.length },
    metaDescription: { content: description, length: description.length },
    canonical,
    robots,
    lang,
    issues,
  };
}

function analyzeOpenGraph(doc) {
  const og = {};
  const twitter = {};
  const issues = [];

  doc.querySelectorAll('meta[property^="og:"]').forEach((meta) => {
    og[meta.getAttribute('property').replace('og:', '')] = meta.content;
  });
  doc.querySelectorAll('meta[name^="twitter:"]').forEach((meta) => {
    twitter[meta.getAttribute('name').replace('twitter:', '')] = meta.content;
  });

  if (!og.title) issues.push('Missing og:title');
  if (!og.description) {
    issues.push('Missing og:description');
  } else if (og.description.length > 200) {
    issues.push(`Open Graph description is recommended to be under 200 characters for optimal display (currently ${og.description.length} chars)`);
  }
  if (!og.image) issues.push('Missing og:image');

  const hasSocialMeta = Object.keys(og).length > 0 || Object.keys(twitter).length > 0;
  return {
    openGraph: og,
    twitter,
    issues,
    // eslint-disable-next-line no-nested-ternary
    score: !hasSocialMeta ? 0 : (issues.length === 0 ? 100 : 50),
    hasSocialMeta,
  };
}

function analyzeAccessibility(root) {
  const images = root.querySelectorAll('img');
  let withAlt = 0;
  let withoutAlt = 0;
  let decorative = 0;

  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    if (alt === '') decorative++;
    else if (alt) withAlt++;
    else withoutAlt++;
  });

  const total = images.length;
  const altCoveragePercent = total > 0 ? Math.round(((withAlt + decorative) / total) * 100) : 100;
  const issues = [];
  if (withoutAlt > 0) issues.push(`${withoutAlt} images missing alt text. The Alt text field is required. Check the content guidelines for help with alt text writing best practices.`);

  return {
    images: {
      total, withAlt, withoutAlt, decorative, altCoveragePercent,
    },
    aria: {
      labels: root.querySelectorAll('[aria-label]').length,
      roles: root.querySelectorAll('[role]').length,
    },
    issues,
    score: altCoveragePercent,
  };
}

function analyzeLinks(root) {
  const links = root.querySelectorAll('a[href]');
  let internal = 0;
  let external = 0;
  let mailto = 0;
  let tel = 0;
  const externalLinks = [];

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('mailto:')) mailto++;
    else if (href.startsWith('tel:')) tel++;
    else if (href.startsWith('http') && !href.includes(window.location.host)) {
      external++;
      externalLinks.push({ href, text: link.textContent?.trim() || '' });
    } else internal++;
  });

  return {
    total: links.length,
    internal,
    external,
    buttons: root.querySelectorAll('button, a.button, .button').length,
    mailto,
    tel,
    externalLinks,
  };
}

function getAnalytics() {
  return {
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screen: {
      width: window.screen?.width || 0,
      height: window.screen?.height || 0,
      colorDepth: window.screen?.colorDepth || 0,
    },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
}

function analyzeDocument(doc, isPlain) {
  const root = isPlain ? doc.body : (doc.querySelector('main') || doc.body);
  return {
    contentMetrics: analyzeContentMetrics(root),
    headingStructure: analyzeHeadings(root),
    blocks: analyzeBlocks(root),
    seo: analyzeSEO(doc),
    openGraph: analyzeOpenGraph(doc),
    accessibility: analyzeAccessibility(root),
    links: analyzeLinks(root),
    analytics: getAnalytics(),
  };
}

function createMinimalAnalysis() {
  return {
    contentMetrics: {
      wordCount: 0,
      characterCount: 0,
      characterCountNoSpaces: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      avgWordsPerSentence: 0,
      readingTimeMinutes: 0,
    },
    headingStructure: {
      headings: [],
      counts: {
        h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0,
      },
      total: 0,
      issues: ['Content not available for analysis'],
      isValid: false,
    },
    blocks: {
      totalBlocks: 0, totalSections: 0, blocks: [], blockNames: [], blockSummary: {},
    },
    seo: {
      title: { content: '', length: 0 },
      metaDescription: { content: '', length: 0 },
      canonical: '',
      robots: '',
      lang: '',
      issues: ['Content not available for analysis'],
    },
    openGraph: {
      openGraph: {}, twitter: {}, issues: [], score: 0, hasSocialMeta: false,
    },
    accessibility: {
      images: {
        total: 0, withAlt: 0, withoutAlt: 0, decorative: 0, altCoveragePercent: 100,
      },
      aria: { labels: 0, roles: 0 },
      issues: [],
      score: 100,
    },
    links: {
      total: 0, internal: 0, external: 0, buttons: 0, mailto: 0, tel: 0, externalLinks: [],
    },
    analytics: getAnalytics(),
  };
}

// ============================================
// PAYLOAD
// ============================================
function buildPayload(ctx, analysis, email, notes = '', priority = DEFAULT_PRIORITY) {
  const name = ctx.path.split('/').pop() || 'index';
  let title = analysis.seo?.title?.content || name;
  if (!title || title === name) {
    const h1 = analysis.headingStructure?.headings?.find((h) => h.level === 1);
    if (h1) title = h1.text;
  }

  const urlPath = buildUrlPath(ctx.path);

  return {
    title,
    name,
    path: urlPath,
    url: ctx.liveUrl,
    previewUrl: ctx.previewUrl,
    liveUrl: ctx.liveUrl,
    reviewSubmissionDate: new Date().toISOString(),
    submittedBy: email || 'unknown',
    notes: notes || '',
    priority: priority || DEFAULT_PRIORITY,
    host: ctx.host,
    env: ctx.env,
    org: ctx.org,
    site: ctx.site,
    ref: ctx.ref,
    source: 'DA.live Library',
    pageIdentifier: ctx.pageIdentifier,
    contentMetrics: analysis.contentMetrics,
    headingStructure: analysis.headingStructure,
    blocks: analysis.blocks,
    seo: analysis.seo,
    openGraph: analysis.openGraph,
    accessibility: analysis.accessibility,
    links: analysis.links,
    analytics: analysis.analytics,
  };
}

// ============================================
// UI RENDERING
// ============================================
function getPriorityClass(priority) {
  if (!priority) return '';
  const normalized = priority.toLowerCase().replace(/\s+/g, '-');
  return `priority-${normalized}`;
}

function renderPriorityOptions(selectedPriority = null) {
  return Object.values(PRIORITIES).map((priority) => {
    const selected = selectedPriority === priority ? 'selected' : '';
    return `<option value="${escapeHtml(priority)}" ${selected}>${escapeHtml(priority)}</option>`;
  }).join('');
}

function renderHeader() {
  const logoHtml = CONFIG.logoPath
    ? `<img src="${CONFIG.logoPath}" alt="Logo" class="logo" onerror="this.style.display='none'" />`
    : '';
  return `<div class="header-bar">${logoHtml}<span class="header-title">${CONFIG.pluginTitle}</span></div>`;
}

function renderLoading(message) {
  return `
    <div class="notice">
      <div class="spinner"></div>
      <p class="status-message status-message--loading">${escapeHtml(message)}</p>
    </div>`;
}

function renderError(message) {
  return `
    <div class="notice">
      <p class="status-message status-message--error">${escapeHtml(message)}</p>
      <button id="retry-btn" class="btn btn--primary" style="margin-top: 12px;">Retry</button>
      <div class="debug-toggle" id="debug-toggle">Show debug info</div>
      <div class="debug-panel" id="debug-panel"></div>
    </div>`;
}

function renderInReview(data) {
  const ctx = state.context;
  const reviewerName = data.reviewerName || 'Reviewer';
  const statusMessage = `Page is in review by ${escapeHtml(reviewerName)}.`;

  return `
    <p class="status-message status-message--in-review">${statusMessage}</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Title:</span>
        <span class="detail-row__value">${escapeHtml(data.title || ctx.path)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Submitted By:</span>
        <span class="detail-row__value">${escapeHtml(data.submittedBy || 'Unknown')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Submitted On:</span>
        <span class="detail-row__value">${data.submittedDate ? formatDate(data.submittedDate) : 'N/A'}</span>
      </div>
      ${data.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value"><span class="${getPriorityClass(data.priority)}">${escapeHtml(data.priority)}</span></span>
        </div>` : ''}
      ${data.notes ? `
        <div class="detail-row detail-row--full-width">
          <span class="detail-row__label">Notes:</span>
          <span class="detail-row__value">${escapeHtml(data.notes)}</span>
        </div>` : ''}
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--secondary">View Preview</a>
      <button id="submit-btn" class="btn btn--primary" disabled title="Review already in progress">Submit for Review</button>
    </div>
    <p class="info-note">Complete the current review before submitting a new one.</p>`;
}

function renderComplete(viewState) {
  const ctx = state.context;
  const storedEmail = storage.getEmail();
  const data = viewState.data || {};
  const analysis = viewState.analysis || state.analysis;
  const name = viewState.name || ctx.path.split('/').pop() || 'index';

  const seoTitle = analysis?.seo?.title?.content || data.title || '';
  const seoTitleLength = analysis?.seo?.title?.length || seoTitle.length || 0;
  const seoDescription = analysis?.seo?.metaDescription?.content || '';
  const seoDescLength = analysis?.seo?.metaDescription?.length || 0;

  const seoIssues = analysis?.seo?.issues || [];
  const seoIssuesHtml = seoIssues.length > 0
    ? seoIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const headingIssues = analysis?.headingStructure?.issues || [];
  const headingIssuesHtml = headingIssues.length > 0
    ? headingIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const blocks = analysis?.blocks?.blockNames?.length > 0
    ? analysis.blocks.blockNames.join(', ')
    : 'None';

  return `
    <p class="status-message status-message--published">
      Page was published by ${escapeHtml(data.submittedBy || 'Unknown')} at ${data.completedDate ? formatDate(data.completedDate) : 'N/A'}.
    </p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">SEO Title (maximum of 60 characters):</span>
        <span class="detail-row__value">${escapeHtml(seoTitle || name)} <span class="char-count">(${seoTitleLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Name:</span>
        <span class="detail-row__value">${escapeHtml(name)}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Description:</span>
        <span class="detail-row__value ${seoDescLength > CONFIG.seo.descriptionMaxLength ? 'detail-row__value--warning' : ''}">${seoDescription ? escapeHtml(seoDescription) : '<em>No description</em>'} <span class="char-count">(${seoDescLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Blocks:</span>
        <span class="detail-row__value">${analysis?.blocks?.totalBlocks || 0} (${escapeHtml(blocks)})</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">SEO Issues:</span>
        <span class="detail-row__value ${seoIssues.length > 0 ? 'detail-row__value--warning' : ''}">${seoIssuesHtml}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Heading Issues:</span>
        <span class="detail-row__value ${headingIssues.length > 0 ? 'detail-row__value--warning' : ''}">${headingIssuesHtml}</span>
      </div>
    </div>
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">Your Email <span class="form-label__required">*</span></label>
        <input type="email" id="email-input" class="form-input" placeholder="Enter your email address" value="${escapeHtml(storedEmail)}" required>
        <div class="form-hint">Required for review tracking</div>
      </div>
      <div class="form-group">
        <label class="form-label">Priority <span class="form-label__required">*</span></label>
        <select id="priority-select" class="form-input" disabled>
          ${renderPriorityOptions()}
        </select>
        <div class="form-hint">Priority cannot be changed after initial submission</div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes / Instructions (Optional)</label>
        <textarea id="notes-input" class="form-textarea" placeholder="Enter any additional notes or instructions for this review..."></textarea>
        <div class="char-counter"><span id="notes-char-count">0</span> characters</div>
      </div>
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--secondary">View Preview</a>
      <button id="submit-btn" class="btn btn--primary">Submit for Review</button>
    </div>
    <p class="info-note">You can submit a new review for this published page.</p>`;
}

function renderBlocked(data) {
  const ctx = state.context;
  const status = normalizeStatus(data.status);
  const statusLabel = getStatusLabel(status);

  // Build status-specific messages with person and date info
  let statusMessage = 'Review submission is not available at this time.';

  if (status === 'in-review') {
    const reviewerName = data.reviewerName || 'Reviewer';
    statusMessage = `This page is in review by ${escapeHtml(reviewerName)}. Please wait for the reviewer to complete their assessment.`;
  } else if (status === 'approved') {
    const reviewerName = data.reviewerName || 'Reviewer';
    const approvedDate = data.lastReviewDate;
    if (approvedDate) {
      statusMessage = `This page was approved on ${formatDate(approvedDate)} by ${escapeHtml(reviewerName)}. Open the Publish task in Workfront to publish it.`;
    } else {
      statusMessage = `This page was approved by ${escapeHtml(reviewerName)}. Open the Publish task in Workfront to publish it.`;
    }
  } else if (status === 'published') {
    const { completedDate } = data;
    if (completedDate) {
      statusMessage = `This page was completed on ${formatDate(completedDate)}.`;
    } else {
      statusMessage = 'This page has already been published.';
    }
  } else if (status === 'scheduled') {
    const reviewerName = data.reviewerName || data.submittedBy || 'System';
    const { scheduledDate } = data;
    if (scheduledDate) {
      statusMessage = `This page is scheduled to be published on ${formatDate(scheduledDate)} by ${escapeHtml(reviewerName)}.`;
    } else {
      statusMessage = `This page is scheduled for publishing by ${escapeHtml(reviewerName)}.`;
    }
  }

  // Determine status message class - approved/published: success, scheduled: info
  let messageClass = 'status-message--blocked';
  if (status === 'approved' || status === 'published') {
    messageClass = 'status-message--approved';
  } else if (status === 'scheduled') {
    messageClass = 'status-message--scheduled';
  }

  return `
    <p class="status-message ${messageClass}">${statusMessage}</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Page:</span>
        <span class="detail-row__value">${escapeHtml(ctx.path)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value"><span class="status-badge status-badge--${status}">${escapeHtml(statusLabel)}</span></span>
      </div>
      ${data.title ? `
        <div class="detail-row">
          <span class="detail-row__label">Title:</span>
          <span class="detail-row__value">${escapeHtml(data.title)}</span>
        </div>` : ''}
      ${data.submittedBy ? `
        <div class="detail-row">
          <span class="detail-row__label">Submitted By:</span>
          <span class="detail-row__value">${escapeHtml(data.submittedBy)}</span>
        </div>` : ''}
      ${data.submittedDate ? `
        <div class="detail-row">
          <span class="detail-row__label">Submitted:</span>
          <span class="detail-row__value">${formatDate(data.submittedDate)}</span>
        </div>` : ''}
      ${data.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value"><span class="${getPriorityClass(data.priority)}">${escapeHtml(data.priority)}</span></span>
        </div>` : ''}
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--secondary">View Preview</a>
      <button class="btn btn--primary" disabled>Submit for Review</button>
    </div>`;
}

function renderChangesRequested(viewState) {
  const ctx = state.context;
  const data = viewState.data || {};
  const analysis = viewState.analysis || state.analysis;
  const name = viewState.name || ctx.path.split('/').pop() || 'index';
  const feedback = cleanFeedback(data.reviewerFeedback);
  const rejCount = parseInt(data.rejectionCount, 10) || 0;
  const storedEmail = data.submittedBy || storage.getEmail();

  const seoTitle = analysis?.seo?.title?.content || data.title || '';
  const seoTitleLength = analysis?.seo?.title?.length || seoTitle.length || 0;
  const seoDescription = analysis?.seo?.metaDescription?.content || '';
  const seoDescLength = analysis?.seo?.metaDescription?.length || 0;

  const seoIssues = analysis?.seo?.issues || [];
  const seoIssuesHtml = seoIssues.length > 0
    ? seoIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const headingIssues = analysis?.headingStructure?.issues || [];
  const headingIssuesHtml = headingIssues.length > 0
    ? headingIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const blocks = analysis?.blocks?.blockNames?.length > 0
    ? analysis.blocks.blockNames.join(', ')
    : 'None';

  // eslint-disable-next-line no-nested-ternary
  const rejBadgeHtml = rejCount > 0
    ? `<span class="rejection-badge">\u21BB ${rejCount} revision${rejCount > 1 ? 's' : ''}</span>`
    : '';

  const reviewerName = data.reviewerName || 'Reviewer';
  const statusMessage = `Changes were requested by ${escapeHtml(reviewerName)}. Review the feedback below, make edits, then resubmit.`;

  return `
    <p class="status-message status-message--changes-requested">${statusMessage}</p>
    ${feedback ? `
      <div class="feedback-box">
        <div class="feedback-box__header">Reviewer Feedback</div>
        <div class="feedback-box__text">${escapeHtml(feedback)}</div>
      </div>` : ''}
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value">
          <span class="status-badge status-badge--changes-requested">Changes Requested</span>
          ${rejBadgeHtml}
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">SEO Title (maximum of 60 characters):</span>
        <span class="detail-row__value">${escapeHtml(seoTitle || name)} <span class="char-count">(${seoTitleLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Name:</span>
        <span class="detail-row__value">${escapeHtml(name)}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Description:</span>
        <span class="detail-row__value ${seoDescLength > CONFIG.seo.descriptionMaxLength ? 'detail-row__value--warning' : ''}">${seoDescription ? escapeHtml(seoDescription) : '<em>No description</em>'} <span class="char-count">(${seoDescLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Blocks:</span>
        <span class="detail-row__value">${analysis?.blocks?.totalBlocks || 0} (${escapeHtml(blocks)})</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">SEO Issues:</span>
        <span class="detail-row__value ${seoIssues.length > 0 ? 'detail-row__value--warning' : ''}">${seoIssuesHtml}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Heading Issues:</span>
        <span class="detail-row__value ${headingIssues.length > 0 ? 'detail-row__value--warning' : ''}">${headingIssuesHtml}</span>
      </div>
      ${data.lastReviewDate ? `
        <div class="detail-row">
          <span class="detail-row__label">Last Reviewed:</span>
          <span class="detail-row__value">${formatDate(data.lastReviewDate)}</span>
        </div>` : ''}
      ${data.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value"><span class="${getPriorityClass(data.priority)}">${escapeHtml(data.priority)}</span></span>
        </div>` : ''}
    </div>
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">Your Email <span class="form-label__required">*</span></label>
        <input type="email" id="email-input" class="form-input" placeholder="Enter your email address" value="${escapeHtml(storedEmail)}" required>
        <div class="form-hint">Required for review tracking</div>
      </div>
      <div class="form-group">
        <label class="form-label">Priority <span class="form-label__required">*</span></label>
        <select id="priority-select" class="form-input" disabled>
          ${renderPriorityOptions(data.priority)}
        </select>
        <div class="form-hint">Priority cannot be changed after initial submission</div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes / What Changed</label>
        <textarea id="notes-input" class="form-textarea" placeholder="Describe the changes you made in response to the feedback..."></textarea>
        <div class="char-counter"><span id="notes-char-count">0</span> characters</div>
      </div>
    </div>
    <div class="actions">
      <button id="submit-btn" class="btn btn--warning">Resubmit for Review</button>
    </div>`;
}

function renderRejected(data) {
  const ctx = state.context;
  const feedback = cleanFeedback(data.reviewerFeedback);

  return `
    <p class="status-message status-message--rejected">This page was marked as &ldquo;Not Relevant&rdquo; and the project has been closed.</p>
    ${feedback ? `
      <div class="feedback-box feedback-box--rejected">
        <div class="feedback-box__header">Reviewer Feedback</div>
        <div class="feedback-box__text">${escapeHtml(feedback)}</div>
      </div>` : ''}
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Page:</span>
        <span class="detail-row__value">${escapeHtml(ctx.path)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value"><span class="status-badge status-badge--rejected">Not Relevant</span></span>
      </div>
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--secondary">View Preview</a>
      <button class="btn btn--primary" disabled>Submit for Review</button>
    </div>
    <p class="info-note">To resubmit, create a new project via the Product Launch form.</p>`;
}

function renderReadyForm(title, name, analysis) {
  const storedEmail = storage.getEmail();

  const seoTitle = analysis?.seo?.title?.content || '';
  const seoTitleLength = analysis?.seo?.title?.length || 0;
  const seoDescription = analysis?.seo?.metaDescription?.content || '';
  const seoDescLength = analysis?.seo?.metaDescription?.length || 0;

  const seoIssues = analysis?.seo?.issues || [];
  const seoIssuesHtml = seoIssues.length > 0
    ? seoIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';
  const seoClass = seoIssues.length > 0 ? 'detail-row__value--warning' : '';

  const headingIssues = analysis?.headingStructure?.issues || [];
  const headingIssuesHtml = headingIssues.length > 0
    ? headingIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';
  const headingClass = headingIssues.length > 0 ? 'detail-row__value--warning' : '';

  const blocks = analysis?.blocks?.blockNames?.length > 0
    ? analysis.blocks.blockNames.join(', ')
    : 'None';

  return `
    <p class="status-message status-message--loading">Ready to submit for review.</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">SEO Title (maximum of 60 characters):</span>
        <span class="detail-row__value">${escapeHtml(seoTitle || name)} <span class="char-count">(${seoTitleLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Name:</span>
        <span class="detail-row__value">${escapeHtml(name)}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Description:</span>
        <span class="detail-row__value ${seoDescLength > CONFIG.seo.descriptionMaxLength ? 'detail-row__value--warning' : ''}">${seoDescription ? escapeHtml(seoDescription) : '<em>No description</em>'} <span class="char-count">(${seoDescLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Blocks:</span>
        <span class="detail-row__value">${analysis?.blocks?.totalBlocks || 0} (${escapeHtml(blocks)})</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">SEO Issues:</span>
        <span class="detail-row__value ${seoClass}">${seoIssuesHtml}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Heading Issues:</span>
        <span class="detail-row__value ${headingClass}">${headingIssuesHtml}</span>
      </div>
    </div>
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">Your Email <span class="form-label__required">*</span></label>
        <input type="email" id="email-input" class="form-input" placeholder="Enter your email address" value="${escapeHtml(storedEmail)}" required>
        <div class="form-hint">Required for review tracking</div>
      </div>
      <div class="form-group">
        <label class="form-label">Priority <span class="form-label__required">*</span></label>
        <select id="priority-select" class="form-input">
          ${renderPriorityOptions()}
        </select>
        <div class="form-hint">Select the priority level for this review</div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes / Instructions (Optional)</label>
        <textarea id="notes-input" class="form-textarea" placeholder="Enter any additional notes or instructions for this review..."></textarea>
        <div class="char-counter"><span id="notes-char-count">0</span> characters</div>
      </div>
    </div>
    <p class="info-note">Please preview the page before sending for review</p>
    <div class="actions">
      <button id="submit-btn" class="btn btn--primary">Submit for Review</button>
    </div>`;
}

function renderReadyMinimal(name) {
  const ctx = state.context;
  const storedEmail = storage.getEmail();

  return `
    <p class="status-message status-message--loading">Ready to submit for review.</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Page:</span>
        <span class="detail-row__value">${escapeHtml(name)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Path:</span>
        <span class="detail-row__value">${buildUrlPath(ctx.path)}</span>
      </div>
    </div>
    <p class="info-note info-note--warning">⚠️ Page analysis unavailable (cross-origin). Review tracking will still work. Sign In might be required.</p>
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">Your Email <span class="form-label__required">*</span></label>
        <input type="email" id="email-input" class="form-input" placeholder="Enter your email address" value="${escapeHtml(storedEmail)}" required>
        <div class="form-hint">Required for review tracking</div>
      </div>
      <div class="form-group">
        <label class="form-label">Priority <span class="form-label__required">*</span></label>
        <select id="priority-select" class="form-input">
          ${renderPriorityOptions()}
        </select>
        <div class="form-hint">Select the priority level for this review</div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes / Instructions (Optional)</label>
        <textarea id="notes-input" class="form-textarea" placeholder="Enter any additional notes or instructions for this review..."></textarea>
      </div>
    </div>
    <p class="info-note">Please preview the page before sending for review</p>
    <div class="actions">
      <button id="submit-btn" class="btn btn--primary">Submit for Review</button>
    </div>`;
}

function renderSuccess(payload) {
  const seoIssues = payload.seo?.issues || [];
  const seoIssuesHtml = seoIssues.length > 0
    ? seoIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const headingIssues = payload.headingStructure?.issues || [];
  const headingIssuesHtml = headingIssues.length > 0
    ? headingIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const blocks = payload.blocks?.blockNames?.length > 0
    ? payload.blocks.blockNames.join(', ')
    : 'None';

  const description = payload.seo?.metaDescription?.content || '';
  const descLength = payload.seo?.metaDescription?.length || 0;

  return `
    <p class="status-message status-message--success">Review request submitted successfully!</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">SEO Title (maximum of 60 characters):</span>
        <span class="detail-row__value">${escapeHtml(payload.title)} <span class="char-count">(${payload.seo?.title?.length || 0} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Name:</span>
        <span class="detail-row__value">${escapeHtml(payload.name)}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Description:</span>
        <span class="detail-row__value">${description ? escapeHtml(description) : '<em>No description</em>'} <span class="char-count">(${descLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Submitted By:</span>
        <span class="detail-row__value">${escapeHtml(payload.submittedBy)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Submission Date:</span>
        <span class="detail-row__value">${formatDate(payload.reviewSubmissionDate)}</span>
      </div>
      ${payload.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value"><span class="${getPriorityClass(payload.priority)}">${escapeHtml(payload.priority)}</span></span>
        </div>` : ''}
      ${payload.notes ? `
        <div class="detail-row detail-row--full-width">
          <span class="detail-row__label">Notes:</span>
          <span class="detail-row__value">${escapeHtml(payload.notes)}</span>
        </div>` : ''}
      <div class="detail-row">
        <span class="detail-row__label">Blocks:</span>
        <span class="detail-row__value">${payload.blocks?.totalBlocks || 0} (${escapeHtml(blocks)})</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">SEO Issues:</span>
        <span class="detail-row__value ${seoIssues.length > 0 ? 'detail-row__value--warning' : ''}">${seoIssuesHtml}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Heading Issues:</span>
        <span class="detail-row__value ${headingIssues.length > 0 ? 'detail-row__value--warning' : ''}">${headingIssuesHtml}</span>
      </div>
    </div>
    <div class="actions">
      <a href="${payload.previewUrl}" target="_blank" class="btn btn--secondary">View Preview</a>
    </div>
    <p class="info-note">Review request has been recorded. Use "Get Page Current Status" to check progress.</p>`;
}

// ============================================
// RENDER ENGINE
// ============================================
function render(viewState) {
  const app = document.getElementById('app');
  let content = '';

  switch (viewState.status) {
    case STATUS.LOADING:
      content = renderLoading(viewState.message);
      break;
    case STATUS.ERROR:
      content = renderError(viewState.message);
      break;
    case STATUS.IN_REVIEW:
      content = renderInReview(viewState.data);
      break;
    case STATUS.BLOCKED:
      content = renderBlocked(viewState.data);
      break;
    case STATUS.CHANGES_REQUESTED:
      content = renderChangesRequested(viewState);
      break;
    case STATUS.REJECTED:
      content = renderRejected(viewState.data);
      break;
    case STATUS.COMPLETE:
      content = renderComplete(viewState);
      break;
    case STATUS.READY:
      content = renderReadyForm(viewState.title, viewState.name, viewState.analysis);
      break;
    case STATUS.READY_MINIMAL:
      content = renderReadyMinimal(viewState.name);
      break;
    case STATUS.SUCCESS:
      content = renderSuccess(viewState.payload);
      break;
    default:
      content = renderError('Unknown state');
  }

  app.innerHTML = `<div class="review-card">${renderHeader()}<div class="content">${content}</div></div>`;
  attachEventListeners();
}

// ============================================
// EVENT HANDLERS
// ============================================
function attachEventListeners() {
  document.getElementById('retry-btn')?.addEventListener('click', init);
  document.getElementById('submit-btn')?.addEventListener('click', handleSubmit);
  document.getElementById('debug-toggle')?.addEventListener('click', toggleDebugPanel);

  // Attach character counter for notes input
  const notesInput = document.getElementById('notes-input');
  const notesCharCount = document.getElementById('notes-char-count');
  if (notesInput && notesCharCount) {
    notesInput.addEventListener('input', () => {
      notesCharCount.textContent = notesInput.value.length;
    });
  }
}

function toggleDebugPanel() {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    panel.classList.toggle('debug-panel--visible');
    panel.textContent = state.debugLogs.join('\n');
  }
}

async function handleSubmit() {
  const emailInput = document.getElementById('email-input');
  const notesInput = document.getElementById('notes-input');
  const prioritySelect = document.getElementById('priority-select');
  const email = emailInput?.value?.trim() || '';
  const notes = notesInput?.value?.trim() || '';
  const priority = prioritySelect?.value || DEFAULT_PRIORITY;

  if (!isValidEmail(email)) {
    emailInput?.focus();
    emailInput?.classList.add('form-input--error');
    return;
  }

  storage.saveEmail(email);
  render({ status: STATUS.LOADING, message: 'Submitting review request…' });

  try {
    const payload = buildPayload(state.context, state.analysis, email, notes, priority);
    await submitReview(payload);
    render({ status: STATUS.SUCCESS, payload });
  } catch (error) {
    log('Submit error', error.message);
    render({ status: STATUS.ERROR, message: `Failed to submit: ${error.message}` });
  }
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  render({ status: STATUS.LOADING, message: 'Initializing…' });

  try {
    state.context = await getFullContext();

    if (!state.context.org || !state.context.site) {
      render({ status: STATUS.ERROR, message: 'Could not determine page context. Make sure you have a page open.' });
      return;
    }

    render({ status: STATUS.LOADING, message: 'Checking review status…' });
    const statusResponse = await checkReviewStatus(state.context);

    // Normalize the status from Fusion response
    const currentStatus = statusResponse?.status
      ? normalizeStatus(statusResponse.status)
      : 'none';

    log('Normalized status', { raw: statusResponse?.status, normalized: currentStatus });

    // ── BLOCKED: in-review, approved, published, scheduled ──
    if (BLOCKED_STATUSES.includes(currentStatus)) {
      log('Submission blocked', { status: currentStatus });
      render({ status: STATUS.BLOCKED, data: statusResponse });
      return;
    }

    // ── REJECTED (Not Relevant) — terminal, no resubmit ──
    if (currentStatus === 'rejected') {
      log('Project rejected/closed', { status: currentStatus });
      render({ status: STATUS.REJECTED, data: statusResponse });
      return;
    }

    // ── CHANGES REQUESTED — show feedback, analyze page, allow resubmit ──
    if (RESUBMIT_STATUSES.includes(currentStatus)) {
      log('Changes requested — analyzing page for resubmit');
      render({ status: STATUS.LOADING, message: 'Analyzing page for resubmission…' });

      const content = await fetchContent(state.context);
      const name = state.context.path.split('/').pop() || 'index';
      let title = name;

      if (content?.html) {
        const doc = new DOMParser().parseFromString(content.html, 'text/html');
        state.analysis = analyzeDocument(doc, content.isPlain);

        title = state.analysis?.seo?.title?.content || name;
        if ((!title || title === name) && state.analysis?.headingStructure?.headings?.length) {
          const h1 = state.analysis.headingStructure.headings.find((h) => h.level === 1);
          if (h1) title = h1.text;
        }
      } else {
        state.analysis = createMinimalAnalysis();
      }

      render({
        status: STATUS.CHANGES_REQUESTED,
        data: statusResponse,
        title,
        name,
        analysis: state.analysis,
      });
      return;
    }

    // ── Normal flow: analyze page, then show ready or complete form ──
    render({ status: STATUS.LOADING, message: 'Analyzing page…' });
    const content = await fetchContent(state.context);
    const name = state.context.path.split('/').pop() || 'index';
    let title = name;

    if (content?.html) {
      const doc = new DOMParser().parseFromString(content.html, 'text/html');
      state.analysis = analyzeDocument(doc, content.isPlain);

      title = state.analysis?.seo?.title?.content || name;
      if ((!title || title === name) && state.analysis?.headingStructure?.headings?.length) {
        const h1 = state.analysis.headingStructure.headings.find((h) => h.level === 1);
        if (h1) title = h1.text;
      }
    } else {
      state.analysis = createMinimalAnalysis();
    }

    if (currentStatus === 'complete') {
      render({
        status: STATUS.COMPLETE,
        data: statusResponse,
        title,
        name,
        analysis: state.analysis,
      });
    } else if (content?.html) {
      render({
        status: STATUS.READY, title, name, analysis: state.analysis,
      });
    } else {
      render({ status: STATUS.READY_MINIMAL, title, name });
    }
  } catch (error) {
    log('Init error', error.message);
    render({ status: STATUS.ERROR, message: `Error: ${error.message}` });
  }
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
