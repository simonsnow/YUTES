let hotkeys = {
  ',': 'like',
  '.': 'dislike'
};

// Custom element shortcuts (user-defined selectors)
let customShortcuts = {};

// Extension settings
let settings = {
  debugMode: false,
  showWatchInfoInTopRow: true
};

// Constant selectors for subscriber count (used in multiple places)
const SUBSCRIBER_SELECTORS = [
  '#owner-sub-count',
  'ytd-video-owner-renderer #owner #subscriber-count',
  '#subscriber-count',
  'yt-formatted-string#owner-sub-count'
];

// Debug logging function
function debugLog(...args) {
  if (settings.debugMode) {
    console.log('[YUTES]', ...args);
  }
}

// Extract and filter info text to only include views and date posted
function extractViewsAndDate(infoEl) {
  const textNodes = [];
  
  // Walk through all child nodes and collect text that's NOT in an anchor tag
  const walker = document.createTreeWalker(infoEl, NodeFilter.SHOW_TEXT, null);
  let node;
  // Assigns each text node to `node` and loops until `walker.nextNode()` returns null.
  while ((node = walker.nextNode()) !== null) {
    // Check if this text node is inside an anchor tag
    let parent = node.parentElement;
    let isInLink = false;
    while (parent && parent !== infoEl) {
      if (parent.tagName === 'A') {
        isInLink = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!isInLink && node.textContent.trim()) {
      textNodes.push(node.textContent.trim());
    }
  }
  
  // Join all non-link text and filter to only views and date
  const allText = textNodes.join(' ').replace(/\s+/g, ' ').trim();
  
  // Extract only the parts we want: views and date
  const parts = allText.split(/\s{2,}|[\n\t]/); // Split by multiple spaces, newlines, or tabs
  const filtered = [];
  
  for (const part of parts) {
    const trimmed = part.trim();
    // Include if it contains "view" (views/view count) or looks like a date
    if (trimmed && (
      /\d+[,\s]*views?/i.test(trimmed) || // Contains number followed by "view" or "views"
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(trimmed) || // Month name
      /\d+\s*(hours?|days?|weeks?|months?|years?)(\s+ago)?\b/i.test(trimmed) || // Relative date
      /\b([1-9]|[12][0-9]|3[01]),\s*\d{4}\b/.test(trimmed) // Date format like "Nov 21, 2025"
    )) {
      filtered.push(trimmed);
    }
  }
  
  return filtered.join(' ');
}

// Utility function to wait for an element to exist in the DOM
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Check if element already exists
    const element = document.querySelector(selector);
    if (element) {
      debugLog(`Element ${selector} already exists`);
      resolve(element);
      return;
    }
    
    debugLog(`Waiting for element: ${selector}`);
    
    // Set up MutationObserver first
    const observer = new MutationObserver((mutations, obs) => {
      // Only check if nodes were added
      for (const mutation of mutations) {
        if (mutation.addedNodes.length === 0) continue;
        
        // Check if any added node or its descendants match the selector
        for (const node of mutation.addedNodes) {
          // Skip non-element nodes (text nodes, comments, etc.)
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          
          // Check if the node itself matches
          if (node.matches(selector)) {
            clearTimeout(timeoutId);
            obs.disconnect();
            debugLog(`Found element: ${selector}`);
            resolve(node);
            return;
          }
          
          // Check descendants
          const element = node.querySelector(selector);
          if (element) {
            clearTimeout(timeoutId);
            obs.disconnect();
            debugLog(`Found element: ${selector}`);
            resolve(element);
            return;
          }
        }
      }
    });
    
    // Set up timeout (after observer is declared)
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      debugLog(`Timeout waiting for element: ${selector}`);
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

// Utility function to wait for multiple elements (tries each selector until one works)
async function waitForAnyElement(selectors, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Check if any element already exists
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        debugLog(`Element ${selector} already exists`);
        resolve({ element, selector });
        return;
      }
    }
    
    debugLog(`Waiting for any of: ${selectors.join(', ')}`);
    
    // Set up MutationObserver first
    const observer = new MutationObserver((mutations, obs) => {
      // Only check if nodes were added
      for (const mutation of mutations) {
        if (mutation.addedNodes.length === 0) continue;
        
        // Check each added node against all selectors
        for (const node of mutation.addedNodes) {
          // Skip non-element nodes
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          
          for (const selector of selectors) {
            // Check if the node itself matches
            if (node.matches(selector)) {
              clearTimeout(timeoutId);
              obs.disconnect();
              debugLog(`Found element: ${selector}`);
              resolve({ element: node, selector });
              return;
            }
            
            // Check descendants
            const element = node.querySelector(selector);
            if (element) {
              clearTimeout(timeoutId);
              obs.disconnect();
              debugLog(`Found element: ${selector}`);
              resolve({ element, selector });
              return;
            }
          }
        }
      }
    });
    
    // Set up timeout (after observer is declared)
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      debugLog(`Timeout waiting for any of: ${selectors.join(', ')}`);
      reject(new Error(`Timeout waiting for any of: ${selectors.join(', ')}`));
    }, timeout);
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

// Load saved hotkeys and settings from storage
chrome.storage.sync.get(['hotkeys', 'settings', 'customShortcuts'], function(result) {
  if (result.hotkeys) {
    hotkeys = result.hotkeys;
    debugLog('Loaded hotkeys:', hotkeys);
  }
  if (result.customShortcuts) {
    customShortcuts = result.customShortcuts;
    debugLog('Loaded custom shortcuts:', customShortcuts);
  }
  if (result.settings) {
    settings = { ...settings, ...result.settings };
    debugLog('Loaded settings:', settings);
  }
  // Initialize watch info feature if enabled
  if (settings.showWatchInfoInTopRow) {
    debugLog('Scheduling initial watch info setup...');
    // Use async initialization
    initializeWatchInfo();
  }
});

// Async initialization function
async function initializeWatchInfo() {
  try {
    await moveWatchInfoToTopRow();
  } catch (error) {
    debugLog('Error in initial watch info setup:', error);
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (changes.hotkeys) {
    hotkeys = changes.hotkeys.newValue;
    debugLog('Hotkeys updated:', hotkeys);
  }
  if (changes.customShortcuts) {
    customShortcuts = changes.customShortcuts.newValue;
    debugLog('Custom shortcuts updated:', customShortcuts);
  }
  if (changes.settings) {
    settings = { ...settings, ...changes.settings.newValue };
    debugLog('Settings updated:', settings);
    
    // Handle watch info toggle
    if (changes.settings.newValue.showWatchInfoInTopRow === false) {
      removeClonedWatchInfo();
    } else if (changes.settings.newValue.showWatchInfoInTopRow === true) {
      // Use async call
      initializeWatchInfo();
    }
  }
});

function findButton(action) {
  const selectors = {
    like: 'button[aria-label*="like"], button[title*="like"], #top-level-buttons-computed ytd-toggle-button-renderer:first-child button',
    dislike: 'button[aria-label*="Dislike"], button[title*="dislike"], #top-level-buttons-computed ytd-toggle-button-renderer:nth-child(2) button'
  };
  
  // Check if it's a built-in action
  const selector = selectors[action];
  if (selector) {
    return document.querySelector(selector);
  }
  
  // Check if it's a custom shortcut
  if (customShortcuts[action]) {
    return document.querySelector(customShortcuts[action].selector);
  }
  
  return null;
}

function handleKeyPress(event) {
  // Only trigger if not typing in an input field
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
    return;
  }
  
  const action = hotkeys[event.key.toLowerCase()];
  if (!action) return;
  
  debugLog('Key pressed:', event.key, 'Action:', action);
  
  const button = findButton(action);
  debugLog('Button found:', !!button, button);
  
  if (button) {
    try {
      button.click();
      event.preventDefault();
      event.stopPropagation(); // Prevent the event from bubbling to other handlers
      debugLog('Button clicked successfully');
    } catch (e) {
      debugLog('Error clicking button:', e);
    }
  } else {
    debugLog('No button found for action:', action);
  }
}

// Add event listener with capture phase to handle before YouTube's handlers
document.addEventListener('keydown', handleKeyPress, true);

// Function to remove cloned watch info
function removeClonedWatchInfo() {
  const clonedElement = document.querySelector('#cloned-watch-info');
  if (clonedElement) {
    clonedElement.remove();
    debugLog('Removed cloned watch info');
  }
  
  // Reset CSS changes
  const ownerContainer = document.querySelector('#top-row #owner');
  const videoOwnerRenderer = ownerContainer?.querySelector('ytd-video-owner-renderer');
  const subscribeButton = document.querySelector('#top-row #subscribe-button');
  
  if (ownerContainer) {
    ownerContainer.style.display = '';
    ownerContainer.style.alignItems = '';
    ownerContainer.style.gap = '';
  }
  
  if (videoOwnerRenderer) {
    videoOwnerRenderer.style.display = '';
    videoOwnerRenderer.style.alignItems = '';
    videoOwnerRenderer.style.gap = '';
    videoOwnerRenderer.style.flexWrap = '';
    
    // Reset margin on buttons inside ytd-video-owner-renderer
    const buttons = videoOwnerRenderer.querySelectorAll('#sponsor-button, #purchase-button, #analytics-button');
    buttons.forEach(button => {
      button.style.marginLeft = '';
    });
  }
  
  if (subscribeButton) {
    subscribeButton.style.marginLeft = '';
  }
  
  // Clean up observers
  if (viewCountObserver) {
    viewCountObserver.disconnect();
    viewCountObserver = null;
  }
  if (infoContainerObserver) {
    infoContainerObserver.disconnect();
    infoContainerObserver = null;
  }
}

// Function to move watch info to top row for better visibility in theatre mode
async function moveWatchInfoToTopRow() {
  // Check if feature is enabled
  if (!settings.showWatchInfoInTopRow) {
    debugLog('Watch info feature is disabled, skipping');
    return;
  }
  
  debugLog('Attempting to move watch info to top row...');
  
  // Check if we haven't already added it
  const alreadyExists = document.querySelector('#cloned-watch-info');
  if (alreadyExists) {
    debugLog('Already exists');
    return;
  }
  
  let subscriberCount;
  let infoEl;
  
  try {
    // Wait for the subscriber count element (trying multiple selectors)
    debugLog('Waiting for subscriber count element...');
    const result = await waitForAnyElement(SUBSCRIBER_SELECTORS, 10000);
    subscriberCount = result.element;
    debugLog('Found subscriber count with selector:', result.selector);
    
    // Wait for the info element
    debugLog('Waiting for info element...');
    infoEl = await waitForElement('ytd-watch-info-text #info', 10000);
    
    debugLog('All required elements found, proceeding with move...');
  } catch (error) {
    debugLog('Error waiting for elements:', error.message);
    return;
  }
  
  // Get text content but ONLY views and date posted
  // Exclude links (hashtags, "Members first", "Products", etc.)
  // Exclude all other unwanted text
  const infoText = extractViewsAndDate(infoEl);
  
  debugLog('Filtered info text (no links):', infoText);
  
  // Check if we have actual content (should contain "view" or a date pattern)
  if (!infoText || infoText.length < 5) {
    debugLog('No info text content yet, will retry...');
    return;
  }
  
  // Create the cloned info container
  const clonedInfo = document.createElement('div');
  clonedInfo.id = 'cloned-watch-info';
  clonedInfo.style.cssText = `
    display: inline-flex;
    align-items: flex-end;
    margin-left: 12px;
    font-size: 14px;
    font-weight: 400;
    line-height: 2rem;
    color: var(--yt-spec-text-secondary);
  `;
  
  clonedInfo.textContent = infoText;
  
  // Store reference to update later
  clonedInfo.dataset.lastInfoText = infoText;
  
  // Insert after the #upload-info parent div, not inside it
  // This puts it at the same level as the channel info
  const uploadInfo = subscriberCount.closest('#upload-info');
  if (uploadInfo && uploadInfo.parentElement) {
    uploadInfo.parentElement.insertAdjacentElement('beforeend', clonedInfo);
    debugLog('Inserted watch info after upload-info div');
  } else {
    // Fallback: just insert after subscriber count
    subscriberCount.insertAdjacentElement('afterend', clonedInfo);
    debugLog('Inserted watch info after subscriber count (fallback)');
  }
  
  // Ensure subscribe button and other buttons are right-justified
  // Find the #owner container, ytd-video-owner-renderer, and #subscribe-button
  const ownerContainer = document.querySelector('#top-row #owner');
  const videoOwnerRenderer = ownerContainer?.querySelector('ytd-video-owner-renderer');
  const subscribeButton = document.querySelector('#top-row #subscribe-button');
  
  if (ownerContainer) {
    // Make sure the owner container uses flex layout with proper spacing
    ownerContainer.style.display = 'flex';
    ownerContainer.style.alignItems = 'center';
    ownerContainer.style.gap = '12px';
  }
  
  if (videoOwnerRenderer) {
    // Make the video owner renderer use flex layout too
    videoOwnerRenderer.style.display = 'flex';
    videoOwnerRenderer.style.alignItems = 'center';
    videoOwnerRenderer.style.gap = '12px';
    videoOwnerRenderer.style.flexWrap = 'wrap';
    
    // Find buttons inside ytd-video-owner-renderer and push them to the right
    // Look for sponsor button, purchase button, or analytics button
    const sponsorButton = videoOwnerRenderer.querySelector('#sponsor-button:not([hidden])');
    const purchaseButton = videoOwnerRenderer.querySelector('#purchase-button:not([hidden])');
    const analyticsButton = videoOwnerRenderer.querySelector('#analytics-button:not([hidden])');
    
    // Push the first visible button to the right with margin-left: auto
    const firstButton = sponsorButton || purchaseButton || analyticsButton;
    if (firstButton) {
      firstButton.style.marginLeft = 'auto';
    }
  }
  
  if (subscribeButton) {
    // Push the subscribe button to the right (or keep it right if buttons above are already pushed)
    // Only apply margin-left: auto if there are no buttons inside ytd-video-owner-renderer
    const videoOwnerButtons = videoOwnerRenderer?.querySelectorAll('#sponsor-button:not([hidden]), #purchase-button:not([hidden]), #analytics-button:not([hidden])');
    if (!videoOwnerButtons || videoOwnerButtons.length === 0) {
      subscribeButton.style.marginLeft = 'auto';
    }
  }
  
  // Set up watcher for view count changes
  setupViewCountWatcher();
  
  debugLog('Successfully cloned watch info to top row:', infoText);
}

// Animate number change with rolling effect
function animateNumberChange(element, oldText, newText) {
  // Add animation class
  element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
  element.style.transform = 'translateY(-5px)';
  element.style.opacity = '0.5';
  
  setTimeout(() => {
    element.textContent = newText;
    element.style.transform = 'translateY(0)';
    element.style.opacity = '1';
  }, 150);
  
  setTimeout(() => {
    element.style.transition = '';
  }, 300);
}

// Watch for view count changes
let viewCountObserver = null;
let infoContainerObserver = null;

function setupViewCountWatcher() {
  // Clean up existing observers
  if (viewCountObserver) {
    viewCountObserver.disconnect();
  }
  if (infoContainerObserver) {
    infoContainerObserver.disconnect();
  }
  
  const infoEl = document.querySelector('ytd-watch-info-text #info');
  const infoContainer = document.querySelector('ytd-watch-info-text #info-container');
  const clonedInfo = document.querySelector('#cloned-watch-info');
  
  if (!infoEl || !clonedInfo) {
    debugLog('Cannot setup watcher - missing elements');
    return;
  }
  
  debugLog('Setting up view count watcher on #info and #info-container');
  
  const updateInfoText = () => {
    const lastInfoText = clonedInfo.dataset.lastInfoText || '';
    
    // Apply the same filtering as initial load
    const newInfoText = extractViewsAndDate(infoEl);
    
    debugLog('Checking for changes - Last:', lastInfoText, '| New:', newInfoText);
    
    if (newInfoText && newInfoText !== lastInfoText && newInfoText.length > 5) {
      debugLog('View count changed! Animating...');
      animateNumberChange(clonedInfo, lastInfoText, newInfoText);
      clonedInfo.dataset.lastInfoText = newInfoText;
    }
  };
  
  // Watch for changes to the info element
  viewCountObserver = new MutationObserver((mutations) => {
    debugLog('MutationObserver triggered on #info');
    updateInfoText();
  });
  
  // Observe the info element and its children
  viewCountObserver.observe(infoEl, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: false
  });
  
  // Also observe the container in case the entire structure changes
  if (infoContainer) {
    infoContainerObserver = new MutationObserver((mutations) => {
      debugLog('MutationObserver triggered on #info-container');
      updateInfoText();
    });
    
    infoContainerObserver.observe(infoContainer, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    });
  }
}

// Re-initialize when navigating between YouTube pages
let lastUrl = location.href;

// Navigation observer - watches for URL changes
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    
    // YouTube uses AJAX navigation, so we need to re-initialize
    debugLog('Navigation detected, initializing watch info...');
    // Remove old cloned info before reinitializing
    removeClonedWatchInfo();
    // Use async initialization
    if (settings.showWatchInfoInTopRow) {
      initializeWatchInfo();
    }
  }
}).observe(document, { subtree: true, childList: true });

// Element Picker functionality
let pickerActive = false;
let pickerOverlay = null;
let pickerHighlight = null;
let pickerCallback = null;

function generateSelector(element) {
  // Generate a unique CSS selector for the element
  
  // Try to find the nearest clickable element (button, a, etc.)
  let target = element;
  
  // Walk up to find clickable parent if we're on a child element
  while (target && target !== document.body) {
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'button' || tagName === 'a' || target.hasAttribute('role') && target.getAttribute('role') === 'button') {
      break;
    }
    if (target.parentElement && target.parentElement.tagName.toLowerCase() === 'button') {
      target = target.parentElement;
      break;
    }
    target = target.parentElement;
  }
  
  if (!target) target = element;
  
  // Try ID first
  if (target.id) {
    return `#${target.id}`;
  }
  
  // Try unique attributes
  const uniqueAttrs = ['aria-label', 'title', 'data-testid', 'data-id'];
  for (const attr of uniqueAttrs) {
    const value = target.getAttribute(attr);
    if (value) {
      const selector = `${target.tagName.toLowerCase()}[${attr}="${value}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }
  
  // Build path with classes, but limit complexity
  let current = target;
  let path = [];
  let depth = 0;
  
  while (current && current !== document.body && depth < 3) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/)
        .filter(c => c && !c.startsWith('yt-simple-endpoint') && !c.includes('touch-feedback'))
        .slice(0, 1); // Only take first meaningful class
      
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
    depth++;
  }
  
  return path.join(' > ');
}

function startElementPicker(callback) {
  if (pickerActive) return;
  
  pickerActive = true;
  pickerCallback = callback;
  
  // Create overlay
  pickerOverlay = document.createElement('div');
  pickerOverlay.id = 'yutes-picker-overlay';
  pickerOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999999;
    cursor: crosshair;
    pointer-events: none;
  `;
  
  // Create highlight box
  pickerHighlight = document.createElement('div');
  pickerHighlight.id = 'yutes-picker-highlight';
  pickerHighlight.style.cssText = `
    position: absolute;
    border: 2px solid #3ea6ff;
    background: rgba(62, 166, 255, 0.1);
    pointer-events: none;
    z-index: 1000000;
    display: none;
  `;
  
  // Create instruction tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'yutes-picker-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #0f0f0f;
    color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  `;
  tooltip.textContent = 'Click on an element to select it, or press ESC to cancel';
  
  document.body.appendChild(pickerOverlay);
  document.body.appendChild(pickerHighlight);
  document.body.appendChild(tooltip);
  
  // Mouse move handler - attach to document since overlay has pointer-events: none
  const handleMouseMove = (e) => {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target === pickerHighlight || target === tooltip) {
      pickerHighlight.style.display = 'none';
      return;
    }
    
    const rect = target.getBoundingClientRect();
    pickerHighlight.style.display = 'block';
    pickerHighlight.style.left = rect.left + 'px';
    pickerHighlight.style.top = rect.top + 'px';
    pickerHighlight.style.width = rect.width + 'px';
    pickerHighlight.style.height = rect.height + 'px';
  };
  
  // Click handler - attach to document
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target === pickerHighlight || target === tooltip) {
      return;
    }
    
    const selector = generateSelector(target);
    const label = target.textContent?.trim().substring(0, 50) || target.getAttribute('aria-label') || target.getAttribute('title') || 'Custom Element';
    
    stopElementPicker();
    
    // Store the result and reopen popup
    chrome.storage.local.set({ 
      pickedElement: { selector, label }
    }, () => {
      // Reopen the popup
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });
    
    if (pickerCallback) {
      pickerCallback({ selector, label });
    }
  };
  
  // Escape key handler
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      stopElementPicker();
      
      // Reopen the popup after cancelling
      chrome.runtime.sendMessage({ action: 'openPopup' });
    }
  };
  
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleEscape, true);
  
  // Store handlers for cleanup
  pickerOverlay._handlers = { handleMouseMove, handleClick, handleEscape };
}

function stopElementPicker() {
  if (!pickerActive) return;
  
  pickerActive = false;
  pickerCallback = null;
  
  if (pickerOverlay && pickerOverlay._handlers) {
    document.removeEventListener('mousemove', pickerOverlay._handlers.handleMouseMove, true);
    document.removeEventListener('click', pickerOverlay._handlers.handleClick, true);
    document.removeEventListener('keydown', pickerOverlay._handlers.handleEscape, true);
  }
  
  document.getElementById('yutes-picker-overlay')?.remove();
  document.getElementById('yutes-picker-highlight')?.remove();
  document.getElementById('yutes-picker-tooltip')?.remove();
  
  pickerOverlay = null;
  pickerHighlight = null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startPicker') {
    startElementPicker((result) => {
      chrome.runtime.sendMessage({ action: 'pickerResult', result });
    });
    sendResponse({ success: true });
  } else if (message.action === 'stopPicker') {
    stopElementPicker();
    sendResponse({ success: true });
  }
  return true;
});
