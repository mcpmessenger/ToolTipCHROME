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
    
    // Auto-crawl first 20 interactive elements for screenshots
    this.autoCrawlFirst20Elements();
    
    // Add simple controls (floating button and thumbnail gallery)
    this.addSimpleControls();
    
    // Listen for settings changes
    this.setupSettingsListener();
    
    console.log('ToolTip Content Script initialized successfully');
  }


  async autoCrawlPage() {
    console.log('🕷️ Starting fresh crawl of current page...');
    
    // Find interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, a[href], input[type="button"], input[type="submit"], .btn, .button, [role="button"]'
    );
    
    console.log(`Found ${interactiveElements.length} interactive elements to crawl`);
    
    // Process elements in batches to avoid overwhelming the system
    const batchSize = 3;
    const elementsToCrawl = Array.from(interactiveElements).slice(0, 20); // Limit to first 20
    let processedCount = 0;
    
    for (let i = 0; i < elementsToCrawl.length; i += batchSize) {
      const batch = elementsToCrawl.slice(i, i + batchSize);
      
      // Process batch in parallel
      const promises = batch.map(async (element) => {
        if (this.isElementInteractive(element)) {
          try {
            const elementData = this.extractElementData(element);
            // Use Playwright to click and capture screenshot
            await this.captureScreenshotWithPlaywright(elementData);
            processedCount++;
            console.log(`✅ Processed element ${processedCount}/${elementsToCrawl.length}: ${element.tagName.toLowerCase()}`);
          } catch (error) {
            console.log(`❌ Failed to process element:`, error.message);
          }
        }
      });
      
      await Promise.all(promises);
      
      // Wait between batches to avoid rate limiting
      if (i + batchSize < elementsToCrawl.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Fresh crawl completed - processed ${processedCount} elements`);
  }

  async autoCrawlFirst20Elements() {
    console.log('🚀 ToolTip Companion: Starting proactive screenshot capture for first 20 elements...');
    
    // Find interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, a[href], input[type="button"], input[type="submit"], .btn, .button, [role="button"]'
    );
    
    // Take only the first 20
    const elementsToCrawl = Array.from(interactiveElements).slice(0, 20);
    
    console.log(`Found ${interactiveElements.length} interactive elements, crawling first ${elementsToCrawl.length}`);
    
    // Process elements in batches to avoid overwhelming the system
    const batchSize = 1; // Process one element at a time to respect Chrome's rate limits
    let currentBatch = 0;
    
    const processBatch = async () => {
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, elementsToCrawl.length);
      
      for (let i = start; i < end; i++) {
        const element = elementsToCrawl[i];
        if (this.isElementInteractive(element)) {
          try {
            const elementData = this.extractElementData(element);
            // Pre-capture screenshot and store in local storage
            await this.captureScreenshotWithPlaywright(elementData);
            console.log(`✅ Pre-captured screenshot for element ${i + 1}/${elementsToCrawl.length}`);
            
            // Shorter delay for faster proactive capture
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.log(`❌ Failed to pre-capture element ${i + 1}:`, error.message);
            // Continue with next element even if one fails
            // Shorter delay even on failure for faster processing
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      currentBatch++;
      
      if (end < elementsToCrawl.length) {
        // Wait 1 second before next batch for faster processing
        setTimeout(processBatch, 1000);
      } else {
        console.log('✅ Auto-crawl completed - first 20 elements pre-captured');
      }
    };
    
    // Start processing immediately for proactive capture
    processBatch();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response?.success) {
          this.settings = response.data;
          this.isEnabled = this.settings.enabled;
          
          // Force enable screenshots for proactive capture
          if (!this.settings.localScreenshots) {
            this.settings.localScreenshots = {};
          }
          this.settings.localScreenshots.enabled = true;
          this.settings.localScreenshots.autoCapture = true;
          
          console.log('Settings loaded successfully (screenshots force-enabled):', this.settings);
        } else {
          console.error('Failed to load settings:', response?.error);
          // Use default settings if loading fails
          this.settings = {
            enabled: true,
            triggerEvent: 'hover',
            delay: 500,
            localScreenshots: { enabled: true, autoCapture: true }
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
        this.addSimpleControls();
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

  addSimpleControls() {
    console.log('🕷️ Adding simple controls...');
    
    // Remove existing controls if they exist
    const existingControls = document.getElementById('tooltip-simple-controls');
    if (existingControls) {
      existingControls.remove();
    }
    
    // Create simple floating button
    const crawlButton = document.createElement('button');
    crawlButton.id = 'tooltip-crawl-btn';
    crawlButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 24px;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 8px 16px rgba(40, 167, 69, 0.3);
      transition: all 0.3s ease;
    `;
    crawlButton.innerHTML = '🕷️';
    crawlButton.title = 'Fresh Crawl - Click to capture screenshots';

    // Create thumbnail gallery
    const gallery = document.createElement('div');
    gallery.id = 'tooltip-thumbnail-gallery';
    gallery.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      width: 300px;
      max-height: 400px;
      background: rgba(40, 40, 40, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 16px;
      padding: 16px;
      z-index: 2147483646;
      display: none;
      overflow-y: auto;
      border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    gallery.innerHTML = `
      <div style="color: white; font-size: 14px; font-weight: 600; margin-bottom: 12px; text-align: center;">
        📸 Screenshot Gallery
      </div>
      <div id="thumbnail-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
        <!-- Thumbnails will be added here -->
      </div>
      <div id="no-screenshots" style="text-align: center; color: #ccc; font-size: 12px; padding: 20px;">
        No screenshots yet. Click 🕷️ to start capturing!
      </div>
    `;
    
    // Add event listeners with null checks
    if (crawlButton) {
      crawlButton.addEventListener('click', async () => {
        crawlButton.disabled = true;
        crawlButton.innerHTML = '⏳';
        crawlButton.title = 'Crawling...';
        
        try {
          await this.autoCrawlFirst20Elements();
          await this.updateThumbnailGallery(gallery);
          crawlButton.innerHTML = '✅';
          crawlButton.title = 'Crawl complete!';
        } catch (error) {
          console.error('Crawl failed:', error);
          crawlButton.innerHTML = '❌';
          crawlButton.title = 'Crawl failed';
        } finally {
          setTimeout(() => {
            if (crawlButton) {
              crawlButton.disabled = false;
              crawlButton.innerHTML = '🕷️';
              crawlButton.title = 'Fresh Crawl - Click to capture screenshots';
            }
          }, 3000);
        }
      });
    }

    // Toggle gallery on button hover with null checks
    if (crawlButton) {
      crawlButton.addEventListener('mouseenter', () => {
        if (gallery) {
          gallery.style.display = 'block';
          this.updateThumbnailGallery(gallery);
        }
      });

      crawlButton.addEventListener('mouseleave', () => {
        // Keep gallery open for a bit to allow clicking
        setTimeout(() => {
          if (gallery && !gallery.matches(':hover')) {
            gallery.style.display = 'none';
          }
        }, 1000);
      });
    }

    // Keep gallery open when hovering over it
    if (gallery) {
      gallery.addEventListener('mouseenter', () => {
        gallery.style.display = 'block';
      });

      gallery.addEventListener('mouseleave', () => {
        gallery.style.display = 'none';
      });
    }
    
    // Add to page
    document.body.appendChild(crawlButton);
    document.body.appendChild(gallery);
    
    console.log('✅ Simple controls created');
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
      
      // First, try to get existing screenshot from storage
      try {
        const existingScreenshot = await this.getExistingScreenshot(elementData);
        if (existingScreenshot) {
          console.log('📸 Found existing screenshot for element:', elementData.tag);
          this.showTooltip(element, {
            content: existingScreenshot.metadata?.title || elementData.text || 'Interactive element',
            description: existingScreenshot.metadata?.description || '',
            screenshot: existingScreenshot.dataUrl,
            metadata: existingScreenshot.metadata,
            loading: false,
            cached: true,
            elementType: elementData.tag,
            source: 'stored'
          });
          return;
        }
      } catch (storageError) {
        console.log('No stored screenshot found:', storageError.message);
      }

      // If no stored screenshot, try to capture new one
      try {
        const screenshotResult = await this.captureScreenshotWithPlaywright(elementData);
        
        if (screenshotResult && screenshotResult.success) {
          console.log('📸 Captured new screenshot for element:', elementData.tag);
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
        console.log('Screenshot capture failed:', screenshotError.message);
      }

      // Only show simple fallback if no screenshots available
      const elementText = element.textContent?.trim().substring(0, 100) || 'Interactive Element';
      const elementType = element.tagName.toLowerCase();
      
      this.showTooltip(element, {
        content: `${elementType.toUpperCase()}: ${elementText}`,
        confidence: 0.7,
        source: 'simple',
        elementType: elementType,
        loading: false
      });

    } catch (error) {
      console.log('Tooltip failed:', error.message);
      // Simple fallback that always works
      this.showTooltip(element, {
        content: 'Interactive Element',
        confidence: 0.5,
        source: 'fallback',
        elementType: element.tagName.toLowerCase(),
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
      width: 400px;
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
      // Main content - simplified and minimized
      const mainText = document.createElement('div');
      mainText.style.cssText = `
        font-size: 12px;
        opacity: 0.7;
        color: #b0b0b0;
        margin-bottom: 8px;
        text-align: center;
      `;
      mainText.textContent = data.content;
      content.appendChild(mainText);

      // Hide description to focus on screenshot
      // Description removed for cleaner look

      // Add screenshot if available
      if (data.screenshot) {
        const screenshotDiv = document.createElement('div');
        screenshotDiv.className = 'tooltip-companion-screenshot';
        screenshotDiv.style.cssText = `
          width: 100%;
          text-align: center;
          margin: 8px 0;
        `;
        
        const img = document.createElement('img');
        img.src = data.screenshot;
        img.alt = data.metadata?.title || 'Screenshot preview';
        img.title = 'Click to view full size';
        img.style.cssText = `
          width: 100%;
          max-width: 380px;
          height: auto;
          max-height: 300px;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        // Handle image loading errors
        img.addEventListener('error', () => {
          console.log('Screenshot failed to load:', data.screenshot);
          screenshotDiv.style.display = 'none';
        });
        
        // Make screenshot clickable to show full size in modal instead of new window
        img.addEventListener('click', () => {
          this.showScreenshotModal(data.screenshot, data.metadata);
        });
        img.style.cursor = 'zoom-in';
        
        // Add minimal status indicators
        const statusContainer = document.createElement('div');
        statusContainer.style.cssText = `
          position: absolute;
          top: 4px;
          right: 4px;
          display: flex;
          gap: 2px;
          pointer-events: none;
        `;
        
        // Minimal cached indicator
        if (data.cached) {
          const cachedIndicator = document.createElement('div');
          cachedIndicator.style.cssText = `
            background: rgba(76, 175, 80, 0.8);
            color: white;
            font-size: 8px;
            padding: 2px 4px;
            border-radius: 4px;
            font-weight: 500;
          `;
          cachedIndicator.textContent = '✓';
          statusContainer.appendChild(cachedIndicator);
        }
        
        // Minimal source indicator
        if (data.source) {
          const sourceIndicator = document.createElement('div');
          sourceIndicator.style.cssText = `
            background: rgba(33, 150, 243, 0.8);
            color: white;
            font-size: 8px;
            padding: 2px 4px;
            border-radius: 4px;
            font-weight: 500;
          `;
          const sourceText = data.source === 'stored' ? 'S' : 
                           data.source === 'playwright' ? 'P' : 
                           data.source === 'chrome_native' ? 'C' : '?';
          sourceIndicator.textContent = sourceText;
          statusContainer.appendChild(sourceIndicator);
        }
        
        screenshotDiv.appendChild(img);
        screenshotDiv.appendChild(statusContainer);
        content.appendChild(screenshotDiv);
        
        // Minimize metadata - only show essential info
        if (data.metadata && data.metadata.title) {
          const metaDiv = document.createElement('div');
          metaDiv.style.cssText = `
            margin-top: 4px;
            font-size: 10px;
            color: #888;
            text-align: center;
            opacity: 0.7;
          `;
          metaDiv.textContent = data.metadata.title;
          content.appendChild(metaDiv);
        }
      }
      
      // Hide confidence/source info to focus on screenshot
      // Removed for cleaner, screenshot-focused design

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
    const tooltipWidth = 400;
    const tooltipHeight = 350;
    const margin = 20;

    // Position tooltip adjacent to the element
    let x, y;
    
    // Try to position to the right of the element first
    if (elementRect.right + tooltipWidth + margin < window.innerWidth) {
      x = elementRect.right + margin;
      y = elementRect.top;
    }
    // Try to position to the left of the element
    else if (elementRect.left - tooltipWidth - margin > 0) {
      x = elementRect.left - tooltipWidth - margin;
      y = elementRect.top;
    }
    // Fallback: position below element
    else {
      x = elementRect.left + elementRect.width / 2 - tooltipWidth / 2;
      y = elementRect.bottom + margin;
    }

    // Adjust for viewport boundaries
    if (x < margin) x = margin;
    if (x + tooltipWidth > window.innerWidth - margin) {
      x = window.innerWidth - tooltipWidth - margin;
    }
    if (y < margin) y = margin;
    if (y + tooltipHeight > window.innerHeight - margin) {
      y = window.innerHeight - tooltipHeight - margin;
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
      
      // Main content - simplified and minimized
      const mainText = document.createElement('div');
      mainText.style.cssText = `
        font-size: 12px;
        opacity: 0.7;
        color: #b0b0b0;
        margin-bottom: 8px;
        text-align: center;
      `;
      mainText.textContent = data.content;
      content.appendChild(mainText);

      // Hide description to focus on screenshot
      // Description removed for cleaner look

      // Add screenshot if available
      if (data.screenshot) {
        const screenshotDiv = document.createElement('div');
        screenshotDiv.className = 'tooltip-companion-screenshot';
        screenshotDiv.style.cssText = `
          width: 100%;
          text-align: center;
          margin: 8px 0;
        `;
        
        const img = document.createElement('img');
        img.src = data.screenshot;
        img.alt = data.metadata?.title || 'Screenshot preview';
        img.title = 'Click to view full size';
        img.style.cssText = `
          width: 100%;
          max-width: 380px;
          height: auto;
          max-height: 300px;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
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
          // Handle specific error types gracefully
          const error = response?.error || 'Screenshot capture failed';
          if (error.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')) {
            reject(new Error('Rate limit exceeded - please wait a moment'));
          } else if (error.includes('activeTab')) {
            reject(new Error('Permission required - please refresh the page'));
          } else {
            reject(new Error(error));
          }
        }
      });
    });
  }

  async getExistingScreenshot(elementData) {
    return new Promise((resolve, reject) => {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        reject(new Error('Extension context invalidated'));
        return;
      }

      chrome.runtime.sendMessage({
        action: 'getExistingScreenshot',
        data: { url: elementData.url, selector: elementData.selector }
      }, (response) => {
        // Handle context invalidation
        if (chrome.runtime.lastError) {
          reject(new Error('Extension context invalidated: ' + chrome.runtime.lastError.message));
          return;
        }
        
        if (response?.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error('No existing screenshot found'));
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

  // Message handling
  handleMessage(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    
    switch (request.action) {
      case 'toggle':
        this.toggle();
        sendResponse({ success: true });
        break;
        
      case 'getSettings':
        sendResponse({ success: true, data: this.settings });
        break;
        
      case 'updateSettings':
        this.updateSettings(request.data);
        sendResponse({ success: true });
        break;
        
      case 'testTooltips':
        this.testTooltips();
        sendResponse({ success: true });
        break;
        
      case 'startFreshCrawl':
        this.autoCrawlPage();
        sendResponse({ success: true });
        break;
        
      case 'createDraggablePanel':
        this.createDraggablePanel();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return true; // Keep message channel open for async response
  }

  createDraggablePanel() {
    // Remove existing panel if it exists
    const existingPanel = document.getElementById('tooltip-draggable-panel');
    if (existingPanel) existingPanel.remove();
    
    // Create new draggable panel
    const panel = document.createElement('div');
    panel.id = 'tooltip-draggable-panel';
    panel.style.cssText = `
      position: fixed;
      top: 100px;
      right: 100px;
      width: 400px;
      min-height: 500px;
      background: linear-gradient(135deg, rgba(80, 80, 80, 0.95) 0%, rgba(60, 60, 60, 0.9) 50%, rgba(40, 40, 40, 0.95) 100%);
      backdrop-filter: blur(20px);
      color: #f0f0f0;
      border-radius: 24px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.2);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      cursor: grab;
      user-select: none;
    `;
    
    panel.innerHTML = `
      <div style="position: absolute; top: 15px; right: 15px; background: rgba(244, 67, 54, 0.8); border: none; border-radius: 50%; width: 30px; height: 30px; color: white; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;" onclick="this.parentElement.remove()">×</div>
      <div style="padding: 20px; text-align: center; background: rgba(80, 80, 80, 0.3); border-radius: 22px 22px 0 0;">
        <h1 style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">ToolTip Companion</h1>
        <p style="font-size: 12px; opacity: 0.8;">Draggable Settings Panel</p>
        <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(76, 175, 80, 0.2); border: 1px solid rgba(76, 175, 80, 0.5); padding: 4px 8px; border-radius: 12px; font-size: 10px; margin-top: 8px;">
          <span>🔒</span><span>Privacy-First Local Storage</span>
        </div>
      </div>
      <div style="padding: 20px;">
        <div style="background: rgba(76, 175, 80, 0.2); border: 1px solid rgba(76, 175, 80, 0.5); padding: 15px; border-radius: 12px; margin-bottom: 15px; text-align: center;">
          <strong>✅ ToolTip Companion is active with Playwright screenshots</strong>
        </div>
        
        <!-- Fresh Crawl Button -->
        <button id="panel-crawl-btn" style="width: 100%; padding: 12px 16px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 14px; font-weight: 500; cursor: pointer; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);">
          🕷️ Fresh Crawl - Click Links & Capture Screenshots
        </button>
        
        <!-- Thumbnail Bank -->
        <div style="background: rgba(60, 60, 60, 0.3); border: 1px solid rgba(120, 120, 120, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; font-weight: 500;">
            <span>📸 Screenshot Gallery</span>
            <span id="screenshot-count" style="font-size: 11px; opacity: 0.7;">0 screenshots</span>
          </div>
          <div id="thumbnail-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 200px; overflow-y: auto;">
            <!-- Thumbnails will be added here -->
          </div>
          <div id="no-screenshots" style="text-align: center; font-size: 12px; opacity: 0.6; padding: 20px;">
            No screenshots yet. Click "Fresh Crawl" to start capturing!
          </div>
        </div>
        
        <!-- Status -->
        <div style="background: rgba(60, 60, 60, 0.3); border: 1px solid rgba(120, 120, 120, 0.3); border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 500;">
            <span>🔧 Playwright Service Status</span>
            <span id="service-status" style="font-size: 11px; opacity: 0.7;">Checking...</span>
          </div>
          <div id="service-details" style="font-size: 12px; opacity: 0.8;">Loading service status...</div>
        </div>
      </div>
    `;
    
    // Add drag functionality
    this.setupPanelDragging(panel);
    
    // Add button event listeners
    const crawlBtn = panel.querySelector('#panel-crawl-btn');
    
    if (crawlBtn) {
      crawlBtn.addEventListener('click', async () => {
        crawlBtn.disabled = true;
        crawlBtn.textContent = '🕷️ Crawling...';
        
        try {
          await this.autoCrawlFirst20Elements();
          await this.updateThumbnailGallery(panel);
        } catch (error) {
          console.error('Crawl failed:', error);
        } finally {
          crawlBtn.disabled = false;
          crawlBtn.textContent = '🕷️ Fresh Crawl - Click Links & Capture Screenshots';
        }
      });
    }
    
    // Load thumbnails and service status
    this.updateThumbnailGallery(panel);
    this.updateServiceStatus(panel);
    
    document.body.appendChild(panel);
    console.log('Draggable panel created successfully');
  }

  async updateThumbnailGallery(panel) {
    try {
      // If no panel provided, try to find the gallery in the simple controls
      if (!panel) {
        const gallery = document.getElementById('tooltip-thumbnail-gallery');
        if (gallery) {
          panel = gallery;
        } else {
          console.log('No panel or gallery found for thumbnail update');
          return;
        }
      }

      const thumbnailContainer = panel.querySelector('#thumbnail-container');
      const screenshotCount = panel.querySelector('#screenshot-count');
      const noScreenshots = panel.querySelector('#no-screenshots');
      
      if (!thumbnailContainer || !screenshotCount || !noScreenshots) {
        console.log('Required gallery elements not found');
        return;
      }
      
      // Get stored screenshots from IndexedDB via background script
      const response = await chrome.runtime.sendMessage({ action: 'getStoredScreenshots' });
      
      if (response && response.success && response.data && response.data.length > 0) {
        const screenshots = response.data;
        
        // Update count
        screenshotCount.textContent = `${screenshots.length} screenshots`;
        
        // Clear container
        thumbnailContainer.innerHTML = '';
        noScreenshots.style.display = 'none';
        
        // Add thumbnails
        screenshots.forEach((screenshot, index) => {
          const thumbnail = document.createElement('div');
          thumbnail.style.cssText = `
            width: 100%;
            height: 60px;
            background-image: url('${screenshot.dataUrl}');
            background-size: cover;
            background-position: center;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            cursor: pointer;
            position: relative;
            overflow: hidden;
          `;
          
          // Add overlay with element type
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            text-align: center;
          `;
          overlay.textContent = screenshot.elementType || 'element';
          
          thumbnail.appendChild(overlay);
          
          // Add click handler to show full screenshot
          thumbnail.addEventListener('click', () => {
            this.showFullScreenshot(screenshot);
          });
          
          thumbnailContainer.appendChild(thumbnail);
        });
      } else {
        // No screenshots
        screenshotCount.textContent = '0 screenshots';
        thumbnailContainer.innerHTML = '';
        noScreenshots.style.display = 'block';
      }
    } catch (error) {
      console.error('Failed to update thumbnail gallery:', error);
    }
  }

  async updateServiceStatus(panel) {
    try {
      const serviceStatus = panel.querySelector('#service-status');
      const serviceDetails = panel.querySelector('#service-details');
      
      if (!serviceStatus || !serviceDetails) return;
      
      const response = await chrome.runtime.sendMessage({ action: 'checkServiceStatus' });
      
      if (response && response.success) {
        const status = response.data;
        if (status.available) {
          serviceStatus.textContent = '✅ Online';
          serviceDetails.textContent = `Playwright service running on localhost:3001`;
        } else {
          serviceStatus.textContent = '❌ Offline';
          serviceDetails.textContent = `Service error: ${status.error || 'Unknown'}`;
        }
      } else {
        serviceStatus.textContent = '❌ Error';
        serviceDetails.textContent = 'Failed to check service status';
      }
    } catch (error) {
      console.error('Failed to update service status:', error);
      const serviceStatus = panel.querySelector('#service-status');
      const serviceDetails = panel.querySelector('#service-details');
      if (serviceStatus) serviceStatus.textContent = '❌ Error';
      if (serviceDetails) serviceDetails.textContent = 'Failed to check service status';
    }
  }

  showScreenshotModal(screenshotDataUrl, metadata) {
    // Create modal to show full screenshot without opening new windows
    const modal = document.createElement('div');
    modal.className = 'tooltip-screenshot-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483648;
      cursor: pointer;
      backdrop-filter: blur(10px);
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      max-width: 95%;
      max-height: 95%;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    
    const img = document.createElement('img');
    img.src = screenshotDataUrl;
    img.style.cssText = `
      max-width: 100%;
      max-height: 80vh;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      object-fit: contain;
    `;
    
    // Add metadata info if available
    if (metadata) {
      const info = document.createElement('div');
      info.style.cssText = `
        margin-top: 15px;
        padding: 15px 20px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: white;
        font-size: 14px;
        text-align: center;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        max-width: 100%;
      `;
      
      const title = document.createElement('div');
      title.style.cssText = 'font-weight: 600; margin-bottom: 5px;';
      title.textContent = metadata.title || 'Screenshot Preview';
      
      const url = document.createElement('div');
      url.style.cssText = 'font-size: 12px; opacity: 0.8; word-break: break-all;';
      url.textContent = metadata.url || '';
      
      info.appendChild(title);
      if (metadata.url) info.appendChild(url);
      container.appendChild(info);
    }
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: -15px;
      right: -15px;
      width: 40px;
      height: 40px;
      background: rgba(244, 67, 54, 0.9);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    container.appendChild(img);
    container.appendChild(closeBtn);
    modal.appendChild(container);
    document.body.appendChild(modal);
    
    // Close on click outside or close button
    const closeModal = () => {
      if (modal.parentNode) {
        document.body.removeChild(modal);
      }
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    closeBtn.addEventListener('click', closeModal);
    
    // Close on Escape key
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  showFullScreenshot(screenshot) {
    // Use the new modal method
    this.showScreenshotModal(screenshot.dataUrl, screenshot.metadata);
  }
}

// Initialize content script when DOM is ready
console.log('ToolTip Content Script loading...');

let contentScriptInstance = null;

// Force initialization after a short delay to ensure DOM is ready
setTimeout(() => {
  console.log('Initializing ToolTip Content Script...');
  try {
    contentScriptInstance = new ToolTipContentScript();
    console.log('ToolTip Content Script initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ToolTip Content Script:', error);
  }
}, 100);

// Add message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (contentScriptInstance) {
    return contentScriptInstance.handleMessage(request, sender, sendResponse);
  }
  return false;
});

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

