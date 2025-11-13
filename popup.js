const actions = {
  'like': 'Like Video',
  'dislike': 'Dislike Video'
};

let currentHotkeys = {
  ',': 'like',
  '.': 'dislike'
};

let currentCustomShortcuts = {};

let currentSettings = {
  debugMode: false,
  showWatchInfoInTopRow: true
};

function createHotkeyItem(key, action) {
  const item = document.createElement('div');
  item.className = 'hotkey-item';
  
  item.innerHTML = `
    <input type="text" class="key-input" value="${key}" maxlength="1">
    <select class="action-select">
      ${Object.entries(actions).map(([value, label]) => 
        `<option value="${value}" ${value === action ? 'selected' : ''}>${label}</option>`
      ).join('')}
    </select>
    <button class="remove-button">×</button>
  `;
  
  // Add change listeners for auto-save
  item.querySelector('.key-input').addEventListener('input', autoSave);
  item.querySelector('.action-select').addEventListener('change', autoSave);
  
  item.querySelector('.remove-button').addEventListener('click', () => {
    item.remove();
    autoSave();
  });
  
  return item;
}

function loadHotkeys() {
  chrome.storage.sync.get(['hotkeys', 'settings', 'customShortcuts'], function(result) {
    if (result.hotkeys) {
      currentHotkeys = result.hotkeys;
    }
    if (result.customShortcuts) {
      currentCustomShortcuts = result.customShortcuts;
    }
    if (result.settings) {
      currentSettings = { ...currentSettings, ...result.settings };
    }
    renderHotkeys();
    renderCustomShortcuts();
    renderSettings();
  });
}

function renderSettings() {
  const debugMode = document.getElementById('debugMode');
  const showWatchInfo = document.getElementById('showWatchInfoInTopRow');
  
  debugMode.checked = currentSettings.debugMode;
  showWatchInfo.checked = currentSettings.showWatchInfoInTopRow;
  
  // Add change listeners for auto-save (remove old listeners first to avoid duplicates)
  debugMode.removeEventListener('change', autoSave);
  showWatchInfo.removeEventListener('change', autoSave);
  debugMode.addEventListener('change', autoSave);
  showWatchInfo.addEventListener('change', autoSave);
}

function renderHotkeys() {
  const container = document.getElementById('hotkeys-container');
  container.innerHTML = '';
  
  Object.entries(currentHotkeys).forEach(([key, action]) => {
    container.appendChild(createHotkeyItem(key, action));
  });
}

function saveHotkeys() {
  const container = document.getElementById('hotkeys-container');
  const items = container.querySelectorAll('.hotkey-item');
  const newHotkeys = {};
  
  items.forEach(item => {
    const key = item.querySelector('.key-input').value.toLowerCase();
    const action = item.querySelector('.action-select').value;
    if (key && action) {
      newHotkeys[key] = action;
    }
  });
  
  // Get custom shortcuts
  const customContainer = document.getElementById('custom-shortcuts-container');
  const customItems = customContainer.querySelectorAll('.custom-shortcut-item');
  const newCustomShortcuts = {};
  
  customItems.forEach(item => {
    const key = item.querySelector('.key-input').value.toLowerCase();
    const shortcutId = item.dataset.shortcutId;
    const oldShortcut = currentCustomShortcuts[shortcutId];
    
    if (key && oldShortcut) {
      // Store shortcut by its ID
      newCustomShortcuts[shortcutId] = oldShortcut;
      // Map the key to this shortcut ID in hotkeys
      newHotkeys[key] = shortcutId;
    }
  });
  
  // Get settings from checkboxes
  const newSettings = {
    debugMode: document.getElementById('debugMode').checked,
    showWatchInfoInTopRow: document.getElementById('showWatchInfoInTopRow').checked
  };
  
  // Show saving status
  showSaveStatus('saving');
  
  chrome.storage.sync.set({ 
    hotkeys: newHotkeys,
    customShortcuts: newCustomShortcuts,
    settings: newSettings
  }, function() {
    currentHotkeys = newHotkeys;
    currentCustomShortcuts = newCustomShortcuts;
    currentSettings = newSettings;
    
    // Show saved status
    showSaveStatus('saved');
  });
}

// Show save status indicator
function showSaveStatus(status) {
  const statusEl = document.getElementById('save-status');
  statusEl.className = 'save-status';
  statusEl.textContent = status === 'saving' ? 'Saving...' : 'Saved';
  
  if (status === 'saving') {
    statusEl.classList.add('saving');
  } else {
    statusEl.classList.add('saved');
    // Fade out after 2 seconds
    setTimeout(() => {
      statusEl.classList.remove('saved');
    }, 2000);
  }
}

// Auto-save with debouncing
let saveTimeout;
function autoSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveHotkeys();
  }, 500); // Wait 500ms after last change before saving
}

document.getElementById('add-hotkey').addEventListener('click', () => {
  const container = document.getElementById('hotkeys-container');
  container.appendChild(createHotkeyItem('', 'like'));
});

document.getElementById('save-hotkeys').addEventListener('click', () => {
  saveHotkeys();
  window.close();
});

// Custom shortcuts functions
function createCustomShortcutItem(shortcutId, shortcut, mappedKey) {
  const item = document.createElement('div');
  item.className = 'custom-shortcut-item';
  item.dataset.shortcutId = shortcutId;
  
  item.innerHTML = `
    <div class="custom-shortcut-top">
      <input type="text" class="key-input" value="${mappedKey || ''}" maxlength="1" placeholder="Key">
      <div class="custom-shortcut-label">${shortcut.label || 'Custom Element'}</div>
      <button class="remove-button">×</button>
    </div>
    <input type="text" class="custom-shortcut-selector" value="${shortcut.selector}" placeholder="CSS Selector">
  `;
  
  // Add change listeners for auto-save
  item.querySelector('.key-input').addEventListener('input', autoSave);
  item.querySelector('.custom-shortcut-selector').addEventListener('input', () => {
    // Update the selector in the shortcut object
    const newSelector = item.querySelector('.custom-shortcut-selector').value;
    if (currentCustomShortcuts[shortcutId]) {
      currentCustomShortcuts[shortcutId].selector = newSelector;
    }
    autoSave();
  });
  
  item.querySelector('.remove-button').addEventListener('click', () => {
    item.remove();
    autoSave();
  });
  
  return item;
}

function renderCustomShortcuts() {
  const container = document.getElementById('custom-shortcuts-container');
  container.innerHTML = '';
  
  // Find which keys map to which shortcuts
  const shortcutKeyMap = {};
  for (const [key, action] of Object.entries(currentHotkeys)) {
    if (currentCustomShortcuts[action]) {
      shortcutKeyMap[action] = key;
    }
  }
  
  Object.entries(currentCustomShortcuts).forEach(([shortcutId, shortcut]) => {
    const mappedKey = shortcutKeyMap[shortcutId] || '';
    container.appendChild(createCustomShortcutItem(shortcutId, shortcut, mappedKey));
  });
}

document.getElementById('add-custom-shortcut').addEventListener('click', async () => {
  const button = document.getElementById('add-custom-shortcut');
  button.disabled = true;
  button.textContent = 'Click on an element...';
  
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Set a flag in storage so we know we're picking
  await chrome.storage.local.set({ pickingElement: true });
  
  // Send message to content script to start picker
  chrome.tabs.sendMessage(tab.id, { action: 'startPicker' });
  
  // Close the popup to get it out of the way
  window.close();
});

// Load existing hotkeys when popup opens
loadHotkeys();

// Check if we're returning from element picker
chrome.storage.local.get(['pickingElement', 'pickedElement'], async (result) => {
  if (result.pickingElement && result.pickedElement) {
    // We just picked an element
    const { selector, label } = result.pickedElement;
    
    // Clear the flags
    chrome.storage.local.remove(['pickingElement', 'pickedElement']);
    
    // Prompt for key
    const key = prompt('Enter a key for this shortcut:', '');
    if (key && key.length === 1) {
      const shortcutId = `custom_${Date.now()}`;
      currentCustomShortcuts[key.toLowerCase()] = {
        selector,
        label,
        id: shortcutId
      };
      renderCustomShortcuts();
      autoSave();
    }
  } else if (result.pickingElement) {
    // Picker was cancelled, just clear the flag
    chrome.storage.local.remove('pickingElement');
  }
});
