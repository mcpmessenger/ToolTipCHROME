# ToolTip Screenshot Service

A local Node.js service that uses Playwright to capture screenshots of web pages when elements are clicked, providing screenshot-based tooltips for the ToolTip Chrome Extension.

## Features

- 🎯 **Universal Screenshot Capture**: Works on any website
- 🚀 **Playwright Integration**: Uses Playwright for reliable screenshot capture
- 💾 **Local Caching**: Stores screenshots locally with TTL
- 🔒 **Privacy-First**: All data stays on your local machine
- ⚡ **High Performance**: Supports up to 50 concurrent screenshots
- 🎨 **Smart Cropping**: Automatically crops screenshots to relevant areas

## Installation

1. **Install Node.js** (version 16 or higher)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

## Usage

### Starting the Service

```bash
# Start the service
npm start

# Or use the batch file (Windows)
start.bat

# Or run directly
node server.js
```

The service will start on `http://localhost:3001`

### API Endpoints

#### Health Check
```
GET http://localhost:3001/health
```

#### Capture Screenshot
```
POST http://localhost:3001/screenshot
Content-Type: application/json

{
  "url": "https://example.com",
  "selector": "button#submit",
  "elementType": "button",
  "maxScreenshots": 25
}
```

#### Cache Stats
```
GET http://localhost:3001/cache/stats
```

#### Clear Cache
```
DELETE http://localhost:3001/cache
```

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)
- `MAX_CONCURRENT`: Maximum concurrent requests (default: 3)
- `CACHE_TTL`: Cache time-to-live in milliseconds (default: 24 hours)
- `MAX_CACHE_SIZE`: Maximum number of cached items (default: 100)

### Settings
The service can be configured by modifying the constants in `server.js`:
- `maxConcurrent`: Number of simultaneous screenshot requests
- `cacheTTL`: How long screenshots are cached
- `maxCacheSize`: Maximum number of cached screenshots

## How It Works

1. **Element Detection**: Chrome extension detects hover over clickable elements
2. **Service Request**: Extension sends element data to local service
3. **Playwright Capture**: Service launches headless browser and navigates to page
4. **Element Interaction**: Service clicks the element and waits for page to settle
5. **Screenshot**: Service captures full page screenshot
6. **Smart Cropping**: Service crops screenshot to relevant area around element
7. **Base64 Encoding**: Screenshot is converted to base64 for transmission
8. **Caching**: Screenshot is cached locally for future use
9. **Display**: Extension displays screenshot in tooltip

## Troubleshooting

### Service Won't Start
- Make sure Node.js is installed
- Check if port 3001 is already in use
- Ensure all dependencies are installed with `npm install`

### Screenshots Not Capturing
- Verify Playwright browsers are installed: `npx playwright install`
- Check browser console for error messages
- Ensure the element selector is valid
- Try with a simpler website first

### Performance Issues
- Reduce `maxConcurrent` setting for slower machines
- Clear cache if it becomes too large
- Check available system memory

### Chrome Extension Issues
- Make sure the service is running on localhost:3001
- Check Chrome extension console for error messages
- Verify manifest permissions include localhost:3001

## Development

### File Structure
```
screenshot-service/
├── server.js              # Main server file
├── playwright-scraper.js  # Playwright screenshot logic
├── cache-manager.js       # Local caching system
├── package.json           # Dependencies
├── start.bat             # Windows start script
└── README.md             # This file
```

### Adding Features
- Modify `playwright-scraper.js` for screenshot logic
- Update `server.js` for new API endpoints
- Extend `cache-manager.js` for caching improvements

## Security

- Service only runs locally (localhost:3001)
- No external network requests for screenshot data
- All screenshots stored locally in cache directory
- No sensitive data transmitted over network

## Performance

- Supports up to 50 concurrent screenshot requests
- Smart caching reduces redundant captures
- Automatic cleanup of old cached items
- Optimized image cropping and compression
