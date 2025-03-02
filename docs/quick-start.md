# PolyX Quick Start Guide

This guide will help you get started with PolyX by walking through some common use cases and patterns. By the end, you'll have a solid understanding of how to use the core functionalities of the library.

## Table of Contents
- [Setting Up](#setting-up)
- [The Maybe Monad: Handling Nullable Values](#the-maybe-monad-handling-nullable-values)
- [The Either Monad: Handling Errors](#the-either-monad-handling-errors)
- [Working with Tasks: Handling Asynchronous Operations](#working-with-tasks-handling-asynchronous-operations)
- [Combining Multiple Patterns](#combining-multiple-patterns)
- [Next Steps](#next-steps)

## Setting Up

If you haven't installed PolyX yet, follow the [Installation Guide](/docs/installation.md). Once installed, you can import the modules you need:

```javascript
// Import specific modules
import { Maybe, Either, Task } from 'polyx';

// Or import everything
import * as PolyX from 'polyx';
```

## The Maybe Monad: Handling Nullable Values

The Maybe monad is designed to handle values that might be null or undefined, without the need for explicit null checks.

### Basic Usage

```javascript
// Import the Maybe module
import { Maybe } from 'polyx';

// Creating a Maybe from a value that might be null
function getUserById(id) {
  // This function might return null if user doesn't exist
  const user = findUserInDatabase(id);
  
  // Wrap the result in a Maybe
  return Maybe.fromNullable(user);
}

// Using the Maybe monad to safely access properties
const userName = getUserById(123)
  .map(user => user.name)
  .getOrElse('Guest');

console.log(userName); // Will be the user's name or 'Guest' if user doesn't exist
```

### Chaining Operations

One of the powerful features of Maybe is the ability to chain multiple operations that might fail:

```javascript
// Function to get a user's address from their profile
function getUserAddress(userId) {
  return Maybe.fromNullable(getUserProfile(userId))
    .chain(profile => Maybe.fromNullable(profile.address))
    .map(address => `${address.street}, ${address.city}, ${address.zipCode}`)
    .getOrElse('Address not available');
}
```

## The Either Monad: Handling Errors

While Maybe is great for handling nulls, Either allows you to handle errors with meaningful information.

### Basic Usage

```javascript
import { Either } from 'polyx';

// A function that might fail
function divide(a, b) {
  if (b === 0) {
    return Either.left('Division by zero');
  }
  return Either.right(a / b);
}

// Using Either to handle the result
const result = divide(10, 2)
  .map(result => `Result: ${result}`)
  .getOrElse('Error occurred');

console.log(result); // "Result: 5"

const errorResult = divide(10, 0)
  .map(result => `Result: ${result}`)
  .getOrElse('Error occurred');

console.log(errorResult); // "Error occurred"
```

### Error Recovery

Either also allows you to recover from errors:

```javascript
function fetchUserData(userId) {
  // This might return Either.left with an error
  return apiCall(`/users/${userId}`);
}

fetchUserData(123)
  .map(user => renderUserProfile(user))
  .orElse(error => {
    if (error.code === 'NOT_FOUND') {
      return Either.right(renderNotFoundPage());
    }
    return Either.right(renderErrorPage(error));
  });
```

## Working with Tasks: Handling Asynchronous Operations

Task is a monad for handling asynchronous operations, similar to Promises but with more powerful composition.

### Basic Usage

```javascript
import { Task } from 'polyx';

// Creating a Task
const fetchUserTask = Task.of((reject, resolve) => {
  fetch('/api/users/123')
    .then(response => {
      if (response.ok) return response.json();
      reject(new Error('Failed to fetch user'));
    })
    .then(data => resolve(data))
    .catch(err => reject(err));
});

// Using the Task
fetchUserTask
  .map(user => user.name)
  .fork(
    error => console.error('Error:', error),
    name => console.log('User name:', name)
  );
```

### Composing Multiple Tasks

```javascript
// Task to fetch a user
const getUser = id => Task.of((reject, resolve) => {
  fetch(`/api/users/${id}`)
    .then(res => res.json())
    .then(resolve)
    .catch(reject);
});

// Task to fetch user's posts
const getUserPosts = userId => Task.of((reject, resolve) => {
  fetch(`/api/users/${userId}/posts`)
    .then(res => res.json())
    .then(resolve)
    .catch(reject);
});

// Compose tasks
const getUserWithPosts = userId => 
  getUser(userId)
    .chain(user => 
      getUserPosts(user.id)
        .map(posts => ({ ...user, posts }))
    );

// Execute
getUserWithPosts(123).fork(
  error => console.error('Failed:', error),
  userWithPosts => renderUserProfile(userWithPosts)
);
```

## Combining Multiple Patterns

PolyX modules are designed to work together seamlessly:

```javascript
// Combining Maybe, Either, and Task
function loadUserData(userId) {
  return Task.of((reject, resolve) => {
    fetch(`/api/users/${userId}`)
      .then(response => {
        if (!response.ok) {
          reject(new Error(`HTTP Error: ${response.status}`));
          return;
        }
        return response.json();
      })
      .then(resolve)
      .catch(reject);
  })
  .map(data => Either.fromNullable(data, 'User data is null'))
  .chain(dataEither => 
    dataEither.fold(
      error => Task.rejected(error),
      data => Task.resolved(data)
    )
  )
  .map(user => Maybe.fromNullable(user.profile))
  .map(profileMaybe => profileMaybe.getOrElse({ name: 'Unknown', email: 'N/A' }));
}

// Usage
loadUserData(123).fork(
  error => console.error('Error:', error),
  profile => displayUserProfile(profile)
);
```

## Next Steps

Now that you're familiar with the basics of PolyX, you can explore more advanced topics:

- [Deep dive into the Maybe monad](/docs/core/maybe.md)
- [Learn about Validation for form handling](/docs/core/validation.md)
- [Explore common patterns and recipes](/docs/patterns)
- [Understand the mathematical foundations](/docs/core-concepts.md#math-foundations)

Remember, functional programming is about thinking differently. It might take some time to get comfortable with these patterns, but they can lead to more robust, maintainable code.
