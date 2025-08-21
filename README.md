# Draftly 2.0 - Professional Email Assistant

A Chrome extension that helps you generate professional email replies using AI assistance.

## Features

- **Smart Email Generation**: Generate professional email replies based on your input
- **Multiple Tone Options**: Choose from Professional, Friendly, Formal, or Casual tones
- **One-Click Copy**: Easily copy generated replies to your clipboard
- **Context Menu Integration**: Right-click on selected text to generate replies
- **Keyboard Shortcuts**: Quick access with Ctrl+Shift+D
- **Email Platform Integration**: Works with Gmail, Outlook, Yahoo Mail, and more
- **User Preferences**: Save your preferred settings
- **Real-time Character Count**: Track your input length
- **Responsive Design**: Beautiful UI that works on all screen sizes

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `Draftly 2.0` folder
5. The extension should now appear in your extensions list

## Usage

### Basic Usage
1. Click the Draftly icon in your Chrome toolbar
2. Enter your email message or prompt in the text area
3. Select your preferred tone (Professional, Friendly, Formal, or Casual)
4. Click "Generate Reply" or press Ctrl+Enter
5. Copy the generated reply and paste it into your email

### Context Menu
1. Select any text on a webpage (like an email you want to reply to)
2. Right-click and select "Generate email reply with Draftly"
3. The extension will process the selected text and generate a reply

### Keyboard Shortcuts
- `Ctrl+Shift+D` - Open Draftly popup
- `Ctrl+Shift+G` - Generate reply for selected text
- `Ctrl+Enter` - Generate reply (when popup is open)
- `Ctrl+C` - Copy reply (when reply is visible)

## Project Structure

```
Draftly 2.0/
├── manifest.json          # Extension manifest
├── popup/
│   ├── popup.html         # Main popup interface
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup functionality
├── background/
│   └── background.js      # Background service worker
├── content/
│   ├── content.js         # Content script for webpage interaction
│   └── content.css        # Content script styles
├── icons/
│   ├── icon16.png         # 16x16 icon
│   ├── icon32.png         # 32x32 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
└── README.md              # This file
```

## Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension manifest version
- **Service Worker**: Background script handles extension lifecycle and API calls
- **Content Scripts**: Interact with web pages to detect email platforms
- **Popup Interface**: Clean, modern UI for user interaction

### Email Platform Support
- Gmail
- Outlook (web)
- Yahoo Mail
- Thunderbird
- Generic email platforms

### Storage
- Uses Chrome's sync storage for user preferences
- Tracks usage analytics locally
- Maintains user settings across devices

## Customization

### Adding New Email Platforms
To add support for new email platforms, modify the `emailSelectors` array in `content/content.js`:

```javascript
this.emailSelectors = [
    // Add your platform-specific selectors here
    '.your-platform-selector',
    // ...existing selectors
];
```

### Modifying Email Templates
Email templates can be customized in the `getEmailTemplates()` method in `popup/popup.js`:

```javascript
getEmailTemplates(tone) {
    const templates = {
        // Customize templates here
        professional: {
            greeting: "Your custom greeting...",
            // ...other template parts
        }
    };
    return templates[tone] || templates.professional;
}
```

### Styling
- Popup styles: `popup/popup.css`
- Content script styles: `content/content.css`
- Both files support dark mode and responsive design

## AI Integration

The extension currently uses placeholder AI functionality. To integrate with real AI services:

1. **OpenAI Integration**: Replace the `generateEmailReply()` function in `popup/popup.js`
2. **API Keys**: Store API keys securely using Chrome's storage API
3. **Rate Limiting**: Implement appropriate rate limiting for API calls
4. **Error Handling**: Add robust error handling for API failures

Example OpenAI integration:
```javascript
async generateEmailReply(input, tone) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `Generate a ${tone} email reply based on the following input:`
                },
                {
                    role: 'user',
                    content: input
                }
            ]
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
}
```

## Development

### Prerequisites
- Chrome browser
- Basic knowledge of HTML, CSS, and JavaScript
- Understanding of Chrome Extension APIs

### Development Setup
1. Make changes to the source files
2. Reload the extension in `chrome://extensions/`
3. Test functionality in the popup and on web pages
4. Use Chrome DevTools for debugging

### Testing
- Test on multiple email platforms
- Verify keyboard shortcuts work
- Check responsive design on different screen sizes
- Test error handling with invalid inputs

## Security Considerations

- **Permissions**: Extension only requests necessary permissions
- **Data Privacy**: No user data is sent to external servers (with placeholder AI)
- **Content Security**: Uses safe DOM manipulation practices
- **Storage Security**: User preferences are stored locally/synced securely

## Performance

- **Lazy Loading**: Content scripts only load when needed
- **Efficient Selectors**: Optimized email platform detection
- **Memory Management**: Proper cleanup of event listeners
- **Bundle Size**: Minimal dependencies for fast loading

## Browser Compatibility

- Chrome 88+
- Chromium-based browsers (Edge, Brave, etc.)
- Manifest V3 support required

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### Version 1.0.0
- Initial release
- Basic email reply generation
- Multiple tone options
- Context menu integration
- Keyboard shortcuts
- Email platform detection
- User preferences storage

## Support

For issues and questions:
1. Check the console for error messages
2. Ensure the extension has necessary permissions
3. Try reloading the extension
4. Submit an issue with detailed information

## Future Enhancements

- Real AI integration
- Custom templates
- Email signature detection
- Multi-language support
- Advanced formatting options
- Team collaboration features
- Analytics dashboard
- Mobile support
