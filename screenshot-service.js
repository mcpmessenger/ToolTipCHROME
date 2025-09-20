// External Screenshot Service for ToolTip Companion
// This service handles Playwright automation for screenshot capture

const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

class ScreenshotService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.screenshotDir = path.join(__dirname, 'screenshots');
    this.setupMiddleware();
    this.setupRoutes();
    this.ensureScreenshotDir();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use('/screenshots', express.static(this.screenshotDir));
    
    // Handle missing screenshot files gracefully
    this.app.use('/screenshots', (req, res, next) => {
      const filePath = path.join(this.screenshotDir, req.path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          error: 'Screenshot not found',
          path: req.path,
          message: 'The requested screenshot has not been captured yet or has expired'
        });
      }
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Main screenshot capture endpoint
    this.app.post('/capture', async (req, res) => {
      try {
        const { url, selector, elementType, waitTime = 2000 } = req.body;
        
        if (!url) {
          return res.status(400).json({ error: 'URL is required' });
        }

        console.log(`Capturing screenshot for: ${url}`);
        
        const result = await this.captureScreenshots(url, selector, elementType, waitTime);
        res.json(result);
        
      } catch (error) {
        console.error('Screenshot capture error:', error);
        res.status(500).json({ 
          error: 'Screenshot capture failed', 
          message: error.message 
        });
      }
    });

    // Link preview endpoint (for clicked links)
    this.app.post('/preview-link', async (req, res) => {
      try {
        const { url, waitTime = 3000 } = req.body;
        
        if (!url) {
          return res.status(400).json({ error: 'URL is required' });
        }

        console.log(`Generating link preview for: ${url}`);
        
        const result = await this.captureLinkPreview(url, waitTime);
        res.json(result);
        
      } catch (error) {
        console.error('Link preview error:', error);
        res.status(500).json({ 
          error: 'Link preview failed', 
          message: error.message 
        });
      }
    });
  }

  ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async captureScreenshots(url, selector, elementType, waitTime) {
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Navigate to the URL
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait for page to load
      await page.waitForTimeout(waitTime);
      
      const timestamp = Date.now();
      const screenshots = {};
      
      // Capture full page screenshot
      const fullPagePath = path.join(this.screenshotDir, `full-${timestamp}.png`);
      await page.screenshot({ 
        path: fullPagePath, 
        fullPage: true 
      });
      screenshots.fullPage = `/screenshots/full-${timestamp}.png`;
      
      // If selector is provided, capture element screenshot
      if (selector) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          const elementPath = path.join(this.screenshotDir, `element-${timestamp}.png`);
          await page.locator(selector).screenshot({ path: elementPath });
          screenshots.element = `/screenshots/element-${timestamp}.png`;
        } catch (error) {
          console.log(`Element selector not found: ${selector}`);
        }
      }
      
      // Get page metadata
      const metadata = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }));
      
      return {
        success: true,
        screenshots,
        metadata,
        timestamp
      };
      
    } finally {
      await browser.close();
    }
  }

  async captureLinkPreview(url, waitTime) {
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1200, height: 630 }, // Optimal for link previews
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Navigate to the URL
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait for page to load
      await page.waitForTimeout(waitTime);
      
      const timestamp = Date.now();
      
      // Capture preview screenshot
      const previewPath = path.join(this.screenshotDir, `preview-${timestamp}.png`);
      await page.screenshot({ 
        path: previewPath,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1200, height: 630 }
      });
      
      // Get page metadata
      const metadata = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        url: window.location.href,
        favicon: document.querySelector('link[rel="icon"]')?.href || '',
        ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
        ogTitle: document.querySelector('meta[property="og:title"]')?.content || document.title,
        ogDescription: document.querySelector('meta[property="og:description"]')?.content || ''
      }));
      
      return {
        success: true,
        screenshot: `/screenshots/preview-${timestamp}.png`,
        metadata,
        timestamp
      };
      
    } finally {
      await browser.close();
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Screenshot Service running on port ${this.port}`);
      console.log(`📸 Screenshots will be saved to: ${this.screenshotDir}`);
      console.log(`🌐 Health check: http://localhost:${this.port}/health`);
    });
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new ScreenshotService();
  service.start();
}

module.exports = ScreenshotService;
