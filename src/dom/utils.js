import { Maybe } from '../core/maybe.js';

/**
 * DOM-related functional utilities
 */


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