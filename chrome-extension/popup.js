// Popup script for Tab Stasher Chrome Extension
// Handles UI interactions and communicates with background script

class TabStasherPopup {
  constructor() {
    this.apiBaseUrl = 'https://tab-stasher.tab-stasher.workers.dev';
    this.currentTab = null;
    this.isAuthenticated = false;
    
    this.setupEventListeners();
    this.initialize();
  }

  setupEventListeners() {
    // Save tab button
    document.getElementById('save-tab-btn').addEventListener('click', () => {
      this.saveCurrentTab();
    });

    // Login button
    document.getElementById('login-btn').addEventListener('click', () => {
      this.openLogin();
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });

    // Refresh auth button
    document.getElementById('refresh-auth-btn').addEventListener('click', () => {
      this.refreshAuthState();
    });

    // Open dashboard button
    document.getElementById('open-dashboard-btn').addEventListener('click', () => {
      this.openDashboard();
    });

    // Listen for auth completion from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'authCompleted') {
        this.refreshAuthState();
      }
      return true; // Keep message channel open
    });
  }

  async initialize() {
    try {
      // Check storage for login state
      const { authCompletedAt, loginInProgress, loginStartedAt } = await chrome.storage.local.get([
        'authCompletedAt',
        'loginInProgress',
        'loginStartedAt'
      ]);

      // If login is in progress, show status and start polling
      if (loginInProgress && loginStartedAt && (Date.now() - loginStartedAt) < 300000) {
        // Login was started recently (within 5 minutes)
        this.showStatus('Login in progress... waiting for authentication.', 'loading');
        this.pollForAuthCompletion();
        return; // Don't proceed with normal initialization
      }

      // Check if auth was completed recently (within last 30 seconds)
      if (authCompletedAt && (Date.now() - authCompletedAt) < 30000) {
        // Auth was completed recently, refresh state
        await this.refreshAuthState();
      } else {
        // Normal initialization - check auth status
        await this.checkAuthStatus();
      }

      // Get current tab information
      await this.getCurrentTabInfo();

      // Show appropriate UI
      this.updateUI();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showStatus('Error initializing extension', 'error');
    }
  }

  async checkAuthStatus() {
    try {
      // First check stored auth state
      const { isAuthenticated: storedAuth, authCompletedAt } = await chrome.storage.local.get([
        'isAuthenticated',
        'authCompletedAt'
      ]);

      // If recently authenticated (within last 30 seconds), trust the stored state
      if (storedAuth && authCompletedAt && (Date.now() - authCompletedAt) < 30000) {
        console.log('Using recently stored auth state:', storedAuth);
        this.isAuthenticated = storedAuth;
        return;
      }

      // Otherwise, check authentication by testing the API
      const response = await chrome.runtime.sendMessage({
        action: 'checkAuth'
      }).catch(error => {
        console.error('Failed to send message to background script:', error);
        return { isAuthenticated: false };
      });

      const isAuth = response && response.isAuthenticated;
      this.isAuthenticated = isAuth;

      // Update stored auth state
      if (isAuth) {
        chrome.storage.local.set({
          isAuthenticated: true,
          authCompletedAt: Date.now()
        });
      } else {
        chrome.storage.local.set({
          isAuthenticated: false
        });
      }

      console.log('Auth status from API:', isAuth);
    } catch (error) {
      console.error('Auth check error:', error);
      this.isAuthenticated = false;
    }
  }

  async getCurrentTabInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      // Update UI with tab information
      document.getElementById('tab-title').textContent = tab.title || 'Untitled';
      document.getElementById('tab-url').textContent = tab.url;
    } catch (error) {
      console.error('Error getting tab info:', error);
      document.getElementById('tab-title').textContent = 'Error';
      document.getElementById('tab-url').textContent = 'Could not get tab information';
    }
  }

  updateUI() {
    const authSection = document.getElementById('auth-section');
    const mainContent = document.getElementById('main-content');
    
    if (this.isAuthenticated) {
      authSection.classList.add('hidden');
      mainContent.classList.remove('hidden');
    } else {
      authSection.classList.remove('hidden');
      mainContent.classList.add('hidden');
    }
  }

  async saveCurrentTab() {
    if (!this.currentTab) {
      this.showStatus('No tab to save', 'error');
      return;
    }

    const saveBtn = document.getElementById('save-tab-btn');
    const originalText = saveBtn.innerHTML;
    
    try {
      // Show loading state
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<div class="loading"></div> Saving...';
      this.showStatus('Saving tab...', 'loading');

      // Get additional page content
      const tabData = await this.getTabData();
      
      // Send to background script for processing
      const response = await chrome.runtime.sendMessage({
        action: 'saveTab',
        tabData: tabData
      });

      if (response.success) {
        this.showStatus('Tab saved successfully!', 'success');
      } else {
        throw new Error(response.error || 'Failed to save tab');
      }
    } catch (error) {
      console.error('Save error:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
    } finally {
      // Reset button state
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }

  async getTabData() {
    try {
      // Get basic tab info
      const tabData = {
        url: this.currentTab.url,
        title: this.currentTab.title,
        favicon: this.currentTab.favIconUrl
      };

      // Try to get additional content from the page
      try {
        const response = await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'getPageContent'
        }).catch(error => {
          console.log('Could not get page content:', error);
          return null;
        });
        
        if (response && response.success) {
          return {
            ...tabData,
            description: response.data.description,
            image: response.data.image,
            content: response.data.content
          };
        }
      } catch (error) {
        console.log('Could not get page content:', error);
      }

      return tabData;
    } catch (error) {
      console.error('Error getting tab data:', error);
      return {
        url: this.currentTab.url,
        title: this.currentTab.title,
        favicon: this.currentTab.favIconUrl
      };
    }
  }

  async refreshAuthState() {
    this.showStatus('Checking authentication...', 'loading');
    await this.checkAuthStatus();

    // Also update tab information when refreshing auth
    await this.getCurrentTabInfo();

    this.updateUI();

    if (this.isAuthenticated) {
      this.showStatus('Authentication successful!', 'success');
    } else {
      this.showStatus('Not authenticated. Please log in.', 'error');
    }
  }

  openLogin() {
    try {
      // Show loading state while opening login
      this.showStatus('Opening login page...', 'loading');

      // Set flag that login is in progress
      chrome.storage.local.set({
        loginInProgress: true,
        loginStartedAt: Date.now()
      });

      // Send message to background script to handle auth flow
      chrome.runtime.sendMessage({
        action: 'handleAuth'
      }).catch(error => {
        console.error('Failed to send message to background script:', error);
        this.showStatus('Error: Could not open login page', 'error');
      });

      // Start polling for auth completion while popup stays open
      this.pollForAuthCompletion();
    } catch (error) {
      console.error('Error opening login:', error);
      this.showStatus('Error opening login page', 'error');
    }
  }

  async pollForAuthCompletion() {
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts = 3 minutes with 3s intervals

    const pollInterval = setInterval(async () => {
      attempts++;

      // Check if auth completed
      const { authCompletedAt, loginInProgress } = await chrome.storage.local.get(['authCompletedAt', 'loginInProgress']);

      if (authCompletedAt && (Date.now() - authCompletedAt) < 30000) {
        // Auth completed recently
        console.log('Auth completion detected via polling');
        clearInterval(pollInterval);
        await chrome.storage.local.set({ loginInProgress: false });

        await this.refreshAuthState();
        this.showStatus('Login successful! You can now save tabs.', 'success');

        // Keep popup open for 2 more seconds to show success, then close
        setTimeout(() => {
          window.close();
        }, 2000);
      } else if (attempts >= maxAttempts) {
        // Timeout - stop polling
        console.log('Auth polling timeout after', maxAttempts, 'attempts');
        clearInterval(pollInterval);
        await chrome.storage.local.set({ loginInProgress: false });
        this.showStatus('Login page has been opened. Please complete login and return to the extension.', 'info');
      }
    }, 3000); // Poll every 3 seconds
  }

  async logout() {
    try {
      this.showStatus('Logging out...', 'loading');

      // Clear stored auth state
      await chrome.storage.local.remove(['authCompletedAt', 'isAuthenticated', 'loginInProgress']);

      // Send logout message to background script
      chrome.runtime.sendMessage({
        action: 'logout'
      }).catch(error => {
        console.log('Could not send logout message:', error.message);
      });

      // Update UI
      this.isAuthenticated = false;
      this.updateUI();
      this.showStatus('Logged out successfully', 'success');

      // Refresh auth status after a short delay
      setTimeout(() => {
        this.checkAuthStatus();
        this.updateUI();
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      this.showStatus('Error logging out', 'error');
    }
  }

  openDashboard() {
    chrome.tabs.create({
      url: `${this.apiBaseUrl}/dashboard`
    });
    window.close();
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status status-${type}`;
    statusEl.classList.remove('hidden');

    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        statusEl.classList.add('hidden');
      }, 3000);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TabStasherPopup();
});
