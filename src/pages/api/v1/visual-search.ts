import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';
import { scheduleVisualSearch } from '../../../lib/visual-search-edge';

export const runtime = 'edge'

// Global type declaration
declare global {
  var jobResults: Map<string, any> | undefined;
}

// In-memory storage for job results (in production, use Redis or database)
// Use global to share between files
if (typeof global.jobResults === 'undefined') {
  global.jobResults = new Map();
}
const jobResults = global.jobResults;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { metrics, logger } = await import('../../../lib/observability');
  const startTime = Date.now();
  logger.info('APIRequestStart', { route: req.url, method: req.method });

  if (req.method !== 'POST') {
    metrics.increment('http.request_error');
    logger.warn('APIRequestInvalidMethod', { method: req.method });
    res.status(405).json({ error: 'Method not allowed' });
    metrics.timing('http.request_duration', Date.now() - startTime);
    return;
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      metrics.increment('http.request_error');
      logger.warn('NoImageUploaded');
      res.status(400).json({ error: 'Missing imageBase64 field' });
      metrics.timing('http.request_duration', Date.now() - startTime);
      return;
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const jobId = uuid();

    logger.info('SchedulingJob', { jobId, fileSize: imageBuffer.length });
    await scheduleVisualSearch(jobId, imageBuffer);

    res.status(202).json({ jobId, status: 'processing' });
    logger.info('APIRequestSuccess', { jobId });
    metrics.increment('visual_search.jobs_scheduled');
  } catch (e: any) {
    metrics.increment('http.request_error');
    logger.error('SchedulingError', { error: e.message });
    res.status(500).json({ error: 'Failed to start visual search' });
  } finally {
    metrics.timing('http.request_duration', Date.now() - startTime);
  }
}

 