# YUTES - YouTube Usability & Theater Enhancement Suite

A browser extension that enhances your YouTube experience with custom hotkeys, theater mode improvements, and usability features.

## Features

### 🎯 Custom Hotkeys
- Configure custom keyboard shortcuts for common YouTube actions
- Built-in support for like/dislike buttons
- Default hotkeys:
  - `,` (comma) - Like video
  - `.` (period) - Dislike video
- Add unlimited custom hotkeys for any action

### 🎭 Theater Mode Enhancements
- Display video information (views, upload date, etc.) in the top row while in theater mode
- Better visibility of video metadata without scrolling
- Automatically syncs with YouTube's native theater mode

### 🔧 Custom Element Shortcuts
- Create keyboard shortcuts for any element on the YouTube page
- Use CSS selectors to target specific buttons or controls
- Perfect for accessing frequently used features quickly

### 🐛 Debug Mode
- Enable console logging for troubleshooting
- Monitor extension behavior and interactions
- Helpful for development and reporting issues

## Installation

### Chrome / Edge / Brave

1. Download or clone this repository
2. Open your browser's extension management page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
3. Enable "Developer mode" using the toggle in the top right corner
4. Click "Load unpacked" and select the YUTES folder
5. The extension icon should appear in your browser toolbar

### Firefox

1. Download or clone this repository
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in the YUTES folder (e.g., `manifest.json`)
5. The extension will be loaded temporarily

## Usage

### Configuring Hotkeys

1. Click the YUTES extension icon in your browser toolbar
2. In the "Custom Hotkeys" section:
   - View existing hotkeys
   - Click "Add Hotkey" to create a new shortcut
   - Enter a single character for the key
   - Select the action from the dropdown
   - Remove hotkeys with the × button
3. Changes are automatically saved

### Theater Mode Enhancement

1. Click the YUTES extension icon
2. In the "Features" section:
   - Check "Show video info in top row (theater mode)" to enable
   - Uncheck to disable this feature
3. Navigate to any YouTube video and enable theater mode
4. Video information will appear in the top row for better visibility

### Custom Element Shortcuts

1. Click the YUTES extension icon
2. In the "Custom Element Shortcuts" section:
   - Click "Pick Element" to add a new shortcut
   - Enter a keyboard shortcut (e.g., "s" for subscribe)
   - Provide a CSS selector for the target element
   - Remove shortcuts with the × button
3. Your custom shortcuts will work on any YouTube page

### Debug Mode

1. Click the YUTES extension icon
2. Check "Enable debug logging (console)"
3. Open your browser's developer console (F12)
4. Look for `[YUTES]` prefixed messages to monitor extension behavior

## Configuration

The extension stores your settings using Chrome's sync storage, which means:
- Settings are automatically saved when you make changes
- Settings sync across devices where you're signed in with the same browser account
- No manual save or export is required

### Default Settings

```javascript
{
  "hotkeys": {
    ",": "like",
    ".": "dislike"
  },
  "customShortcuts": {},
  "settings": {
    "debugMode": false,
    "showWatchInfoInTopRow": true
  }
}
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: storage, activeTab
- **Platforms**: YouTube (`*://www.youtube.com/*`)
- **Content Script**: Runs at document_end for optimal performance

## Troubleshooting

### Hotkeys not working
- Make sure you're not focused on an input field or text area
- Check that your hotkey doesn't conflict with YouTube's native shortcuts
- Enable debug mode to see console messages

### Theater mode info not showing
- Ensure the feature is enabled in the extension popup
- Refresh the YouTube page after enabling
- Check that you're in theater mode (press 't' on YouTube)

### Custom element shortcuts not working
- Verify your CSS selector is correct
- Use browser DevTools to test selectors
- Enable debug mode to troubleshoot

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Privacy

YUTES:
- Does not collect any personal data
- Does not track your browsing history
- Only accesses YouTube pages when you visit them
- All settings are stored locally in your browser

## License

This project is open source. Feel free to use, modify, and distribute it.

## Support

If you encounter any issues or have suggestions:
1. Enable debug mode in the extension settings
2. Check the browser console for error messages
3. Open an issue on GitHub with details about the problem

---

Made with ❤️ for YouTube power users
