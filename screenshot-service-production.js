// Production Screenshot Service for ToolTip Companion
// Designed for hosting on your main website

const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

class ProductionScreenshotService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.screenshotDir = path.join(__dirname, 'screenshots');
    this.maxScreenshots = 1000; // Limit stored screenshots
    this.screenshotTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    this.setupMiddleware();
    this.setupRoutes();
    this.ensureScreenshotDir();
    this.startCleanupTimer();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      }
    });
    this.app.use('/api/', limiter);
    
    // CORS configuration
    this.app.use(cors({
      origin: [
        'chrome-extension://*',
        'https://tooltipcompanion.com',
        'https://www.tooltipcompanion.com',
        'http://localhost:*' // For development
      ],
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    
    // Serve screenshots with proper headers
    this.app.use('/screenshots', express.static(this.screenshotDir, {
      maxAge: '1h', // Cache for 1 hour
      etag: true
    }));
    
    // Handle missing screenshot files gracefully
    this.app.use('/screenshots', (req, res, next) => {
      const filePath = path.join(this.screenshotDir, req.path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          error: 'Screenshot not found',
          message: 'The requested screenshot has expired or was not found'
        });
      }
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime()
      });
    });

    // Service info endpoint
    this.app.get('/api/info', (req, res) => {
      res.json({
        service: 'ToolTip Companion Screenshot Service',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          capture: '/api/capture',
          preview: '/api/preview-link',
          info: '/api/info'
        },
        limits: {
          maxRequestsPerWindow: 100,
          windowMinutes: 15,
          screenshotTTL: '24 hours'
        }
      });
    });

    // Main screenshot capture endpoint
    this.app.post('/api/capture', async (req, res) => {
      try {
        const { url, selector, elementType, waitTime = 2000 } = req.body;
        
        if (!url || !this.isValidUrl(url)) {
          return res.status(400).json({ error: 'Valid URL is required' });
        }

        // Validate wait time
        const validWaitTime = Math.min(Math.max(waitTime, 1000), 10000);
        
        console.log(`Capturing screenshot for: ${url}`);
        
        const result = await this.captureScreenshots(url, selector, elementType, validWaitTime);
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
    this.app.post('/api/preview-link', async (req, res) => {
      try {
        const { url, waitTime = 3000 } = req.body;
        
        if (!url || !this.isValidUrl(url)) {
          return res.status(400).json({ error: 'Valid URL is required' });
        }

        // Validate wait time
        const validWaitTime = Math.min(Math.max(waitTime, 1000), 10000);
        
        console.log(`Generating link preview for: ${url}`);
        
        const result = await this.captureLinkPreview(url, validWaitTime);
        res.json(result);
        
      } catch (error) {
        console.error('Link preview error:', error);
        res.status(500).json({ 
          error: 'Link preview failed', 
          message: error.message 
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'ToolTip Companion Screenshot Service',
        status: 'running',
        documentation: 'https://tooltipcompanion.com/docs',
        endpoints: ['/api/health', '/api/capture', '/api/preview-link']
      });
    });
  }

  isValidUrl(string) {
    try {
      const url = new URL(string);
      return ['http:', 'https:'].includes(url.protocol);
    } catch (_) {
      return false;
    }
  }

  ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  startCleanupTimer() {
    // Clean up old screenshots every hour
    setInterval(() => {
      this.cleanupOldScreenshots();
    }, 60 * 60 * 1000);
  }

  cleanupOldScreenshots() {
    try {
      const files = fs.readdirSync(this.screenshotDir);
      const now = Date.now();
      let cleanedCount = 0;

      files.forEach(file => {
        const filePath = path.join(this.screenshotDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > this.screenshotTTL) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old screenshots`);
      }
    } catch (error) {
      console.error('Error cleaning up screenshots:', error);
    }
  }

  async captureScreenshots(url, selector, elementType, waitTime) {
    const browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Set timeout
      page.setDefaultTimeout(30000);
      
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
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1200, height: 630 }, // Optimal for link previews
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Set timeout
      page.setDefaultTimeout(30000);
      
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
      console.log(`🚀 Production Screenshot Service running on port ${this.port}`);
      console.log(`📸 Screenshots will be saved to: ${this.screenshotDir}`);
      console.log(`🌐 Health check: http://localhost:${this.port}/api/health`);
      console.log(`📚 API info: http://localhost:${this.port}/api/info`);
      console.log(`🔒 Rate limiting: 100 requests per 15 minutes`);
      console.log(`🧹 Auto cleanup: Every hour`);
    });
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new ProductionScreenshotService();
  service.start();
}

module.exports = ProductionScreenshotService;
