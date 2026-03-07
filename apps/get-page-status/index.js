/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
/* eslint-disable import/no-unresolved */
/**
 * Get Page Current Status Plugin
 * DA.live Library integration for checking review status
 * Uses Adobe I/O Runtime proxy for secure webhook authentication
 */

// ============================================
// CONFIGURATION - Using Adobe I/O Runtime Proxy
// ============================================
const CONFIG = Object.freeze({
  proxyUrl: 'https://23750-539copperbadger.adobeioruntime.net/api/v1/web/default/status-check-proxy',
  defaultRef: 'main',
  logoPath: './assets/logo.png',
  pluginTitle: 'ContentFlow — Get Page Status',
});

const STATUS = Object.freeze({
  LOADING: 'loading',
  IN_REVIEW: 'in-review',
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes-requested',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
  COMPLETE: 'complete',
  NO_REVIEW: 'no-review',
  ERROR: 'error',
});

// ============================================
// STATE
// ============================================
const state = {
  context: null,
  debugLogs: [],
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
  console.log(`[GPS ${timestamp}]`, message, data || '');
  state.debugLogs.push(logEntry);
}

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
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
    console.warn('[GPS] Unexpected status value:', raw, '→ normalized to:', s);
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
    const DA_SDK = await import('https://da.live/nx/utils/sdk.js');
    const sdk = await DA_SDK.default;
    log('DA SDK raw context', sdk?.context);

    if (sdk?.context) {
      const sdkPath = sdk.context.path || '';
      return {
        org: sdk.context.org || sdk.context.owner || '',
        site: sdk.context.repo || '',
        ref: sdk.context.ref || 'main',
        path: sdkPath,
        source: 'da-sdk',
      };
    }
  } catch (error) {
    log('DA SDK error', error.message);
  }
  return null;
}

async function getFullContext() {
  const urlParams = getContextFromURLParams();
  const referrerCtx = getContextFromReferrer();
  const sdkCtx = await getContextFromDASDK();

  log('Context sources', { urlParams, referrerCtx, sdkCtx });

  let path = sdkCtx?.path || referrerCtx?.path || urlParams.path || '';

  if (!path) {
    path = 'index';
  }

  if (path.includes('tools/') || path.includes('get-page-status')) {
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
    source: sdkCtx?.source || referrerCtx?.source || 'url-params',
  };

  const urlPath = buildUrlPath(ctx.path);
  ctx.previewUrl = `https://${ctx.ref}--${ctx.site}--${ctx.org}.aem.page${urlPath}`;
  ctx.liveUrl = `https://${ctx.ref}--${ctx.site}--${ctx.org}.aem.live${urlPath}`;
  ctx.pageIdentifier = `${ctx.org}/${ctx.site}/${ctx.path}`;

  log('Final context', ctx);
  return ctx;
}

// ============================================
// UI RENDERING
// ============================================
function getPriorityClass(priority) {
  if (!priority) return '';
  const normalized = priority.toLowerCase().replace(/\s+/g, '-');
  return `priority-${normalized}`;
}

function renderPriority(priority) {
  if (!priority) return '';
  const cssClass = getPriorityClass(priority);
  return `<span class="${cssClass}">${escapeHtml(priority)}</span>`;
}

function closeModal() {
  try {
    window.parent.postMessage({ type: 'close' }, '*');
  } catch {
    // ignore
  }
  window.close();
}

function renderHeader() {
  const logoHtml = CONFIG.logoPath
    ? `<img src="${CONFIG.logoPath}" alt="Logo" class="logo" onerror="this.style.display='none'" />`
    : '';
  return `<div class="header-bar">${logoHtml}<span class="header-title">${CONFIG.pluginTitle}</span><button class="modal-close" id="modal-close-btn" title="Close">&times;</button></div>`;
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

  const seoTitle = data.seo?.title?.content || data.title || '';
  const seoTitleLength = data.seo?.title?.length || seoTitle.length || 0;
  const seoDescription = data.seo?.metaDescription?.content || '';
  const seoDescLength = data.seo?.metaDescription?.length || 0;

  const seoIssues = data.seo?.issues || [];
  const seoIssuesHtml = seoIssues.length > 0
    ? seoIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const headingIssues = data.headingStructure?.issues || [];
  const headingIssuesHtml = headingIssues.length > 0
    ? headingIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const blocks = data.blocks?.blockNames?.length > 0
    ? data.blocks.blockNames.join(', ')
    : 'None';

  const reviewerName = data.reviewerName || 'Reviewer';
  const statusMessage = `Page is in review by ${escapeHtml(reviewerName)}.`;

  return `
    <p class="status-message status-message--in-review">${statusMessage}</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value"><span class="status-badge status-badge--in-review">In Review</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Title:</span>
        <span class="detail-row__value">${escapeHtml(seoTitle || ctx.path)} <span class="char-count">(${seoTitleLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Page Path:</span>
        <span class="detail-row__value">${escapeHtml(data.name || ctx.path)}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Description:</span>
        <span class="detail-row__value">${seoDescription ? escapeHtml(seoDescription) : '<em>No description</em>'} <span class="char-count">(${seoDescLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Submitted By:</span>
        <span class="detail-row__value">${escapeHtml(data.submittedBy || 'Unknown')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Submission Date:</span>
        <span class="detail-row__value">${data.submittedDate ? formatDate(data.submittedDate) : 'N/A'}</span>
      </div>
      ${data.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value">${renderPriority(data.priority)}</span>
        </div>` : ''}
      ${data.notes ? `
        <div class="detail-row detail-row--full-width">
          <span class="detail-row__label">Notes:</span>
          <span class="detail-row__value">${escapeHtml(data.notes)}</span>
        </div>` : ''}
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--primary">View Preview</a>
    </div>`;
}

function renderComplete(data) {
  const ctx = state.context;

  const seoTitle = data.seo?.title?.content || data.title || '';
  const seoTitleLength = data.seo?.title?.length || seoTitle.length || 0;
  const seoDescription = data.seo?.metaDescription?.content || '';
  const seoDescLength = data.seo?.metaDescription?.length || 0;

  const seoIssues = data.seo?.issues || [];
  const seoIssuesHtml = seoIssues.length > 0
    ? seoIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const headingIssues = data.headingStructure?.issues || [];
  const headingIssuesHtml = headingIssues.length > 0
    ? headingIssues.map((issue) => `<span class="issue-item">${escapeHtml(issue)}</span>`).join('')
    : '<span class="detail-row__value--success">None</span>';

  const blocks = data.blocks?.blockNames?.length > 0
    ? data.blocks.blockNames.join(', ')
    : 'None';

  const { completedDate } = data;
  const statusMessage = completedDate
    ? `Page was completed on ${formatDate(completedDate)}.`
    : 'Page has been published.';

  return `
    <p class="status-message status-message--complete">${statusMessage}</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value"><span class="status-badge status-badge--published">Published</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Title:</span>
        <span class="detail-row__value">${escapeHtml(seoTitle || ctx.path)} <span class="char-count">(${seoTitleLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Page Path:</span>
        <span class="detail-row__value">${escapeHtml(data.name || ctx.path)}</span>
      </div>
      <div class="detail-row detail-row--full-width">
        <span class="detail-row__label">Description:</span>
        <span class="detail-row__value">${seoDescription ? escapeHtml(seoDescription) : '<em>No description</em>'} <span class="char-count">(${seoDescLength} chars)</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Submitted By:</span>
        <span class="detail-row__value">${escapeHtml(data.submittedBy || 'Unknown')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Completed Date:</span>
        <span class="detail-row__value">${data.completedDate ? formatDate(data.completedDate) : 'N/A'}</span>
      </div>
      ${data.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value">${renderPriority(data.priority)}</span>
        </div>` : ''}
      ${data.notes ? `
        <div class="detail-row detail-row--full-width">
          <span class="detail-row__label">Notes:</span>
          <span class="detail-row__value">${escapeHtml(data.notes)}</span>
        </div>` : ''}
    </div>
    <div class="actions">
      <a href="${ctx.liveUrl}" target="_blank" class="btn btn--primary">View Live</a>
    </div>
    <p class="info-note">Page is ready for a new review submission if needed.</p>`;
}

function renderApproved(data) {
  const ctx = state.context;

  const reviewerName = data.reviewerName || 'Reviewer';
  const approvedDate = data.lastReviewDate;
  const statusMessage = approvedDate
    ? `Page was approved on ${formatDate(approvedDate)} by ${escapeHtml(reviewerName)}.`
    : `Page was approved by ${escapeHtml(reviewerName)}.`;

  return `
    <p class="status-message status-message--approved">${statusMessage}</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value"><span class="status-badge status-badge--approved">Approved</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Title:</span>
        <span class="detail-row__value">${escapeHtml(data.title || ctx.path)}</span>
      </div>
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
      ${approvedDate ? `
        <div class="detail-row">
          <span class="detail-row__label">Approved On:</span>
          <span class="detail-row__value">${formatDate(approvedDate)}</span>
        </div>` : ''}
      ${data.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value">${renderPriority(data.priority)}</span>
        </div>` : ''}
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--secondary">View Preview</a>
    </div>
    <p class="info-note">Open the &ldquo;Publish Page&rdquo; task in Workfront to publish.</p>`;
}

function renderScheduled(data) {
  const ctx = state.context;

  const reviewerName = data.reviewerName || data.submittedBy || 'System';
  const { scheduledDate } = data;
  const statusMessage = scheduledDate
    ? `This page is scheduled to be published on ${formatDate(scheduledDate)} by ${escapeHtml(reviewerName)}.`
    : `This page is scheduled for publishing by ${escapeHtml(reviewerName)}.`;

  return `
    <p class="status-message status-message--scheduled">${statusMessage}</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value"><span class="status-badge status-badge--scheduled">Scheduled</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Title:</span>
        <span class="detail-row__value">${escapeHtml(data.title || ctx.path)}</span>
      </div>
      ${data.submittedBy ? `
        <div class="detail-row">
          <span class="detail-row__label">Submitted By:</span>
          <span class="detail-row__value">${escapeHtml(data.submittedBy)}</span>
        </div>` : ''}
      ${scheduledDate ? `
        <div class="detail-row">
          <span class="detail-row__label">Scheduled Date:</span>
          <span class="detail-row__value">${formatDate(scheduledDate)}</span>
        </div>` : ''}
      ${data.lastReviewDate ? `
        <div class="detail-row">
          <span class="detail-row__label">Approved On:</span>
          <span class="detail-row__value">${formatDate(data.lastReviewDate)}</span>
        </div>` : ''}
      ${data.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value">${renderPriority(data.priority)}</span>
        </div>` : ''}
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--secondary">View Preview</a>
    </div>
    <p class="info-note">Page will be published automatically at the scheduled time.</p>`;
}

function renderChangesRequested(data) {
  const ctx = state.context;
  const feedback = cleanFeedback(data.reviewerFeedback);
  const rejCount = parseInt(data.rejectionCount, 10) || 0;

  const reviewerName = data.reviewerName || 'Reviewer';
  const statusMessage = `Changes were requested by ${escapeHtml(reviewerName)}. Please review the feedback below.`;

  // eslint-disable-next-line no-nested-ternary
  const rejBadgeHtml = rejCount > 0
    ? `<span class="rejection-badge">\u21BB ${rejCount} revision${rejCount > 1 ? 's' : ''}</span>`
    : '';

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
        <span class="detail-row__label">Title:</span>
        <span class="detail-row__value">${escapeHtml(data.title || ctx.path)}</span>
      </div>
      ${data.submittedBy ? `
        <div class="detail-row">
          <span class="detail-row__label">Submitted By:</span>
          <span class="detail-row__value">${escapeHtml(data.submittedBy)}</span>
        </div>` : ''}
      ${data.lastReviewDate ? `
        <div class="detail-row">
          <span class="detail-row__label">Last Reviewed:</span>
          <span class="detail-row__value">${formatDate(data.lastReviewDate)}</span>
        </div>` : ''}
      ${data.priority ? `
        <div class="detail-row">
          <span class="detail-row__label">Priority:</span>
          <span class="detail-row__value">${renderPriority(data.priority)}</span>
        </div>` : ''}
      ${data.notes ? `
        <div class="detail-row detail-row--full-width">
          <span class="detail-row__label">Author Notes:</span>
          <span class="detail-row__value">${escapeHtml(data.notes)}</span>
        </div>` : ''}
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--primary">View Preview</a>
    </div>
    <p class="info-note">Make your changes, then use &ldquo;Send For Review&rdquo; to resubmit.</p>`;
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
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value"><span class="status-badge status-badge--rejected">Not Relevant</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Page:</span>
        <span class="detail-row__value">${escapeHtml(ctx.path)}</span>
      </div>
      ${data.lastReviewDate ? `
        <div class="detail-row">
          <span class="detail-row__label">Closed On:</span>
          <span class="detail-row__value">${formatDate(data.lastReviewDate)}</span>
        </div>` : ''}
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--secondary">View Preview</a>
    </div>
    <p class="info-note">To resubmit, create a new project via the Product Launch form.</p>`;
}

function renderNoReview() {
  const ctx = state.context;

  return `
    <p class="status-message status-message--no-review">No active review found for this page.</p>
    <div class="page-details">
      <div class="detail-row">
        <span class="detail-row__label">Page:</span>
        <span class="detail-row__value">${escapeHtml(ctx.pageIdentifier)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Status:</span>
        <span class="detail-row__value"><span class="status-badge status-badge--no-review">No Review</span></span>
      </div>
    </div>
    <div class="actions">
      <a href="${ctx.previewUrl}" target="_blank" class="btn btn--primary">View Preview</a>
    </div>
    <p class="info-note">Use "Send For Review" to submit this page for review.</p>`;
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
    case STATUS.APPROVED:
      content = renderApproved(viewState.data);
      break;
    case STATUS.SCHEDULED:
      content = renderScheduled(viewState.data);
      break;
    case STATUS.CHANGES_REQUESTED:
      content = renderChangesRequested(viewState.data);
      break;
    case STATUS.REJECTED:
      content = renderRejected(viewState.data);
      break;
    case STATUS.PUBLISHED:
    case STATUS.COMPLETE:
      content = renderComplete(viewState.data);
      break;
    case STATUS.NO_REVIEW:
      content = renderNoReview();
      break;
    default:
      content = renderError('Unknown state');
  }

  app.innerHTML = `<div class="status-card">${renderHeader()}<div class="content">${content}</div></div>`;
  attachEventListeners();
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  render({ status: STATUS.LOADING, message: 'Checking page status…' });

  try {
    state.context = await getFullContext();

    if (!state.context.org || !state.context.site) {
      render({ status: STATUS.ERROR, message: 'Could not determine page context. Make sure you have a page open.' });
      return;
    }

    const statusResponse = await checkReviewStatus(state.context);

    if (!statusResponse) {
      render({ status: STATUS.ERROR, message: 'Failed to check status. Please try again.' });
      return;
    }

    // Normalize the status from Fusion response
    const currentStatus = statusResponse.status
      ? normalizeStatus(statusResponse.status)
      : 'none';

    log('Normalized status', { raw: statusResponse.status, normalized: currentStatus });

    switch (currentStatus) {
      case 'in-review':
        render({ status: STATUS.IN_REVIEW, data: statusResponse });
        break;
      case 'approved':
        render({ status: STATUS.APPROVED, data: statusResponse });
        break;
      case 'scheduled':
        render({ status: STATUS.SCHEDULED, data: statusResponse });
        break;
      case 'changes-requested':
        render({ status: STATUS.CHANGES_REQUESTED, data: statusResponse });
        break;
      case 'rejected':
        render({ status: STATUS.REJECTED, data: statusResponse });
        break;
      case 'published':
        render({ status: STATUS.PUBLISHED, data: statusResponse });
        break;
      case 'complete':
        render({ status: STATUS.COMPLETE, data: statusResponse });
        break;
      default:
        render({ status: STATUS.NO_REVIEW });
        break;
    }
  } catch (error) {
    log('Init error', error.message);
    render({ status: STATUS.ERROR, message: `Error: ${error.message}` });
  }
}

// ============================================
// EVENT HANDLERS
// ============================================
function attachEventListeners() {
  document.getElementById('retry-btn')?.addEventListener('click', init);
  document.getElementById('debug-toggle')?.addEventListener('click', toggleDebugPanel);
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
}

function toggleDebugPanel() {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    panel.classList.toggle('debug-panel--visible');
    panel.textContent = state.debugLogs.join('\n');
  }
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
