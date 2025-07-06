import type { NextApiRequest, NextApiResponse } from 'next';
import Redis from 'ioredis';
import { metrics, logger } from '../../../../lib/observability';
import { config } from '../../../../lib/config';

const redis = new Redis(config.redis.url);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { jobId } = req.query as { jobId: string };
  const start = Date.now();
  logger.info('PollRequestStart', { jobId, method: req.method });

  try {
    if (req.method !== 'GET') {
      metrics.increment('http.request_error', 1, [`route:${req.url}`, `method:${req.method}`]);
      logger.warn('PollInvalidMethod', { method: req.method });
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const data = await redis.hgetall(`job:${jobId}`);
    if (!data || !data.status) {
      metrics.increment('http.request_error', 1, ['step:job_not_found']);
      logger.warn('JobNotFound', { jobId });
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (data.status === 'processing') {
      res.status(200).json({ jobId, status: 'processing' });
      return;
    }

    if (data.status === 'error') {
      metrics.increment('visual_search.error', 1);
      res.status(500).json({ jobId, status: 'error', errorMessage: data.errorMessage });
      logger.error('PollJobError', { jobId, errorMessage: data.errorMessage });
      return;
    }

    // status === 'done'
    res.status(200).json({
      jobId,
      status: 'done',
      matchUrl: data.matchUrl || null,
      pageTitle: data.pageTitle || null,
      confidence: data.confidence ? Number(data.confidence) : null,
    });
    logger.info('PollJobSuccess', { jobId, matchUrl: data.matchUrl });
  } catch (err: any) {
    metrics.increment('http.request_error', 1, ['step:poll_exception']);
    logger.error('PollException', { jobId, error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    metrics.timing(
      'http.request_duration',
      Date.now() - start,
      [`route:/api/v1/visual-search/[jobId]`, `method:${req.method}`, `status_code:${res.statusCode}`]
    );
  }
} 