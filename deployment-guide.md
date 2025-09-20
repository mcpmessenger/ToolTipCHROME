# 🚀 ToolTip Companion Screenshot Service - Production Deployment Guide

This guide will help you deploy the screenshot service to your website hosting platform.

## 📋 Prerequisites

- **Node.js hosting** (Heroku, DigitalOcean, AWS, Vercel, etc.)
- **Domain/subdomain** for the service (e.g., `api.tooltipcompanion.com`)
- **SSL certificate** (HTTPS required for Chrome extensions)

## 🛠️ Deployment Options

### Option 1: Heroku (Recommended for beginners)

#### Step 1: Prepare Files
```bash
# Create deployment directory
mkdir tooltip-screenshot-service
cd tooltip-screenshot-service

# Copy production files
cp screenshot-service-production.js app.js
cp package-production.json package.json

# Create Procfile
echo "web: node app.js" > Procfile
```

#### Step 2: Deploy to Heroku
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create new app
heroku create tooltip-screenshot-service

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git init
git add .
git commit -m "Initial deployment"
git push heroku main
```

#### Step 3: Install Playwright
```bash
# After deployment, install browsers
heroku run npx playwright install chromium
```

### Option 2: DigitalOcean App Platform

#### Step 1: Create App Spec
Create `app.yaml`:
```yaml
name: tooltip-screenshot-service
services:
- name: api
  source_dir: /
  github:
    repo: your-username/tooltip-screenshot-service
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "8080"
```

#### Step 2: Deploy
1. Connect your GitHub repository
2. Select the app spec
3. Deploy automatically

### Option 3: Vercel

#### Step 1: Create `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "screenshot-service-production.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "screenshot-service-production.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### Step 2: Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 🔧 Configuration

### Environment Variables
Set these in your hosting platform:

```bash
NODE_ENV=production
PORT=8080  # Or your platform's port
```

### Domain Setup
1. **Point your domain** to the hosting service
2. **Enable HTTPS** (most platforms do this automatically)
3. **Update extension settings** to use your domain:
   - `https://api.tooltipcompanion.com/api`
   - `https://tooltipcompanion.com/api`
   - `https://your-domain.com/api`

## 🔒 Security Features

The production service includes:

- ✅ **Rate limiting**: 100 requests per 15 minutes per IP
- ✅ **CORS protection**: Only allows Chrome extensions and your domain
- ✅ **Helmet security**: Security headers
- ✅ **Input validation**: URL validation and sanitization
- ✅ **Error handling**: Graceful error responses
- ✅ **Auto cleanup**: Removes old screenshots every hour

## 📊 Monitoring

### Health Check Endpoint
```bash
curl https://your-domain.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

### Service Info Endpoint
```bash
curl https://your-domain.com/api/info
```

## 🚀 Testing Your Deployment

### Step 1: Test Health Check
```bash
curl https://your-domain.com/api/health
```

### Step 2: Test Screenshot Capture
```bash
curl -X POST https://your-domain.com/api/preview-link \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com"}'
```

### Step 3: Update Extension
1. **Update default URL** in extension settings
2. **Test with real users**
3. **Monitor usage** and performance

## 📈 Scaling Considerations

### For High Traffic:
- **Increase rate limits** if needed
- **Add Redis caching** for frequent URLs
- **Use CDN** for screenshot serving
- **Load balancing** for multiple instances

### Cost Optimization:
- **Screenshot TTL**: Currently 24 hours (adjustable)
- **Rate limiting**: Prevents abuse
- **Auto cleanup**: Removes old files

## 🔧 Customization

### Update Extension Default URL
In `background.js`:
```javascript
screenshotService: {
  enabled: true,
  url: 'https://your-domain.com/api', // Your service URL
  autoCapture: true,
  waitTime: 3000
}
```

### Update Popup Default
In `popup.html`:
```html
<input type="url" id="screenshotServiceUrl" 
       value="https://your-domain.com/api">
```

## 🆘 Troubleshooting

### Common Issues:

1. **"Cannot GET" errors**: Check if service is running
2. **Screenshots not loading**: Verify HTTPS and CORS
3. **Rate limiting**: Adjust limits in service code
4. **Memory issues**: Increase server resources

### Debug Commands:
```bash
# Check service status
curl https://your-domain.com/api/health

# Test screenshot capture
curl -X POST https://your-domain.com/api/preview-link \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Check logs (platform specific)
heroku logs --tail
```

## 📝 Next Steps

1. **Deploy the service** using one of the methods above
2. **Update extension** with your service URL
3. **Test thoroughly** with real users
4. **Monitor performance** and adjust as needed
5. **Consider adding authentication** for premium features

---

**Your users will now get beautiful screenshot previews without needing to run any local services! 🎉**
