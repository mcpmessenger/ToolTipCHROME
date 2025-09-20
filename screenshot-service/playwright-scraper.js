const { chromium } = require('playwright');
const sharp = require('sharp');

class PlaywrightScraper {
  constructor() {
    this.browser = null;
    this.maxConcurrent = 3; // Limit concurrent requests
    this.activeRequests = 0;
    this.queue = [];
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
  }

  async captureScreenshot(options) {
    const { url, selector, elementType, maxScreenshots = 25 } = options;
    
    // Wait for available slot
    await this.waitForSlot();
    this.activeRequests++;

    try {
      await this.initialize();
      
      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      
      // Set reasonable timeouts
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      console.log(`🌐 Navigating to: ${url}`);
      
      // Navigate to the page
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);

      console.log(`🎯 Looking for element: ${selector}`);

      // Find the element
      const element = await page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout: 10000 });

      // Get element position for cropping
      const elementBox = await element.boundingBox();
      
      if (!elementBox) {
        throw new Error('Element not found or not visible');
      }

      console.log(`🖱️ Clicking element at position: ${elementBox.x}, ${elementBox.y}`);

      // Click the element
      await element.click();
      
      // Wait for page to settle after click
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');

      console.log(`📸 Capturing screenshot...`);

      // Take full page screenshot
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: true,
        quality: 90
      });

      // Crop to relevant area around the element
      const croppedScreenshot = await this.cropScreenshot(screenshotBuffer, elementBox);

      // Convert to base64
      const base64Screenshot = croppedScreenshot.toString('base64');

      // Get page metadata
      const metadata = await page.evaluate(() => ({
        title: document.title,
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.content || '',
        timestamp: Date.now()
      }));

      await context.close();

      return {
        success: true,
        screenshot: base64Screenshot,
        metadata: {
          ...metadata,
          elementType,
          selector,
          originalUrl: url,
          screenshotSize: croppedScreenshot.length
        }
      };

    } catch (error) {
      console.error('Playwright capture error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  async cropScreenshot(screenshotBuffer, elementBox) {
    try {
      // Calculate crop area - expand around the element
      const padding = 100;
      const cropX = Math.max(0, elementBox.x - padding);
      const cropY = Math.max(0, elementBox.y - padding);
      const cropWidth = Math.min(elementBox.width + (padding * 2), 800);
      const cropHeight = Math.min(elementBox.height + (padding * 2), 600);

      // Crop the image using Sharp
      const cropped = await sharp(screenshotBuffer)
        .extract({
          left: Math.floor(cropX),
          top: Math.floor(cropY),
          width: Math.floor(cropWidth),
          height: Math.floor(cropHeight)
        })
        .png({ quality: 90 })
        .toBuffer();

      return cropped;
    } catch (error) {
      console.error('Crop error:', error);
      // Return original if cropping fails
      return screenshotBuffer;
    }
  }

  async waitForSlot() {
    if (this.activeRequests < this.maxConcurrent) {
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  processQueue() {
    if (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const resolve = this.queue.shift();
      resolve();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Create singleton instance
const scraper = new PlaywrightScraper();

// Export the capture function
async function captureScreenshot(options) {
  return await scraper.captureScreenshot(options);
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  await scraper.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await scraper.close();
  process.exit(0);
});

module.exports = { captureScreenshot };
