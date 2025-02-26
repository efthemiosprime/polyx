// File: src/functional/dom.js

import { Maybe } from './maybe.js';

/**
 * DOM-related functional utilities
 */

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
export const isInView = (element, align = 'bottom', options = {}) => {
  const defaults = {
    isMobile: () => false,
    mobileOffset: 60,
    desktopOffset: 100
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
      'center': boundary => boundary.height / 2,
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
  
  const calculateInView = (boundary, offset) => {
    // Create a calculation context object to avoid mutations
    const values = {
      top: boundary.top + getHeaderOffset(),
      bottom: boundary.bottom + offset,
      height: boundary.height + offset,
      clientHeight: Maybe.of(window)
        .map(w => w.innerHeight)
        .getOrElse(document.documentElement.clientHeight)
    };
    
    // Determine visibility with a pure calculation
    return (values.top + values.height >= values.height) && 
           (values.height + values.clientHeight >= values.bottom);
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

/**
 * Gets an element safely using a CSS selector
 * 
 * @param {string} selector - CSS selector
 * @returns {Maybe} Maybe monad containing the element or Nothing
 */
export const getElement = (selector) =>
  Maybe.of(document.querySelector(selector));

/**
 * Gets multiple elements safely using a CSS selector
 * 
 * @param {string} selector - CSS selector
 * @returns {Array} Array of elements (empty if none found)
 */
export const getElements = (selector) =>
  Maybe.of(document.querySelectorAll(selector))
    .map(nodeList => Array.from(nodeList))
    .getOrElse([]);

/**
 * Adds a class to an element safely
 * 
 * @param {string} className - Class to add
 * @returns {Function} Function that takes an element and returns a Maybe of that element
 */
export const addClass = (className) => (element) =>
  Maybe.of(element)
    .map(el => {
      el.classList.add(className);
      return el;
    });

/**
 * Removes a class from an element safely
 * 
 * @param {string} className - Class to remove
 * @returns {Function} Function that takes an element and returns a Maybe of that element
 */
export const removeClass = (className) => (element) =>
  Maybe.of(element)
    .map(el => {
      el.classList.remove(className);
      return el;
    });

/**
 * Toggle a class on an element safely
 * 
 * @param {string} className - Class to toggle
 * @param {boolean} [force] - If true, adds the class; if false, removes it
 * @returns {Function} Function that takes an element and returns a Maybe of that element
 */
export const toggleClass = (className, force) => (element) =>
  Maybe.of(element)
    .map(el => {
      el.classList.toggle(className, force);
      return el;
    });

/**
 * Sets a style property on an element
 * 
 * @param {string} property - CSS property to set
 * @param {string} value - Value to set
 * @returns {Function} Function that takes an element and returns a Maybe of that element
 */
export const setStyle = (property, value) => (element) =>
  Maybe.of(element)
    .map(el => {
      el.style[property] = value;
      return el;
    });

/**
 * Gets the computed style value of an element safely
 * 
 * @param {string} property - CSS property to get
 * @returns {Function} Function that takes an element and returns a Maybe of the style value
 */
export const getStyle = (property) => (element) =>
  Maybe.of(element)
    .map(el => window.getComputedStyle(el))
    .map(styles => styles[property]);

/**
 * Sets the inner HTML of an element safely
 * 
 * @param {string} html - HTML content
 * @returns {Function} Function that takes an element and returns a Maybe of that element
 */
export const setHtml = (html) => (element) =>
  Maybe.of(element)
    .map(el => {
      el.innerHTML = html;
      return el;
    });

/**
 * Sets the text content of an element safely
 * 
 * @param {string} text - Text content
 * @returns {Function} Function that takes an element and returns a Maybe of that element
 */
export const setText = (text) => (element) =>
  Maybe.of(element)
    .map(el => {
      el.textContent = text;
      return el;
    });

/**
 * Adds an event listener to an element safely
 * 
 * @param {string} event - Event name
 * @param {Function} handler - Event handler function
 * @param {Object|boolean} [options] - Event listener options
 * @returns {Function} Function that takes an element and returns a Maybe of that element
 */
export const addEvent = (event, handler, options) => (element) =>
  Maybe.of(element)
    .map(el => {
      el.addEventListener(event, handler, options);
      return el;
    });