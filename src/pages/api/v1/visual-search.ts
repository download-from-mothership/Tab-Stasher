import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { v4 as uuid } from 'uuid';
import fs from 'fs/promises';
import fsSync from 'fs';
import { scheduleVisualSearch } from '../../../lib/visual-search';

// Global type declaration
declare global {
  var jobResults: Map<string, any> | undefined;
}

// Disable Next.js default body parser for this route
export const configNext = {
  api: {
    bodyParser: false,
  },
};

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

  const form = new formidable.IncomingForm();
  form.parse(req, async (err: any, _fields: any, files: any) => {
    if (err) {
      metrics.increment('http.request_error');
      logger.error('FormParseError', { error: err.message });
      res.status(500).json({ error: 'Error parsing upload' });
      metrics.timing('http.request_duration', Date.now() - startTime);
      return;
    }

    const file = files.screenshot as formidable.File;
    if (!file) {
      metrics.increment('http.request_error');
      logger.warn('NoFileUploaded');
      res.status(400).json({ error: 'Missing screenshot file' });
      metrics.timing('http.request_duration', Date.now() - startTime);
      return;
    }

    try {
      const data = await fs.readFile(file.filepath);
      const jobId = uuid();

      logger.info('SchedulingJob', { jobId, fileSize: data.length });
      await scheduleVisualSearch(jobId, data);

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
  });
}

async function processImageSearch(jobId: string, imagePath: string) {
  try {
    console.log(`Starting visual search for job ${jobId}`);
    
    // Check if file exists
    if (!fsSync.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    // Read the image file and convert to base64
    const imageBuffer = fsSync.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    console.log(`Image converted to base64, size: ${base64.length} characters`);
    
    // Use the existing OCR/web detection API
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const apiUrl = `${nextAuthUrl}/api/ocr-read`;
    console.log(`Calling OCR API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64 }),
    });

    console.log(`OCR API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OCR API error: ${errorText}`);
      throw new Error(`OCR/Web detection failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`OCR API result:`, result);
    
    // Store the result
    jobResults.set(jobId, {
      status: 'completed',
      result: result.bestMatch || null,
      timestamp: Date.now()
    });

    console.log(`Job ${jobId} completed successfully`);

    // Clean up the temporary file
    try {
      fsSync.unlinkSync(imagePath);
      console.log(`Cleaned up temp file: ${imagePath}`);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError);
    }

  } catch (error: unknown) {
    console.error('Image search processing error:', error);
    jobResults.set(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
} 