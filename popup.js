// Popup script for ToolTip Companion Extension (Local Storage Version)
class ToolTipPopup {
  constructor() {
    this.settings = {};
    this.elements = {};
    
    this.init();
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.loadSettings();
  }

  bindElements() {
    this.elements = {
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
      advancedToggle: document.getElementById('advancedToggle'),
      advancedContent: document.getElementById('advancedContent')
    };
  }

  setupEventListeners() {
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
  }

  async loadSettings() {
    try {
      const response = await this.sendMessage({ action: 'getSettings' });
      
      if (response.success) {
        this.settings = response.data;
        this.populateUI();
        this.updateStatus();
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

