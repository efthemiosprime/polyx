/**
 * Flattens a deeply nested object structure.
 * 
 * @param {Object} obj - The nested object to flatten
 * @param {Object} options - Configuration options
 * @param {boolean} options.removeNested - Whether to remove nested objects (default: true)
 * @param {string[]} options.unwrapPaths - Array of paths to automatically unwrap (e.g., ['data', 'attributes'])
 * @param {string} options.delimiter - Delimiter for flattened keys (default: '.')
 * @returns {Object} A flattened version of the object
 */
export const flatten = (obj, options = {}) => {
    const defaultOptions = {
      removeNested: true,
      unwrapPaths: ['data', 'attributes'],
      delimiter: '.'
    };
  
    const config = { ...defaultOptions, ...options };
    
    // Helper function to check if value is an object (not null, not array)
    const isObject = (val) => 
      typeof val === 'object' && 
      val !== null && 
      !Array.isArray(val);
    
    // Automatically unwraps common nested structures
    const unwrap = (input) => {
      if (!isObject(input)) return input;
      
      let current = input;
      for (const pathSegment of config.unwrapPaths) {
        if (isObject(current) && current[pathSegment] !== undefined) {
          current = current[pathSegment];
        } else {
          break;
        }
      }
      return current;
    };
    
    // Unwrap the top level first; a non-object (or empty) result is returned
    // as-is, matching the original base-case behavior.
    const top = unwrap(obj);
    if (!isObject(top) || Object.keys(top).length === 0) {
      return top;
    }

    // Single mutable accumulator: each leaf is written exactly once, so the whole
    // flatten is O(n) instead of the previous O(n^2) spread-in-reduce.
    const result = {};

    const walk = (node, prefix) => {
      // Unwrap at each level so nested wrapper envelopes collapse too.
      const unwrapped = unwrap(node);
      if (unwrapped !== node) {
        walk(unwrapped, prefix);
        return;
      }

      if (!isObject(node) || Object.keys(node).length === 0) {
        if (prefix) result[prefix] = node;
        return;
      }

      for (const [key, value] of Object.entries(node)) {
        const newKey = prefix ? `${prefix}${config.delimiter}${key}` : key;
        if (isObject(value)) {
          // Keep the original nested object alongside its flattened leaves when
          // removeNested is false.
          if (!config.removeNested) result[newKey] = value;
          walk(value, newKey);
        } else {
          result[newKey] = value;
        }
      }
    };

    walk(top, '');
    return result;
  };


  /**
 * A more functional version that uses a lens-like approach
 * to automatically navigate and flatten nested structures.
 */
export const flattenWith = (paths) => (obj) => {
    // Start with the original object
    let result = obj;
    
    // Apply each path transformation
    for (const path of paths) {
      // Skip if result is no longer an object
      if (!result || typeof result !== 'object') break;
      
      // Navigate to the path if it exists
      if (result[path] !== undefined) {
        result = result[path];
      }
    } 
    return result;
};
  