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
  
  const calculateOffset = (boundary, alignType) => {
    const offsetMap = {
      'top': boundary => boundary.height * -1,
      'center': boundary => boundary.height / -2, // Negative because we're offsetting upward
      'bottom': () => 0
    };
    
    return Maybe.of(alignType)
      .map(a => offsetMap[a] || offsetMap.bottom)
      .map(fn => fn(boundary))
      .getOrElse(0);
  };
  
  const isMobile = () => 
    Maybe.of(config.isMobile)
      .map(fn => fn())
      .getOrElse(false);
  
  const getHeaderOffset = () =>
    isMobile() ? config.mobileOffset : config.desktopOffset;
  
  const calculateInView = (boundary, alignOffset) => {
    const headerOffset = getHeaderOffset();
    const clientHeight = Maybe.of(window)
      .map(w => w.innerHeight)
      .getOrElse(document.documentElement.clientHeight);
      
    // Adjust element position based on alignment
    const alignedTop = boundary.top - alignOffset;
    
    // Check if the aligned point is in the viewport
    return (alignedTop + headerOffset >= 0) && (alignedTop + headerOffset < clientHeight);
  };
  
  // Compose all operations using Maybe to handle null safely
  return Maybe.of(element)
    .map(getElementBoundary)
    .flatMap(boundary => 
      boundary === null 
        ? Maybe.of(false) 
        : Maybe.of(calculateInView(boundary, calculateOffset(boundary, align)))
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