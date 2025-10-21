// Content script for Tab Stasher Chrome Extension
// Handles page content extraction and mini-toast notifications

class TabStasherContent {
  constructor() {
    this.toastContainer = null;
    this.setupMessageHandlers();
    this.createToastContainer();
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'getPageContent':
          this.getPageContent()
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true;

        case 'showToast':
          this.showToast(request.title, request.message, request.type);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  getPageContent() {
    return new Promise((resolve) => {
      try {
        // Extract meta information
        const metaDescription = document.querySelector('meta[name="description"]')?.content ||
                               document.querySelector('meta[property="og:description"]')?.content || '';
        const metaImage = document.querySelector('meta[property="og:image"]')?.content ||
                         document.querySelector('meta[name="twitter:image"]')?.content ||
                         document.querySelector('meta[property="og:image:url"]')?.content || '';

        // Extract page content with improved selectors
        const selectors = [
          'article',
          '[role="main"]',
          '.main-content',
          '.post-content',
          '.entry-content',
          '.content',
          '#content',
          '.article-content',
          '.story-content',
          '[role="article"]'
        ];

        let mainContent = null;
        for (const selector of selectors) {
          mainContent = document.querySelector(selector);
          if (mainContent) break;
        }

        let content = '';

        if (mainContent) {
          // Extract from main content area
          const paragraphs = mainContent.querySelectorAll('p, li, h2, h3');
          for (let i = 0; i < Math.min(5, paragraphs.length); i++) {
            const text = paragraphs[i].textContent?.trim();
            if (text && text.length > 30) {
              content += text + ' ';
              if (content.length > 500) break;
            }
          }
        }

        // Fallback: extract from all paragraphs if no main content found
        if (!content) {
          const allParagraphs = document.querySelectorAll('p');
          for (let i = 0; i < Math.min(5, allParagraphs.length); i++) {
            const text = allParagraphs[i].textContent?.trim();
            if (text && text.length > 30) {
              content += text + ' ';
              if (content.length > 500) break;
            }
          }
        }

        // Final fallback to body text with better filtering
        if (!content) {
          const bodyText = document.body.textContent?.trim();
          if (bodyText && bodyText.length > 100) {
            // Try to get first meaningful chunk
            content = bodyText.substring(0, 500);
          }
        }

        resolve({
          description: metaDescription.substring(0, 200),
          image: metaImage,
          content: content.trim().substring(0, 1000)
        });
      } catch (error) {
        console.error('Error extracting page content:', error);
        resolve({
          description: '',
          image: '',
          content: ''
        });
      }
    });
  }

  createToastContainer() {
    // Create toast container if it doesn't exist
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'tab-stasher-toast-container';
      this.toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(this.toastContainer);
    }
  }

  showToast(title, message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'tab-stasher-toast';

    // Set colors based on type
    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      error: { bg: '#ef4444', border: '#dc2626' },
      warning: { bg: '#f59e0b', border: '#d97706' },
      info: { bg: '#3b82f6', border: '#2563eb' }
    };

    const color = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${color.bg};
      border: 1px solid ${color.border};
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
      pointer-events: auto;
    `;

    // Create title element safely to prevent XSS
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight: 600; margin-bottom: 4px;';
    titleEl.textContent = title;

    // Create message element safely to prevent XSS
    const messageEl = document.createElement('div');
    messageEl.style.cssText = 'opacity: 0.9;';
    messageEl.textContent = message;

    // Append child elements instead of using innerHTML
    toast.appendChild(titleEl);
    toast.appendChild(messageEl);
    
    // Add to container
    this.toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
    
    // Add click to dismiss
    toast.addEventListener('click', () => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    });
  }
}

// Initialize content script with better error handling
function initializeContentScript() {
  try {
    new TabStasherContent();
  } catch (error) {
    console.error('Failed to initialize Tab Stasher content script:', error);
  }
}

// Initialize immediately if DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeContentScript();
} else {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', initializeContentScript);

  // Fallback: initialize after a short delay if DOMContentLoaded doesn't fire
  setTimeout(() => {
    if (!window.tabStasherInitialized) {
      console.log('Initializing Tab Stasher fallback after timeout');
      initializeContentScript();
    }
  }, 1000);
}

// Mark as initialized to prevent duplicate initialization
window.tabStasherInitialized = true;
