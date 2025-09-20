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
    
    this.init();
  }

  async init() {
    // Load settings
    await this.loadSettings();
    
    // Only proceed if extension is enabled
    if (!this.settings.enabled) {
      return;
    }

    // Initialize tooltip system
    this.initializeTooltipSystem();
    
    // Start observing the page
    this.startObserving();
    
    // Listen for settings changes
    this.setupSettingsListener();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response?.success) {
          this.settings = response.data;
          this.isEnabled = this.settings.enabled;
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
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    this.hoverTimeout = setTimeout(() => {
      this.showTooltipForElement(event.target);
    }, this.settings.delay || 500);
  }

  handleElementLeave(event) {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.hideTooltip();
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
      
      // Show loading tooltip immediately
      this.showTooltip(linkElement, {
        content: 'Capturing screenshot...',
        loading: true,
        linkPreview: true
      });

      // Get link data
      const linkData = {
        url: linkElement.href,
        title: linkElement.textContent?.trim() || linkElement.title || '',
        element: linkElement
      };

      // Request screenshot capture from background script
      const preview = await this.captureLinkPreview(linkData);
      
      if (preview && preview.success && preview.metadata) {
        // Show tooltip with screenshot
        this.showTooltip(linkElement, {
          content: preview.metadata.title || linkData.title,
          description: preview.metadata.description || '',
          screenshot: preview.screenshot,
          metadata: preview.metadata,
          linkPreview: true,
          loading: false,
          cached: preview.cached || false
        });
      } else {
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
      // Show loading tooltip immediately
      this.showTooltip(element, {
        content: 'Capturing screenshot...',
        loading: true
      });

      // Extract element data
      const elementData = this.extractElementData(element);
      
      // Try Playwright screenshot capture first
      try {
        const screenshotResult = await this.captureScreenshotWithPlaywright(elementData);
        
        if (screenshotResult && screenshotResult.success) {
          // Show tooltip with screenshot
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
    // Always hide existing tooltip first
    this.hideTooltip();
    
    // Prevent multiple simultaneous tooltip operations
    if (this.isProcessing) {
      this.tooltipQueue.push({ element, data });
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
    
    // Calculate position
    const rect = element.getBoundingClientRect();
    const position = this.calculateTooltipPosition(rect);

    tooltip.style.cssText = `
      position: absolute;
      left: ${position.x}px;
      top: ${position.y}px;
      width: 280px;
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
        screenshotDiv.style.cssText = `
          margin-top: 12px;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        `;
        
        const img = document.createElement('img');
        img.src = data.screenshot;
        img.alt = 'Link preview';
        img.style.cssText = `
          width: 100%;
          height: auto;
          max-height: 200px;
          object-fit: cover;
          border-radius: 8px;
          cursor: pointer;
        `;
        
        // Handle image loading errors
        img.addEventListener('error', () => {
          console.log('Screenshot failed to load:', data.screenshot);
          screenshotDiv.style.display = 'none';
        });
        
        // Make screenshot clickable to open link
        if (data.metadata && data.metadata.url) {
          img.addEventListener('click', () => {
            window.open(data.metadata.url, '_blank');
          });
          img.title = 'Click to open link';
        }
        
        // Add cached indicator if screenshot was cached
        if (data.cached) {
          const cachedIndicator = document.createElement('div');
          cachedIndicator.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            pointer-events: none;
          `;
          cachedIndicator.textContent = 'Cached';
          screenshotDiv.appendChild(cachedIndicator);
        }
        
        screenshotDiv.appendChild(img);
        content.appendChild(screenshotDiv);
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
    
    // Add interactive features if enabled
    if (this.settings.interactiveTooltips !== false) {
      // Add resize handles
      this.addResizeHandles(tooltip);
      
      // Add event listeners
      this.addTooltipEventListeners(tooltip, header, collapseBtn, closeBtn);
    } else {
      // Simple close button only
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hideTooltip();
      });
      
      // Remove drag functionality from header
      header.style.cursor = 'default';
      collapseBtn.style.display = 'none';
    }

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
    const tooltipWidth = 280; // initial width
    const tooltipHeight = 80; // estimated height
    const margin = 10;

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

    return { x: x + window.scrollX, y: y + window.scrollY };
  }

  addResizeHandles(tooltip) {
    const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];
    
    handles.forEach(direction => {
      const handle = document.createElement('div');
      handle.className = `tooltip-companion-resize-handle ${direction}`;
      tooltip.appendChild(handle);
      
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startResize(tooltip, direction, e);
      });
    });
  }

  addTooltipEventListeners(tooltip, header, collapseBtn, closeBtn) {
    let isDragging = false;
    let dragStart = { x: 0, y: 0, left: 0, top: 0 };
    
    // Drag functionality
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.tooltip-companion-btn')) return;
      
      isDragging = true;
      tooltip.classList.add('dragging');
      
      dragStart = {
        x: e.clientX,
        y: e.clientY,
        left: parseInt(tooltip.style.left),
        top: parseInt(tooltip.style.top)
      };
      
      e.preventDefault();
    });
    
    // Collapse/Expand functionality
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleCollapse(tooltip, collapseBtn);
    });
    
    // Close functionality
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hideTooltip();
    });
    
    // Global mouse events for dragging
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      const newLeft = dragStart.left + deltaX;
      const newTop = dragStart.top + deltaY;
      
      // Constrain to viewport
      const maxLeft = window.innerWidth - tooltip.offsetWidth;
      const maxTop = window.innerHeight - tooltip.offsetHeight;
      
      tooltip.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
      tooltip.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        tooltip.classList.remove('dragging');
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Store cleanup function
    tooltip._cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }

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

  startResize(tooltip, direction, e) {
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = tooltip.offsetWidth;
    const startHeight = tooltip.offsetHeight;
    const startLeft = parseInt(tooltip.style.left);
    const startTop = parseInt(tooltip.style.top);
    
    tooltip.classList.add('resizing');
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;
      
      // Calculate new dimensions based on resize direction
      if (direction.includes('e')) newWidth = startWidth + deltaX;
      if (direction.includes('w')) {
        newWidth = startWidth - deltaX;
        newLeft = startLeft + deltaX;
      }
      if (direction.includes('s')) newHeight = startHeight + deltaY;
      if (direction.includes('n')) {
        newHeight = startHeight - deltaY;
        newTop = startTop + deltaY;
      }
      
      // Apply constraints
      newWidth = Math.max(200, Math.min(newWidth, 600));
      newHeight = Math.max(40, Math.min(newHeight, 400));
      
      // Update tooltip
      tooltip.style.width = newWidth + 'px';
      tooltip.style.height = newHeight + 'px';
      
      if (direction.includes('w')) {
        tooltip.style.left = (startLeft + startWidth - newWidth) + 'px';
      }
      if (direction.includes('n')) {
        tooltip.style.top = (startTop + startHeight - newHeight) + 'px';
      }
    };
    
    const handleMouseUp = () => {
      tooltip.classList.remove('resizing');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  hideTooltip() {
    if (this.currentTooltip) {
      // Clean up event listeners
      if (this.currentTooltip._cleanup) {
        this.currentTooltip._cleanup();
      }
      
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ToolTipContentScript();
  });
} else {
  new ToolTipContentScript();
}

