// Debug script to test Playwright service directly
// Run this with: node debug-playwright.js

const fetch = require('node-fetch');

async function testPlaywrightService() {
  console.log('🔍 Testing Playwright Service...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
      return;
    }

    // Test 2: Screenshot Capture
    console.log('\n2️⃣ Testing screenshot capture...');
    const screenshotResponse = await fetch('http://localhost:3001/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://www.google.com',
        selector: 'body',
        elementType: 'body',
        maxScreenshots: 1
      })
    });

    if (screenshotResponse.ok) {
      const screenshotData = await screenshotResponse.json();
      console.log('✅ Screenshot capture successful!');
      console.log('📊 Response data:', {
        success: screenshotData.success,
        hasScreenshot: !!screenshotData.screenshot,
        screenshotLength: screenshotData.screenshot ? screenshotData.screenshot.length : 0,
        cached: screenshotData.cached,
        metadata: screenshotData.metadata
      });
      
      if (screenshotData.screenshot) {
        console.log('🖼️ Screenshot preview (first 100 chars):', screenshotData.screenshot.substring(0, 100) + '...');
      }
    } else {
      const errorText = await screenshotResponse.text();
      console.log('❌ Screenshot capture failed:', screenshotResponse.status, errorText);
    }

    // Test 3: Cache Stats
    console.log('\n3️⃣ Testing cache stats...');
    const cacheResponse = await fetch('http://localhost:3001/cache/stats');
    
    if (cacheResponse.ok) {
      const cacheData = await cacheResponse.json();
      console.log('✅ Cache stats:', cacheData);
    } else {
      console.log('❌ Cache stats failed:', cacheResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPlaywrightService();
