# ☕ TiddlyWiki Coffee Tracker

A comprehensive TiddlyWiki plugin for tracking your coffee journey - from roasters and beans to brewing techniques and tasting notes.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TiddlyWiki](https://img.shields.io/badge/TiddlyWiki-%3E%3D5.1.22-red)

## Features

### Dashboard Overview

- Real-time statistics: total brews, active bags, coffee types, and average ratings
- Quick access to active coffee bags with freshness indicators
- Recent brew log activity feed
- One-click navigation to browse all data

### Comprehensive Tracking

- **Roasters**: Track your favorite coffee roasters with location and notes
- **Coffee Types**: Document coffee details including origin, varietal, processing method, roast level, and tasting notes
- **Coffee Bags**: Manage individual bag purchases with roast dates, purchase dates, and freshness tracking
- **Equipment**: Catalog your brewing equipment (brewers, grinders, scales, kettles)
- **Brew Logs**: Record detailed brewing sessions with parameters, ratings, and notes

### Freshness Tracking

Automatic freshness indicators based on roast date:

- **Peak** (7-21 days): Optimal flavor development
- **Optimal** (21-60 days): Prime drinking window
- **Aging** (60+ days): Still usable but past peak
- Visual badges and status messages

## Installation

### Option 1. Manual

If you already have TiddlyWiki setupped, follow these steps:

1. Download the latest plugin from the [Releases](https://github.com/mblackman/tiddlywiki-coffee-tracker/releases) page
2. Drag and drop the plugin file into your TiddlyWiki
3. Save and reload your wiki

### Option 2. Create TiddlyHost From Template

If you want a new notebook that's hosted online (it's free), follow these steps:

1. Create an account with [TiddlyHost](https://tiddlyhost.com/) if you don't already have one.
2. Create a [clone](https://tiddlyhost.com/sites/new?clone=coffee-tracker) of the template.
3. Enjoy!

## Development

### Prerequisites

- Node.js >= 20
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/mblackman/tiddlywiki-coffee-tracker.git
cd tiddlywiki-coffee-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run dev:lan` - Start development server accessible on LAN
- `npm run build` - Build the plugin for distribution
- `npm run publish` - Publish the plugin
- `npm run lint` - Lint the code
- `npm run lint:fix` - Lint and fix issues
- `npm test` - Run tests
- `npm run clean` - Clean build artifacts

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Test your changes thoroughly
- Update documentation as needed
- Add example data if introducing new features

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [TiddlyWiki](https://tiddlywiki.com/)
- Developed using [Modern.TiddlyDev](https://tiddly-gittly.github.io/Modern.TiddlyDev/)
- Inspired by the coffee community's passion for the perfect cup

---

**Happy Brewing! ☕**
