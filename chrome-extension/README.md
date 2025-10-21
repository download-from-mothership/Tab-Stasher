# Tab Stasher Chrome Extension

A Chrome extension that allows users to save tabs to their Tab Stasher collection for processing and organization.

## Features

- **One-click tab saving**: Save the current tab with a single click
- **Automatic content extraction**: Extracts page title, description, images, and content
- **Mini-toast notifications**: Shows success/error notifications on the page
- **Authentication integration**: Seamlessly integrates with Tab Stasher authentication
- **Clean UI**: Modern, responsive popup interface

## Installation

1. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `chrome-extension` folder

2. **Set up authentication**:
   - Click the extension icon in your browser toolbar
   - Click "Log In" to authenticate with Tab Stasher
   - Complete the login process in the opened tab

3. **Start saving tabs**:
   - Navigate to any webpage you want to save
   - Click the Tab Stasher extension icon
   - Click "Save This Tab" to add it to your collection

## File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # Content script for page interaction
├── content.css           # Styles for content script
├── popup.html           # Extension popup UI
├── popup.js             # Popup functionality
└── icons/               # Extension icons
    ├── icon.svg         # Source SVG icon
    ├── icon16.png       # 16x16 icon (create from SVG)
    ├── icon32.png       # 32x32 icon (create from SVG)
    ├── icon48.png       # 48x48 icon (create from SVG)
    └── icon128.png      # 128x128 icon (create from SVG)
```

## Creating Icons

The extension requires PNG icons in multiple sizes. You can create these from the provided `icon.svg`:

1. **Using an online converter**:
   - Upload `icons/icon.svg` to an SVG to PNG converter
   - Generate icons in sizes: 16x16, 32x32, 48x48, and 128x128 pixels
   - Save them as `icon16.png`, `icon32.png`, `icon48.png`, and `icon128.png`

2. **Using design software**:
   - Open `icons/icon.svg` in Figma, Sketch, or Adobe Illustrator
   - Export as PNG in the required sizes

3. **Using command line tools** (if you have ImageMagick):
   ```bash
   cd chrome-extension/icons
   convert icon.svg -resize 16x16 icon16.png
   convert icon.svg -resize 32x32 icon32.png
   convert icon.svg -resize 48x48 icon48.png
   convert icon.svg -resize 128x128 icon128.png
   ```

## Configuration

### API Endpoint

Update the `apiBaseUrl` in both `background.js` and `popup.js` to match your Tab Stasher deployment:

```javascript
this.apiBaseUrl = 'https://tab-stasher.tab-stasher.workers.dev'; // Current Cloudflare Workers URL
```

### Authentication

The extension uses Supabase's cookie-based authentication system. The authentication flow:

1. User clicks "Log In" in the popup
2. Opens Tab Stasher login page in a new tab
3. After successful login, the extension detects the redirect to `/dashboard`
4. Extension automatically refreshes authentication state
5. User can now save tabs using the extension

The extension checks authentication by making a request to `/api/instagram-mapping` endpoint, which requires valid Supabase authentication cookies.

## Development

### Testing the Extension

1. **Load the extension**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `chrome-extension` folder

2. **Test functionality**:
   - Open any webpage
   - Click the extension icon
   - Try saving a tab (you may need to set up authentication first)

3. **Debug**:
   - Right-click the extension icon → "Inspect popup" to debug popup
   - Go to `chrome://extensions/` → Click "service worker" to debug background script
   - Use browser dev tools to debug content scripts

### Making Changes

- **Background script**: Changes require reloading the extension
- **Content script**: Changes require reloading the extension and refreshing pages
- **Popup**: Changes are visible immediately when reopening the popup

## API Integration

The extension integrates with the Tab Stasher API endpoint `/api/tabs` which expects:

```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "description": "Page description",
  "image": "https://example.com/image.jpg",
  "favicon": "https://example.com/favicon.ico",
  "content": "Page content text...",
  "tags": [],
  "primaryCategory": "uncategorized",
  "secondaryCategory": "general",
  "confidence": 0.5
}
```

## Permissions

The extension requires these permissions:

- `activeTab`: Access to the current tab's URL and content
- `storage`: Store authentication tokens and user preferences
- `notifications`: Show system notifications for save status
- `host_permissions`: Access to all websites for content extraction

## Troubleshooting

### Common Issues

1. **"User not authenticated" error**:
   - Make sure you're logged into Tab Stasher
   - Try logging out and back in
   - Check that the API endpoint URL is correct

2. **"Failed to save tab" error**:
   - Check your internet connection
   - Verify the API endpoint is accessible
   - Check browser console for detailed error messages

3. **Icons not showing**:
   - Make sure all PNG icon files exist in the `icons/` folder
   - Reload the extension after adding icons

4. **Content not extracted**:
   - Some pages may block content extraction
   - The extension will still save basic tab information (URL, title)

### Debug Mode

Enable debug logging by opening the browser console and looking for Tab Stasher messages.

## Future Enhancements

- **Batch saving**: Save multiple tabs at once
- **Custom tags**: Add custom tags before saving
- **Categories**: Choose categories before saving
- **Sync settings**: Sync preferences across devices
- **Keyboard shortcuts**: Add keyboard shortcuts for quick saving
