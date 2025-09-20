// Background service worker for ToolTip Companion Extension (Local Storage Version)
class ToolTipBackground {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      triggerEvent: 'hover', // 'hover', 'click', 'focus'
      showPreviews: true,
      interactiveTooltips: true, // Enable draggable/resizable tooltips
      analysisMode: 'local', // 'local', 'api'
      apiUrl: '',
      apiKey: '',
      delay: 500, // ms delay before showing tooltip
      position: 'auto', // 'auto', 'top', 'bottom', 'left', 'right'
      localScreenshots: {
        enabled: true,
        autoCapture: true, // Automatically capture screenshots for links
        waitTime: 3000, // Wait time for page load
        maxStorageSize: 50 * 1024 * 1024, // 50MB max storage
        cleanupInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    };
    
    this.dbName = 'ToolTipScreenshots';
    this.dbVersion = 1;
    this.db = null;
    
    this.init();
  }

  init() {
    // Initialize settings on install
    chrome.runtime.onInstalled.addListener(() => {
      this.initializeSettings();
      this.initializeDatabase();
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Initialize database on startup
    this.initializeDatabase();
  }

  async initializeSettings() {
    const result = await chrome.storage.local.get('tooltipSettings');
    if (!result.tooltipSettings) {
      await chrome.storage.local.set({
        tooltipSettings: this.defaultSettings
      });
    }
  }

  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create screenshots object store
        if (!db.objectStoreNames.contains('screenshots')) {
          const store = db.createObjectStore('screenshots', { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;

        case 'updateSettings':
          await this.updateSettings(request.data);
          // Notify all content scripts about settings change
          this.broadcastSettingsUpdate();
          sendResponse({ success: true });
          break;

        case 'analyzeElement':
          const analysis = await this.analyzeElement(request.data);
          sendResponse({ success: true, data: analysis });
          break;

        case 'captureScreenshot':
          const screenshot = await this.captureScreenshotLocal(request.data);
          sendResponse({ success: true, data: screenshot });
          break;

        case 'previewLink':
          const preview = await this.previewLinkLocal(request.data);
          sendResponse({ success: true, data: preview });
          break;

        case 'captureScreenshotWithPlaywright':
          const playwrightScreenshot = await this.captureScreenshotWithPlaywright(request.data);
          sendResponse({ success: true, data: playwrightScreenshot });
          break;

        case 'cleanupOldScreenshots':
          await this.cleanupOldScreenshots();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getSettings() {
    const result = await chrome.storage.local.get('tooltipSettings');
    return result.tooltipSettings || this.defaultSettings;
  }

  async updateSettings(newSettings) {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    await chrome.storage.local.set({ tooltipSettings: updatedSettings });
  }

  async broadcastSettingsUpdate() {
    const tabs = await chrome.tabs.query({});
    const settings = await this.getSettings();
    
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'settingsUpdated',
        data: settings
      }).catch(() => {
        // Ignore errors for tabs that don't have content script
      });
    });
  }

  async analyzeElement(elementData) {
    const settings = await this.getSettings();
    
    if (settings.analysisMode === 'api' && settings.apiUrl && settings.apiKey) {
      return await this.analyzeWithAPI(elementData, settings);
    } else {
      return this.analyzeLocally(elementData);
    }
  }

  analyzeLocally(elementData) {
    // Local heuristic-based analysis
    const { tag, text, attributes, url } = elementData;
    
    let tooltip = '';
    let confidence = 0.7;
    let source = 'local';

    // Check for existing tooltip attributes
    if (attributes.title) {
      tooltip = attributes.title;
      confidence = 0.9;
    } else if (attributes['aria-label']) {
      tooltip = attributes['aria-label'];
      confidence = 0.85;
    } else if (text) {
      // Generate tooltip based on element type and text
      tooltip = this.generateTooltipFromText(tag, text, attributes);
      confidence = 0.6;
    } else {
      // Fallback based on element type
      tooltip = this.generateFallbackTooltip(tag, attributes);
      confidence = 0.4;
    }

    return {
      tooltip: tooltip || 'Interactive element',
      confidence,
      source,
      elementType: tag,
      hasExistingTooltip: !!(attributes.title || attributes['aria-label'])
    };
  }

  generateTooltipFromText(tag, text, attributes) {
    const cleanText = text.trim().substring(0, 100);
    
    switch (tag) {
      case 'button':
        if (cleanText.toLowerCase().includes('submit')) {
          return `Submit: ${cleanText}`;
        } else if (cleanText.toLowerCase().includes('cancel')) {
          return `Cancel: ${cleanText}`;
        } else if (cleanText.toLowerCase().includes('save')) {
          return `Save: ${cleanText}`;
        } else if (cleanText.toLowerCase().includes('delete')) {
          return `Delete: ${cleanText}`;
        }
        return `Button: ${cleanText}`;
        
      case 'a':
        if (attributes.href) {
          const domain = this.extractDomain(attributes.href);
          return `Link to ${domain}: ${cleanText}`;
        }
        return `Link: ${cleanText}`;
        
      case 'input':
        const type = attributes.type || 'text';
        return `${type.charAt(0).toUpperCase() + type.slice(1)} input: ${cleanText}`;
        
      default:
        return `${tag.charAt(0).toUpperCase() + tag.slice(1)}: ${cleanText}`;
    }
  }

  generateFallbackTooltip(tag, attributes) {
    switch (tag) {
      case 'button':
        return 'Clickable button';
      case 'a':
        if (attributes.href) {
          const domain = this.extractDomain(attributes.href);
          return `Link to ${domain}`;
        }
        return 'Link';
      case 'input':
        const type = attributes.type || 'text';
        return `${type.charAt(0).toUpperCase() + type.slice(1)} input field`;
      default:
        return `Interactive ${tag} element`;
    }
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'external site';
    }
  }

  async analyzeWithAPI(elementData, settings) {
    try {
      const response = await fetch(settings.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          element: elementData,
          context: {
            url: elementData.url,
            timestamp: Date.now()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        tooltip: result.tooltip || 'API analysis result',
        confidence: result.confidence || 0.8,
        source: 'api',
        elementType: elementData.tag,
        apiResponse: result
      };
    } catch (error) {
      console.error('API analysis failed:', error);
      // Fallback to local analysis
      return this.analyzeLocally(elementData);
    }
  }

  async captureScreenshotLocal(elementData) {
    const settings = await this.getSettings();
    
    if (!settings.localScreenshots.enabled) {
      return { success: false, error: 'Local screenshots disabled' };
    }

    try {
      // Check if we already have a recent screenshot for this URL
      const existingScreenshot = await this.getExistingScreenshot(elementData.url);
      if (existingScreenshot) {
        return {
          success: true,
          screenshot: existingScreenshot.dataUrl,
          metadata: existingScreenshot.metadata,
          timestamp: existingScreenshot.timestamp,
          cached: true
        };
      }

      // Capture new screenshot using chrome.tabs API
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        throw new Error('No active tab found');
      }

      const tab = tabs[0];
      
      // Capture visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 90
      });

      // Get page metadata
      const metadata = await this.getPageMetadata(tab.id);

      // Store screenshot in IndexedDB
      const screenshotId = await this.storeScreenshot({
        url: elementData.url,
        dataUrl: dataUrl,
        metadata: metadata,
        timestamp: Date.now(),
        elementType: elementData.tag
      });

      return {
        success: true,
        screenshot: dataUrl,
        metadata: metadata,
        timestamp: Date.now(),
        screenshotId: screenshotId
      };

    } catch (error) {
      console.error('Local screenshot capture failed:', error);
      return { 
        success: false, 
        error: error.message,
        fallback: 'Screenshot capture unavailable'
      };
    }
  }

  async previewLinkLocal(linkData) {
    const settings = await this.getSettings();
    
    if (!settings.localScreenshots.enabled) {
      return { success: false, error: 'Local screenshots disabled' };
    }

    try {
      // Check if we already have a recent screenshot for this URL
      const existingScreenshot = await this.getExistingScreenshot(linkData.url);
      if (existingScreenshot) {
        return {
          success: true,
          screenshot: existingScreenshot.dataUrl,
          metadata: existingScreenshot.metadata,
          timestamp: existingScreenshot.timestamp,
          cached: true
        };
      }

      // For link previews, we need to open the URL in a new tab temporarily
      const newTab = await chrome.tabs.create({ 
        url: linkData.url, 
        active: false 
      });

      // Wait for the page to load
      await this.waitForTabLoad(newTab.id, settings.localScreenshots.waitTime);

      // Capture screenshot
      const dataUrl = await chrome.tabs.captureVisibleTab(newTab.windowId, {
        format: 'png',
        quality: 90
      });

      // Get page metadata
      const metadata = await this.getPageMetadata(newTab.id);

      // Close the temporary tab
      await chrome.tabs.remove(newTab.id);

      // Store screenshot in IndexedDB
      const screenshotId = await this.storeScreenshot({
        url: linkData.url,
        dataUrl: dataUrl,
        metadata: metadata,
        timestamp: Date.now(),
        elementType: 'link_preview'
      });

      return {
        success: true,
        screenshot: dataUrl,
        metadata: metadata,
        timestamp: Date.now(),
        screenshotId: screenshotId
      };

    } catch (error) {
      console.error('Local link preview failed:', error);
      return { 
        success: false, 
        error: error.message,
        fallback: 'Link preview unavailable'
      };
    }
  }

  async waitForTabLoad(tabId, waitTime) {
    return new Promise((resolve) => {
      const checkTab = () => {
        chrome.tabs.get(tabId, (tab) => {
          if (tab && tab.status === 'complete') {
            setTimeout(resolve, waitTime); // Additional wait time
          } else {
            setTimeout(checkTab, 500);
          }
        });
      };
      checkTab();
    });
  }

  async getPageMetadata(tabId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => ({
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          url: window.location.href,
          favicon: document.querySelector('link[rel="icon"]')?.href || '',
          ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
          ogTitle: document.querySelector('meta[property="og:title"]')?.content || document.title,
          ogDescription: document.querySelector('meta[property="og:description"]')?.content || ''
        })
      });

      return results[0]?.result || {
        title: 'Unknown Page',
        description: '',
        url: '',
        favicon: '',
        ogImage: '',
        ogTitle: '',
        ogDescription: ''
      };
    } catch (error) {
      console.error('Failed to get page metadata:', error);
      return {
        title: 'Unknown Page',
        description: '',
        url: '',
        favicon: '',
        ogImage: '',
        ogTitle: '',
        ogDescription: ''
      };
    }
  }

  async storeScreenshot(screenshotData) {
    if (!this.db) {
      await this.initializeDatabase();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['screenshots'], 'readwrite');
      const store = transaction.objectStore('screenshots');
      
      const screenshotId = `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const data = {
        id: screenshotId,
        url: screenshotData.url,
        dataUrl: screenshotData.dataUrl,
        metadata: screenshotData.metadata,
        timestamp: screenshotData.timestamp,
        elementType: screenshotData.elementType
      };

      const request = store.add(data);
      
      request.onsuccess = () => {
        console.log('Screenshot stored successfully:', screenshotId);
        resolve(screenshotId);
      };
      
      request.onerror = () => {
        console.error('Failed to store screenshot:', request.error);
        reject(request.error);
      };
    });
  }

  async getExistingScreenshot(url) {
    if (!this.db) {
      await this.initializeDatabase();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['screenshots'], 'readonly');
      const store = transaction.objectStore('screenshots');
      const index = store.index('url');
      
      const request = index.getAll(url);
      
      request.onsuccess = () => {
        const screenshots = request.result;
        if (screenshots.length === 0) {
          resolve(null);
          return;
        }

        // Find the most recent screenshot (within last hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentScreenshots = screenshots.filter(s => s.timestamp > oneHourAgo);
        
        if (recentScreenshots.length > 0) {
          // Return the most recent one
          const mostRecent = recentScreenshots.sort((a, b) => b.timestamp - a.timestamp)[0];
          resolve(mostRecent);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to get existing screenshot:', request.error);
        resolve(null); // Don't reject, just return null
      };
    });
  }

  async captureScreenshotWithPlaywright(elementData) {
    const settings = await this.getSettings();
    
    if (!settings.localScreenshots.enabled) {
      return { success: false, error: 'Local screenshots disabled' };
    }

    try {
      // Check if we already have a recent screenshot for this element
      const existingScreenshot = await this.getExistingScreenshot(elementData.url + '#' + elementData.selector);
      if (existingScreenshot) {
        return {
          success: true,
          screenshot: existingScreenshot.dataUrl,
          metadata: existingScreenshot.metadata,
          timestamp: existingScreenshot.timestamp,
          cached: true
        };
      }

      // Request screenshot from local Playwright service
      const response = await fetch('http://localhost:3001/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: elementData.url,
          selector: elementData.selector,
          elementType: elementData.tag || 'unknown',
          maxScreenshots: 25
        })
      });

      if (!response.ok) {
        throw new Error(`Screenshot service error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Store screenshot in IndexedDB
        const screenshotId = await this.storeScreenshot({
          url: elementData.url + '#' + elementData.selector,
          dataUrl: `data:image/png;base64,${result.screenshot}`,
          metadata: result.metadata,
          timestamp: Date.now(),
          elementType: elementData.tag || 'unknown',
          source: 'playwright'
        });

        return {
          success: true,
          screenshot: `data:image/png;base64,${result.screenshot}`,
          metadata: result.metadata,
          timestamp: Date.now(),
          screenshotId: screenshotId,
          cached: result.cached || false
        };
      } else {
        throw new Error(result.error || 'Screenshot capture failed');
      }

    } catch (error) {
      console.error('Playwright screenshot capture failed:', error);
      return { 
        success: false, 
        error: error.message,
        fallback: 'Screenshot capture unavailable - make sure the screenshot service is running on localhost:3001'
      };
    }
  }

  async cleanupOldScreenshots() {
    if (!this.db) {
      await this.initializeDatabase();
    }

    const settings = await this.getSettings();
    const cutoffTime = Date.now() - settings.localScreenshots.cleanupInterval;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['screenshots'], 'readwrite');
      const store = transaction.objectStore('screenshots');
      const index = store.index('timestamp');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deletedCount} old screenshots`);
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to cleanup old screenshots:', request.error);
        reject(request.error);
      };
    });
  }
}

// Initialize background script
new ToolTipBackground();

