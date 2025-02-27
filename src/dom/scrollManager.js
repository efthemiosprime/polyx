// File: src/functional/scrollManager.js
/**
 * Creates a minimal, declarative scroll manager that components can subscribe to
 * 
 * @returns {Object} Scroll manager instance with subscribe/unsubscribe methods
 */
export const createScrollManager = () => {
  // Private state
  const subscribers = new Set();
  let isRunning = false;
  let scrollY = 0;
  let ticking = false;
  
  /**
   * Start listening for scroll events
   * @private
   */
  const start = () => {
    if (isRunning) return;
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    isRunning = true;
    
    // Initial scroll position
    scrollY = window.scrollY;
    notifySubscribers();
  };
  
  /**
   * Stop listening for scroll events
   * @private
   */
  const stop = () => {
    if (!isRunning) return;
    
    window.removeEventListener('scroll', handleScroll);
    isRunning = false;
  };
  
  /**
   * Handle scroll events with requestAnimationFrame for performance
   * @private
   */
  const handleScroll = () => {
    scrollY = window.scrollY;
    
    if (!ticking) {
      requestAnimationFrame(() => {
        notifySubscribers();
        ticking = false;
      });
      
      ticking = true;
    }
  };
  
  /**
   * Notify all subscribers
   * @private
   */
  const notifySubscribers = () => {
    const scrollData = {
      y: scrollY,
      direction: detectScrollDirection(),
      timestamp: Date.now()
    };
    
    subscribers.forEach(subscriber => {
      // Call subscriber with scroll data
      try {
        subscriber(scrollData);
      } catch (err) {
        console.error('Error in scroll subscriber:', err);
      }
    });
  };
  
  /**
   * Detect scroll direction (up or down)
   * @private
   * @returns {string} 'up' or 'down'
   */
  let lastScrollY = scrollY;
  const detectScrollDirection = () => {
    const direction = scrollY > lastScrollY ? 'down' : 'up';
    lastScrollY = scrollY;
    return direction;
  };
  
  /**
   * Subscribe a component to scroll events
   * 
   * @param {Function} callback - Function to call on scroll events
   * @returns {Function} Unsubscribe function
   */
  const subscribe = (callback) => {
    // Only accept functions as subscribers
    if (typeof callback !== 'function') {
      console.error('Scroll subscriber must be a function');
      return () => {};
    }
    
    // Add to subscribers
    subscribers.add(callback);
    
    // Start listening if this is the first subscriber
    if (subscribers.size === 1) {
      start();
    }
    
    // Return unsubscribe function
    return () => unsubscribe(callback);
  };
  
  /**
   * Unsubscribe a component from scroll events
   * 
   * @param {Function} callback - The callback function to remove
   */
  const unsubscribe = (callback) => {
    subscribers.delete(callback);
    
    // Stop listening if no more subscribers
    if (subscribers.size === 0) {
      stop();
    }
  };
  
  /**
   * Get current scroll position
   * 
   * @returns {Object} Current scroll data
   */
  const getScrollPosition = () => ({
    y: scrollY,
    direction: detectScrollDirection(),
    timestamp: Date.now()
  });
  
  // Public API
  return {
    subscribe,
    unsubscribe,
    getScrollPosition
  };
};

/**
 * Singleton instance of scroll manager for shared usage
 */
export const scrollManager = createScrollManager();

// Example Web Component integration:
//
// class ScrollAwareElement extends HTMLElement {
//   constructor() {
//     super();
//     this.unsubscribe = null;
//   }
//
//   connectedCallback() {
//     // Subscribe to scroll events
//     this.unsubscribe = scrollManager.subscribe(this.handleScroll.bind(this));
//   }
//
//   disconnectedCallback() {
//     // Clean up subscription when element is removed
//     if (this.unsubscribe) {
//       this.unsubscribe();
//       this.unsubscribe = null;
//     }
//   }
//
//   handleScroll(scrollData) {
//     // React to scroll events
//     console.log('Scroll position:', scrollData.y);
//     console.log('Scroll direction:', scrollData.direction);
//   }
// }
//
// customElements.define('scroll-aware', ScrollAwareElement);