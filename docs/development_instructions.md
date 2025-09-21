# ToolTipCHROME Extension Development Instructions

## Introduction
This document outlines development instructions to address identified issues within the ToolTipCHROME extension and to implement new functionality. The primary goals are to fix the dragging mechanism of the main tooltip panel, improve its placement logic, and integrate Playwright for pre-crawling links and capturing screenshots. These enhancements aim to provide a more robust and interactive user experience, aligning with the capabilities demonstrated on tooltipcompanion.com.

## 1. Fixing the Dragging Functionality

### Problem Description
The current implementation of the tooltip's dragging functionality in `content.js` appears to be limited. Based on the provided code, the dragging logic is attached to the `header` element of the tooltip. This means that only clicking and dragging the header area will move the tooltip. The user explicitly mentioned "only dragging in the box and not dragging issue for the main panel," which confirms this limitation. For a more intuitive user experience, the entire tooltip panel should be draggable, or at least a larger, more prominent area than just the header.

### Root Cause Analysis
Upon reviewing the `addTooltipEventListeners` function in `content.js` (lines 538-590), the `mousedown` event listener responsible for initiating the drag operation is exclusively attached to the `header` element:

```javascript
    header.addEventListener(\'mousedown\', (e) => {
      if (e.target.closest(\'.tooltip-companion-btn\')) return;
      
      isDragging = true;
      tooltip.classList.add(\'dragging\');
      
      dragStart = {
        x: e.clientX,
        y: e.clientY,
        left: parseInt(tooltip.style.left),
        top: parseInt(tooltip.style.top)
      };
      
      e.preventDefault();
    });
```

This design choice restricts the draggable area. Additionally, the `mousemove` and `mouseup` event listeners are attached to `document`, which is correct for handling drag operations that might extend beyond the tooltip's bounds. However, the initial `mousedown` trigger point is the limiting factor.

### Proposed Solution
To enable dragging of the entire tooltip panel, the `mousedown` event listener should be moved from the `header` to the `tooltip` element itself. This will allow users to click and drag anywhere on the tooltip body (excluding interactive elements like buttons or resize handles) to reposition it. 

#### Implementation Steps:

1.  **Modify `addTooltipEventListeners` in `content.js`:**
    *   Change the target of the `mousedown` event listener from `header` to `tooltip`.
    *   Ensure that clicks on control buttons (collapse, close) and resize handles do not trigger dragging. The existing `if (e.target.closest('.tooltip-companion-btn')) return;` check is good for buttons, but we might need to extend it for resize handles if they are part of the main tooltip element.

    **Original Code (excerpt from `content.js` around line 543):**
    ```javascript
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.tooltip-companion-btn')) return;
      // ... rest of drag initiation logic
    });
    ```

    **Revised Code (conceptual):**
    ```javascript
    tooltip.addEventListener('mousedown', (e) => {
      // Prevent dragging if clicking on buttons or resize handles
      if (e.target.closest('.tooltip-companion-btn') || e.target.closest('.tooltip-companion-resize-handle')) {
        return;
      }
      
      isDragging = true;
      tooltip.classList.add('dragging');
      
      dragStart = {
        x: e.clientX,
        y: e.clientY,
        left: parseInt(tooltip.style.left),
        top: parseInt(tooltip.style.top)
      };
      
      e.preventDefault();
    });
    ```

2.  **Update CSS for `cursor` property:**
    *   Ensure the `tooltip-companion-tooltip` class has a `cursor: grab;` style when not dragging, and `cursor: grabbing;` when `isDragging` is true (by adding a class like `dragging`). The `header` element's cursor can remain `default` or `move` as appropriate.

    **Example CSS (in `tooltip-styles.css` or injected styles):**
    ```css
    .tooltip-companion-tooltip {
      cursor: grab;
    }

    .tooltip-companion-tooltip.dragging {
      cursor: grabbing;
    }

    .tooltip-companion-drag-handle {
      /* Keep specific cursor for the handle if desired, or remove if entire tooltip is draggable */
      cursor: move;
    }
    ```

This change will significantly improve the usability of the draggable tooltip by making the entire panel responsive to drag gestures.



## 2. Improving Tooltip Placement in Relation to Links

### Problem Description
The current tooltip placement logic, while attempting to be smart with `auto` positioning, might not always provide the most optimal or visually appealing placement, especially in relation to the interactive elements (links) it describes. The user's request for "better placement in relation to links for tooltips" suggests that the current `calculateTooltipPosition` function could be refined to ensure the tooltip is consistently well-positioned and doesn't obscure the target element or other important content.

### Root Cause Analysis
The `calculateTooltipPosition` function in `content.js` (lines 500-519) determines where the tooltip appears. It calculates an initial position (centered horizontally above the element) and then adjusts for viewport boundaries. If there isn't enough space above, it moves the tooltip below the element. While this is a basic responsive approach, it might not account for all scenarios, such as:

*   **Element proximity:** The fixed `margin = 10` might be too small or too large in certain contexts, leading to overlap or excessive distance.
*   **Tooltip size variations:** The estimated `tooltipHeight = 80` is a static value. Tooltips with more content (e.g., screenshots) will be taller, potentially leading to incorrect initial calculations and subsequent repositioning issues.
*   **Dynamic page layouts:** Pages with complex or dynamic layouts might cause the tooltip to appear in an awkward position even after adjustments.
*   **Multiple interactive elements:** If several interactive elements are close together, the tooltip might interfere with adjacent elements.

**Current `calculateTooltipPosition` function:**

```javascript
  calculateTooltipPosition(elementRect) {
    const tooltipWidth = 280; // initial width
    const tooltipHeight = 80; // estimated height
    const margin = 10;

    let x = elementRect.left + elementRect.width / 2 - tooltipWidth / 2;
    let y = elementRect.top - tooltipHeight - margin;

    // Adjust for viewport boundaries
    if (x < margin) x = margin;
    if (x + tooltipWidth > window.innerWidth - margin) {
      x = window.innerWidth - tooltipWidth - margin;
    }

    if (y < margin) {
      y = elementRect.bottom + margin; // Show below if no space above
    }

    return { x: x + window.scrollX, y: y + window.scrollY };
  }
```

### Proposed Solution
To achieve better placement, the `calculateTooltipPosition` function needs to be more dynamic and consider the actual dimensions of the tooltip content, as well as more sophisticated collision detection. The goal is to prioritize visibility and readability without obscuring the triggering element.

#### Implementation Steps:

1.  **Dynamic Tooltip Dimensions:**
    *   Instead of a fixed `tooltipHeight`, the function should calculate the actual height and width of the tooltip *after* its content has been rendered but *before* it's displayed. This can be done by temporarily appending the tooltip to the DOM (e.g., `visibility: hidden; position: absolute;`) to measure its dimensions, then removing it or resetting its styles.

2.  **Enhanced `auto` Positioning Logic:**
    *   **Prioritize space:** The function should evaluate available space around the `elementRect` (top, bottom, left, right) and choose the position with the most available space.
    *   **Avoid overlap:** Ensure the tooltip does not overlap with the `elementRect` itself.
    *   **Smart margins:** Introduce dynamic margins based on tooltip size and screen dimensions, rather than a fixed `10px`.
    *   **Fallback chain:** Implement a more robust fallback chain (e.g., try top, then bottom, then right, then left, then finally a constrained auto-position if all else fails).

3.  **Refactor `calculateTooltipPosition`:**

    **Revised `calculateTooltipPosition` (conceptual):**
    ```javascript
    calculateTooltipPosition(elementRect, tooltipElement) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Temporarily render tooltip to get actual dimensions
      tooltipElement.style.visibility = 'hidden';
      tooltipElement.style.position = 'absolute';
      tooltipElement.style.left = '0';
      tooltipElement.style.top = '0';
      document.body.appendChild(tooltipElement); // Append to get dimensions
      const tooltipWidth = tooltipElement.offsetWidth;
      const tooltipHeight = tooltipElement.offsetHeight;
      document.body.removeChild(tooltipElement); // Remove after measurement
      tooltipElement.style.visibility = ''; // Reset

      const padding = 15; // Padding from element and viewport edges

      let bestX = 0;
      let bestY = 0;
      let bestScore = -1;

      // Candidate positions: top, bottom, right, left
      const candidates = [
        { // Top
          x: elementRect.left + elementRect.width / 2 - tooltipWidth / 2,
          y: elementRect.top - tooltipHeight - padding,
          score: 0
        },
        { // Bottom
          x: elementRect.left + elementRect.width / 2 - tooltipWidth / 2,
          y: elementRect.bottom + padding,
          score: 0
        },
        { // Right
          x: elementRect.right + padding,
          y: elementRect.top + elementRect.height / 2 - tooltipHeight / 2,
          score: 0
        },
        { // Left
          x: elementRect.left - tooltipWidth - padding,
          y: elementRect.top + elementRect.height / 2 - tooltipHeight / 2,
          score: 0
        }
      ];

      candidates.forEach(pos => {
        // Check if position is within viewport and calculate score based on available space
        const fitsHorizontally = pos.x >= 0 && (pos.x + tooltipWidth) <= viewportWidth;
        const fitsVertically = pos.y >= 0 && (pos.y + tooltipHeight) <= viewportHeight;

        if (fitsHorizontally && fitsVertically) {
          // Score based on distance from element and viewport center
          pos.score = 1; // Basic score for now, can be refined
        }
      });

      // Select best candidate or fallback to a default constrained position
      let chosenPos = candidates.find(pos => pos.score > 0) || candidates[1]; // Default to bottom if no perfect fit

      bestX = chosenPos.x;
      bestY = chosenPos.y;

      // Final viewport boundary adjustments (after choosing best fit)
      bestX = Math.max(padding, Math.min(bestX, viewportWidth - tooltipWidth - padding));
      bestY = Math.max(padding, Math.min(bestY, viewportHeight - tooltipHeight - padding));

      return { x: bestX + scrollX, y: bestY + scrollY };
    }
    ```

4.  **Integration with `showTooltip`:**
    *   The `showTooltip` function will need to pass the `tooltip` element itself to `calculateTooltipPosition` so its actual dimensions can be measured. This will require a slight reordering of operations within `showTooltip` to create the tooltip element and its content before calculating its final position. This is a critical step to ensure accurate placement based on the actual rendered size of the tooltip, especially when it contains dynamic content like screenshots. The current `showTooltip` function creates the tooltip element and then calculates the position based on fixed `tooltipWidth` and `tooltipHeight` values, which is a limitation. The tooltip element should be fully constructed (but hidden) before `calculateTooltipPosition` is called to get accurate dimensions. This will involve creating the `tooltip` element, appending `header` and `content` to it, and then measuring its `offsetWidth` and `offsetHeight`.

By implementing these changes, the tooltip placement will become significantly more intelligent and user-friendly, adapting to content size and available screen real estate.



## 3. Playwright Integration for Link Pre-crawling and Screenshot Storage

### Problem Description
The current extension provides basic link preview functionality, but it relies on a `screenshotService` that is external and not fully integrated with a robust pre-crawling mechanism. The user specifically requested that "the extension uses playwright to precrawl the 1st 20 links on any give page and store screenshot of what happens when each is clicked in the for of a pop up window like our website tooltipcompanion.com." This requires a more sophisticated system for automated browsing, screenshot capture, and data storage.

### Root Cause Analysis
The existing `background.js` contains a `previewLink` function that makes a `fetch` request to an external `screenshotService.url` (e.g., `https://tooltipcompanion.com/api/preview-link`). This implies an existing backend service capable of generating link previews. However, to fulfill the requirement of pre-crawling the *first 20 links* on *any given page* and storing screenshots, this external service needs to be either enhanced significantly or a new, dedicated Playwright-based service needs to be developed and integrated. The current `captureScreenshot` function also points to this external service, suggesting a dependency on it for any screenshot-related tasks.

Directly running Playwright within a Chrome extension's background script is not feasible due to browser security models and the heavy resource requirements of a full browser automation library. Therefore, an external service that communicates with the extension is the appropriate architectural choice.

### Proposed Solution
We will implement a separate Playwright service that the Chrome extension's background script will communicate with. This service will handle the heavy lifting of launching browsers, navigating, pre-crawling links, and capturing screenshots. The screenshots (or their URLs) will then be returned to the extension for display.

#### Architecture Overview

1.  **Chrome Extension (`background.js`):**
    *   Initiates pre-crawling requests to the Playwright service.
    *   Receives pre-crawled data and screenshot URLs from the service.
    *   Stores this data in `chrome.storage.local` for quick retrieval by `content.js`.
    *   Manages the queue of pages to be pre-crawled.

2.  **Playwright Service (External Node.js/Python Application):**
    *   A standalone web service (e.g., a Flask or Express app) that exposes API endpoints.
    *   Uses Playwright to control a browser instance.
    *   Handles requests for pre-crawling a given URL and capturing screenshots of its internal links.
    *   Returns structured data including link metadata and screenshot data (base64 or URL).

#### Implementation Steps:

1.  **Develop the Playwright Service:**

    *   **Setup:** Create a new Node.js or Python project. Install Playwright (`npm install playwright` or `pip install playwright`).
    *   **API Endpoints:** Implement two main API endpoints:
        *   `POST /precrawl`: Takes a `url` as input. This endpoint will be responsible for:
            *   Launching a Playwright browser instance.
            *   Navigating to the provided `url`.
            *   Identifying the first 20 `<a>` (anchor) elements with `href` attributes.
            *   For each identified link:
                *   Navigating to the link's `href` in a new page context.
                *   Waiting for the page to load (configurable wait time).
                *   Capturing a full-page screenshot (`page.screenshot({ fullPage: true })`).
                *   Extracting relevant metadata (e.g., page title, meta description).
                *   Storing the screenshot. It is recommended to upload the screenshot to an external storage (like S3, as the user hosts websites on S3, or a dedicated image hosting service) and return the public URL. Alternatively, for simpler initial implementation, return base64 encoded images, but be mindful of payload size.
                *   Closing the page context.
            *   Returning a JSON object containing an array of pre-crawled link data (original link, target URL, title, description, screenshot URL).
        *   `POST /screenshot`: (Optional, if separate from precrawl) Takes a `url` and `selector` (or coordinates) as input to capture a specific element's screenshot. This might be useful for future enhancements but the `precrawl` endpoint covers the immediate need.
    *   **Error Handling:** Implement robust error handling for network issues, page load failures, and Playwright errors.
    *   **Resource Management:** Ensure browser instances and pages are properly closed after use to prevent memory leaks.
    *   **Deployment:** This service will need to be deployed to a server (e.g., a cloud VM, or a serverless function if suitable for the workload) and exposed via a public URL. The user's preference for Amazon S3 hosting suggests a potential for AWS-based deployment (e.g., EC2, Lambda with Fargate).

2.  **Modify Chrome Extension `background.js`:**

    *   **`precrawlPage` Function:** Create a new asynchronous function, `precrawlPage(pageUrl)`, that:
        *   Makes a `fetch` request to the Playwright service's `/precrawl` endpoint, passing `pageUrl`.
        *   Upon receiving a successful response, stores the returned array of link data (including screenshot URLs) in `chrome.storage.local`.
        *   The storage key should be based on `pageUrl` to easily retrieve data for a specific page.
    *   **Triggering Pre-crawling:** Decide when to trigger `precrawlPage`:
        *   **On `webNavigation.onCompleted`:** When a new page finishes loading, trigger `precrawlPage` for that URL. This ensures fresh data for every visited page.
        *   **Idle Detection:** Optionally, use `chrome.idle` API to trigger pre-crawling when the user is idle on a page, to minimize performance impact during active browsing.
    *   **`previewLink` Enhancement:** Update the existing `previewLink` function to first check `chrome.storage.local` for pre-crawled data related to the requested `linkData.url`. If found, return the stored screenshot URL and metadata. If not found (or if the data is stale), then fall back to the existing `screenshotService` call or trigger an on-demand capture via the Playwright service.

3.  **Modify Chrome Extension `content.js`:**

    *   **Requesting Pre-crawled Data:** When `handleLinkClick` (or `handleElementEnter` for hover) is triggered for an `<a>` element, modify it to send a message to `background.js` requesting the pre-crawled data for that specific link.
    *   **Displaying Screenshots:** If `background.js` returns a screenshot URL, update the `showTooltip` function to display this image within the tooltip. The existing `data.screenshot` logic is already in place, so it will mostly involve ensuring the correct URL is passed.

#### Example Playwright Service (Node.js - conceptual)

```javascript
// playwright-service/server.js
const express = require(\'express\');
const { chromium } = require(\'playwright\');
const bodyParser = require(\'body-parser\');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post(\'/precrawl\', async (req, res) => {
  const { url, waitTime = 3000 } = req.body;
  if (!url) {
    return res.status(400).json({ error: \'URL is required\' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: \'domcontentloaded\' });

    const links = await page.$$eval(\'a[href]\', (elements) =>
      elements.slice(0, 20).map((el) => ({
        href: el.href,
        text: el.textContent.trim(),
      }))
    );

    const results = [];
    for (const link of links) {
      try {
        const linkPage = await browser.newPage();
        await linkPage.goto(link.href, { waitUntil: \'load\', timeout: waitTime });
        const screenshotBuffer = await linkPage.screenshot({ fullPage: true });
        const title = await linkPage.title();
        const description = await linkPage.$eval(\'meta[name="description"]\', (meta) => meta.content).catch(() => \'\');
        
        // TODO: Upload screenshotBuffer to S3 and get a public URL
        // For now, returning base64 (not recommended for large scale)
        const screenshotBase64 = screenshotBuffer.toString(\'base64\');

        results.push({
          originalLink: link.href,
          targetUrl: link.href,
          title,
          description,
          screenshot: `data:image/png;base64,${screenshotBase64}`,
        });
        await linkPage.close();
      } catch (linkError) {
        console.error(`Error processing link ${link.href}:`, linkError);
        results.push({
          originalLink: link.href,
          targetUrl: link.href,
          error: linkError.message,
        });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error(\'Playwright service error:\', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Playwright service listening on port ${PORT}`);
});
```

#### Example `background.js` modifications (conceptual)

```javascript
// background.js
// ... existing code ...

  async precrawlPage(pageUrl) {
    const settings = await this.getSettings();
    if (!settings.screenshotService.enabled) return;

    try {
      const response = await fetch(`${settings.screenshotService.url}/precrawl`, {
        method: \'POST\',
        headers: { \'Content-Type\': \'application/json\' },
        body: JSON.stringify({ url: pageUrl, waitTime: settings.screenshotService.waitTime }),
      });

      if (!response.ok) {
        throw new Error(`Pre-crawl service error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        // Store pre-crawled data in local storage, keyed by the pageUrl
        await chrome.storage.local.set({ [`precrawled_links_${pageUrl}`]: result.data });
        console.log(`Pre-crawled data stored for ${pageUrl}`);
      }
    } catch (error) {
      console.error(\'Pre-crawling failed:\', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    // ... existing switch cases ...

    case \'previewLink\':
      // Check local storage first for pre-crawled data
      const pageUrl = sender.tab.url; // URL of the tab where the link was found
      const storedData = await chrome.storage.local.get(`precrawled_links_${pageUrl}`);
      const precrawledLinks = storedData[`precrawled_links_${pageUrl}`] || [];

      const matchingLink = precrawledLinks.find(link => link.originalLink === request.data.url);

      if (matchingLink && matchingLink.screenshot) {
        sendResponse({ success: true, data: matchingLink });
      } else {
        // Fallback to existing external screenshot service if not pre-crawled
        const preview = await this.previewLinkExternal(request.data); // Rename existing previewLink to previewLinkExternal
        sendResponse({ success: true, data: preview });
      }
      break;

    // ... existing switch cases ...
  }

  // Add listener for web navigation completion to trigger pre-crawling
  chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0) { // Only process main frame navigation
      this.precrawlPage(details.url);
    }
  });

// ... existing code ...
```

This comprehensive approach ensures that the extension can efficiently pre-crawl links and provide rich screenshot previews, significantly enhancing the user experience as requested.

