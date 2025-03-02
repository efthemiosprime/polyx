# PolyX Installation Guide

This guide will walk you through the process of installing and setting up PolyX in your JavaScript project.

## Prerequisites

Before installing PolyX, make sure you have:

- Node.js (version 12.0.0 or higher)
- npm (usually comes with Node.js) or yarn

## Installation Methods

### Using npm

The recommended way to install PolyX is through npm:

```bash
npm install polyx
```

### Using yarn

If you prefer yarn, you can install PolyX with:

```bash
yarn add polyx
```

### Direct Download

Alternatively, you can download the library directly from the GitHub repository:

1. Go to [https://github.com/efthemiosprime/polyx](https://github.com/efthemiosprime/polyx)
2. Click on the "Code" button and select "Download ZIP"
3. Extract the ZIP file
4. Include the library in your project

## Usage

### ES Modules

```javascript
// Import specific modules
import { Maybe } from 'polyx';

// Create a Maybe instance
const maybeValue = Maybe.of(5);
```

### CommonJS

```javascript
// Import the entire library
const polyx = require('polyx');

// Use a specific module
const Maybe = polyx.Maybe;

// Create a Maybe instance
const maybeValue = Maybe.of(5);
```

### Browser

If you're using PolyX directly in the browser:

```html
<script src="path/to/polyx/dist/polyx.min.js"></script>
<script>
  // PolyX is available as a global variable
  const maybeValue = PolyX.Maybe.of(5);
</script>
```

## Verifying Installation

To verify that PolyX has been installed correctly, you can run a simple test:

```javascript
import { Maybe } from 'polyx';

const result = Maybe.of(5)
  .map(x => x * 2)
  .getOrElse(0);

console.log(result); // Should output: 10
```

## Next Steps

Now that you have PolyX installed, check out the following resources:

- [Quick Start Guide](/docs/quick-start.md) - Learn the basics of using PolyX
- [Core Concepts](/docs/core-concepts.md) - Understand the fundamental ideas behind functional programming
- [Maybe Monad](/docs/core/maybe.md) - Start with one of the most useful patterns

## Troubleshooting

If you encounter any issues during installation, try the following:

1. Make sure your Node.js and npm/yarn versions are up to date
2. Clear your npm/yarn cache and try reinstalling:
   ```bash
   npm cache clean --force
   npm install polyx
   ```
3. Check for any error messages in your console and verify that your project's package.json has been updated with the dependency
4. If you're still having trouble, please [open an issue](https://github.com/efthemiosprime/polyx/issues) on GitHub
