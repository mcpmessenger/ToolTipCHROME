const express = require('express');
const cors = require('cors');
const { captureScreenshot } = require('./playwright-scraper');
const { CacheManager } = require('./cache-manager');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize cache manager
const cacheManager = new CacheManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ToolTip Screenshot Service'
  });
});

// Main screenshot capture endpoint
app.post('/screenshot', async (req, res) => {
  try {
    const { url, selector, elementType, maxScreenshots = 25 } = req.body;
    
    // Validate required parameters
    if (!url || !selector) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: url and selector'
      });
    }

    console.log(`📸 Screenshot request: ${url} - ${selector}`);

    // Check cache first
    const cacheKey = `${url}#${selector}`;
    const cached = await cacheManager.get(cacheKey);
    
    if (cached) {
      console.log(`✅ Cache hit for: ${cacheKey}`);
      return res.json({
        success: true,
        screenshot: cached.screenshot,
        metadata: cached.metadata,
        cached: true,
        timestamp: cached.timestamp
      });
    }

    // Capture new screenshot
    console.log(`🔄 Capturing new screenshot for: ${url}`);
    const result = await captureScreenshot({
      url,
      selector,
      elementType,
      maxScreenshots
    });

    if (result.success) {
      // Store in cache
      await cacheManager.set(cacheKey, {
        screenshot: result.screenshot,
        metadata: result.metadata,
        timestamp: Date.now()
      });

      console.log(`✅ Screenshot captured and cached: ${url}`);
      res.json({
        success: true,
        screenshot: result.screenshot,
        metadata: result.metadata,
        cached: false,
        timestamp: Date.now()
      });
    } else {
      console.log(`❌ Screenshot capture failed: ${url} - ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cache stats
app.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheManager.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache
app.delete('/cache', async (req, res) => {
  try {
    await cacheManager.clear();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ToolTip Screenshot Service running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📸 Screenshot endpoint: http://localhost:${PORT}/screenshot`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
