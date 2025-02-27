// File: src/functional/path.js

/**
 * Creates a function that can safely access deeply nested properties
 * using a string path or array of keys.
 * 
 * @param {Object} obj - The object to add path access methods to
 * @returns {Object} - The original object with path access methods
 */
export const path = (obj) => {
    /**
     * Safe path property accessor that supports both string paths and arrays
     * 
     * @param {string|Array} pathStr - A dot-notated string path (e.g. 'data.blogs.title') 
     *                              or array of keys (e.g. ['data', 'blogs', 'title'])
     * @param {*} defaultValue - Optional default value if path doesn't exist
     * @returns {*} The value at the specified path or the default value
     */
    const get = (pathStr, defaultValue) => {
      // Handle empty or invalid objects
      if (obj === null || obj === undefined) {
        return defaultValue;
      }
      
      // Convert string path to array
      const keys = Array.isArray(pathStr) 
        ? pathStr 
        : pathStr.split('.').filter(Boolean);
      
      // Handle empty path
      if (keys.length === 0) {
        return obj;
      }
      
      // Traverse the path
      let current = obj;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        
        // Special handling for arrays with numeric indices
        if (Array.isArray(current) && !isNaN(Number(key))) {
          current = current[Number(key)];
        } else if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, key)) {
          // If we hit a null/undefined or the key doesn't exist, return default
          return defaultValue;
        } else {
          // Normal property access
          current = current[key];
        }
        
        // Handle 'data' and 'attributes' keys common in REST APIs (optional auto-unwrapping)
        if (i < keys.length - 1 && current && typeof current === 'object') {
          if (current.data !== undefined && keys[i + 1] !== 'data') {
            current = current.data;
            // Don't increment i since we're not consuming a path segment
          }
          if (current.attributes !== undefined && keys[i + 1] !== 'attributes') {
            current = current.attributes;
            // Don't increment i since we're not consuming a path segment
          }
        }
      }
      
      return current !== undefined ? current : defaultValue;
    };
    
    /**
     * Checks if a deeply nested path exists in the object
     * 
     * @param {string|Array} pathStr - A dot-notated string path or array of keys
     * @returns {boolean} True if the path exists and is not undefined
     */
    const has = (pathStr) => {
      // Use a unique symbol as sentinel value to distinguish undefined properties
      // that actually exist from properties that don't exist
      const sentinel = Symbol('sentinel');
      return get(pathStr, sentinel) !== sentinel;
    };
    
    /**
     * Returns all values from an array of objects at the specified path
     * 
     * @param {string|Array} pathStr - Path to extract from each item
     * @returns {Array} Array of values at the specified path
     */
    const getAll = (pathStr) => {
      if (!Array.isArray(obj)) {
        return [];
      }
      
      return obj.map(item => path(item).get(pathStr));
    };
    
    /**
     * Converts a path to a function that can extract that property
     * 
     * @param {string|Array} pathStr - The path to extract
     * @returns {Function} A function that takes an object and extracts the property
     */
    const prop = (pathStr) => (object) => path(object).get(pathStr);
    
    return {
      // Original object
      value: obj,
      
      // Core accessor methods
      get,
      has,
      getAll,
      prop,
      
      // Add some common patterns for REST APIs
      data: () => path(obj.data),
      attributes: () => path(obj.attributes)
    };
  };
  
  /**
   * Standalone function to create a getter for a specific path
   * 
   * @param {string|Array} pathStr - Path to get from an object
   * @returns {Function} A function that extracts the specified path from an object
   */
  export const getPath = (pathStr) => (obj) => path(obj).get(pathStr);
  
  /**
   * Function to safely create a path from multiple parts 
   * (useful for dynamic paths)
   * 
   * @param {...string} parts - Path segments to join
   * @returns {string} A dot-separated path string
   */
  export const makePath = (...parts) => parts.filter(Boolean).join('.');
  
  // Examples usage:
  //
  // const data = {
  //   data: {
  //     blogs: {
  //       data: {
  //         attributes: {
  //           title: "Blog title",
  //           date: "2022-09-28"
  //         }
  //       }
  //     }
  //   }
  // };
  //
  // const pathData = path(data);
  // const title = pathData.get('blogs.title');
  // 
  // // Auto-handles common patterns like .data and .attributes
  // // So this also works with the same result:
  // const title = pathData.get('data.blogs.data.attributes.title');
  // 
  // // Create reusable getters
  // const getTitle = getPath('blogs.title');
  // const title = getTitle(data);