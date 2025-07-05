import { NextRequest, NextResponse } from 'next/server';

const AZURE_ENDPOINT = process.env.AZURE_COMPUTER_VISION_ENDPOINT;
const AZURE_KEY = process.env.AZURE_COMPUTER_VISION_KEY;
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

async function runAzureOCR(url: string) {
  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    throw new Error('Azure Computer Vision credentials not set');
  }
  const analyzeRes = await fetch(`${AZURE_ENDPOINT}/vision/v3.2/read/analyze`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  if (analyzeRes.status !== 202) {
    const error = await analyzeRes.text();
    throw new Error('Failed to start OCR: ' + error);
  }
  const operationLocation = analyzeRes.headers.get('operation-location');
  if (!operationLocation) {
    throw new Error('No operation-location header from Azure');
  }
  let result, status;
  let attempts = 0;
  do {
    await new Promise(res => setTimeout(res, 1000));
    const pollRes = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY },
    });
    result = await pollRes.json();
    status = result.status;
    attempts++;
    if (attempts > 15) {
      throw new Error('OCR polling timed out');
    }
  } while (status === 'running' || status === 'notStarted');
  if (status !== 'succeeded') {
    throw new Error('OCR failed: ' + JSON.stringify(result));
  }
  const lines = (result.analyzeResult?.readResults || [])
    .flatMap((page: any) => page.lines?.map((line: any) => line.text) || []);
  return lines;
}

async function runGoogleWebDetection(base64: string) {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Google Vision API key not set');
  }
  const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [
          { type: 'WEB_DETECTION', maxResults: 10 }
        ]
      }
    ]
  };
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error('Google Vision API error: ' + error);
  }
  const data = await res.json();
  const webDetection = data.responses?.[0]?.webDetection || {};
  return webDetection;
}

function pickBestWebDetectionMatch(webDetection: any) {
  if (!webDetection || !Array.isArray(webDetection.pagesWithMatchingImages)) return null;
  // 1. Filter to .com domains
  const filtered = webDetection.pagesWithMatchingImages.filter((page: any) =>
    typeof page.url === 'string' && page.url.includes('.com')
  );
  // 2. Sort by score and fullMatchingImages.length
  filtered.sort((a: any, b: any) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    const fullA = Array.isArray(a.fullMatchingImages) ? a.fullMatchingImages.length : 0;
    const fullB = Array.isArray(b.fullMatchingImages) ? b.fullMatchingImages.length : 0;
    // Sort by score DESC, then by number of full matches DESC
    if (scoreB !== scoreA) return scoreB - scoreA;
    return fullB - fullA;
  });
  // 3. Threshold: score >= 1.0
  const thresholded = filtered.filter((page: any) => (page.score || 0) >= 1.0);
  // 4. Return the top match (or null)
  if (thresholded.length > 0) {
    const top = thresholded[0];
    return {
      url: top.url,
      score: top.score,
      pageTitle: top.pageTitle,
      fullMatchingImages: top.fullMatchingImages,
      partialMatchingImages: top.partialMatchingImages
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { url, base64 } = await req.json();
    if (!url && !base64) {
      return NextResponse.json({ error: 'Missing url or base64 image' }, { status: 400 });
    }
    let ocrText = null;
    let webDetection = null;
    let bestMatch = null;
    const promises = [];
    if (url) {
      promises.push(
        runAzureOCR(url).then(text => { ocrText = text; }).catch(e => { ocrText = { error: e.message }; })
      );
    }
    if (base64) {
      promises.push(
        runGoogleWebDetection(base64).then(res => {
          webDetection = res;
          bestMatch = pickBestWebDetectionMatch(res);
        }).catch(e => { webDetection = { error: e.message }; bestMatch = null; })
      );
    }
    await Promise.all(promises);
    return NextResponse.json({ ocrText, webDetection, bestMatch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 