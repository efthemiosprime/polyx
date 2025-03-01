/**
 * Scroll Manager - Singleton implementation
 * Provides unified scroll event handling with both regular subscriptions
 * and one-time directional triggers
 */
export const ScrollManager = (() => {
    // Private singleton instance
    let instance;
    
    /**
     * Creates the scroll manager instance
     * @private
     */
    function createInstance() {
      // Private state
      const subscribers = new Set();
      let isRunning = false;
      let scrollY = 0;
      let ticking = false;
      
      // State for one-time triggers
      const oneTimeTriggers = new Map();
      
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
        // Don't notify subscribers initially - wait for actual scroll
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
        
        // Mark that actual scrolling has occurred
        oneTimeTriggers.forEach(trigger => {
          if (trigger.requireActualScroll) {
            trigger.hasScrolled = true;
          }
        });
        
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
        
        // Regular subscribers
        subscribers.forEach(subscriber => {
          // Call subscriber with scroll data
          try {
            subscriber(scrollData);
          } catch (err) {
            console.error('Error in scroll subscriber:', err);
          }
        });
        
        // Process one-time triggers
        processOneTimeTriggers(scrollData);
      };
      
      /**
       * Process one-time triggers
       * @private
       * @param {Object} scrollData - Current scroll data
       */
      const processOneTimeTriggers = (scrollData) => {
        // Get all up and down triggers
        const upTriggers = new Map();
        const downTriggers = new Map();
        
        // Sort triggers by direction
        oneTimeTriggers.forEach((config, id) => {
          if (config.direction === 'up') {
            upTriggers.set(id, config);
          } else if (config.direction === 'down') {
            downTriggers.set(id, config);
          }
        });
        
        oneTimeTriggers.forEach((triggerConfig, id) => {
          const { direction, hasTriggered, callback, resetOnStop, resetDelay, hasScrolled } = triggerConfig;
          
          // Add debounce mechanism to prevent rapid repainting
          const now = Date.now();
          const minTriggerInterval = 300; // Minimum time between trigger resets (ms)
          
          // Initialize lastReset if it doesn't exist
          if (!triggerConfig.lastReset) {
            triggerConfig.lastReset = 0;
          }
          
          // Check if this trigger should fire (only if actual scrolling has occurred if required)
          if (!hasTriggered && hasScrolled && scrollData.direction === direction) {
            // Call the callback
            try {
              callback(scrollData);
            } catch (err) {
              console.error(`Error in one-time trigger (${id}):`, err);
            }
            
            // Mark as triggered and record time
            triggerConfig.hasTriggered = true;
            triggerConfig.lastTriggered = now;
            
            // Set up reset timer if needed
            if (resetOnStop && resetDelay) {
              // Clear existing timeout if any
              if (triggerConfig.resetTimeout) {
                clearTimeout(triggerConfig.resetTimeout);
              }
              
              // Schedule reset
              triggerConfig.resetTimeout = setTimeout(() => {
                triggerConfig.hasTriggered = false;
                triggerConfig.lastReset = Date.now();
              }, resetDelay);
            }
          } else if (resetOnStop && resetDelay) {
            // Always reset the timer when scrolling to detect when scrolling stops
            if (triggerConfig.resetTimeout) {
              clearTimeout(triggerConfig.resetTimeout);
            }
            
            triggerConfig.resetTimeout = setTimeout(() => {
              triggerConfig.hasTriggered = false;
              triggerConfig.lastReset = Date.now();
            }, resetDelay);
          }
          
          // Check if enough time has passed since last reset before resetting again
          const timeSinceLastReset = now - (triggerConfig.lastReset || 0);
          const canReset = timeSinceLastReset > minTriggerInterval;
          
          // Reset opposite direction triggers with debouncing
          // If we're scrolling down, reset up triggers (with debounce)
          if (scrollData.direction === 'down' && direction === 'up' && hasTriggered && canReset) {
            triggerConfig.hasTriggered = false;
            triggerConfig.lastReset = now;
            
            if (triggerConfig.resetTimeout) {
              clearTimeout(triggerConfig.resetTimeout);
              triggerConfig.resetTimeout = null;
            }
          }
          
          // If we're scrolling up, reset down triggers (with debounce)
          if (scrollData.direction === 'up' && direction === 'down' && hasTriggered && canReset) {
            triggerConfig.hasTriggered = false;
            triggerConfig.lastReset = now;
            
            if (triggerConfig.resetTimeout) {
              clearTimeout(triggerConfig.resetTimeout);
              triggerConfig.resetTimeout = null;
            }
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
        if (subscribers.size === 1 && oneTimeTriggers.size === 0) {
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
        
        // Stop listening if no more subscribers and triggers
        if (subscribers.size === 0 && oneTimeTriggers.size === 0) {
          stop();
        }
      };
      
      /**
       * Add a one-time trigger for a specific scroll direction
       * 
       * @param {Object} options - Trigger options
       * @param {string} options.direction - The direction to trigger on ('up' or 'down')
       * @param {Function} options.callback - The function to call when triggered
       * @param {boolean} options.resetOnStop - Whether to reset the trigger when scrolling stops
       * @param {number} options.resetDelay - Time in ms to wait before resetting
       * @param {boolean} options.requireActualScroll - Whether to require actual scrolling before triggering (default: true)
       * @param {number} options.debounceInterval - Minimum time in ms between trigger resets (default: 300)
       * @returns {string} Trigger ID that can be used to remove the trigger
       */
      const addOneTimeTrigger = ({ 
        direction = 'down', 
        callback, 
        resetOnStop = true,
        resetDelay = 1500,
        requireActualScroll = true,
        debounceInterval = 300
      }) => {
        if (typeof callback !== 'function') {
          console.error('Trigger callback must be a function');
          return null;
        }
        
        // Generate a unique ID
        const triggerId = `trigger_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Track whether any actual scrolling has occurred
        let hasScrolled = !requireActualScroll;
        
        // Add the trigger
        oneTimeTriggers.set(triggerId, {
          direction,
          callback,
          hasTriggered: false,
          resetOnStop,
          resetDelay,
          resetTimeout: null,
          requireActualScroll,
          hasScrolled,
          debounceInterval,
          lastTriggered: 0,
          lastReset: 0
        });
        
        // Start the scroll listener if needed
        if (!isRunning && (subscribers.size === 0 && oneTimeTriggers.size === 1)) {
          start();
        }
        
        // Return ID for later removal
        return triggerId;
      };
      
      /**
       * Remove a one-time trigger
       * 
       * @param {string} triggerId - The ID of the trigger to remove
       */
      const removeOneTimeTrigger = (triggerId) => {
        const trigger = oneTimeTriggers.get(triggerId);
        
        if (trigger && trigger.resetTimeout) {
          clearTimeout(trigger.resetTimeout);
        }
        
        oneTimeTriggers.delete(triggerId);
        
        // Stop listening if no more subscribers and triggers
        if (subscribers.size === 0 && oneTimeTriggers.size === 0) {
          stop();
        }
      };
      
      /**
       * Reset a specific one-time trigger
       * 
       * @param {string} triggerId - The ID of the trigger to reset
       */
      const resetOneTimeTrigger = (triggerId) => {
        const trigger = oneTimeTriggers.get(triggerId);
        
        if (trigger) {
          trigger.hasTriggered = false;
          
          if (trigger.resetTimeout) {
            clearTimeout(trigger.resetTimeout);
            trigger.resetTimeout = null;
          }
        }
      };
      
      /**
       * Reset all one-time triggers
       */
      const resetAllOneTimeTriggers = () => {
        oneTimeTriggers.forEach(trigger => {
          trigger.hasTriggered = false;
          
          if (trigger.resetTimeout) {
            clearTimeout(trigger.resetTimeout);
            trigger.resetTimeout = null;
          }
        });
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
        getScrollPosition,
        addOneTimeTrigger,
        removeOneTimeTrigger,
        resetOneTimeTrigger,
        resetAllOneTimeTriggers
      };
    }
    
    // Return the Singleton's public interface
    return {
      /**
       * Get the ScrollManager instance (creates it if it doesn't exist)
       * @returns {Object} ScrollManager instance
       */
      getInstance: () => {
        if (!instance) {
          instance = createInstance();
        }
        return instance;
      }
    };
})();
  
export const scrollManager = ScrollManager.getInstance();

  
  // Usage Example:
  /*
  // Get the shared ScrollManager instance
  
  // Add a one-time trigger for scrolling down
  const downTriggerId = scrollManager.addOneTimeTrigger({
    direction: 'down',
    callback: (data) => {
      console.log('Scrolled down!', data);
      // Do something when scrolling down
      document.querySelector('.header').classList.add('collapsed');
    },
    resetOnStop: true,
    resetDelay: 2000 // Reset 2 seconds after scrolling stops
  });
  
  // In a different component/file, use the same instance
  import { ScrollManager } from './scrollManager';
  
  function setupComponent() {
    // Get the same shared instance
    const scrollManager = ScrollManager.getInstance();
    
    // Add a one-time trigger for scrolling up
    const upTriggerId = scrollManager.addOneTimeTrigger({
      direction: 'up',
      callback: (data) => {
        console.log('Scrolled up!', data);
        // Do something when scrolling up
        document.querySelector('.header').classList.remove('collapsed');
      }
    });
    
    // Regular scroll subscriber - will use the same scroll manager
    const unsubscribe = scrollManager.subscribe((data) => {
      // Update component based on scroll
    });
    
    // Component cleanup
    return () => {
      scrollManager.removeOneTimeTrigger(upTriggerId);
      unsubscribe();
    };
  }
  */


  /*

  // Get the ScrollManager instance
const scrollManager = ScrollManager.getInstance();

// Add a one-time trigger for scrolling down that will only
// fire after the user has actually scrolled
const downTriggerId = scrollManager.addOneTimeTrigger({
  direction: 'down',
  callback: (scrollData) => {
    console.log('User actually scrolled down!', scrollData);
    document.querySelector('.header').classList.add('compact');
  },
  // This is the default, but shown for clarity
  requireActualScroll: true
});

// If you need a trigger that fires immediately based on current position
// (previous behavior), you can set requireActualScroll to false
const immediateTriggerId = scrollManager.addOneTimeTrigger({
  direction: 'down',
  callback: handleImmediateTrigger,
  requireActualScroll: false
});

*/