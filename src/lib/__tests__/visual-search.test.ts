// Mock external dependencies before importing the module
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  })),
}));

jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    annotateImage: jest.fn().mockResolvedValue([{
      webDetection: {
        pagesWithMatchingImages: [],
      },
    }]),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    hgetall: jest.fn().mockResolvedValue({}),
    hmset: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn().mockResolvedValue(1),
  }));
});

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash'),
  }),
}));

jest.mock('../config', () => ({
  config: {
    gcs: { bucket: 'test-bucket' },
    redis: { url: 'redis://localhost' },
    vision: { keyFilePath: '/path/to/key.json' },
  },
}));

// Now import the function we want to test
import { selectBestCandidate } from '../visual-search';

// Mock the isRetailerDomain function since it's not exported
// We'll test it indirectly through selectBestCandidate
jest.mock('../visual-search', () => {
  const originalModule = jest.requireActual('../visual-search');
  return {
    ...originalModule,
    // We'll test the actual implementation, but mock the helper for isolation
    isRetailerDomain: jest.fn((url: string) => {
      const retailers = ['amazon.com', 'bottegaveneta.com', 'net-a-porter.com'];
      return retailers.some(domain => url.includes(domain));
    }),
  };
});

describe('selectBestCandidate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filtering logic', () => {
    it('should filter out candidates below MIN_SCORE', () => {
      const candidates = [
        { url: 'https://amazon.com/product1', score: 3, pageTitle: 'Low Score Product' },
        { url: 'https://amazon.com/product2', score: 7, pageTitle: 'High Score Product' },
      ];

      const result = selectBestCandidate(candidates);
      
      expect(result).toEqual({
        matchUrl: 'https://amazon.com/product2',
        pageTitle: 'High Score Product',
        confidence: 7,
      });
    });

    it('should filter out non-retailer domains', () => {
      const candidates = [
        { url: 'https://random-blog.com/post', score: 8, pageTitle: 'Blog Post' },
        { url: 'https://amazon.com/product', score: 6, pageTitle: 'Amazon Product' },
      ];

      const result = selectBestCandidate(candidates);
      
      expect(result).toEqual({
        matchUrl: 'https://amazon.com/product',
        pageTitle: 'Amazon Product',
        confidence: 6,
      });
    });

    it('should filter out candidates with null/undefined URLs', () => {
      const candidates = [
        { url: null, score: 8, pageTitle: 'Null URL' },
        { url: undefined, score: 7, pageTitle: 'Undefined URL' },
        { url: 'https://amazon.com/product', score: 6, pageTitle: 'Valid Product' },
      ];

      const result = selectBestCandidate(candidates);
      
      expect(result).toEqual({
        matchUrl: 'https://amazon.com/product',
        pageTitle: 'Valid Product',
        confidence: 6,
      });
    });
  });

  describe('ranking algorithm', () => {
    it('should rank by score + fullMatchingImages count', () => {
      const candidates = [
        { 
          url: 'https://amazon.com/product1', 
          score: 6, 
          fullMatchingImages: [{}, {}], // 2 images
          pageTitle: 'Product 1' 
        },
        { 
          url: 'https://amazon.com/product2', 
          score: 8, 
          fullMatchingImages: [], // 0 images
          pageTitle: 'Product 2' 
        },
      ];

      const result = selectBestCandidate(candidates);
      
      // Product 1: 6 + 2 = 8, Product 2: 8 + 0 = 8
      // Should pick Product 1 due to more matching images
      expect(result).toEqual({
        matchUrl: 'https://amazon.com/product1',
        pageTitle: 'Product 1',
        confidence: 6,
      });
    });

    it('should handle null/undefined fullMatchingImages', () => {
      const candidates = [
        { 
          url: 'https://amazon.com/product1', 
          score: 6, 
          fullMatchingImages: null,
          pageTitle: 'Product 1' 
        },
        { 
          url: 'https://amazon.com/product2', 
          score: 7, 
          fullMatchingImages: undefined,
          pageTitle: 'Product 2' 
        },
      ];

      const result = selectBestCandidate(candidates);
      
      expect(result).toEqual({
        matchUrl: 'https://amazon.com/product2',
        pageTitle: 'Product 2',
        confidence: 7,
      });
    });
  });

  describe('edge cases', () => {
    it('should return { matchUrl: null } for empty candidates array', () => {
      const result = selectBestCandidate([]);
      expect(result).toEqual({ matchUrl: null });
    });

    it('should return { matchUrl: null } when no candidates pass filters', () => {
      const candidates = [
        { url: 'https://random-site.com', score: 3, pageTitle: 'Low Score' },
        { url: 'https://another-blog.com', score: 4, pageTitle: 'Non Retailer' },
      ];

      const result = selectBestCandidate(candidates);
      expect(result).toEqual({ matchUrl: null });
    });

    it('should handle candidates with missing optional fields', () => {
      const candidates = [
        { 
          url: 'https://amazon.com/product', 
          score: 6,
          // missing pageTitle and fullMatchingImages
        },
      ];

      const result = selectBestCandidate(candidates);
      
      expect(result).toEqual({
        matchUrl: 'https://amazon.com/product',
        pageTitle: '', // should default to empty string
        confidence: 6,
      });
    });

    it('should handle null score values', () => {
      const candidates = [
        { url: 'https://amazon.com/product', score: null, pageTitle: 'Product' },
      ];

      const result = selectBestCandidate(candidates);
      expect(result).toEqual({ matchUrl: null }); // null score < MIN_SCORE
    });
  });

  describe('return type validation', () => {
    it('should return correct structure for successful match', () => {
      const candidates = [
        { 
          url: 'https://bottegaveneta.com/bag', 
          score: 9, 
          pageTitle: 'Luxury Bag',
          fullMatchingImages: [{}, {}],
        },
      ];

      const result = selectBestCandidate(candidates);
      
      expect(result).toMatchObject({
        matchUrl: expect.any(String),
        pageTitle: expect.any(String),
        confidence: expect.any(Number),
      });
      
      expect(result.matchUrl).toBe('https://bottegaveneta.com/bag');
      expect(result.pageTitle).toBe('Luxury Bag');
      expect(result.confidence).toBe(9);
    });

    it('should return correct structure for no match', () => {
      const candidates = [
        { url: 'https://random-site.com', score: 3, pageTitle: 'Low Score' },
      ];

      const result = selectBestCandidate(candidates);
      
      expect(result).toEqual({ matchUrl: null });
      expect(result).not.toHaveProperty('pageTitle');
      expect(result).not.toHaveProperty('confidence');
    });
  });

  describe('integration scenarios', () => {
    it('should handle real-world candidate mix', () => {
      const candidates = [
        { url: 'https://blog.com/post', score: 8, pageTitle: 'Blog Post' }, // non-retailer
        { url: 'https://amazon.com/product1', score: 3, pageTitle: 'Low Score' }, // below threshold
        { url: 'https://amazon.com/product2', score: 7, fullMatchingImages: [{}, {}, {}], pageTitle: 'Best Match' }, // best
        { url: 'https://net-a-porter.com/item', score: 6, fullMatchingImages: [{}], pageTitle: 'Good Match' }, // good
      ];

      const result = selectBestCandidate(candidates);
      
      // Should pick product2: score 7 + 3 images = 10 (highest metric)
      expect(result).toEqual({
        matchUrl: 'https://amazon.com/product2',
        pageTitle: 'Best Match',
        confidence: 7,
      });
    });

    it('should prioritize higher score over more images when close', () => {
      const candidates = [
        { 
          url: 'https://amazon.com/product1', 
          score: 8, 
          fullMatchingImages: [{}, {}], // 2 images
          pageTitle: 'High Score' 
        },
        { 
          url: 'https://amazon.com/product2', 
          score: 6, 
          fullMatchingImages: [{}, {}, {}, {}], // 4 images
          pageTitle: 'More Images' 
        },
      ];

      const result = selectBestCandidate(candidates);
      
      // Product 1: 8 + 2 = 10, Product 2: 6 + 4 = 10
      // Should pick Product 1 due to higher score (tiebreaker)
      expect(result).toEqual({
        matchUrl: 'https://amazon.com/product1',
        pageTitle: 'High Score',
        confidence: 8,
      });
    });
  });
}); 