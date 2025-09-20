# 🚀 ToolTip Chrome Extension Setup Guide

This guide will help you set up the ToolTip Chrome Extension with the local Playwright service for the best experience.

## 📋 Prerequisites

- **Chrome Browser** (version 88 or higher)
- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- **Git** (optional, for cloning the repository)

## 🛠️ Installation Steps

### Step 1: Install Node.js Dependencies

1. Open a terminal/command prompt
2. Navigate to the `screenshot-service` directory:
   ```bash
   cd screenshot-service
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

### Step 2: Start the Screenshot Service

**Option A: Using the provided script (Windows)**
```bash
start.bat
```

**Option B: Manual start**
```bash
node server.js
```

You should see output like:
```
🚀 ToolTip Screenshot Service running on http://localhost:3001
📊 Health check: http://localhost:3001/health
📸 Screenshot endpoint: http://localhost:3001/screenshot
```

### Step 3: Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `ToolTipCHROME-Local` folder
5. The extension should now appear in your extensions list

### Step 4: Verify Installation

1. Click the ToolTip Companion extension icon in your browser toolbar
2. Check that the service status shows "✅ Local Service is running"
3. Visit any website and hover over clickable elements to test tooltips

## 🔧 Configuration

### Extension Settings

Click the extension icon to access settings:

- **Enable ToolTip Companion**: Toggle the extension on/off
- **Trigger Event**: Choose hover, click, or focus
- **Hover Delay**: Adjust how quickly tooltips appear
- **Local Screenshots**: Enable/disable screenshot capture
- **Auto-capture**: Automatically capture screenshots for links
- **Storage Management**: Set max storage size and cleanup old screenshots

### Service Configuration

The screenshot service runs on `http://localhost:3001` by default. You can modify settings in `screenshot-service/server.js` if needed.

## 🚨 Troubleshooting

### Service Not Running

**Problem**: Extension shows "Service offline" status

**Solutions**:
1. Make sure the service is running: `node server.js` in the screenshot-service directory
2. Check if port 3001 is available: `netstat -an | findstr :3001` (Windows) or `lsof -i :3001` (Mac/Linux)
3. Try restarting the service
4. Check the console for error messages

### Screenshots Not Capturing

**Problem**: Tooltips show but no screenshots appear

**Solutions**:
1. Verify the service is running and accessible
2. Check browser console for errors
3. Ensure the target website allows screenshots
4. Try refreshing the page

### Extension Not Loading

**Problem**: Extension doesn't appear in Chrome

**Solutions**:
1. Make sure Developer mode is enabled
2. Check that you selected the correct folder (`ToolTipCHROME-Local`)
3. Try reloading the extension
4. Check Chrome's extension error page for details

### Performance Issues

**Problem**: Extension is slow or unresponsive

**Solutions**:
1. Reduce the number of concurrent screenshots
2. Increase the hover delay
3. Clear old screenshots using the cleanup button
4. Restart the screenshot service

## 🔒 Privacy & Security

- **Local Storage**: All screenshots are stored locally in your browser
- **No External Servers**: The service runs entirely on your machine
- **No Data Collection**: No usage data is sent to external services
- **Secure**: All communication happens over localhost

## 📊 Service Endpoints

The local service provides these endpoints:

- `GET /health` - Health check
- `POST /screenshot` - Capture screenshots
- `GET /cache/stats` - Cache statistics
- `DELETE /cache` - Clear cache

## 🆘 Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify the service is running on localhost:3001
3. Try restarting both the service and the extension
4. Check the troubleshooting section above

## 🔄 Updates

To update the extension:

1. Stop the screenshot service
2. Pull the latest changes (if using Git)
3. Run `npm install` in the screenshot-service directory
4. Restart the service
5. Reload the extension in Chrome

## 📝 Development

For developers wanting to modify the extension:

- **Extension Code**: `background-local.js`, `content-local.js`, `popup-local.js`
- **Service Code**: `screenshot-service/server.js`, `playwright-scraper.js`
- **Styles**: `tooltip-styles.css`
- **Configuration**: `manifest-local.json`

---

**Need more help?** Check the main README.md or create an issue on GitHub.
