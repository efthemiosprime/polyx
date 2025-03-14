# isInView

## Overview

The `isInView` function is a utility that checks whether a DOM element is currently visible within the browser's viewport. This is particularly useful for implementing features like lazy loading, triggering animations, or any functionality that should occur when an element becomes visible to the user.

## API Reference

### `isInView(element, offset = 0)`

Determines if a DOM element is currently visible in the viewport.

**Parameters:**
- `element`: The DOM element to check
- `offset` (optional): Additional offset in pixels. This extends the detection area beyond the viewport boundaries, allowing elements to be considered "in view" before they're fully visible. Defaults to 0.

**Returns:**
- `true` if the element is in the viewport (considering any offset)
- `false` if the element is not in the viewport

**Example:**
```javascript
import { isInView } from '@efthemiosprime/polyx';

// Check if an element is in view
const element = document.querySelector('.my-element');
if (isInView(element)) {
  console.log('Element is visible!');
}

// Check with a 100px offset (element will be considered "in view" 
// when it's within 100px of entering the viewport)
if (isInView(element, 100)) {
  console.log('Element is approaching the viewport!');
}
```

## Implementation Details

The function works by:
1. Calculating the element's bounding rectangle relative to the viewport using `getBoundingClientRect()`
2. Comparing these coordinates with the viewport dimensions (considering any offset)
3. Returning true if any part of the element is within the adjusted viewport area

## Real-World Examples

### Example 1: Lazy Loading Images

```javascript
import { isInView } from '@efthemiosprime/polyx';

function setupLazyLoading() {
  // Get all images with data-src attribute
  const lazyImages = Array.from(document.querySelectorAll('img[data-src]'));
  
  // Function to check and load visible images
  const loadVisibleImages = () => {
    lazyImages.forEach((img, index) => {
      if (isInView(img, 200)) { // 200px offset - load images before they're fully visible
        // Get the data-src attribute
        const originalSrc = img.getAttribute('data-src');
        
        if (originalSrc) {
          // Set the src to trigger loading
          img.src = originalSrc;
          
          // Remove the data-src attribute to prevent loading again
          img.removeAttribute('data-src');
          
          // Remove from our array once loaded
          lazyImages.splice(index, 1);
        }
      }
    });
  };
  
  // Initial check - load images that are visible on page load
  loadVisibleImages();
  
  // Check on scroll
  window.addEventListener('scroll', () => {
    requestAnimationFrame(loadVisibleImages);
  });
  
  // Also check on resize and orientation change
  window.addEventListener('resize', loadVisibleImages);
  window.addEventListener('orientationchange', loadVisibleImages);
}

// Initialize lazy loading
document.addEventListener('DOMContentLoaded', setupLazyLoading);
```

### Example 2: Triggering Animations on Scroll

```javascript
import { isInView, when } from '@efthemiosprime/polyx';

function setupScrollAnimations() {
  // Get all elements that should animate on scroll
  const animateElements = document.querySelectorAll('.animate-on-scroll');
  
  // Function to check elements and trigger animations
  const checkElementsInView = () => {
    animateElements.forEach(element => {
      // Only process elements that haven't been animated yet
      if (!element.classList.contains('animated')) {
        // Using the `when` utility from PolyX
        when(
          () => isInView(element, 50),
          () => {
            element.classList.add('animated');
            // Get animation type from data attribute
            const animationType = element.dataset.animation || 'fade-in';
            element.classList.add(animationType);
          }
        )();
      }
    });
  };
  
  // Initial check
  checkElementsInView();
  
  // Check on scroll
  window.addEventListener('scroll', () => {
    requestAnimationFrame(checkElementsInView);
  });
}

// Initialize scroll animations
document.addEventListener('DOMContentLoaded', setupScrollAnimations);
```

### Example 3: Infinite Scroll Implementation

```javascript
import { isInView, compose } from '@efthemiosprime/polyx';

function setupInfiniteScroll({
  containerSelector = '.content-container',
  loadingIndicatorSelector = '.loading-indicator',
  loadMoreThreshold = 200,
  loadMore = () => {}
}) {
  const container = document.querySelector(containerSelector);
  const loadingIndicator = document.querySelector(loadingIndicatorSelector);
  
  let isLoading = false;
  
  // Function to check if we should load more content
  const checkShouldLoadMore = () => {
    if (isLoading) return; // Prevent multiple simultaneous requests
    
    if (isInView(loadingIndicator, loadMoreThreshold)) {
      isLoading = true;
      
      // Show loading state
      loadingIndicator.classList.add('visible');
      
      // Load more content
      Promise.resolve(loadMore())
        .then(() => {
          // Reset loading state
          isLoading = false;
          loadingIndicator.classList.remove('visible');
          
          // After new content is loaded, check again in case 
          // the page still isn't full
          checkShouldLoadMore();
        })
        .catch(error => {
          console.error('Error loading more content:', error);
          isLoading = false;
          loadingIndicator.classList.remove('visible');
        });
    }
  };
  
  // Composing our scroll handler with throttling
  const throttle = (fn, delay) => {
    let lastCall = 0;
    return function(...args) {
      const now = new Date().getTime();
      if (now - lastCall < delay) return;
      lastCall = now;
      return fn(...args);
    };
  };
  
  const handleScroll = compose(
    throttle(checkShouldLoadMore, 200),
    () => {
      // If we're near the bottom, check if we should load more
      if (isInView(loadingIndicator, loadMoreThreshold)) {
        checkShouldLoadMore();
      }
    }
  );
  
  // Initial check
  checkShouldLoadMore();
  
  // Add scroll listener
  window.addEventListener('scroll', handleScroll);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

// Usage
const cleanup = setupInfiniteScroll({
  loadMore: async () => {
    // Fetch new content
    const response = await fetch('/api/content?page=' + currentPage);
    const newItems = await response.json();
    
    // Append new content to DOM
    appendContentToDOM(newItems);
    
    // Update page counter
    currentPage++;
    
    return newItems;
  }
});
```

### Example 4: Implementing a Reading Progress Indicator

```javascript
import { isInView } from '@efthemiosprime/polyx';

function setupReadingProgressIndicator() {
  // Get the article element
  const article = document.querySelector('article');
  
  // Create or get a progress bar element
  let progressBar = document.querySelector('.reading-progress');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.classList.add('reading-progress');
    document.body.appendChild(progressBar);
  }
  
  // Get all sections or paragraphs to track
  const sections = Array.from(article.querySelectorAll('p, h2, h3, figure'));
  let totalSections = sections.length;
  let visibleSections = 0;
  
  // Function to update progress
  const updateProgress = () => {
    // Count visible sections
    visibleSections = sections.filter(section => isInView(section)).length;
    
    // Calculate progress percentage
    const progressPercent = Math.min(
      100, 
      Math.round((visibleSections / totalSections) * 100)
    );
    
    // Update progress bar style
    progressBar.style.width = `${progressPercent}%`;
    
    // Optional: Update a text indicator
    const progressText = document.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = `${progressPercent}%`;
    }
  };
  
  // Initial update
  updateProgress();
  
  // Update on scroll
  window.addEventListener('scroll', () => {
    requestAnimationFrame(updateProgress);
  });
  
  // Update on resize (in case layout changes)
  window.addEventListener('resize', updateProgress);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('scroll', updateProgress);
    window.removeEventListener('resize', updateProgress);
  };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const cleanup = setupReadingProgressIndicator();
  
  // Store cleanup for later use
  window.cleanupReadingIndicator = cleanup;
});
```

## Integration with Other PolyX Modules

The `isInView` function works well with other PolyX modules to create more powerful viewport-detection functionality:

### Using with Maybe

```javascript
import { isInView, Maybe } from '@efthemiosprime/polyx';

// Safe version that handles null elements
function safeIsInView(elementOrSelector, offset = 0) {
  if (typeof elementOrSelector === 'string') {
    return Maybe.fromNullable(document.querySelector(elementOrSelector))
      .map(element => isInView(element, offset))
      .getOrElse(false);
  }
  
  return Maybe.fromNullable(elementOrSelector)
    .map(element => isInView(element, offset))
    .getOrElse(false);
}

// Usage
if (safeIsInView('#may-not-exist')) {
  console.log('Element is visible!');
}
```

### Using with ScrollManager

```javascript
import { isInView, ScrollManager } from '@efthemiosprime/polyx';

function setupScrollWatcher(selector, callback) {
  const elements = document.querySelectorAll(selector);
  
  const checkElements = () => {
    elements.forEach(element => {
      const inView = isInView(element);
      const wasInView = element.dataset.wasInView === 'true';
      
      // Detect when element enters viewport
      if (inView && !wasInView) {
        element.dataset.wasInView = 'true';
        callback(element, 'enter');
      } 
      // Detect when element exits viewport
      else if (!inView && wasInView) {
        element.dataset.wasInView = 'false';
        callback(element, 'exit');
      }
    });
  };
  
  // Initial check
  checkElements();
  
  // Set up scroll handler
  return ScrollManager.onScroll(() => {
    requestAnimationFrame(checkElements);
  });
}

// Usage
const cleanup = setupScrollWatcher('.watch-element', (element, action) => {
  if (action === 'enter') {
    console.log('Element entered viewport:', element);
    element.classList.add('active');
  } else {
    console.log('Element exited viewport:', element);
    element.classList.remove('active');
  }
});
```

## Performance Considerations

For optimal performance when using `isInView`:

1. **Throttle scroll events**: Checking element visibility can be expensive, especially with many elements. Use `requestAnimationFrame` or throttling to limit checks.

2. **Optimize for repeated calls**: If checking the same elements frequently, consider caching results or using a technique like "once-visible-always-visible" for certain use cases.

3. **Use appropriate offsets**: Larger offsets can trigger visibility checks earlier but might cause unnecessary work if elements are far from the viewport.

4. **Batch DOM operations**: When processing multiple elements, batch any resulting DOM changes to minimize layout thrashing.

5. **Use a sentinel element**: For infinite scroll or similar features, consider checking a single sentinel element rather than many content elements.