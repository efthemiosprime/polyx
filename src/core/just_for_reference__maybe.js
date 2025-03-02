// this is just a reference for oo approach
class Maybe {
    constructor(value) {
      this.value = value;
    }
  
    static of(value) {
      return value === null || value === undefined ? new Nothing() : new Just(value);
    }
  
    isNothing() {
      return this instanceof Nothing;
    }
  
    isJust() {
      return this instanceof Just;
    }
  
    map(fn) {
      return this.isNothing() ? this : new Just(fn(this.value));
    }
  
    flatMap(fn) {
      return this.isNothing() ? this : fn(this.value);
    }
  
    filter(predicate) {
      return this.isNothing() || predicate(this.value) ? this : new Nothing();
    }
  
    tap(fn) {
      if (this.isJust()) {
        fn(this.value);
      }
      return this;
    }
  
    getOrElse(defaultValue) {
      return this.isNothing() ? defaultValue : this.value;
    }
  
    chain(fn) {
      return this.flatMap(fn);
    }
  }
  
  class Just extends Maybe {
    constructor(value) {
      super(value);
    }
  }
  
  class Nothing extends Maybe {
    constructor() {
      super(null);
    }
  
    map() {
      return this;
    }
  
    flatMap() {
      return this;
    }
  
    filter() {
      return this;
    }
  }
  
  // Example usage:
  const result = Maybe.of(5)
    .map(x => x * 2)
    .filter(x => x > 5)
    .getOrElse(0); // Returns 10
  
  const nothingExample = Maybe.of(null)
    .map(x => x * 2)
    .getOrElse(0); // Returns 0
  