# ArrayTransform

## Overview

The `ArrayTransform` module provides a chainable interface for array transformations. It wraps standard JavaScript arrays with a fluent API that makes it easier to perform multiple operations in sequence while maintaining readability.

## Mathematical Definition

`ArrayTransform` can be viewed as a wrapper around JavaScript arrays that provides a fluent functional interface. In categorical terms, it can be seen as a functor because it implements a `map` method that preserves the structure while transforming values.

## API Reference

### Static Methods

#### `ArrayTransform.from(array)`

Creates a new `ArrayTransform` instance from an array or array-like object.

**Parameters:**
- `array`: An array or array-like object to transform

**Returns:** An `ArrayTransform` instance wrapping the array

**Example:**
```javascript
const numbers = ArrayTransform.from([1, 2, 3, 4, 5]);
```

### Instance Methods

#### `map(fn)`

Transforms each element in the array using the provided function.

**Parameters:**
- `fn`: A function that maps each element to a new value

**Returns:** A new `ArrayTransform` instance containing the transformed values

**Example:**
```javascript
const doubled = ArrayTransform.from([1, 2, 3])
  .map(x => x * 2);
// doubled.toArray() = [2, 4, 6]
```

#### `filter(fn)`

Filters the array, keeping only elements that satisfy the predicate function.

**Parameters:**
- `fn`: A predicate function that returns true for elements to keep

**Returns:** A new `ArrayTransform` instance containing only the elements that passed the predicate

**Example:**
```javascript
const evens = ArrayTransform.from([1, 2, 3, 4, 5])
  .filter(x => x % 2 === 0);
// evens.toArray() = [2, 4]
```

#### `forEach(fn)`

Executes a function for each element in the array (for side effects).

**Parameters:**
- `fn`: A function to execute for each element

**Returns:** The original `ArrayTransform` instance (for chaining)

**Example:**
```javascript
ArrayTransform.from(['apple', 'banana', 'cherry'])
  .forEach(fruit => console.log(`I like ${fruit}`));
// Logs:
// "I like apple"
// "I like banana"
// "I like cherry"
```

#### `toSet()`

Converts the array to a JavaScript `Set` object, which automatically removes duplicate values.

**Returns:** A new `Set` containing the unique values from the array

**Example:**
```javascript
const uniqueValues = ArrayTransform.from([1, 2, 2, 3, 3, 3])
  .toSet();
// uniqueValues = Set {1, 2, 3}
```

#### `toArray()`

Returns the underlying array.

**Returns:** The JavaScript array wrapped by this `ArrayTransform`

**Example:**
```javascript
const array = ArrayTransform.from([1, 2, 3])
  .map(x => x * x)
  .toArray();
// array = [1, 4, 9]
```

## Real-World Examples

### Example 1: Processing User Data

```javascript
// Array of user objects
const users = [
  { id: 1, name: 'Alice', age: 25, active: true },
  { id: 2, name: 'Bob', age: 17, active: false },
  { id: 3, name: 'Charlie', age: 30, active: true },
  { id: 4, name: 'David', age: 22, active: true },
  { id: 5, name: 'Eve', age: 16, active: false }
];

// Get names of active users who are 18 or older
const adultActiveUserNames = ArrayTransform.from(users)
  .filter(user => user.active)
  .filter(user => user.age >= 18)
  .map(user => user.name)
  .toArray();

// Results in ['Alice', 'Charlie', 'David']
```

### Example 2: Unique Tags Extraction

```javascript
// Array of blog posts
const blogPosts = [
  { title: 'Intro to JavaScript', tags: ['javascript', 'programming', 'web'] },
  { title: 'Advanced CSS', tags: ['css', 'web', 'design'] },
  { title: 'JavaScript Frameworks', tags: ['javascript', 'react', 'vue'] },
  { title: 'Web Security', tags: ['security', 'web', 'programming'] }
];

// Extract all unique tags
const uniqueTags = ArrayTransform.from(blogPosts)
  .map(post => post.tags)
  .forEach(tags => console.log(`Found tags: ${tags.join(', ')}`)) // Side effect - logging
  .map(tags => tags.map(tag => tag.toLowerCase())) // Normalize case
  .toArray()
  .flat() // Flatten the array of arrays
  .reduce((acc, tag) => acc.includes(tag) ? acc : [...acc, tag], []);

// Results in ['javascript', 'programming', 'web', 'css', 'design', 'react', 'vue', 'security']
```

### Example 3: Imperative vs Declarative Approach

#### Imperative Approach
```javascript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const result = [];

for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] % 2 === 0) {
    result.push(numbers[i] * numbers[i]);
  }
}

console.log(result); // [4, 16, 36, 64, 100]
```

#### Declarative Approach with ArrayTransform
```javascript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const result = ArrayTransform.from(numbers)
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .toArray();

console.log(result); // [4, 16, 36, 64, 100]
```

## Best Practices

1. **Chain operations** for clarity and readability
   ```javascript
   // Good
   ArrayTransform.from(data)
     .filter(isValid)
     .map(transform)
     .toArray();
   
   // Avoid
   const filtered = ArrayTransform.from(data).filter(isValid);
   const transformed = filtered.map(transform);
   const result = transformed.toArray();
   ```

2. **Use `forEach` for side effects** only, not for transformations
   ```javascript
   // Good
   ArrayTransform.from(items)
     .forEach(item => logger.log(item))
     .map(transform)
     .toArray();
   
   // Avoid
   const results = [];
   ArrayTransform.from(items)
     .forEach(item => {
       results.push(transform(item));
     });
   ```

3. **Convert to native JavaScript collections** when appropriate
   ```javascript
   // When you need unique values
   const uniqueIds = ArrayTransform.from(users)
     .map(user => user.id)
     .toSet();
   
   // When you need to use array methods not available in ArrayTransform
   const sortedArray = ArrayTransform.from(data)
     .filter(isValid)
     .toArray()
     .sort((a, b) => a - b);
   ```

4. **Use `toArray()` at the end of the chain** when you need the final result as a standard array
   ```javascript
   const processedData = ArrayTransform.from(rawData)
     .map(parseData)
     .filter(isValid)
     .toArray();
   ```

## Performance Considerations

While the `ArrayTransform` class provides a more declarative and chainable API, it's important to be aware of potential performance implications:

1. Each method creates a new `ArrayTransform` instance with a new underlying array, which may impact memory usage and performance for very large arrays.

2. For operations on large arrays where performance is critical, consider using native array methods directly or libraries like Lodash that optimize for performance.

3. If you're performing multiple transformations on very large arrays, you might want to consider alternatives like iterators or generators that process elements on-demand rather than creating multiple intermediate arrays.