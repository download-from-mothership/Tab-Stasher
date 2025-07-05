import { Storage } from '@google-cloud/storage';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { config } from './config';
import { metrics, logger } from './observability';

//////////////////////
// Client instances //
//////////////////////

const gcs    = new Storage();
const bucket = gcs.bucket(config.gcs.bucket);
const redis  = new Redis(config.redis.url);
const vision = new ImageAnnotatorClient({ keyFilename: config.vision.keyFilePath });

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
  const jobTimer = metrics.timer('visual_search.job_duration');
  logger.info('JobStart', { jobId });

  try {
    // 1️⃣ Upload → GCS
    const t1 = metrics.timer('visual_search.step_duration', { step: 'gcs_upload' });
    await bucket.file(`screenshots/${jobId}.png`).save(imageBuffer, { contentType: 'image/png', resumable: false });
    t1();

    // 2️⃣ Hash & cache lookup
    const t2 = metrics.timer('visual_search.step_duration', { step: 'cache_lookup' });
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const cached = await redis.hgetall(hashKey(hash));
    t2();
    if (cached && cached.matchUrl) {
      logger.info('CacheHit', { jobId, hash });
      await redis.hmset(jobKey(jobId), { status: 'done', ...cached });
      await redis.expire(jobKey(jobId), JOB_TTL);
      jobTimer();
      return;
    }

    // 3️⃣ Vision API call
    const t3 = metrics.timer('visual_search.step_duration', { step: 'vision_call' });
    const [visionResponse] = await vision.annotateImage({
      image: { content: imageBuffer },
      features: [{ type: 'WEB_DETECTION', maxResults: 10 }],
    });
    t3();

    // 4️⃣ Filter & rank
    const t4 = metrics.timer('visual_search.step_duration', { step: 'filter_rank' });
    const best = selectBestCandidate(visionResponse.webDetection?.pagesWithMatchingImages || []);
    t4();

    // 5️⃣ Cache result
    const t5 = metrics.timer('visual_search.step_duration', { step: 'cache_write' });
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
    await redis.hmset(hashKey(hash), cachePayload);
    await redis.expire(hashKey(hash), CACHE_TTL);
    t5();

    // 6️⃣ Job status write
    const t6 = metrics.timer('visual_search.step_duration', { step: 'job_write' });
    const jobPayload: JobResult = best.matchUrl
      ? { status: 'done', ...best }
      : { status: 'done', matchUrl: null };
    await redis.hmset(jobKey(jobId), jobPayload as any);
    await redis.expire(jobKey(jobId), JOB_TTL);
    t6();

    logger.info('JobSuccess', { jobId, matchUrl: best.matchUrl, confidence: (best as any).confidence });
  } catch (err: any) {
    logger.error('JobError', { jobId, error: err.message });
    metrics.increment('visual_search.error', 1);
    const errorPayload: JobResult = {
      status: 'error',
      matchUrl: null,
      errorMessage: err.message || 'Unknown error',
    };
    await redis.hmset(jobKey(jobId), errorPayload as any);
    await redis.expire(jobKey(jobId), JOB_TTL);
  } finally {
    jobTimer();
  }
}

/////////////////////////
// Helper definitions //
/////////////////////////

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