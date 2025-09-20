# 🤝 Contributing to ToolTip Companion

Thank you for your interest in contributing to ToolTip Companion! This guide will help you get started with contributing to our Chrome extension project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Development Guidelines](#development-guidelines)

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Please report unacceptable behavior to [contact@tooltipcompanion.com](mailto:contact@tooltipcompanion.com).

## 🚀 Getting Started

### Prerequisites
- **Node.js 16+** for screenshot service development
- **Chrome Browser** for extension testing
- **Git** for version control
- **Basic knowledge** of Chrome extension development

### Fork and Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/ToolTipCHROME.git
cd ToolTipCHROME

# Add upstream remote
git remote add upstream https://github.com/mcpmessenger/ToolTipCHROME.git
```

## 🛠️ Development Setup

### 1. Install Dependencies
```bash
# Install screenshot service dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### 2. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the project directory
5. The extension should now appear in your extensions list

### 3. Start Screenshot Service (Optional)
```bash
# Start the local screenshot service
node screenshot-service.js

# Service will be available at http://localhost:3001
```

### 4. Verify Setup
- Extension loads without errors
- Tooltips appear when hovering over elements
- Screenshot service responds to health checks

## 🔧 Making Changes

### Branch Strategy
We use Git Flow with the following branches:
- **main** - Production-ready code
- **develop** - Integration branch for features
- **feature/*** - New features
- **bugfix/*** - Bug fixes
- **hotfix/*** - Critical production fixes

### Creating a Feature Branch
```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create and switch to feature branch
git checkout -b feature/amazing-new-feature

# Make your changes
# ... code changes ...

# Commit your changes
git add .
git commit -m "feat: add amazing new feature"
```

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Examples:
feat(tooltip): add collapse functionality
fix(content): prevent multiple tooltips
docs(readme): update installation guide
style(css): improve glassmorphism effects
refactor(service): optimize screenshot capture
test(content): add unit tests for tooltip
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 📤 Pull Request Process

### 1. Before Submitting
- [ ] **Test your changes** thoroughly
- [ ] **Update documentation** if needed
- [ ] **Follow code style** guidelines
- [ ] **Add tests** for new functionality
- [ ] **Check for console errors** in Chrome DevTools

### 2. Create Pull Request
```bash
# Push your branch
git push origin feature/amazing-new-feature

# Create PR on GitHub with:
# - Clear title and description
# - Reference related issues
# - Include screenshots if UI changes
```

### 3. PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on Chrome
- [ ] Tested on different websites
- [ ] No console errors
- [ ] Screenshots work (if applicable)

## Screenshots
Include screenshots for UI changes

## Related Issues
Closes #123
```

### 4. Review Process
- **Automated checks** must pass
- **Code review** by maintainers
- **Testing** by team members
- **Approval** from at least one maintainer

## 🐛 Issue Guidelines

### Bug Reports
When reporting bugs, please include:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Chrome Version: 
- Extension Version:
- OS:
- Website URL (if specific):

**Screenshots**
Include screenshots if applicable

**Console Errors**
Include any console errors from DevTools
```

### Feature Requests
For new features, please include:

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should it work?

**Alternatives**
Any alternative solutions considered?

**Additional Context**
Any other relevant information
```

## 📝 Development Guidelines

### Code Style
- **ES6+ JavaScript** with modern syntax
- **Consistent naming**: camelCase for variables, PascalCase for classes
- **Clear comments** for complex logic
- **Modular structure** with single responsibility

### Chrome Extension Best Practices
```javascript
// Always check for extension context validity
if (!chrome.runtime?.id) {
  reject(new Error('Extension context invalidated'));
  return;
}

// Handle chrome.runtime.lastError
chrome.runtime.sendMessage(message, (response) => {
  if (chrome.runtime.lastError) {
    reject(new Error(chrome.runtime.lastError.message));
    return;
  }
  resolve(response);
});
```

### CSS Guidelines
```css
/* Use CSS custom properties for theming */
.tooltip-companion-tooltip {
  background: var(--tooltip-bg, rgba(60, 60, 60, 0.95));
  color: var(--tooltip-text, #f0f0f0);
}

/* Include accessibility considerations */
@media (prefers-reduced-motion: reduce) {
  .tooltip-companion-tooltip {
    transition: none;
  }
}
```

### Testing Guidelines
- **Manual testing** on multiple websites
- **Cross-browser testing** (Chrome, Edge, Brave)
- **Performance testing** for memory leaks
- **Accessibility testing** with screen readers

### File Organization
```
ToolTipCHROME/
├── extension/              # Chrome extension files
├── screenshot-service/     # External service
├── docs/                  # Documentation
├── tests/                 # Test files
└── scripts/               # Build and utility scripts
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] **Extension loads** without errors
- [ ] **Tooltips appear** on hover/click
- [ ] **Dragging works** smoothly
- [ ] **Resizing functions** correctly
- [ ] **Screenshots capture** for links
- [ ] **Settings persist** across sessions
- [ ] **Works on different websites**

### Test Websites
Test on various sites to ensure compatibility:
- **Google.com** - Simple, fast loading
- **GitHub.com** - Complex layout, lots of links
- **Reddit.com** - Dynamic content, user-generated
- **News sites** - Text-heavy, multiple links
- **E-commerce** - Product pages, images

### Debug Tools
```javascript
// Console logging
console.log('Debug info:', data);

// Chrome DevTools
// - F12 on any page
// - Check Console for errors
// - Monitor Network requests
// - Inspect extension popup
```

## 📚 Resources

### Documentation
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/migrating/)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Playwright Documentation](https://playwright.dev/)
- [CSS Glassmorphism](https://glassmorphism.com/)

## 🤔 Getting Help

### Community Support
- **GitHub Discussions** for questions and ideas
- **GitHub Issues** for bugs and feature requests
- **Discord/Slack** (if available) for real-time chat

### Code Reviews
- **Be constructive** and specific
- **Test changes** before approving
- **Consider performance** implications
- **Check accessibility** requirements

## 🏆 Recognition

Contributors will be recognized in:
- **README.md** contributor list
- **Release notes** for significant contributions
- **GitHub contributors** page
- **Project documentation** credits

---

**Thank you for contributing to ToolTip Companion! 🚀**

Your contributions help make the web browsing experience more beautiful and informative for users worldwide.
