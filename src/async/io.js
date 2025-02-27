/**
 * IO Monad - Wraps computations that may perform I/O or other side effects
 * 
 * The IO monad doesn't perform side effects when created, but instead
 * when the run() method is called. This allows for composition of side-effectful
 * operations while maintaining referential transparency.
 */

/**
 * Creates an IO monad from a computation function
 * 
 * @param {Function} fn - The computation function that performs I/O
 * @returns {Object} IO monad instance
 */
export const IO = fn => ({
    /**
     * The computation to be performed
     */
    run: fn,
    
    /**
     * Map a function over the result of the IO computation
     * 
     * @param {Function} f - Function to apply to the result
     * @returns {IO} A new IO monad
     */
    map: f => IO(() => f(fn())),
    
    /**
     * Chain another IO-returning function after this computation
     * 
     * @param {Function} f - Function that returns an IO monad
     * @returns {IO} A new IO monad
     */
    flatMap: f => IO(() => f(fn()).run()),
    
    /**
     * Alias for flatMap to match standard monad naming
     * 
     * @param {Function} f - Function that returns an IO monad
     * @returns {IO} A new IO monad
     */
    chain(f) { 
      return this.flatMap(f); 
    },
    
    /**
     * Combine this IO with another, ignoring the result of this IO
     * 
     * @param {IO} otherIO - Another IO to run after this one
     * @returns {IO} A new IO monad
     */
    concat: (otherIO) => IO(() => {
      fn(); // Run this IO for its effects
      return otherIO.run(); // Return the result of the other IO
    }),
    
    /**
     * Handle errors that might occur when running the IO
     * 
     * @param {Function} handler - Function that takes an error and returns an IO
     * @returns {IO} A new IO monad
     */
    catchError: (handler) => IO(() => {
      try {
        return fn();
      } catch (e) {
        return handler(e).run();
      }
    })
  });
  
  /**
   * Creates an IO monad that returns a fixed value
   * 
   * @param {*} x - The value to return
   * @returns {IO} An IO monad that returns the value
   */
  IO.of = x => IO(() => x);
  
  /**
   * Creates an IO from a function
   * 
   * @param {Function} f - The function to wrap
   * @returns {IO} An IO monad that runs the function
   */
  IO.from = f => IO(f);
  
  /**
   * Creates an IO that captures the current time
   * 
   * @returns {IO} An IO monad that returns the current time
   */
  IO.now = () => IO(() => new Date());
  
  /**
   * Creates an IO that produces a random number
   * 
   * @returns {IO} An IO monad that returns a random number
   */
  IO.random = () => IO(() => Math.random());
  
  /**
   * Creates an IO that logs to the console
   * 
   * @param {*} message - The message to log
   * @returns {IO} An IO monad that logs the message
   */
  IO.log = message => IO(() => {
    console.log(message);
    return message;
  });
  
  /**
   * Creates an IO that reads a property from an object
   * 
   * @param {string} prop - The property to read
   * @returns {Function} A function that takes an object and returns an IO
   */
  IO.prop = prop => obj => IO(() => obj[prop]);
  
  /**
   * Creates an IO that reads localStorage
   * 
   * @param {string} key - The key to read
   * @returns {IO} An IO monad that returns the value from localStorage
   */
  IO.localStorage = {
    getItem: key => IO(() => {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }),
    setItem: key => value => IO(() => {
      try {
        localStorage.setItem(key, value);
        return value;
      } catch (e) {
        return null;
      }
    }),
    removeItem: key => IO(() => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    })
  };
  
  // Examples:
  //
  // // Basic usage:
  // const getCurrentTime = IO(() => new Date().toLocaleTimeString());
  // const logTime = getCurrentTime.map(time => `Current time: ${time}`).flatMap(IO.log);
  // logTime.run();
  //
  // // DOM manipulation:
  // const getElement = id => IO(() => document.getElementById(id));
  // const setText = text => element => IO(() => {
  //   if (element) element.textContent = text;
  //   return element;
  // });
  //
  // const updateHeader = getElement('header')
  //   .flatMap(setText('Updated with IO!'));
  //
  // updateHeader.run();