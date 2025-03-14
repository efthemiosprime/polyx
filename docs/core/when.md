# When Function

## Overview

The `when` function is a utility that conditionally applies a transformation to a value based on a predicate. It enables a more declarative approach to conditional operations, allowing you to express "when this condition is true, apply this transformation" in a functional style.

## Mathematical Definition

The `when` function can be understood as a higher-order function that takes a predicate function `p` and a transformation function `f`, and returns a new function that either applies `f` to its input or returns the input unchanged based on the result of the predicate:

when(p, f)(x) = p(x) ? f(x) : x

Where:
- `p` is a predicate function that returns a boolean
- `f` is a transformation function
- `x` is the input value

This pattern is common in functional programming and is sometimes referred to as a conditional transformation.

## API Reference

### `when(predicate, transformation)`

Creates a function that will apply a transformation to a value only if the predicate returns true for that value.

**Parameters:**
- `predicate`: A function that takes a value and returns a boolean
- `transformation`: A function that transforms the input value

**Returns:** 
A function that takes a value and returns either the transformed value (if the predicate returns true) or the original value (if the predicate returns false).

**Example:**
```javascript
import { when } from '@efthemiosprime/polyx';

const isEven = x => x % 2 === 0;
const double = x => x * 2;

// Create a function that doubles even numbers but leaves odd numbers unchanged
const doubleIfEven = when(isEven, double);

console.log(doubleIfEven(4)); // 8 (4 is even, so it gets doubled)
console.log(doubleIfEven(5)); // 5 (5 is odd, so it remains unchanged)
```

## Real-World Examples

### Example 1: Form Data Validation

```javascript
import { when, compose } from '@efthemiosprime/polyx';

// Predicates
const isEmpty = str => str.trim().length === 0;
const isNotEmail = str => !str.includes('@');

// Transformations
const withError = value => ({ value, error: 'This field is required' });
const withEmailError = value => ({ value, error: 'Invalid email format' });

// Create validation functions
const validateRequired = when(isEmpty, withError);
const validateEmail = when(isNotEmail, withEmailError);

// Combine validations using compose
const validateEmailField = compose(
  result => result.error ? result : { value: result.value, error: null },
  validateEmail,
  value => validateRequired(value).error 
    ? validateRequired(value) 
    : { value }
);

// Usage
console.log(validateEmailField(''));          // { value: '', error: 'This field is required' }
console.log(validateEmailField('invalid'));   // { value: 'invalid', error: 'Invalid email format' }
console.log(validateEmailField('user@example.com')); // { value: 'user@example.com', error: null }
```

### Example 2: Data Transformation Pipeline

```javascript
import { when, compose } from '@efthemiosprime/polyx';

// Process user data with conditional transformations
const processUser = user => {
  // Predicates
  const isMinor = user => user.age < 18;
  const hasIncompleteProfile = user => !user.email || !user.phoneNumber;
  
  // Transformations
  const flagAsMinor = user => ({ ...user, minor: true });
  const flagAsIncomplete = user => ({ ...user, profileStatus: 'incomplete' });
  
  // Create conditional transformations
  const markIfMinor = when(isMinor, flagAsMinor);
  const markIfIncomplete = when(hasIncompleteProfile, flagAsIncomplete);
  
  // Apply transformations in sequence
  return compose(
    markIfIncomplete,
    markIfMinor
  )(user);
};

// Usage
const user1 = { name: 'John', age: 16, email: 'john@example.com', phoneNumber: '123-456-7890' };
const user2 = { name: 'Alice', age: 25, email: 'alice@example.com' };

console.log(processUser(user1));
// { name: 'John', age: 16, email: 'john@example.com', phoneNumber: '123-456-7890', minor: true }

console.log(processUser(user2));
// { name: 'Alice', age: 25, email: 'alice@example.com', profileStatus: 'incomplete' }
```

### Example 3: Imperative vs Declarative

#### Imperative Approach
```javascript
function processNumber(num) {
  if (num % 2 === 0) {
    return num * 2;
  }
  return num;
}

function processArray(numbers) {
  const results = [];
  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i];
    if (num > 10) {
      results.push(processNumber(num));
    } else {
      results.push(num);
    }
  }
  return results;
}
```

#### Declarative Approach with `when`
```javascript
import { when, compose } from '@efthemiosprime/polyx';

const isEven = x => x % 2 === 0;
const double = x => x * 2;
const doubleIfEven = when(isEven, double);

const isGreaterThan10 = x => x > 10;
const processLargeNumber = when(isGreaterThan10, doubleIfEven);

const processArray = numbers => numbers.map(processLargeNumber);

// Usage
const numbers = [5, 12, 15, 8, 20];
console.log(processArray(numbers)); // [5, 24, 15, 8, 40]
```

## Combining with Other PolyX Modules

### Example with Maybe and When

```javascript
import { when, Maybe, compose } from '@efthemiosprime/polyx';

// Check if a user is eligible for premium features
const isPremiumUser = user => user.subscription === 'premium' || user.credits > 100;
const enhanceUserFeatures = user => ({
  ...user,
  features: [...(user.features || []), 'advanced-analytics', 'priority-support']
});

// Apply premium features only to eligible users
const applyPremiumFeaturesIfEligible = when(isPremiumUser, enhanceUserFeatures);

// Process user data
const processUser = compose(
  maybeUser => maybeUser.map(applyPremiumFeaturesIfEligible),
  userId => Maybe.fromNullable(getUserById(userId))
);

// Usage
const processedUser = processUser('user123')
  .getOrElse({ error: 'User not found' });
```

### Example with Either and When

```javascript
import { when, Either, compose } from '@efthemiosprime/polyx';

// Validate user input
const validateUserInput = input => {
  const hasErrors = !input.name || !input.email;
  
  return hasErrors
    ? Either.Left({ error: 'Missing required fields' })
    : Either.Right(input);
};

// Enrichment for valid data
const isComplete = data => data.name && data.email && data.preferences;
const addDefaultPreferences = data => ({
  ...data,
  preferences: data.preferences || { theme: 'light', notifications: true }
});

// Apply default preferences only if needed
const enrichData = when(
  data => !isComplete(data),
  addDefaultPreferences
);

// Processing pipeline
const processInput = input => 
  validateUserInput(input)
    .map(enrichData);

// Usage
const input1 = { name: 'John', email: 'john@example.com' };
const input2 = { name: 'John' };

console.log(processInput(input1));
// Either.Right({ name: 'John', email: 'john@example.com', preferences: { theme: 'light', notifications: true } })

console.log(processInput(input2));
// Either.Left({ error: 'Missing required fields' })
```

## Pattern Matching with When

The `when` function can be used as a building block for simple pattern matching:

```javascript
import { when, compose } from '@efthemiosprime/polyx';

// Simple pattern matching using multiple when clauses
const match = (value, patterns) => {
  for (const [predicate, transformation] of patterns) {
    if (predicate(value)) {
      return transformation(value);
    }
  }
  return value; // Default case
};

// Example: Process different types of messages
const processMessage = message => match(message, [
  [msg => msg.type === 'error', msg => ({ ...msg, priority: 'high', color: 'red' })],
  [msg => msg.type === 'warning', msg => ({ ...msg, priority: 'medium', color: 'yellow' })],
  [msg => msg.type === 'success', msg => ({ ...msg, priority: 'low', color: 'green' })],
  // Default case
  [() => true, msg => ({ ...msg, priority: 'normal', color: 'blue' })]
]);

// Usage
console.log(processMessage({ type: 'error', text: 'Failed to connect' }));
// { type: 'error', text: 'Failed to connect', priority: 'high', color: 'red' }

console.log(processMessage({ type: 'info', text: 'Operation completed' }));
// { type: 'info', text: 'Operation completed', priority: 'normal', color: 'blue' }
```

## Related Concepts

- **Predicate composition**: Combining multiple predicates using logical operations
- **Condition chaining**: Using multiple `when` functions in sequence
- **Partial application**: Creating specialized versions of `when` with fixed predicates
- **Pattern matching**: More sophisticated conditionals based on structure and content of data