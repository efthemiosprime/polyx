/**
 * Rate-limit a function to at most once per `wait` ms (leading + trailing edge).
 * The returned function exposes `.cancel()` to drop any pending trailing call.
 *
 * @param {Function} fn
 * @param {number} wait - Minimum ms between invocations
 * @returns {Function & { cancel: () => void }}
 */
const throttle = (fn, wait) => {
  let last = 0;
  let timer = null;
  let lastArgs = null;

  const throttled = (...args) => {
    const now = Date.now();
    lastArgs = args;
    const remaining = wait - (now - last);

    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now;
      fn(...args);
    } else if (!timer) {
      // Trailing edge: fire once the window elapses with the latest args.
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...lastArgs);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };
  return throttled;
};

/**
 * Defer a function until `wait` ms have passed without another call — ideal for
 * "scroll has stopped" work. The returned function exposes `.cancel()`.
 *
 * @param {Function} fn
 * @param {number} wait - Idle ms to wait before firing
 * @returns {Function & { cancel: () => void }}
 */
const debounce = (fn, wait) => {
  let timer = null;
  let lastArgs = null;

  const debounced = (...args) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...lastArgs);
    }, wait);
  };

  debounced.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };
  return debounced;
};

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
      // Private state. subscribers maps the caller's original callback to the
      // (possibly throttled/debounced) function we actually invoke, so we can
      // both dispatch and cancel its pending timer on unsubscribe.
      const subscribers = new Map();
      let isRunning = false;
      let scrollY = 0;
      let lastScrollY = 0;
      let currentDirection = 'down';
      let ticking = false;
      let rafId = null; // handle for the in-flight frame, so stop() can cancel it

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
        lastScrollY = scrollY;
        // Don't notify subscribers initially - wait for actual scroll
      };

      /**
       * Stop listening for scroll events and release every pending timer/frame.
       * @private
       */
      const stop = () => {
        if (!isRunning) return;

        window.removeEventListener('scroll', handleScroll);
        isRunning = false;

        // Cancel any queued frame so a stale notify can't run after stop,
        // and clear ticking so a later start() isn't wedged.
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        ticking = false;
      };

      /**
       * Handle scroll events, coalescing bursts into a single rAF-throttled tick.
       * @private
       */
      const handleScroll = () => {
        scrollY = window.scrollY;

        // Compute direction once, here, where scrollY actually changes.
        // (Reads elsewhere must not mutate this baseline.)
        currentDirection = scrollY > lastScrollY ? 'down' : 'up';
        lastScrollY = scrollY;

        if (ticking) return;

        // Set the guard BEFORE scheduling so this stays correct even if rAF runs
        // synchronously; the callback always clears it via finally.
        ticking = true;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          try {
            notifySubscribers();
          } finally {
            ticking = false;
          }
        });
      };

      /**
       * Notify all subscribers
       * @private
       */
      const notifySubscribers = () => {
        const scrollData = {
          y: scrollY,
          direction: currentDirection,
          timestamp: Date.now()
        };

        // Snapshot so a subscriber that (un)subscribes during dispatch can't
        // disturb the iteration.
        for (const invoke of [...subscribers.values()]) {
          try {
            invoke(scrollData);
          } catch (err) {
            console.error('Error in scroll subscriber:', err);
          }
        }

        processOneTimeTriggers(scrollData);
      };

      /**
       * Process one-time directional triggers for a frame.
       * @private
       * @param {Object} scrollData - Current scroll data
       */
      const processOneTimeTriggers = (scrollData) => {
        if (oneTimeTriggers.size === 0) return;

        const now = Date.now();

        // Snapshot: a trigger callback may add/remove triggers mid-dispatch.
        for (const [id, cfg] of [...oneTimeTriggers]) {
          // Mark that real scrolling has occurred (throttled to the frame).
          if (cfg.requireActualScroll) cfg.hasScrolled = true;

          const armReset = () => {
            if (!cfg.resetOnStop || !cfg.resetDelay) return;
            if (cfg.resetTimeout) clearTimeout(cfg.resetTimeout);
            cfg.resetTimeout = setTimeout(() => {
              cfg.hasTriggered = false;
              cfg.resetTimeout = null;
              cfg.lastReset = Date.now();
            }, cfg.resetDelay);
          };

          const matches = scrollData.direction === cfg.direction;

          if (!cfg.hasTriggered && cfg.hasScrolled && matches) {
            // Fire.
            try {
              cfg.callback(scrollData);
            } catch (err) {
              console.error(`Error in one-time trigger (${id}):`, err);
            }
            cfg.hasTriggered = true;
            cfg.lastTriggered = now;
            armReset();
          } else if (cfg.hasTriggered && matches) {
            // Re-arm the "scrolling stopped" reset only for already-fired
            // triggers still moving in their direction (avoids per-frame churn
            // on triggers that could never reset anyway).
            armReset();
          }

          // When direction reverses, let an already-fired opposite trigger arm
          // again — debounced so a jittery reversal doesn't thrash it.
          const debounce = cfg.debounceInterval ?? 300;
          if (cfg.hasTriggered && !matches && now - (cfg.lastReset || 0) > debounce) {
            cfg.hasTriggered = false;
            cfg.lastReset = now;
            if (cfg.resetTimeout) {
              clearTimeout(cfg.resetTimeout);
              cfg.resetTimeout = null;
            }
          }
        }
      };
      
      /**
       * Subscribe a component to scroll events.
       *
       * Notifications are already coalesced to one per animation frame. Pass a
       * rate limit to further reduce work for expensive subscribers:
       *   - `throttle`: call at most once per N ms (good for continuous work)
       *   - `debounce`: call only after scrolling pauses for N ms (scroll-end work)
       * `debounce` wins if both are given.
       *
       * @param {Function} callback - Function to call on scroll events
       * @param {Object} [options]
       * @param {number} [options.throttle=0] - Max one call per this many ms
       * @param {number} [options.debounce=0] - Fire only after this idle gap
       * @returns {Function} Unsubscribe function
       */
      const subscribe = (callback, options = {}) => {
        // Only accept functions as subscribers
        if (typeof callback !== 'function') {
          console.error('Scroll subscriber must be a function');
          return () => {};
        }

        const { throttle: throttleMs = 0, debounce: debounceMs = 0 } = options;
        let invoke = callback;
        if (debounceMs > 0) invoke = debounce(callback, debounceMs);
        else if (throttleMs > 0) invoke = throttle(callback, throttleMs);

        // Keyed by the caller's original callback so unsubscribe(cb) works.
        subscribers.set(callback, invoke);

        if (!isRunning) start();

        // Return unsubscribe function
        return () => unsubscribe(callback);
      };

      /**
       * Unsubscribe a component from scroll events.
       *
       * @param {Function} callback - The callback function to remove
       */
      const unsubscribe = (callback) => {
        const invoke = subscribers.get(callback);
        if (invoke && invoke.cancel) invoke.cancel(); // drop any pending timer
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
        if (!isRunning) {
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
        direction: currentDirection,
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