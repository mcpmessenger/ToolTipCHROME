# 🚀 ToolTip Companion Screenshot Service Setup

This guide will help you set up the Playwright screenshot service for the ToolTip Companion Chrome extension.

## 📋 Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

## 🛠️ Installation Steps

### Step 1: Install Node.js
1. Go to [nodejs.org](https://nodejs.org/)
2. Download and install the LTS version
3. Verify installation: `node --version` and `npm --version`

### Step 2: Install Screenshot Service Dependencies
Open terminal/command prompt in your extension folder and run:

```bash
# Install dependencies
npm install express playwright cors

# Install Playwright browsers
npx playwright install chromium
```

### Step 3: Start the Screenshot Service
```bash
# Start the service
node screenshot-service.js
```

You should see:
```
🚀 Screenshot Service running on port 3001
📸 Screenshots will be saved to: /path/to/screenshots
🌐 Health check: http://localhost:3001/health
```

### Step 4: Configure Chrome Extension
1. Open the ToolTip Companion popup
2. Go to **Advanced Settings**
3. Ensure **Screenshot Service** is enabled
4. Set URL to: `http://localhost:3001`

## 🎯 How It Works

### Automatic Screenshot Capture
- **Click any link** on a webpage
- The extension automatically captures a screenshot of the destination
- **Preview appears** in the tooltip with the captured image
- **Click the screenshot** to open the link in a new tab

### Features
- ✅ **Beautiful glassmorphism tooltips** with gradients and blur effects
- ✅ **Draggable and resizable** tooltips
- ✅ **Collapsible interface** with minimize/expand
- ✅ **Automatic screenshot capture** for clicked links
- ✅ **Link previews** with page metadata
- ✅ **Clickable screenshots** to open links

## 🔧 Configuration

### Screenshot Service Settings
- **URL**: `http://localhost:3001` (default)
- **Auto Capture**: Enable/disable automatic screenshots
- **Wait Time**: How long to wait for page load (default: 3 seconds)

### Tooltip Settings
- **Interactive Mode**: Enable draggable/resizable tooltips
- **Trigger Event**: Hover, Click, or Focus
- **Position**: Auto, Top, Bottom, Left, Right

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check if port 3001 is in use
netstat -an | findstr 3001

# Try a different port
PORT=3002 node screenshot-service.js
```

### Screenshots Not Capturing
1. **Check service status**: Visit `http://localhost:3001/health`
2. **Verify extension settings**: Ensure screenshot service is enabled
3. **Check console**: Open browser DevTools for error messages
4. **Try manual test**: Click a link and wait for the loading indicator

### Playwright Issues
```bash
# Reinstall Playwright
npx playwright install --force

# Check browser installation
npx playwright install chromium --with-deps
```

## 📱 Usage Examples

### Basic Link Preview
1. Navigate to any webpage
2. Click on a link
3. Watch the tooltip appear with screenshot preview
4. Click the screenshot to open the link

### Interactive Tooltips
1. Hover over any element
2. Drag the tooltip header to move it
3. Resize using corner handles
4. Collapse using the − button
5. Close using the × button

## 🔒 Security Notes

- The screenshot service runs locally on your machine
- No data is sent to external servers
- Screenshots are stored temporarily in the `screenshots/` folder
- The service only captures publicly accessible web pages

## 🎨 Customization

### Styling
- Modify `tooltip-styles.css` for visual customization
- Adjust glassmorphism effects and gradients
- Change colors, fonts, and animations

### Behavior
- Edit `screenshot-service.js` for capture logic
- Modify `content.js` for tooltip behavior
- Update `background.js` for service integration

## 🆘 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify the screenshot service is running
3. Ensure all dependencies are installed
4. Try restarting both the service and the extension

---

**Enjoy your enhanced ToolTip Companion with beautiful screenshots! 🎉**
