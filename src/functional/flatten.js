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
    
    // Recursively flatten the object
    const flattenRecursive = (obj, prefix = '') => {
      // Unwrap the object if it matches unwrapPaths pattern
      const unwrapped = unwrap(obj);
      
      // If unwrapping changed the object, start again with the unwrapped object
      if (unwrapped !== obj) {
        return flattenRecursive(unwrapped, prefix);
      }
      
      // Base case: not an object or empty object
      if (!isObject(obj) || Object.keys(obj).length === 0) {
        return prefix ? { [prefix]: obj } : obj;
      }
      
      // Recursive case: process each property
      return Object.entries(obj).reduce((acc, [key, value]) => {
        const newKey = prefix ? `${prefix}${config.delimiter}${key}` : key;
        
        if (isObject(value)) {
          // For nested objects, recursively flatten
          const flattened = flattenRecursive(value, newKey);
          
          // If we're removing nested objects, merge the flattened values
          if (config.removeNested) {
            return { ...acc, ...flattened };
          } else {
            // Otherwise, keep the original nested object and add flattened values
            return { ...acc, [newKey]: value, ...flattened };
          }
        } else {
          // For non-objects, just add the key-value pair
          return { ...acc, [newKey]: value };
        }
      }, {});
    };
    
    return flattenRecursive(obj);
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
  