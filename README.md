# @efthemiosprime/polyx

A lightweight functional programming library implementing various concepts from category theory.

## Purpose
PolyX is primarily designed for learning purposes. While there are already many robust and battle-tested functional programming libraries available for JavaScript, I created PolyX as a personal journey to deeply understand both the theoretical foundations and practical implementations of these concepts. This library represents my hands-on exploration of functional programming patterns and how they can be applied to real-world projects. It's ideal for developers who, like me, want to learn by building and experimenting with these powerful abstractions rather than just using them as a black box. PolyX helps JavaScript developers:

- **Learn** fundamental category theory concepts through practical code examples
- **Explore** functional programming patterns in a real-world context
- **Apply** powerful abstractions to everyday JavaScript problems
- **Understand** how mathematical concepts translate into programming paradigms


## Documentation

Comprehensive documentation for PolyX is available in the [docs](/docs) directory. 

Key sections:
- [Getting Started](/docs/getting-started.md)
- [Core Modules](/docs/core)
- [Common Patterns](/docs/patterns)
- [Recipes](/docs/recipes)
- [API Reference](/docs/api)

For a complete overview, see the [Documentation Table of Contents](/docs/README.md).

## Installation

```bash
npm install @efthemiosprime/polyx
```

## Core Concepts

Poly implements several key abstractions from category theory:

### Maybe
Handle nullable values without null checks

```javascript
// Instead of:
const name = user && user.profile && user.profile.name ? user.profile.name : 'Guest';

// Use Maybe:
import { Maybe } from '@efthemiosprime/polyx';

const name = Maybe.of(user)
  .map(user => user.profile)
  .map(profile => profile.name)
  .getOrElse('Guest');
```

### Either
Express computations that might fail without throwing exceptions

```javascript
import { Either } from '@efthemiosprime/polyx';

const divide = (a, b) => 
  b === 0 
    ? Either.Left(new Error('Division by zero'))
    : Either.Right(a / b);

divide(10, 2)
  .fold(
    error => console.error(error.message),
    result => console.log(`Result: ${result}`)
  );
```

### Task
Manage asynchronous operations with better composition than Promises

```javascript
import { Task } from '@efthemiosprime/polyx';

const fetchUser = id => 
  Task((reject, resolve) => 
    fetch(`/api/users/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
      })
      .then(resolve)
      .catch(reject)
  );

fetchUser(123)
  .map(user => user.name)
  .fork(
    error => console.error('Error:', error.message),
    name => console.log('User name:', name)
  );
```

## Learning Path

PolyX is organized to help you learn functional programming concepts incrementally:

1. **Start with Maybe** - The simplest and most immediately useful monad
2. **Explore Either** - Learn error handling without exceptions
3. **Try Task** - Understand asynchronous operations in a functional way
4. **Study IO** - See how to handle side effects functionally
5. **Dive into Reader/State** - Explore dependency injection and state management
6. **Experiment with Lenses** - Learn immutable data manipulation techniques

## Examples

The library includes practical examples to help you understand how these concepts apply to real-world problems:

- Form validation using Applicative and Either
- API clients using Task and Reader
- State management using State monad
- DOM manipulation using IO monad

## Educational Resources

PolyX comes with detailed documentation explaining not just how to use each abstraction, but also:

- The mathematical concepts behind each implementation
- Diagrams illustrating how data flows through these structures
- Interactive examples showing practical applications
- Comparisons with imperative solutions to the same problems

## Playground

Try out PolyX concepts in our online playground without installation:

[PolyX Playground](https://efthemiosprime.github.io/poly-playground) (coming soon)

## Further Learning

If you're interested in diving deeper into category theory and functional programming:

- [Category Theory for Programmers](https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers-the-preface/)
- [Functional Programming in JavaScript](https://mostly-adequate.gitbook.io/mostly-adequate-guide/)
- [What is a Monad?](https://stackoverflow.com/questions/44965/what-is-a-monad)

## Contributing

We welcome contributions, especially:

- Additional examples showcasing practical applications
- Better educational content explaining the concepts
- Improvements to documentation and learning materials
- New category theory concepts implemented in JavaScript

## License

MIT
