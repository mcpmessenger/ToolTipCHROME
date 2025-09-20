// Popup script for ToolTip Companion Extension (Local Storage Version)
class ToolTipPopup {
  constructor() {
    this.settings = {};
    this.elements = {};
    
    this.init();
  }

  init() {
    console.log('ToolTip Popup initializing...');
    this.bindElements();
    this.setupEventListeners();
    this.loadSettings();
    console.log('ToolTip Popup initialized successfully');
  }

  bindElements() {
    this.elements = {
      popupHeader: document.getElementById('popupHeader'),
      status: document.getElementById('status'),
      statusText: document.getElementById('status-text'),
      enabled: document.getElementById('enabled'),
      triggerEvent: document.getElementById('triggerEvent'),
      delay: document.getElementById('delay'),
      delayValue: document.getElementById('delayValue'),
      position: document.getElementById('position'),
      analysisMode: document.getElementById('analysisMode'),
      apiSettings: document.getElementById('apiSettings'),
      apiUrl: document.getElementById('apiUrl'),
      apiKey: document.getElementById('apiKey'),
      showPreviews: document.getElementById('showPreviews'),
      interactiveTooltips: document.getElementById('interactiveTooltips'),
      localScreenshotsEnabled: document.getElementById('localScreenshotsEnabled'),
      localScreenshotsAutoCapture: document.getElementById('localScreenshotsAutoCapture'),
      localScreenshotsWaitTime: document.getElementById('localScreenshotsWaitTime'),
      localScreenshotsWaitTimeValue: document.getElementById('localScreenshotsWaitTimeValue'),
      localScreenshotsMaxStorage: document.getElementById('localScreenshotsMaxStorage'),
      localScreenshotsMaxStorageValue: document.getElementById('localScreenshotsMaxStorageValue'),
      localScreenshotsSettings: document.getElementById('localScreenshotsSettings'),
      cleanupButton: document.getElementById('cleanupButton'),
      freshCrawlButton: document.getElementById('freshCrawlButton'),
      crawlProgress: document.getElementById('crawlProgress'),
      crawlStatus: document.getElementById('crawlStatus'),
      progressFill: document.getElementById('progressFill'),
      crawlStats: document.getElementById('crawlStats'),
      advancedToggle: document.getElementById('advancedToggle'),
      advancedContent: document.getElementById('advancedContent'),
      serviceStatus: document.getElementById('service-status'),
      serviceStatusText: document.getElementById('service-status-text'),
      refreshServiceStatus: document.getElementById('refreshServiceStatus'),
      testTooltipsButton: document.getElementById('testTooltipsButton'),
      openDraggablePanelButton: document.getElementById('openDraggablePanelButton')
    };
  }

  setupEventListeners() {
    // Setup drag functionality for popup
    this.setupDragFunctionality();
    
    // Main toggle
    this.elements.enabled.addEventListener('change', () => {
      this.updateSetting('enabled', this.elements.enabled.checked);
      this.updateStatus();
    });

    // Trigger event
    this.elements.triggerEvent.addEventListener('change', () => {
      this.updateSetting('triggerEvent', this.elements.triggerEvent.value);
    });

    // Delay slider
    this.elements.delay.addEventListener('input', () => {
      const value = parseInt(this.elements.delay.value);
      this.elements.delayValue.textContent = `${value}ms`;
      this.updateSetting('delay', value);
    });

    // Position
    this.elements.position.addEventListener('change', () => {
      this.updateSetting('position', this.elements.position.value);
    });

    // Analysis mode
    this.elements.analysisMode.addEventListener('change', () => {
      const mode = this.elements.analysisMode.value;
      this.updateSetting('analysisMode', mode);
      this.toggleApiSettings(mode === 'api');
    });

    // API settings
    this.elements.apiUrl.addEventListener('input', () => {
      this.updateSetting('apiUrl', this.elements.apiUrl.value);
    });

    this.elements.apiKey.addEventListener('input', () => {
      this.updateSetting('apiKey', this.elements.apiKey.value);
    });

    // Show previews
    this.elements.showPreviews.addEventListener('change', () => {
      this.updateSetting('showPreviews', this.elements.showPreviews.checked);
    });

    // Interactive tooltips
    this.elements.interactiveTooltips.addEventListener('change', () => {
      this.updateSetting('interactiveTooltips', this.elements.interactiveTooltips.checked);
    });

    // Local screenshots settings
    this.elements.localScreenshotsEnabled.addEventListener('change', () => {
      const enabled = this.elements.localScreenshotsEnabled.checked;
      this.updateNestedSetting('localScreenshots', 'enabled', enabled);
      this.toggleLocalScreenshotsSettings(enabled);
    });

    this.elements.localScreenshotsAutoCapture.addEventListener('change', () => {
      this.updateNestedSetting('localScreenshots', 'autoCapture', this.elements.localScreenshotsAutoCapture.checked);
    });

    // Wait time slider
    this.elements.localScreenshotsWaitTime.addEventListener('input', () => {
      const value = parseInt(this.elements.localScreenshotsWaitTime.value);
      this.elements.localScreenshotsWaitTimeValue.textContent = `${value}ms`;
      this.updateNestedSetting('localScreenshots', 'waitTime', value);
    });

    // Max storage slider
    this.elements.localScreenshotsMaxStorage.addEventListener('input', () => {
      const value = parseInt(this.elements.localScreenshotsMaxStorage.value);
      const mbValue = Math.round(value / (1024 * 1024));
      this.elements.localScreenshotsMaxStorageValue.textContent = `${mbValue}MB`;
      this.updateNestedSetting('localScreenshots', 'maxStorageSize', value);
    });

    // Cleanup button
    this.elements.cleanupButton.addEventListener('click', () => {
      this.cleanupOldScreenshots();
    });

    // Advanced toggle
    this.elements.advancedToggle.addEventListener('click', () => {
      this.toggleAdvancedSettings();
    });

    // Service status refresh
    this.elements.refreshServiceStatus.addEventListener('click', () => {
      this.checkServiceStatus();
    });

    // Fresh crawl button
    this.elements.freshCrawlButton.addEventListener('click', () => {
      this.startFreshCrawl();
    });

    // Test tooltips button
    this.elements.testTooltipsButton.addEventListener('click', () => {
      this.testTooltips();
    });

    // Open draggable panel button
    this.elements.openDraggablePanelButton.addEventListener('click', () => {
      this.openDraggablePanel();
    });
  }

  async loadSettings() {
    try {
      const response = await this.sendMessage({ action: 'getSettings' });
      
      if (response.success) {
        this.settings = response.data;
        this.populateUI();
        this.updateStatus();
        this.checkServiceStatus();
      } else {
        this.showError('Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Error loading settings');
    }
  }

  populateUI() {
    // Main settings
    this.elements.enabled.checked = this.settings.enabled || false;
    this.elements.triggerEvent.value = this.settings.triggerEvent || 'hover';
    this.elements.delay.value = this.settings.delay || 500;
    this.elements.delayValue.textContent = `${this.settings.delay || 500}ms`;
    this.elements.position.value = this.settings.position || 'auto';

    // Advanced settings
    this.elements.analysisMode.value = this.settings.analysisMode || 'local';
    this.elements.apiUrl.value = this.settings.apiUrl || '';
    this.elements.apiKey.value = this.settings.apiKey || '';
    this.elements.showPreviews.checked = this.settings.showPreviews !== false;
    this.elements.interactiveTooltips.checked = this.settings.interactiveTooltips !== false;

    // Local screenshots settings
    const localScreenshots = this.settings.localScreenshots || {};
    this.elements.localScreenshotsEnabled.checked = localScreenshots.enabled !== false;
    this.elements.localScreenshotsAutoCapture.checked = localScreenshots.autoCapture !== false;
    this.elements.localScreenshotsWaitTime.value = localScreenshots.waitTime || 3000;
    this.elements.localScreenshotsWaitTimeValue.textContent = `${localScreenshots.waitTime || 3000}ms`;
    
    const maxStorage = localScreenshots.maxStorageSize || (50 * 1024 * 1024);
    this.elements.localScreenshotsMaxStorage.value = maxStorage;
    this.elements.localScreenshotsMaxStorageValue.textContent = `${Math.round(maxStorage / (1024 * 1024))}MB`;

    // Show/hide conditional settings
    this.toggleApiSettings(this.settings.analysisMode === 'api');
    this.toggleLocalScreenshotsSettings(localScreenshots.enabled !== false);
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    
    try {
      const response = await this.sendMessage({
        action: 'updateSettings',
        data: { [key]: value }
      });

      if (!response.success) {
        this.showError('Failed to save settings');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      this.showError('Error saving settings');
    }
  }

  async updateNestedSetting(parentKey, childKey, value) {
    if (!this.settings[parentKey]) {
      this.settings[parentKey] = {};
    }
    this.settings[parentKey][childKey] = value;
    
    try {
      const response = await this.sendMessage({
        action: 'updateSettings',
        data: { [parentKey]: this.settings[parentKey] }
      });

      if (!response.success) {
        this.showError('Failed to save settings');
      }
    } catch (error) {
      console.error('Error updating nested setting:', error);
      this.showError('Error saving settings');
    }
  }

  updateStatus() {
    const isEnabled = this.settings.enabled;
    const localScreenshotsEnabled = this.settings.localScreenshots?.enabled !== false;
    
    this.elements.status.className = `status ${isEnabled ? 'enabled' : 'disabled'}`;
    
    if (isEnabled) {
      if (localScreenshotsEnabled) {
        this.elements.statusText.textContent = 'ToolTip Companion is active with local screenshots';
      } else {
        this.elements.statusText.textContent = 'ToolTip Companion is active (screenshots disabled)';
      }
    } else {
      this.elements.statusText.textContent = 'ToolTip Companion is disabled';
    }
  }

  toggleApiSettings(show) {
    this.elements.apiSettings.style.display = show ? 'block' : 'none';
  }

  toggleLocalScreenshotsSettings(show) {
    this.elements.localScreenshotsSettings.style.display = show ? 'block' : 'none';
  }

  toggleAdvancedSettings() {
    const content = this.elements.advancedContent;
    const chevron = this.elements.advancedToggle.querySelector('.chevron');
    
    const isVisible = content.classList.contains('show');
    
    if (isVisible) {
      content.classList.remove('show');
      chevron.classList.remove('rotated');
    } else {
      content.classList.add('show');
      chevron.classList.add('rotated');
    }
  }

  async cleanupOldScreenshots() {
    try {
      this.elements.cleanupButton.disabled = true;
      this.elements.cleanupButton.textContent = 'Cleaning...';
      
      const response = await this.sendMessage({ action: 'cleanupOldScreenshots' });
      
      if (response.success) {
        this.elements.cleanupButton.textContent = 'Cleaned!';
        setTimeout(() => {
          this.elements.cleanupButton.textContent = 'Cleanup Old Screenshots';
          this.elements.cleanupButton.disabled = false;
        }, 2000);
      } else {
        this.showError('Cleanup failed');
        this.elements.cleanupButton.disabled = false;
        this.elements.cleanupButton.textContent = 'Cleanup Old Screenshots';
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      this.showError('Cleanup error');
      this.elements.cleanupButton.disabled = false;
      this.elements.cleanupButton.textContent = 'Cleanup Old Screenshots';
    }
  }

  showError(message) {
    this.elements.status.className = 'status disabled';
    this.elements.statusText.textContent = message;
  }

  async checkServiceStatus() {
    try {
      this.elements.serviceStatusText.textContent = 'Checking...';
      this.elements.serviceStatus.style.display = 'block';
      
      const response = await this.sendMessage({ action: 'checkServiceStatus' });
      
      if (response.success) {
        const status = response.data;
        this.updateServiceStatus(status);
      } else {
        this.updateServiceStatus({
          available: false,
          status: 'error',
          error: 'Failed to check service status'
        });
      }
    } catch (error) {
      console.error('Error checking service status:', error);
      this.updateServiceStatus({
        available: false,
        status: 'error',
        error: error.message
      });
    }
  }

  updateServiceStatus(status) {
    const { available, status: statusType, error, service } = status;
    
    // Update status classes
    this.elements.serviceStatus.className = 'service-status';
    if (available) {
      this.elements.serviceStatus.classList.add('online');
      this.elements.serviceStatusText.textContent = `✅ ${service || 'Local Service'} is running`;
    } else if (statusType === 'offline') {
      this.elements.serviceStatus.classList.add('offline');
      this.elements.serviceStatusText.textContent = `❌ Service offline: ${error || 'Not responding'}`;
    } else {
      this.elements.serviceStatus.classList.add('error');
      this.elements.serviceStatusText.textContent = `⚠️ Service error: ${error || 'Unknown error'}`;
    }
  }

  async startFreshCrawl() {
    try {
      // Disable button and show progress
      this.elements.freshCrawlButton.disabled = true;
      this.elements.freshCrawlButton.textContent = '🔄 Crawling...';
      this.elements.crawlProgress.classList.add('show');
      
      // Reset progress
      this.elements.crawlStatus.textContent = 'Starting fresh crawl...';
      this.elements.progressFill.style.width = '0%';
      this.elements.crawlStats.textContent = 'Found 0 elements, processed 0';
      
      // Start the crawl
      const response = await this.sendMessage({ action: 'startFreshCrawl' });
      
      if (response.success) {
        this.elements.crawlStatus.textContent = 'Crawl completed successfully!';
        this.elements.progressFill.style.width = '100%';
        this.elements.crawlStats.textContent = `Found ${response.data.totalElements} elements, processed ${response.data.processedElements}`;
        
        // Show success message
        setTimeout(() => {
          this.elements.crawlProgress.classList.remove('show');
          this.elements.freshCrawlButton.textContent = '🔍 Fresh Crawl - Scan Entire Page';
          this.elements.freshCrawlButton.disabled = false;
        }, 3000);
      } else {
        throw new Error(response.error || 'Crawl failed');
      }
    } catch (error) {
      console.error('Fresh crawl failed:', error);
      this.elements.crawlStatus.textContent = `Error: ${error.message}`;
      this.elements.freshCrawlButton.textContent = '🔍 Fresh Crawl - Scan Entire Page';
      this.elements.freshCrawlButton.disabled = false;
      
      // Hide progress after error
      setTimeout(() => {
        this.elements.crawlProgress.classList.remove('show');
      }, 5000);
    }
  }

  async testTooltips() {
    try {
      this.elements.testTooltipsButton.disabled = true;
      this.elements.testTooltipsButton.textContent = '🧪 Testing...';
      
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        throw new Error('No active tab found');
      }

      // Send a test message to the content script
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'testTooltips'
      });

      if (response && response.success) {
        this.elements.testTooltipsButton.textContent = '✅ Test Complete - Check Console';
      } else {
        this.elements.testTooltipsButton.textContent = '❌ Test Failed - Check Console';
      }
      
      setTimeout(() => {
        this.elements.testTooltipsButton.textContent = '🧪 Test Tooltips - Check Console';
        this.elements.testTooltipsButton.disabled = false;
      }, 3000);
      
    } catch (error) {
      console.error('Tooltip test failed:', error);
      this.elements.testTooltipsButton.textContent = '❌ Test Error - Check Console';
      this.elements.testTooltipsButton.disabled = false;
    }
  }

  async openDraggablePanel() {
    try {
      this.elements.openDraggablePanelButton.disabled = true;
      this.elements.openDraggablePanelButton.textContent = '🪟 Opening...';
      
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        throw new Error('No active tab found');
      }

      // Send message to content script to create draggable panel
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'createDraggablePanel'
      });

      if (response && response.success) {
        this.elements.openDraggablePanelButton.textContent = '✅ Panel Opened';
        // Close the popup since we opened the draggable panel
        window.close();
      } else {
        this.elements.openDraggablePanelButton.textContent = '❌ Failed to Open';
      }
      
      setTimeout(() => {
        this.elements.openDraggablePanelButton.textContent = '🪟 Open Draggable Settings Panel';
        this.elements.openDraggablePanelButton.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to open draggable panel:', error);
      this.elements.openDraggablePanelButton.textContent = '❌ Error - Check Console';
      this.elements.openDraggablePanelButton.disabled = false;
    }
  }

  setupDragFunctionality() {
    // Note: Chrome extension popups have limitations for true cross-frame dragging
    // The popup is rendered in a special context that doesn't allow repositioning outside its frame
    // However, we can still provide visual feedback and limited dragging within the popup
    
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    // Store initial position (limited to popup bounds)
    this.popupPosition = { x: 0, y: 0 };
    
    this.elements.popupHeader.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = this.popupPosition.x;
      initialY = this.popupPosition.y;
      
      document.body.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        this.popupPosition.x = initialX + deltaX;
        this.popupPosition.y = initialY + deltaY;
        
        // Apply transform to move the popup (limited to popup bounds)
        document.body.style.transform = `translate(${this.popupPosition.x}px, ${this.popupPosition.y}px)`;
        document.body.style.transition = 'none';
        
        e.preventDefault();
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = 'default';
        document.body.style.transition = 'all 0.3s ease';
        
        // Store position for next time
        this.savePopupPosition();
        
        e.preventDefault();
      }
    });
    
    // Load saved position
    this.loadPopupPosition();
    
    // Add a note about popup limitations
    console.log('Note: Chrome extension popups have inherent dragging limitations due to security restrictions');
  }
  
  savePopupPosition() {
    chrome.storage.local.set({ popupPosition: this.popupPosition });
  }
  
  loadPopupPosition() {
    chrome.storage.local.get(['popupPosition'], (result) => {
      if (result.popupPosition) {
        this.popupPosition = result.popupPosition;
        document.body.style.transform = `translate(${this.popupPosition.x}px, ${this.popupPosition.y}px)`;
      }
    });
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ToolTipPopup();
});

