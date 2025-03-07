import { Maybe } from "../core";

/**
 * Determines if an element is in the viewport with optional alignment
 * 
 * @param {HTMLElement} element - DOM element to check
 * @param {string} [align='bottom'] - Alignment option: 'top', 'center', or 'bottom'
 * @param {Object} [options] - Additional options
 * @param {Function} [options.isMobile] - Function to determine if viewport is mobile
 * @param {number} [options.mobileOffset=60] - Header offset for mobile devices
 * @param {number} [options.desktopOffset=100] - Header offset for desktop devices
 * @returns {boolean} Whether the element is in view
 */
export const isInView = (element, align = 'center', options = {}) => {
  const defaults = {
    isMobile: () => false,
    mobileOffset: 0,
    desktopOffset: 0
  };
  
  const config = { ...defaults, ...options };
  
  // Create pure functions for each calculation step
  const getElementBoundary = elem => 
    Maybe.of(elem)
      .map(el => el.getBoundingClientRect())
      .getOrElse(null);
  
  const isMobile = () => 
    Maybe.of(config.isMobile)
      .map(fn => fn())
      .getOrElse(false);
  
  const getHeaderOffset = () =>
    isMobile() ? config.mobileOffset : config.desktopOffset;
  
  const calculateInView = (boundary) => {
    const headerOffset = getHeaderOffset();
    const clientHeight = Maybe.of(window)
      .map(w => w.innerHeight)
      .getOrElse(document.documentElement.clientHeight);
    
    // Different checks based on alignment
    if (align === 'top') {
      // Element is in view when its top edge is in the viewport
      return (boundary.top + headerOffset >= 0) && (boundary.top + headerOffset < clientHeight);
    } else if (align === 'center') {
      // Element is in view when its center point is in the viewport
      const centerY = boundary.top + (boundary.height / 2);
      return (centerY + headerOffset >= 0) && (centerY + headerOffset < clientHeight);
    } else if (align === 'bottom') {
      // Element is in view when its bottom edge is in the viewport
      return (boundary.bottom + headerOffset >= 0) && (boundary.bottom + headerOffset < clientHeight);
    }
    
    // Default to center if alignment is not recognized
    const centerY = boundary.top + (boundary.height / 2);
    return (centerY + headerOffset >= 0) && (centerY + headerOffset < clientHeight);
  };
  
  // Compose all operations using Maybe to handle null safely
  return Maybe.of(element)
    .map(getElementBoundary)
    .flatMap(boundary => 
      boundary === null 
        ? Maybe.of(false) 
        : Maybe.of(calculateInView(boundary))
    )
    .getOrElse(false);
};

/**
 * Creates a function that checks if a selector is in view
 * 
 * @param {string} selector - CSS selector for the element
 * @param {string} [align='bottom'] - Alignment option
 * @param {Object} [options] - Additional options passed to isInView
 * @returns {Function} Function that returns boolean when called
 */
export const createInViewChecker = (selector, align = 'bottom', options = {}) => () => {
  const element = document.querySelector(selector);
  return isInView(element, align, options);
};

// const element = document.querySelector('.my-element');
// if (isInView(element, 'center')) {
//   // Element is in view with center alignment
// }