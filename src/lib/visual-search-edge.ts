import { config } from './config';
import { metrics, logger } from './observability';

///////////////////////
// Types & Constants //
///////////////////////

interface JobResult {
  status: 'done' | 'error';
  matchUrl: string | null;
  pageTitle?: string;
  confidence?: number;
  errorMessage?: string;
}

const CACHE_TTL = 24 * 60 * 60; // seconds
const JOB_TTL   = 24 * 60 * 60; // seconds

function jobKey(id: string) { return `job:${id}`; }
function hashKey(h: string) { return `visual-search:${h}`; }

///////////////////////////
// Main orchestration fn //
///////////////////////////

export async function scheduleVisualSearch(jobId: string, imageBuffer: Buffer) {
  const start = Date.now();
  logger.info('JobStart', { jobId });

  try {
    // 1️⃣ Hash & cache lookup
    const start2 = Date.now();
    const hash = await createHash(imageBuffer);
    const cached = await getFromCache(hashKey(hash));
    metrics.timing('visual_search.step_duration', Date.now() - start2, ['step:cache_lookup']);
    
    if (cached && cached.matchUrl) {
      logger.info('CacheHit', { jobId, hash });
      await setJobResult(jobKey(jobId), { status: 'done', ...cached });
      await setExpiry(jobKey(jobId), JOB_TTL);
      metrics.timing('visual_search.job_duration', Date.now() - start);
      return;
    }

    // 2️⃣ Vision API call using fetch
    const start3 = Date.now();
    const visionResponse = await callVisionAPI(imageBuffer);
    metrics.timing('visual_search.step_duration', Date.now() - start3, ['step:vision_call']);

    // 3️⃣ Filter & rank
    const start4 = Date.now();
    const best = selectBestCandidate(visionResponse.webDetection?.pagesWithMatchingImages || []);
    metrics.timing('visual_search.step_duration', Date.now() - start4, ['step:filter_rank']);

    // 4️⃣ Cache result
    const start5 = Date.now();
    let cachePayload;
    if (best.matchUrl) {
      cachePayload = {
        matchUrl: best.matchUrl,
        pageTitle: (best as any).pageTitle || '',
        confidence: String((best as any).confidence || ''),
      };
    } else {
      cachePayload = { matchUrl: '' };
    }
    await setCacheData(hashKey(hash), cachePayload);
    await setExpiry(hashKey(hash), CACHE_TTL);
    metrics.timing('visual_search.step_duration', Date.now() - start5, ['step:cache_write']);

    // 5️⃣ Job status write
    const start6 = Date.now();
    const jobPayload: JobResult = best.matchUrl
      ? { status: 'done', ...best }
      : { status: 'done', matchUrl: null };
    await setJobResult(jobKey(jobId), jobPayload as any);
    await setExpiry(jobKey(jobId), JOB_TTL);
    metrics.timing('visual_search.step_duration', Date.now() - start6, ['step:job_write']);

    logger.info('JobSuccess', { jobId, matchUrl: best.matchUrl, confidence: (best as any).confidence });
  } catch (err: any) {
    logger.error('JobError', { jobId, error: err.message });
    metrics.increment('visual_search.error', 1);
    const errorPayload: JobResult = {
      status: 'error',
      matchUrl: null,
      errorMessage: err.message || 'Unknown error',
    };
    await setJobResult(jobKey(jobId), errorPayload as any);
    await setExpiry(jobKey(jobId), JOB_TTL);
  } finally {
    metrics.timing('visual_search.job_duration', Date.now() - start);
  }
}

/////////////////////////
// Helper functions //
/////////////////////////

async function createHash(buffer: Buffer): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(buffer.toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function callVisionAPI(imageBuffer: Buffer) {
  const apiKey = config.vision.apiKey;
  if (!apiKey) {
    throw new Error('Google Vision API key not configured');
  }

  const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const body = {
    requests: [
      {
        image: { content: imageBuffer.toString('base64') },
        features: [
          { type: 'WEB_DETECTION', maxResults: 10 }
        ]
      }
    ]
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Vision API error: ${error}`);
  }

  const data = await response.json();
  return data.responses?.[0] || {};
}

// Simple in-memory cache for Edge Runtime (replace with Cloudflare KV in production)
const memoryCache = new Map();

async function getFromCache(key: string): Promise<any> {
  const cached = memoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  if (cached) {
    memoryCache.delete(key);
  }
  return null;
}

async function setCacheData(key: string, data: any): Promise<void> {
  memoryCache.set(key, {
    data,
    expiry: Date.now() + (CACHE_TTL * 1000)
  });
}

async function setJobResult(key: string, data: any): Promise<void> {
  memoryCache.set(key, {
    data,
    expiry: Date.now() + (JOB_TTL * 1000)
  });
}

async function setExpiry(key: string, ttl: number): Promise<void> {
  const cached = memoryCache.get(key);
  if (cached) {
    cached.expiry = Date.now() + (ttl * 1000);
  }
}

export async function getJobResult(jobId: string): Promise<any> {
  return await getFromCache(jobKey(jobId));
}

/**
 * From Vision API pagesWithMatchingImages, pick the best match:
 * - Must exceed MIN_SCORE
 * - Must pass retailer-domain whitelist
 * - Ranked by (score + # of fullMatchingImages)
 */
export function selectBestCandidate(
  candidates: Array<{
    url?: string | null;
    score?: number | null;
    fullMatchingImages?: any[] | null;
    pageTitle?: string | null;
  }>
): { matchUrl: string; pageTitle: string; confidence: number } | { matchUrl: null } {
  const MIN_SCORE = 5;

  const filtered = candidates
    .filter(p => p.url && p.score! >= MIN_SCORE && isRetailerDomain(p.url!));

  if (filtered.length === 0) {
    return { matchUrl: null };
  }

  filtered.sort((a, b) => {
    const aMetric = (a.score! || 0) + (a.fullMatchingImages?.length || 0);
    const bMetric = (b.score! || 0) + (b.fullMatchingImages?.length || 0);
    return bMetric - aMetric;
  });

  const top = filtered[0];
  return {
    matchUrl: top.url!,
    pageTitle: top.pageTitle || '',
    confidence: top.score!,
  };
}

/**
 * Whitelist check for retailer domains.
 */
function isRetailerDomain(url: string): boolean {
  const retailers = [
    'amazon.com',
    'bottegaveneta.com',
    'net-a-porter.com',
    // extend as needed
  ];
  return retailers.some(domain => url.includes(domain));
} 