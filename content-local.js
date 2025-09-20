// Content script for ToolTip Companion Extension (Local Storage Version)
class ToolTipContentScript {
  constructor() {
    this.isEnabled = false;
    this.settings = {};
    this.tooltipInstance = null;
    this.observedElements = new Set();
    this.mutationObserver = null;
    this.hoverTimeout = null;
    this.currentTooltip = null;
    this.isProcessing = false; // Prevent multiple simultaneous operations
    this.tooltipQueue = []; // Queue for tooltip operations
    this.isDragging = false; // Track if tooltip is being dragged
    
    this.init();
  }

  async init() {
    console.log('ToolTip Content Script initializing...');
    
    // Load settings
    await this.loadSettings();
    console.log('Settings loaded:', this.settings);
    
    // Only proceed if extension is enabled
    if (!this.settings.enabled) {
      console.log('ToolTip extension is disabled');
      return;
    }

    console.log('ToolTip extension is enabled, initializing...');

    // Initialize tooltip system
    this.initializeTooltipSystem();
    
    // Start observing the page
    this.startObserving();
    
    // Listen for settings changes
    this.setupSettingsListener();
    
    console.log('ToolTip Content Script initialized successfully');
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response?.success) {
          this.settings = response.data;
          this.isEnabled = this.settings.enabled;
          console.log('Settings loaded successfully:', this.settings);
        } else {
          console.error('Failed to load settings:', response?.error);
          // Use default settings if loading fails
          this.settings = {
            enabled: true,
            triggerEvent: 'hover',
            delay: 500,
            localScreenshots: { enabled: true }
          };
          this.isEnabled = true;
        }
        resolve();
      });
    });
  }

  setupSettingsListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'settingsUpdated') {
        this.settings = request.data;
        this.isEnabled = this.settings.enabled;
        
        if (this.isEnabled) {
          this.startObserving();
        } else {
          this.stopObserving();
          this.hideTooltip();
        }
      } else if (request.action === 'testTooltips') {
        this.testTooltips();
        sendResponse({ success: true });
      } else if (request.action === 'createDraggablePanel') {
        this.createDraggablePanel();
        sendResponse({ success: true });
      }
    });
  }

  testTooltips() {
    console.log('🧪 ToolTip Test Started');
    console.log('Settings:', this.settings);
    console.log('Is Enabled:', this.isEnabled);
    console.log('Observed Elements Count:', this.observedElements.size);
    
    // Find some interactive elements to test
    const testElements = document.querySelectorAll('button, a[href], input, select, textarea');
    console.log('Found interactive elements:', testElements.length);
    
    if (testElements.length > 0) {
      console.log('Testing tooltip on first element:', testElements[0]);
      this.showTooltipForElement(testElements[0]);
    } else {
      console.log('No interactive elements found to test');
    }
  }

  createDraggablePanel() {
    console.log('🪟 Creating draggable settings panel...');
    
    // Remove existing panel if it exists
    const existingPanel = document.getElementById('tooltip-draggable-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    // Create the draggable panel
    const panel = document.createElement('div');
    panel.id = 'tooltip-draggable-panel';
    panel.style.cssText = `
      position: fixed;
      top: 100px;
      right: 100px;
      width: 400px;
      min-height: 500px;
      background: linear-gradient(135deg, 
        rgba(80, 80, 80, 0.95) 0%, 
        rgba(60, 60, 60, 0.9) 50%, 
        rgba(40, 40, 40, 0.95) 100%);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      color: #f0f0f0;
      border-radius: 24px;
      box-shadow: 
        0 25px 50px rgba(0, 0, 0, 0.4),
        0 12px 24px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.2);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      cursor: grab;
      user-select: none;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      text-align: center;
      background: rgba(80, 80, 80, 0.3);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(120, 120, 120, 0.3);
      border-radius: 22px 22px 0 0;
      cursor: grab;
    `;
    
    header.innerHTML = `
      <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 40px; height: 6px; background: rgba(255, 255, 255, 0.4); border-radius: 3px; opacity: 0.7;"></div>
      <h1 style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">ToolTip Companion</h1>
      <p style="font-size: 12px; opacity: 0.8;">Draggable Settings Panel</p>
      <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(76, 175, 80, 0.2); border: 1px solid rgba(76, 175, 80, 0.5); padding: 4px 8px; border-radius: 12px; font-size: 10px; margin-top: 8px;">
        <span>🔒</span>
        <span>Privacy-First Local Storage</span>
      </div>
    `;
    
    // Create content area
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
    `;
    
    content.innerHTML = `
      <div style="background: rgba(76, 175, 80, 0.2); border: 1px solid rgba(76, 175, 80, 0.5); padding: 15px; border-radius: 12px; margin-bottom: 15px; text-align: center;">
        <strong>✅ ToolTip Companion is active with local screenshots</strong>
      </div>
      
      <div style="background: rgba(60, 60, 60, 0.3); border: 1px solid rgba(120, 120, 120, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 500;">
          <span>🔧 Local Service Status</span>
          <button style="background: rgba(120, 120, 120, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: #e8e8e8; font-size: 12px; padding: 4px 8px; cursor: pointer;">🔄</button>
        </div>
        <div style="font-size: 12px; opacity: 0.8;">✅ ToolTip Screenshot Service is running</div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; font-weight: 500;">Enable ToolTip Companion</span>
          <div style="position: relative; display: inline-block; width: 50px; height: 24px;">
            <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #70a070; transition: 0.3s; border-radius: 24px;"></span>
            <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; transform: translateX(26px);"></span>
          </div>
        </div>
      </div>
      
      <button style="width: 100%; padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; margin-bottom: 10px;">
        🧪 Test Tooltips - Check Console
      </button>
      
      <button style="width: 100%; padding: 12px 16px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">
        🔍 Fresh Crawl - Scan Entire Page
      </button>
    `;
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(244, 67, 54, 0.8);
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      color: white;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    `;
    closeBtn.innerHTML = '×';
    
    // Assemble panel
    panel.appendChild(closeBtn);
    panel.appendChild(header);
    panel.appendChild(content);
    
    // Add drag functionality
    this.setupPanelDragging(panel);
    
    // Add close functionality
    closeBtn.addEventListener('click', () => {
      panel.remove();
    });
    
    // Add to page
    document.body.appendChild(panel);
    
    console.log('✅ Draggable settings panel created');
  }

  setupPanelDragging(panel) {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    panel.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
        return; // Don't drag when clicking buttons or inputs
      }
      
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      panel.style.cursor = 'grabbing';
      panel.style.zIndex = '2147483648';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep panel within viewport bounds
        const maxX = window.innerWidth - panel.offsetWidth;
        const maxY = window.innerHeight - panel.offsetHeight;
        
        panel.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
        panel.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
        panel.style.right = 'auto';
        
        e.preventDefault();
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        panel.style.cursor = 'grab';
        panel.style.zIndex = '2147483647';
      }
    });
  }

  initializeTooltipSystem() {
    // Create tooltip container if it doesn't exist
    if (!document.getElementById('tooltip-companion-container')) {
      const container = document.createElement('div');
      container.id = 'tooltip-companion-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
      `;
      document.body.appendChild(container);
    }
  }

  startObserving() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Observe for new elements
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processElement(node);
            // Also process child elements
            const interactiveElements = node.querySelectorAll(this.getInteractiveSelectors());
            interactiveElements.forEach(el => this.processElement(el));
          }
        });
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Process existing elements
    this.processExistingElements();
  }

  stopObserving() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // Remove all event listeners
    this.observedElements.forEach(element => {
      this.removeElementListeners(element);
    });
    this.observedElements.clear();
  }

  getInteractiveSelectors() {
    return [
      'button',
      'a[href]',
      '[role="button"]',
      '[tabindex]:not([tabindex="-1"])',
      'input[type="button"]',
      'input[type="submit"]',
      'input[type="reset"]',
      '[onclick]',
      '[data-testid*="button"]',
      '[data-testid*="btn"]',
      '.btn',
      '.button',
      'select',
      'textarea',
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="search"]'
    ].join(', ');
  }

  processExistingElements() {
    const elements = document.querySelectorAll(this.getInteractiveSelectors());
    elements.forEach(element => this.processElement(element));
  }

  processElement(element) {
    if (!element || this.observedElements.has(element)) {
      return;
    }

    // Skip if element is not visible or interactive
    if (!this.isElementInteractive(element)) {
      return;
    }

    // Skip if element already has a comprehensive tooltip
    if (this.hasComprehensiveTooltip(element)) {
      return;
    }

    this.observedElements.add(element);
    this.addElementListeners(element);
  }

  isElementInteractive(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      !element.disabled
    );
  }

  hasComprehensiveTooltip(element) {
    // Check if element already has a good tooltip
    const title = element.getAttribute('title');
    const ariaLabel = element.getAttribute('aria-label');
    
    return (title && title.length > 10) || (ariaLabel && ariaLabel.length > 10);
  }

  addElementListeners(element) {
    const triggerEvent = this.settings.triggerEvent || 'hover';
    
    if (triggerEvent === 'hover') {
      element.addEventListener('mouseenter', (e) => this.handleElementEnter(e));
      element.addEventListener('mouseleave', (e) => this.handleElementLeave(e));
    } else if (triggerEvent === 'click') {
      element.addEventListener('click', (e) => this.handleElementClick(e));
    } else if (triggerEvent === 'focus') {
      element.addEventListener('focus', (e) => this.handleElementFocus(e));
      element.addEventListener('blur', (e) => this.handleElementBlur(e));
    }
  }

  removeElementListeners(element) {
    const events = ['mouseenter', 'mouseleave', 'click', 'focus', 'blur'];
    events.forEach(event => {
      element.removeEventListener(event, this.handleElementEnter);
      element.removeEventListener(event, this.handleElementLeave);
      element.removeEventListener(event, this.handleElementClick);
      element.removeEventListener(event, this.handleElementFocus);
      element.removeEventListener(event, this.handleElementBlur);
    });
  }

  handleElementEnter(event) {
    const element = event.target;
    
    // Clear any existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    // Don't show tooltip if we're already processing one for the same element
    if (this.isProcessing && this.currentTooltip && 
        this.currentTooltip.dataset.elementId === (element.id || element.className || 'unknown')) {
      return;
    }

    // Set timeout to show tooltip
    this.hoverTimeout = setTimeout(() => {
      // Only show if we're still hovering over the same element
      if (!this.isProcessing || 
          !this.currentTooltip || 
          this.currentTooltip.dataset.elementId !== (element.id || element.className || 'unknown')) {
        this.showTooltipForElement(element);
      }
    }, this.settings.delay || 500);
  }

  handleElementLeave(event) {
    const element = event.target;
    
    // Clear timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    
    // Only hide tooltip if it's for this specific element and we're not dragging
    if (this.currentTooltip && 
        this.currentTooltip.dataset.elementId === (element.id || element.className || 'unknown') &&
        !this.isDragging) {
      // Add a small delay to prevent flashing when moving between elements
      setTimeout(() => {
        if (!this.isProcessing && !this.isDragging) {
          this.hideTooltip();
        }
      }, 100);
    }
  }

  async handleElementClick(event) {
    const element = event.target;
    
    // Check if this is a link that should trigger screenshot capture
    if (element.tagName.toLowerCase() === 'a' && element.href) {
      await this.handleLinkClick(element, event);
    } else {
      this.showTooltipForElement(element);
    }
  }

  async handleLinkClick(linkElement, event) {
    try {
      const settings = await this.getSettings();
      
      // Check if local screenshots are enabled
      if (!settings.localScreenshots?.enabled) {
        // Simple link tooltip without screenshot
        this.showTooltip(linkElement, {
          content: `Link: ${linkElement.textContent?.trim() || linkElement.title || 'Click to visit'}`,
          description: `Opens: ${linkElement.href}`,
          loading: false
        });
        return;
      }
      
      // Get link data first
      const linkData = {
        url: linkElement.href,
        title: linkElement.textContent?.trim() || linkElement.title || '',
        element: linkElement
      };

      // Request screenshot capture from background script
      const preview = await this.captureLinkPreview(linkData);
      
      if (preview && preview.success && preview.screenshot) {
        // Show tooltip with screenshot immediately
        this.showTooltip(linkElement, {
          content: preview.metadata?.title || linkData.title || 'Link Preview',
          description: preview.metadata?.description || `Opens: ${linkData.url}`,
          screenshot: preview.screenshot,
          metadata: preview.metadata,
          linkPreview: true,
          loading: false,
          cached: preview.cached || false
        });
      } else {
        // Show loading tooltip only if screenshot fails
        this.showTooltip(linkElement, {
          content: 'Capturing screenshot...',
          loading: true,
          linkPreview: true
        });
        
        // Fallback to regular tooltip
        this.showTooltip(linkElement, {
          content: `Link: ${linkData.title || linkData.url}`,
          description: `Opens: ${linkData.url}`,
          loading: false
        });
      }
    } catch (error) {
      console.error('Link preview failed:', error);
      // Simple fallback tooltip
      this.showTooltip(linkElement, {
        content: `Link: ${linkElement.textContent?.trim() || linkElement.title || 'Click to visit'}`,
        description: `Opens: ${linkElement.href}`,
        loading: false
      });
    }
  }

  handleElementFocus(event) {
    this.showTooltipForElement(event.target);
  }

  handleElementBlur(event) {
    this.hideTooltip();
  }

  async showTooltipForElement(element) {
    try {
      // Extract element data first
      const elementData = this.extractElementData(element);
      
      // Try Playwright screenshot capture first
      try {
        const screenshotResult = await this.captureScreenshotWithPlaywright(elementData);
        
        if (screenshotResult && screenshotResult.success) {
          // Show tooltip with screenshot immediately
          this.showTooltip(element, {
            content: screenshotResult.metadata?.title || elementData.text || 'Interactive element',
            description: screenshotResult.metadata?.description || '',
            screenshot: screenshotResult.screenshot,
            metadata: screenshotResult.metadata,
            loading: false,
            cached: screenshotResult.cached || false,
            elementType: elementData.tag,
            source: 'playwright'
          });
          return;
        }
      } catch (screenshotError) {
        console.log('Playwright screenshot failed, falling back to analysis:', screenshotError.message);
      }

      // Show loading tooltip only if screenshot fails
      this.showTooltip(element, {
        content: 'Analyzing element...',
        loading: true
      });

      // Fallback to traditional analysis if screenshot fails
      const analysis = await this.analyzeElement(elementData);
      
      // Update tooltip with analysis
      this.showTooltip(element, {
        content: analysis.tooltip,
        confidence: analysis.confidence,
        source: analysis.source,
        elementType: analysis.elementType,
        loading: false
      });

    } catch (error) {
      console.error('Tooltip analysis failed:', error);
      this.showTooltip(element, {
        content: 'Analysis unavailable',
        error: true,
        loading: false
      });
    }
  }

  showTooltip(element, data) {
    // Prevent multiple simultaneous tooltip operations
    if (this.isProcessing) {
      // Don't queue if it's the same element to prevent flashing
      if (this.tooltipQueue.length > 0 && 
          this.tooltipQueue[this.tooltipQueue.length - 1].element === element) {
        return;
      }
      this.tooltipQueue.push({ element, data });
      return;
    }
    
    // Don't hide existing tooltip if it's for the same element
    const elementId = element.id || element.className || 'unknown';
    if (this.currentTooltip && this.currentTooltip.dataset.elementId !== elementId) {
      this.hideTooltip();
    } else if (this.currentTooltip && this.currentTooltip.dataset.elementId === elementId) {
      // Update existing tooltip content instead of creating new one
      this.updateTooltipContent(this.currentTooltip, data);
      return;
    }
    
    this.isProcessing = true;

    const container = document.getElementById('tooltip-companion-container');
    if (!container) {
      this.isProcessing = false;
      this.processQueue();
      return;
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-companion-tooltip';
    tooltip.dataset.elementId = element.id || element.className || 'unknown';
    
    // Calculate position
    const rect = element.getBoundingClientRect();
    const position = this.calculateTooltipPosition(rect);

    tooltip.style.cssText = `
      position: absolute;
      left: ${position.x}px;
      top: ${position.y}px;
      width: 320px;
      height: auto;
      opacity: 0;
      transform: translateY(5px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;

    // Create header
    const header = document.createElement('div');
    header.className = 'tooltip-companion-header';
    
    const dragHandle = document.createElement('div');
    dragHandle.className = 'tooltip-companion-drag-handle';
    dragHandle.innerHTML = `
      <span style="font-size: 16px;">🔍</span>
      <span>ToolTip Companion</span>
    `;
    
    const controls = document.createElement('div');
    controls.className = 'tooltip-companion-controls';
    
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'tooltip-companion-btn';
    collapseBtn.innerHTML = '−';
    collapseBtn.title = 'Collapse/Expand';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tooltip-companion-btn';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    
    controls.appendChild(collapseBtn);
    controls.appendChild(closeBtn);
    
    header.appendChild(dragHandle);
    header.appendChild(controls);
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'tooltip-companion-content';
    
    if (data.loading) {
      content.className += ' loading';
      content.innerHTML = `
        <div class="tooltip-companion-loading">
          <span>${data.linkPreview ? 'Capturing screenshot...' : 'Analyzing...'}</span>
          <div class="tooltip-companion-spinner"></div>
        </div>
      `;
    } else if (data.error) {
      content.className += ' error';
      content.textContent = data.content;
    } else {
      // Main content
      const mainText = document.createElement('div');
      mainText.textContent = data.content;
      content.appendChild(mainText);

      // Add description if available
      if (data.description) {
        const desc = document.createElement('div');
        desc.style.cssText = `
          margin-top: 8px;
          font-size: 13px;
          opacity: 0.8;
          color: #d0d0d0;
          line-height: 1.4;
        `;
        desc.textContent = data.description;
        content.appendChild(desc);
      }

      // Add screenshot if available
      if (data.screenshot) {
        const screenshotDiv = document.createElement('div');
        screenshotDiv.className = 'tooltip-companion-screenshot';
        
        const img = document.createElement('img');
        img.src = data.screenshot;
        img.alt = data.metadata?.title || 'Screenshot preview';
        img.title = 'Click to view full size';
        
        // Handle image loading errors
        img.addEventListener('error', () => {
          console.log('Screenshot failed to load:', data.screenshot);
          screenshotDiv.style.display = 'none';
        });
        
        // Make screenshot clickable to open link or show full size
        if (data.metadata && data.metadata.url) {
          img.addEventListener('click', () => {
            window.open(data.metadata.url, '_blank');
          });
          img.style.cursor = 'pointer';
        } else {
          img.addEventListener('click', () => {
            // Open image in new tab for full size view
            const newWindow = window.open();
            newWindow.document.write(`
              <html>
                <head><title>Screenshot Preview</title></head>
                <body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; min-height:100vh;">
                  <img src="${data.screenshot}" style="max-width:100%; max-height:100%; object-fit:contain;" />
                </body>
              </html>
            `);
          });
          img.style.cursor = 'zoom-in';
        }
        
        // Add status indicators
        const statusContainer = document.createElement('div');
        statusContainer.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          pointer-events: none;
        `;
        
        // Cached indicator
        if (data.cached) {
          const cachedIndicator = document.createElement('div');
          cachedIndicator.style.cssText = `
            background: rgba(76, 175, 80, 0.9);
            color: white;
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          `;
          cachedIndicator.textContent = 'Cached';
          statusContainer.appendChild(cachedIndicator);
        }
        
        // Source indicator
        if (data.source) {
          const sourceIndicator = document.createElement('div');
          sourceIndicator.style.cssText = `
            background: rgba(33, 150, 243, 0.9);
            color: white;
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          `;
          sourceIndicator.textContent = data.source === 'playwright' ? 'Playwright' : 'Chrome';
          statusContainer.appendChild(sourceIndicator);
        }
        
        screenshotDiv.appendChild(img);
        screenshotDiv.appendChild(statusContainer);
        content.appendChild(screenshotDiv);
        
        // Add metadata info below screenshot
        if (data.metadata) {
          const metaDiv = document.createElement('div');
          metaDiv.style.cssText = `
            margin-top: 8px;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            font-size: 12px;
            color: #d0d0d0;
            border-left: 3px solid rgba(255, 255, 255, 0.3);
          `;
          
          const metaInfo = [];
          if (data.metadata.title) metaInfo.push(`Title: ${data.metadata.title}`);
          if (data.metadata.description) metaInfo.push(`Description: ${data.metadata.description.substring(0, 100)}...`);
          if (data.timestamp) metaInfo.push(`Captured: ${new Date(data.timestamp).toLocaleString()}`);
          
          metaDiv.textContent = metaInfo.join(' • ');
          content.appendChild(metaDiv);
        }
      }
      
      // Add metadata if available
      if (data.confidence && !data.error) {
        const meta = document.createElement('div');
        meta.style.cssText = `
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.7;
          color: #b0b0b0;
        `;
        meta.textContent = `Confidence: ${Math.round(data.confidence * 100)}% • Source: ${data.source}`;
        content.appendChild(meta);
      }

      // Add local storage indicator for screenshots
      if (data.screenshot && data.linkPreview) {
        const localIndicator = document.createElement('div');
        localIndicator.style.cssText = `
          margin-top: 4px;
          font-size: 11px;
          opacity: 0.6;
          color: #90c695;
          display: flex;
          align-items: center;
          gap: 4px;
        `;
        localIndicator.innerHTML = `
          <span>🔒</span>
          <span>Screenshot stored locally</span>
        `;
        content.appendChild(localIndicator);
      }
    }

    tooltip.appendChild(header);
    tooltip.appendChild(content);
    
    // Make tooltips draggable anywhere on the page using injected script
    this.setupTooltipDragging(tooltip);
    
    // Close button
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hideTooltip();
    });
    
    // Collapse button
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleCollapse(tooltip, collapseBtn);
    });
    
    // Make header draggable
    header.style.cursor = 'grab';
    collapseBtn.style.display = 'flex';

    container.appendChild(tooltip);
    this.currentTooltip = tooltip;

    // Animate in
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
      
      // Mark processing as complete and process queue
      this.isProcessing = false;
      this.processQueue();
    });
  }

  processQueue() {
    if (this.tooltipQueue.length > 0 && !this.isProcessing) {
      const next = this.tooltipQueue.shift();
      this.showTooltip(next.element, next.data);
    }
  }

  calculateTooltipPosition(elementRect) {
    const tooltipWidth = 320; // increased width for better content display
    const tooltipHeight = 120; // increased height for screenshots
    const margin = 15;

    let x = elementRect.left + elementRect.width / 2 - tooltipWidth / 2;
    let y = elementRect.top - tooltipHeight - margin;

    // Adjust for viewport boundaries
    if (x < margin) x = margin;
    if (x + tooltipWidth > window.innerWidth - margin) {
      x = window.innerWidth - tooltipWidth - margin;
    }

    if (y < margin) {
      y = elementRect.bottom + margin; // Show below if no space above
    }

    // Ensure tooltip stays within viewport
    if (y + tooltipHeight > window.innerHeight + window.scrollY - margin) {
      y = window.innerHeight + window.scrollY - tooltipHeight - margin;
    }

    return { x: x + window.scrollX, y: y + window.scrollY };
  }

  // Resize handles removed - tooltips are now stationary

  // Tooltip event listeners removed - tooltips are now stationary

  toggleCollapse(tooltip, collapseBtn) {
    const isCollapsed = tooltip.classList.contains('collapsed');
    
    if (isCollapsed) {
      tooltip.classList.remove('collapsed');
      collapseBtn.innerHTML = '−';
      collapseBtn.title = 'Collapse';
    } else {
      tooltip.classList.add('collapsed');
      collapseBtn.innerHTML = '+';
      collapseBtn.title = 'Expand';
    }
  }

  // Resize functionality removed - tooltips are now stationary

  updateTooltipContent(tooltip, data) {
    // Update tooltip content without recreating the entire tooltip
    const content = tooltip.querySelector('.tooltip-companion-content');
    if (!content) return;
    
    if (data.loading) {
      content.className = 'tooltip-companion-content loading';
      content.innerHTML = `
        <div class="tooltip-companion-loading">
          <span>${data.linkPreview ? 'Capturing screenshot...' : 'Analyzing...'}</span>
          <div class="tooltip-companion-spinner"></div>
        </div>
      `;
    } else if (data.error) {
      content.className = 'tooltip-companion-content error';
      content.textContent = data.content;
    } else {
      content.className = 'tooltip-companion-content';
      content.innerHTML = '';
      
      // Main content
      const mainText = document.createElement('div');
      mainText.textContent = data.content;
      content.appendChild(mainText);

      // Add description if available
      if (data.description) {
        const desc = document.createElement('div');
        desc.style.cssText = `
          margin-top: 8px;
          font-size: 13px;
          opacity: 0.8;
          color: #d0d0d0;
          line-height: 1.4;
        `;
        desc.textContent = data.description;
        content.appendChild(desc);
      }

      // Add screenshot if available
      if (data.screenshot) {
        const screenshotDiv = document.createElement('div');
        screenshotDiv.className = 'tooltip-companion-screenshot';
        
        const img = document.createElement('img');
        img.src = data.screenshot;
        img.alt = data.metadata?.title || 'Screenshot preview';
        img.title = 'Click to view full size';
        
        // Handle image loading errors
        img.addEventListener('error', () => {
          console.log('Screenshot failed to load:', data.screenshot);
          screenshotDiv.style.display = 'none';
        });
        
        screenshotDiv.appendChild(img);
        content.appendChild(screenshotDiv);
      }
    }
  }

  setupTooltipDragging(tooltip) {
    // Simple drag functionality that works within the content script context
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    tooltip.addEventListener('mousedown', (e) => {
      // Don't start drag if clicking on buttons or interactive elements
      if (e.target.classList.contains('tooltip-companion-btn') || 
          e.target.tagName === 'BUTTON' || 
          e.target.tagName === 'IMG') {
        return;
      }
      
      isDragging = true;
      this.isDragging = true;
      const rect = tooltip.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      tooltip.style.cursor = 'grabbing';
      tooltip.style.zIndex = '2147483648';
      e.preventDefault();
      e.stopPropagation();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep tooltip within viewport bounds
        const maxX = window.innerWidth - tooltip.offsetWidth;
        const maxY = window.innerHeight - tooltip.offsetHeight;
        
        tooltip.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
        tooltip.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
        tooltip.style.transform = 'none';
        tooltip.style.position = 'fixed';
        
        e.preventDefault();
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        this.isDragging = false;
        tooltip.style.cursor = 'grab';
        tooltip.style.zIndex = '2147483647';
      }
    });
    
    // Make the tooltip cursor indicate it's draggable
    tooltip.style.cursor = 'grab';
  }

  hideTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.style.opacity = '0';
      this.currentTooltip.style.transform = 'translateY(5px)';
      
      setTimeout(() => {
        if (this.currentTooltip && this.currentTooltip.parentNode) {
          this.currentTooltip.parentNode.removeChild(this.currentTooltip);
        }
        this.currentTooltip = null;
        this.isProcessing = false;
        this.processQueue();
      }, 200);
    } else {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  extractElementData(element) {
    const rect = element.getBoundingClientRect();
    
    return {
      tag: element.tagName.toLowerCase(),
      text: element.textContent?.trim() || '',
      id: element.id || null,
      className: element.className || null,
      attributes: {
        title: element.getAttribute('title'),
        'aria-label': element.getAttribute('aria-label'),
        'data-testid': element.getAttribute('data-testid'),
        href: element.getAttribute('href'),
        type: element.getAttribute('type'),
        role: element.getAttribute('role'),
        placeholder: element.getAttribute('placeholder')
      },
      coordinates: [rect.left, rect.top],
      size: [rect.width, rect.height],
      url: window.location.href,
      selector: this.generateSelector(element)
    };
  }

  generateSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }
    
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
    }
    
    return element.tagName.toLowerCase();
  }

  async analyzeElement(elementData) {
    return new Promise((resolve, reject) => {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        reject(new Error('Extension context invalidated'));
        return;
      }

      chrome.runtime.sendMessage({
        action: 'analyzeElement',
        data: elementData
      }, (response) => {
        // Handle context invalidation
        if (chrome.runtime.lastError) {
          reject(new Error('Extension context invalidated: ' + chrome.runtime.lastError.message));
          return;
        }
        
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Analysis failed'));
        }
      });
    });
  }

  async captureLinkPreview(linkData) {
    return new Promise((resolve, reject) => {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        reject(new Error('Extension context invalidated'));
        return;
      }

      chrome.runtime.sendMessage({
        action: 'previewLink',
        data: linkData
      }, (response) => {
        // Handle context invalidation
        if (chrome.runtime.lastError) {
          reject(new Error('Extension context invalidated: ' + chrome.runtime.lastError.message));
          return;
        }
        
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Preview failed'));
        }
      });
    });
  }

  async captureScreenshotWithPlaywright(elementData) {
    return new Promise((resolve, reject) => {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        reject(new Error('Extension context invalidated'));
        return;
      }

      chrome.runtime.sendMessage({
        action: 'captureScreenshotWithPlaywright',
        data: elementData
      }, (response) => {
        // Handle context invalidation
        if (chrome.runtime.lastError) {
          reject(new Error('Extension context invalidated: ' + chrome.runtime.lastError.message));
          return;
        }
        
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Screenshot capture failed'));
        }
      });
    });
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          resolve(this.settings);
        }
      });
    });
  }
}

// Initialize content script when DOM is ready
console.log('ToolTip Content Script loading...');

// Force initialization after a short delay to ensure DOM is ready
setTimeout(() => {
  console.log('Initializing ToolTip Content Script...');
  try {
    new ToolTipContentScript();
    console.log('ToolTip Content Script initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ToolTip Content Script:', error);
  }
}, 100);

// Also try immediate initialization if DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ToolTip Content Script...');
    try {
      new ToolTipContentScript();
    } catch (error) {
      console.error('Failed to initialize on DOM ready:', error);
    }
  });
} else {
  console.log('DOM already ready, initializing immediately...');
  try {
    new ToolTipContentScript();
  } catch (error) {
    console.error('Failed to initialize immediately:', error);
  }
}

