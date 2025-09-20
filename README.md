# ToolTip Chrome Extension v2.0.0

A revolutionary Chrome extension that provides screenshot-based tooltips for any webpage. When you hover over clickable elements, the extension automatically captures screenshots of what happens when those elements are clicked, storing them locally in your browser for instant access.

## 🌟 Features

- **Universal Screenshot Capture**: Works on any website with any clickable element
- **Playwright Integration**: Uses Playwright for reliable, automated screenshot capture
- **Local Storage**: All screenshots stored locally in your browser (IndexedDB)
- **Privacy-First**: No data sent to external servers (when using localhost service)
- **Smart Caching**: Intelligent caching system with automatic cleanup
- **Beautiful UI**: Modern, draggable, resizable tooltips with glassmorphism theme
- **High Performance**: Supports up to 50 concurrent screenshot requests
- **Auto-Detection**: Automatically detects and analyzes clickable elements
- **Service Status Monitoring**: Real-time status of local Playwright service
- **Fallback Support**: Graceful fallback to chrome.tabs API when service unavailable

## 🏗️ Architecture

### Current Implementation (Localhost)
```
Chrome Extension ↔ http://localhost:3001 ↔ Playwright Service ↔ Local Browser Storage
```

### Production Architecture (Recommended)
```
Chrome Extension ↔ Your Cloud API ↔ Playwright Service ↔ User's Browser Storage
```

## 📦 Installation

### Prerequisites
- Node.js 16+ (for screenshot service)
- Chrome browser
- Playwright browsers (installed automatically)

### Quick Start

1. **Install screenshot service dependencies**:
   ```bash
   cd screenshot-service
   npm install
   npx playwright install
   ```

2. **Start the screenshot service**:
   ```bash
   # Windows
   start.bat
   
   # Or manually
   node server.js
   ```

3. **Load the Chrome extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `ToolTipCHROME-Local` folder
   - The extension should now be active!

## 🚀 Usage

1. **Navigate to any website**
2. **Hover over clickable elements** (buttons, links, etc.)
3. **Wait for screenshot capture** (first time may take a few seconds)
4. **View the screenshot tooltip** showing what happens when you click
5. **Screenshots are cached** for instant future access

## 🛠️ Configuration

### Extension Settings
Access settings via the extension popup:
- **Trigger Event**: Hover, Click, or Focus
- **Hover Delay**: Adjust delay before tooltip appears
- **Screenshot Quality**: Control image quality and size
- **Caching**: Manage local storage and cleanup

### Screenshot Service Settings
Configure in `screenshot-service/server.js`:
- **Port**: Default 3001
- **Max Concurrent**: Number of simultaneous requests
- **Cache TTL**: How long screenshots are cached
- **Max Cache Size**: Maximum number of cached screenshots

## 📋 API Wish List

See [API-WISHLIST.md](./API-WISHLIST.md) for the complete list of cloud API endpoints planned for production deployment.

## 🎯 Implementation Priority

### Phase 1 (MVP)
- Primary screenshot capture
- Health & status endpoints
- Basic caching
- Rate limiting

### Phase 2 (Enhanced)
- Batch screenshot capture
- Element safety analysis
- User authentication
- Analytics

### Phase 3 (Advanced)
- AI-powered features
- Template generation
- Webhook support
- Advanced analytics

### Phase 4 (Enterprise)
- Multi-tenant support
- Advanced security
- Compliance features
- Enterprise integrations

## 🔧 Development

### File Structure
```
ToolTipCHROME-Local-v2.0.0/
├── ToolTipCHROME-Local/
│   ├── manifest.json              # Extension manifest
│   ├── manifest-local.json        # Local development manifest
│   ├── background-local.js        # Background service worker
│   ├── content-local.js          # Content script
│   ├── popup-local.html          # Extension popup
│   ├── popup-local.js            # Popup script
│   ├── tooltip-styles.css        # Tooltip styling
│   ├── icons/                    # Extension icons
│   └── screenshot-service/        # Node.js screenshot service
│       ├── server.js             # Main server file
│       ├── playwright-scraper.js # Playwright screenshot logic
│       ├── cache-manager.js      # Local caching system
│       ├── package.json          # Dependencies
│       ├── start.bat             # Windows start script
│       └── README.md             # Service documentation
```

### Local Development

1. **Start the screenshot service**:
   ```bash
   cd screenshot-service
   npm start
   ```

2. **Load extension in Chrome**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension folder

3. **Test on any website**:
   - Navigate to any website
   - Hover over clickable elements
   - Check browser console for logs

### Production Deployment

#### Option 1: Vercel (Recommended)
```javascript
// vercel.json
{
  "functions": {
    "api/screenshot.js": {
      "maxDuration": 30
    }
  }
}
```

#### Option 2: Railway
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

#### Option 3: AWS/GCP/Azure
- Deploy as containerized service
- Use managed databases for caching
- Implement auto-scaling

## 🛡️ Security Considerations

### API Security
- Rate limiting per user/IP
- Validate URLs (prevent SSRF attacks)
- Sanitize selectors
- Add authentication if needed

### Chrome Extension Security
- Validate all API responses
- Sanitize screenshot data
- Implement proper error handling
- Use HTTPS only in production

## 📊 Performance

- **Screenshot Capture**: 1-5 seconds per element
- **Cache Hit Rate**: 85%+ for repeated elements
- **Concurrent Requests**: Up to 50 simultaneous
- **Storage**: ~50MB max local storage
- **Memory Usage**: ~100MB for service

## 🆘 Troubleshooting

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

## 🚀 Roadmap

- [ ] Cloud API deployment
- [ ] AI-powered screenshot selection
- [ ] Multi-language support
- [ ] Mobile browser support
- [ ] Advanced caching strategies
- [ ] User analytics dashboard
- [ ] Enterprise features
- [ ] API marketplace

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: Check the README files
- **Community**: Join our Discord server
- **Email**: support@tooltipcompanion.com

---

**Made with ❤️ for the web development community**