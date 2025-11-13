// Background service worker for YUTES extension

// Listen for messages to open the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    // Open the popup by opening the action (extension icon)
    chrome.action.openPopup().catch((error) => {
      // If openPopup fails (e.g., user interaction required), 
      // we can't force open the popup programmatically
      console.log('Could not open popup:', error);
    });
    sendResponse({ success: true });
  }
  return true;
});
