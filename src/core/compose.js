/**
 * Composes multiple functions from right to left.
 * 
 * The rightmost function can take multiple arguments,
 * while the rest of the functions must take a single argument.
 * 
 * @param {...Function} fns - Functions to compose
 * @returns {Function} Composed function
 */
export const compose = (...fns) => {
    if (fns.length === 0) {
      return arg => arg;
    }
    
    if (fns.length === 1) {
      return fns[0];
    }
    
    return fns.reduce((f, g) => (...args) => f(g(...args)));
  };
  
  /**
   * Composes multiple functions from left to right (pipe).
   * 
   * The leftmost function can take multiple arguments,
   * while the rest of the functions must take a single argument.
   * 
   * @param {...Function} fns - Functions to compose
   * @returns {Function} Composed function
   */
  export const pipe = (...fns) => {
    if (fns.length === 0) {
      return arg => arg;
    }
    
    if (fns.length === 1) {
      return fns[0];
    }
    
    return fns.reduce((f, g) => (...args) => g(f(...args)));
  };
  
  /**
   * Curries a function to allow partial application.
   * 
   * @param {Function} fn - Function to curry
   * @returns {Function} Curried function
   */
  export const curry = (fn) => {
    const arity = fn.length;
    
    return function curried(...args) {
      if (args.length >= arity) {
        return fn(...args);
      }
      
      return (...moreArgs) => curried(...args, ...moreArgs);
    };
  };
  
  /**
   * Creates a function that performs side effects without changing the input value.
   * Useful for logging, debugging, or other effects in a composition chain.
   * 
   * @param {Function} fn - Side effect function
   * @returns {Function} A function that returns its input unchanged after applying the side effect
   */
  export const tap = (fn) => (value) => {
    fn(value);
    return value;
  };
  
  /**
   * Creates a function that applies a transformation only if a predicate is satisfied.
   * 
   * @param {Function} predicate - Function that determines if the transformation should be applied
   * @param {Function} fn - Transformation function
   * @returns {Function} A function that conditionally applies the transformation
   */
  export const when = (predicate, fn) => (value) => 
    predicate(value) ? fn(value) : value;
  
  /**
   * Creates a function that applies one transformation if the predicate is true,
   * and another transformation if the predicate is false.
   * 
   * @param {Function} predicate - Function that tests the condition
   * @param {Function} onTrue - Function to apply if predicate is true
   * @param {Function} onFalse - Function to apply if predicate is false
   * @returns {Function} A function that applies the appropriate transformation
   */
  export const ifElse = (predicate, onTrue, onFalse) => (value) =>
    predicate(value) ? onTrue(value) : onFalse(value);
  
  /**
   * Creates a function that applies a transformation to a specific property of an object.
   * 
   * @param {string} prop - The property name to transform
   * @param {Function} fn - The transformation function
   * @returns {Function} A function that returns a new object with the transformed property
   */
  export const evolve = (prop, fn) => (obj) => ({
    ...obj,
    [prop]: fn(obj[prop])
  });
  
  // Examples:
  //
  // // Simple composition
  // const double = x => x * 2;
  // const addOne = x => x + 1;
  // const doubleThenAddOne = compose(addOne, double);
  // doubleThenAddOne(5); // 11
  //
  // // Using pipe (left-to-right)
  // const addOneThenDouble = pipe(addOne, double);
  // addOneThenDouble(5); // 12
  //
  // // Using tap for debugging
  // const logThenDouble = pipe(
  //   tap(x => console.log('Input:', x)),
  //   double,
  //   tap(x => console.log('Result:', x))
  // );
  // logThenDouble(5); // logs "Input: 5", "Result: 10", returns 10
  //
  // // Using when for conditional transformation
  // const doubleIfEven = when(x => x % 2 === 0, double);
  // doubleIfEven(4); // 8
  // doubleIfEven(5); // 5