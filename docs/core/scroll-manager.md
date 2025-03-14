# scrollManager

## Overview

The `scrollManager` is a utility module that provides functional wrappers for handling scroll-related operations in the browser. It offers methods for getting scroll position, scrolling to specific positions or elements, checking visibility, and managing scroll event listeners in a functional and declarative way.

## API Reference

### `getScrollPosition()`

Returns the current scroll position of the window.

**Returns:**
- An object with `x` and `y` properties representing the horizontal and vertical scroll positions.

**Example:**
```javascript
import { scrollManager } from '@efthemiosprime/polyx';

const { x, y } = scrollManager.getScrollPosition();
console.log(`Current scroll position: ${x}px horizontally, ${y}px vertically`);
```

### `scrollTo(options)`

Scrolls the window to a specific position.

**Parameters:**
- `options`: An object that can include:
  - `x` (optional): The horizontal position to scroll to (in pixels)
  - `y` (optional): The vertical position to scroll to (in pixels)
  - `behavior` (optional): The scroll behavior ('auto', 'smooth', etc.)

**Example:**
```javascript
import { scrollManager } from '@efthemiosprime/polyx';

// Scroll to position with smooth animation
scrollManager.scrollTo({
  y: 500,
  behavior: 'smooth'
});

// Instantly jump to a position
scrollManager.scrollTo({
  x: 100,
  y: 200
});
```

### `scrollToElement(element, offset = 0)`

Scrolls the window to bring the specified element into view.

**Parameters:**
- `element`: The DOM element to scroll to
- `offset` (optional): Additional offset from the top of the element (in pixels), defaults to 0

**Example:**
```javascript
import { scrollManager } from '@efthemiosprime/polyx';

// Scroll to an element
const headingElement = document.getElementById('section-heading');
scrollManager.scrollToElement(headingElement);

// Scroll to an element with offset
const menuElement = document.querySelector('.menu');
scrollManager.scrollToElement(menuElement, 20); // 20px offset from the top
```

### `isInViewport(element, offset = 0)`

Checks if an element is currently visible in the viewport.

**Parameters:**
- `element`: The DOM element to check
- `offset` (optional): Additional offset to consider (in pixels), defaults to 0

**Returns:**
- `true` if the element is in the viewport, `false` otherwise

**Example:**
```javascript
import { scrollManager } from '@efthemiosprime/polyx';

const element = document.querySelector('.lazy-load-image');
if (scrollManager.isInViewport(element)) {
  loadImage(element);
}
```

### `onScroll(callback)`

Registers a callback function to be called when the window is scrolled.

**Parameters:**
- `callback`: A function that will receive the scroll event

**Returns:**
- A cleanup function that, when called, will remove the scroll event listener

**Example:**
```javascript
import { scrollManager } from '@efthemiosprime/polyx';

// Add scroll handler
const cleanup = scrollManager.onScroll(event => {
  const { y } = scrollManager.getScrollPosition();
  if (y > 200) {
    showBackToTopButton();
  } else {
    hideBackToTopButton();
  }
});

// Later, to remove the scroll handler
cleanup();
```

## Real-World Examples

### Example 1: Lazy Loading Images

```javascript
import { scrollManager, Maybe } from '@efthemiosprime/polyx';

// Function to load images when they come into view
function setupLazyLoading() {
  // Get all images with data-src attribute
  const lazyImages = Array.from(document.querySelectorAll('img[data-src]'));
  
  // Function to check and load visible images
  const loadVisibleImages = () => {
    lazyImages.forEach(img => {
      if (scrollManager.isInViewport(img, 100)) {
        // Get the data-src attribute
        const dataSrc = img.getAttribute('data-src');
        
        // Use Maybe to handle potential null values
        Maybe.fromNullable(dataSrc)
          .filter(src => src.length > 0)
          .map(src => {
            img.src = src;
            img.removeAttribute('data-src');
            // Remove from our array
            const index = lazyImages.indexOf(img);
            if (index > -1) lazyImages.splice(index, 1);
          });
      }
    });
    
    // If all images are loaded, remove the scroll handler
    if (lazyImages.length === 0) {
      cleanup();
    }
  };
  
  // Initial check for images in the viewport on page load
  loadVisibleImages();
  
  // Set up scroll handler
  const cleanup = scrollManager.onScroll(() => {
    loadVisibleImages();
  });
  
  return cleanup;
}

// Usage
const cleanupLazyLoading = setupLazyLoading();

// When navigating away or component unmounting
function cleanupPage() {
  cleanupLazyLoading();
}
```

### Example 2: Parallax Scrolling Effect

```javascript
import { scrollManager, when } from '@efthemiosprime/polyx';

// Create a parallax scrolling effect
function setupParallax(selector, speedFactor = 0.5) {
  const elements = Array.from(document.querySelectorAll(selector));
  
  // Apply parallax effect based on scroll position
  const applyParallax = () => {
    const { y } = scrollManager.getScrollPosition();
    
    elements.forEach(element => {
      // Only apply the effect if the element is in or near the viewport
      const isNearViewport = when(
        el => {
          const rect = el.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          return rect.top < windowHeight + 500 && rect.bottom > -500;
        },
        el => {
          // Calculate parallax offset
          const elementTop = el.getBoundingClientRect().top + y;
          const offset = Math.round((y - elementTop) * speedFactor);
          
          // Apply transform
          el.style.transform = `translateY(${offset}px)`;
          return el;
        }
      );
      
      // Apply the transformation if the element is near the viewport
      isNearViewport(element);
    });
  };
  
  // Initial application
  applyParallax();
  
  // Set up scroll handler
  return scrollManager.onScroll(() => {
    window.requestAnimationFrame(applyParallax);
  });
}

// Usage
const cleanupParallax = setupParallax('.parallax-bg', 0.3);

// Cleanup when done
function cleanup() {
  cleanupParallax();
}
```

### Example 3: Scroll-Triggered Animations

```javascript
import { scrollManager, compose, when } from '@efthemiosprime/polyx';

// Function to set up scroll-triggered animations
function setupScrollAnimations(selector, animationClass, offset = 100) {
  const elements = Array.from(document.querySelectorAll(selector));
  
  // Function to check and animate elements
  const animateElements = () => {
    elements.forEach(element => {
      // Process only elements that haven't been animated yet
      const needsAnimation = !element.classList.contains(animationClass);
      
      // Check if element is in viewport and add animation class if needed
      const addAnimationIfVisible = compose(
        () => element,
        when(
          () => scrollManager.isInViewport(element, offset) && needsAnimation,
          () => element.classList.add(animationClass)
        )
      );
      
      addAnimationIfVisible();
    });
  };
  
  // Check for elements on initial load
  animateElements();
  
  // Set up scroll handler
  return scrollManager.onScroll(() => {
    window.requestAnimationFrame(animateElements);
  });
}

// Usage
const cleanupFadeIn = setupScrollAnimations('.fade-in', 'visible');
const cleanupSlideIn = setupScrollAnimations('.slide-in', 'active', 50);

// Cleanup on page unload or component unmount
function cleanup() {
  cleanupFadeIn();
  cleanupSlideIn();
}
```

### Example 4: Scroll Position-Based Navigation Highlighting

```javascript
import { scrollManager, Maybe } from '@efthemiosprime/polyx';

// Function to highlight navigation based on current scroll position
function setupScrollSpy(navSelector = '.nav-link', sectionSelector = 'section', activeClass = 'active', offset = 100) {
  const navLinks = Array.from(document.querySelectorAll(navSelector));
  const sections = Array.from(document.querySelectorAll(sectionSelector));
  
  // Function to update active navigation link
  const updateActiveNav = () => {
    const { y } = scrollManager.getScrollPosition();
    
    // Find the current section
    let currentSection = null;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionTop = section.offsetTop - offset;
      const sectionBottom = sectionTop + section.offsetHeight;
      
      if (y >= sectionTop && y < sectionBottom) {
        currentSection = section;
        break;
      }
    }
    
    // Use Maybe to handle the case where no section is in view
    Maybe.fromNullable(currentSection)
      .map(section => {
        const id = section.id;
        
        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove(activeClass));
        
        // Add active class to the corresponding nav link
        const activeLink = navLinks.find(link => {
          const href = link.getAttribute('href');
          return href === `#${id}`;
        });
        
        Maybe.fromNullable(activeLink)
          .map(link => link.classList.add(activeClass));
      });
  };
  
  // Initial update
  updateActiveNav();
  
  // Set up scroll handler
  return scrollManager.onScroll(() => {
    window.requestAnimationFrame(updateActiveNav);
  });
}

// Usage
const cleanupScrollSpy = setupScrollSpy();

// Cleanup
function cleanup() {
  cleanupScrollSpy();
}
```

## Integration with Other PolyX Modules

scrollManager integrates well with other PolyX modules to create more powerful and declarative scroll-based functionality:

```javascript
import { scrollManager, Maybe, compose, when } from '@efthemiosprime/polyx';

// Scroll position-based UI updates with functional composition
function setupHeaderTransformation() {
  const header = document.querySelector('header');
  
  const isScrolled = () => scrollManager.getScrollPosition().y > 50;
  
  const updateHeaderStyle = compose(
    when(isScrolled, () => {
      header.classList.add('scrolled');
      header.classList.remove('top');
    }),
    when(() => !isScrolled(), () => {
      header.classList.remove('scrolled');
      header.classList.add('top');
    })
  );
  
  // Initial update
  updateHeaderStyle();
  
  // Set up scroll handler with Maybe for null safety
  return Maybe.fromNullable(header)
    .map(el => scrollManager.onScroll(() => updateHeaderStyle()))
    .getOrElse(() => () => {}); // Return no-op cleanup if header doesn't exist
}

// Usage
const cleanup = setupHeaderTransformation();
```

## Performance Considerations

When working with scroll-based functionality, performance is a critical consideration. Here are some best practices when using scrollManager:

1. **Use requestAnimationFrame**: For smooth animations, wrap update functions in `requestAnimationFrame` as shown in the examples.

2. **Debounce or throttle**: For expensive operations, consider debouncing or throttling scroll handlers:

```javascript
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}

const efficientHandler = debounce(() => {
  // Expensive operation here
  analyzeScrollPosition();
}, 100);

scrollManager.onScroll(efficientHandler);
```

3. **Check element visibility efficiently**: When checking multiple elements, batch operations and minimize DOM operations.

4. **Clean up event listeners**: Always use the returned cleanup function to remove scroll listeners when they're no longer needed to prevent memory leaks.