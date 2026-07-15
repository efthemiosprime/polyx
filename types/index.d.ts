// Type definitions for @efthemiosprime/polyx
// Hand-written to match the runtime in src/. Declaration-merged interface + const
// pairs give each ADT both a type (Maybe<T>) and a value namespace (Maybe.of).

// ---------------------------------------------------------------------------
// core / Maybe
// ---------------------------------------------------------------------------

export interface Maybe<T> {
  readonly value: T;
  readonly isNothing: boolean;
  map<U>(fn: (value: T) => U): Maybe<U>;
  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U>;
  chain<U>(fn: (value: T) => Maybe<U>): Maybe<U>;
  filter(predicate: (value: T) => boolean): Maybe<T>;
  tap(fn: (value: T) => void): Maybe<T>;
  fold<A, B>(onNothing: () => A, onJust: (value: T) => B): A | B;
  orElse<U>(fn: () => Maybe<U>): Maybe<T | U>;
  /** Applicative apply — valid when T is a unary function `(a: A) => B`. */
  ap<A, B>(other: Maybe<A>): Maybe<B>;
  getOrElse<U>(defaultValue: U): T | U;
  /** Lazy getOrElse — the thunk runs only for a Nothing. */
  getOrElseGet<U>(fn: () => U): T | U;
  /** Nothing -> Left(leftValue); Just -> Right(value). */
  toEither<L>(leftValue: L): Either<L, T>;
}

export const Maybe: {
  of<T>(value: T | null | undefined): Maybe<T>;
};

// ---------------------------------------------------------------------------
// core / Either
// ---------------------------------------------------------------------------

export interface Either<L, R> {
  readonly isLeft: boolean;
  readonly isRight: boolean;
  readonly value: L | R;
  map<R2>(fn: (r: R) => R2): Either<L, R2>;
  flatMap<L2, R2>(fn: (r: R) => Either<L2, R2>): Either<L | L2, R2>;
  chain<L2, R2>(fn: (r: R) => Either<L2, R2>): Either<L | L2, R2>;
  mapLeft<L2>(fn: (l: L) => L2): Either<L2, R>;
  bimap<L2, R2>(onLeft: (l: L) => L2, onRight: (r: R) => R2): Either<L2, R2>;
  tap(fn: (r: R) => void): Either<L, R>;
  /** Applicative apply — valid when R is a unary function `(a: A) => B`. */
  ap<A, B>(other: Either<L, A>): Either<L, B>;
  orElse<L2, R2>(fn: (l: L) => Either<L2, R2>): Either<L2, R | R2>;
  fold<A, B>(onLeft: (l: L) => A, onRight: (r: R) => B): A | B;
  getOrElse<U>(defaultValue: U): R | U;
  /** Lazy getOrElse — the thunk runs only for a Left. */
  getOrElseGet<U>(fn: () => U): R | U;
  /** Left -> Nothing; Right -> Just(value). */
  toMaybe(): Maybe<R>;
}

export const Either: {
  Left<L>(x: L): Either<L, never>;
  Right<R>(x: R): Either<never, R>;
  of<R>(x: R): Either<never, R>;
  fromNullable<T>(x: T | null | undefined): Either<null, T>;
  tryCatch<R>(f: () => R): Either<unknown, R>;
  fromCondition<L, R>(
    condition: boolean,
    leftValue?: L,
    rightValue?: R
  ): Either<L | null, R | null>;
};

// ---------------------------------------------------------------------------
// core / Validation (applicative, accumulates errors)
// ---------------------------------------------------------------------------

export interface Validation<E, A> {
  readonly isSuccess: boolean;
  readonly isFailure: boolean;
  /** The success value for a Success, or the errors array for a Failure. */
  readonly value: A | E[];
  map<B>(fn: (value: A) => B): Validation<E, B>;
  mapFailure<E2>(fn: (errors: E[]) => E2[]): Validation<E2, A>;
  bimap<E2, B>(onFailure: (errors: E[]) => E2[], onSuccess: (value: A) => B): Validation<E2, B>;
  /** Applicative apply — accumulates errors. Valid when A is `(x: X) => B`. */
  ap<X, B>(other: Validation<E, X>): Validation<E, B>;
  fold<R>(onFailure: (errors: E[]) => R, onSuccess: (value: A) => R): R;
  getOrElse<U>(defaultValue: U): A | U;
  toEither(): Either<E[], A>;
}

export const Validation: {
  Success<E, A>(value: A): Validation<E, A>;
  Failure<E, A = never>(errors: E[]): Validation<E, A>;
  of<E, A>(value: A): Validation<E, A>;
  fail<E>(error: E): Validation<E, never>;
  fromEither<L, R>(either: Either<L, R>): Validation<L, R>;
};

// ---------------------------------------------------------------------------
// core / ArrayTransform
// ---------------------------------------------------------------------------

export interface ArrayTransform<T> {
  readonly value: T[];
  map<U>(fn: (item: T, index: number) => U): ArrayTransform<U>;
  filter(fn: (item: T, index: number) => boolean): ArrayTransform<T>;
  flatMap<U>(fn: (item: T, index: number) => U | readonly U[]): ArrayTransform<U>;
  chain<U>(fn: (item: T, index: number) => U | readonly U[]): ArrayTransform<U>;
  forEach(fn: (item: T, index: number) => void): ArrayTransform<T>;
  take(n: number): ArrayTransform<T>;
  drop(n: number): ArrayTransform<T>;
  unique(keyFn?: (item: T) => unknown): ArrayTransform<T>;
  reduce(fn: (acc: T, item: T, index: number) => T): T;
  reduce<U>(fn: (acc: U, item: T, index: number) => U, initial: U): U;
  groupBy(fn: (item: T) => PropertyKey): Record<string, T[]>;
  partition(pred: (item: T) => boolean): [T[], T[]];
  find(fn: (item: T, index: number) => boolean): Maybe<T>;
  head(): Maybe<T>;
  last(): Maybe<T>;
  some(fn: (item: T, index: number) => boolean): boolean;
  every(fn: (item: T, index: number) => boolean): boolean;
  isEmpty(): boolean;
  toSet(): Set<T>;
  toArray(): T[];
}

export const ArrayTransform: {
  from<T>(source: Iterable<T> | ArrayLike<T>): ArrayTransform<T>;
  of<T>(value: T): ArrayTransform<T>;
};

// ---------------------------------------------------------------------------
// core / compose & combinators
// ---------------------------------------------------------------------------

export function compose<A>(...fns: Array<(a: any) => any>): (a: A) => any;
export function pipe<A>(...fns: Array<(a: any) => any>): (a: A) => any;
export function curry(fn: (...args: any[]) => any): (...args: any[]) => any;
export function tap<T>(fn: (value: T) => void): (value: T) => T;
export function when<T>(predicate: (v: T) => boolean, fn: (v: T) => T): (v: T) => T;
export function ifElse<T, A, B>(
  predicate: (v: T) => boolean,
  onTrue: (v: T) => A,
  onFalse: (v: T) => B
): (v: T) => A | B;
export function evolve<T extends object, K extends keyof T>(
  prop: K,
  fn: (v: T[K]) => T[K]
): (obj: T) => T;
export function identity<T>(x: T): T;
export function always<T>(x: T): () => T;
export function complement<A extends any[]>(
  predicate: (...args: A) => boolean
): (...args: A) => boolean;

// ---------------------------------------------------------------------------
// async / IO
// ---------------------------------------------------------------------------

export interface IO<T> {
  run(): T;
  map<U>(f: (value: T) => U): IO<U>;
  flatMap<U>(f: (value: T) => IO<U>): IO<U>;
  chain<U>(f: (value: T) => IO<U>): IO<U>;
  concat<U>(otherIO: IO<U>): IO<U>;
  catchError(handler: (error: unknown) => IO<T>): IO<T>;
}

export const IO: {
  <T>(fn: () => T): IO<T>;
  of<T>(x: T): IO<T>;
  from<T>(f: () => T): IO<T>;
  now(): IO<Date>;
  random(): IO<number>;
  log<T>(message: T): IO<T>;
  prop<T = unknown>(prop: string): (obj: any) => IO<T>;
  localStorage: {
    getItem(key: string): IO<string | null>;
    setItem(key: string): (value: string) => IO<string | null>;
    removeItem(key: string): IO<boolean>;
  };
};

// ---------------------------------------------------------------------------
// async / Task
// ---------------------------------------------------------------------------

export interface Task<E, A> {
  fork(onRejected: (error: E) => void, onResolved: (value: A) => void): void;
  map<B>(f: (value: A) => B): Task<E, B>;
  mapRejected<E2>(f: (error: E) => E2): Task<E2, A>;
  flatMap<E2, B>(f: (value: A) => Task<E2, B>): Task<E | E2, B>;
  chain<E2, B>(f: (value: A) => Task<E2, B>): Task<E | E2, B>;
  /** Applicative apply — valid when A is a unary function `(a: X) => B`. */
  ap<X, B>(taskOfValue: Task<E, X>): Task<E, B>;
  orElse<E2, B>(handler: (error: E) => Task<E2, B>): Task<E2, A | B>;
}

export const Task: {
  <E, A>(
    computation: (reject: (error: E) => void, resolve: (value: A) => void) => void
  ): Task<E, A>;
  of<A>(value: A): Task<never, A>;
  resolved<A>(value: A): Task<never, A>;
  rejected<E>(error: E): Task<E, never>;
  fromPromise<A>(promiseFn: () => Promise<A>): Task<unknown, A>;
  toPromise<E, A>(task: Task<E, A>): Promise<A>;
};

// ---------------------------------------------------------------------------
// data / flatten & path
// ---------------------------------------------------------------------------

export interface FlattenOptions {
  removeNested?: boolean;
  unwrapPaths?: string[];
  delimiter?: string;
}
export function flatten(obj: object, options?: FlattenOptions): Record<string, any>;
export function flattenWith(paths: string[]): (obj: any) => any;

export type PathKey = string | ReadonlyArray<string | number>;
export interface PathAccessor {
  value: any;
  get(pathStr: PathKey, defaultValue?: any): any;
  has(pathStr: PathKey): boolean;
  getAll(pathStr: PathKey): any[];
  prop(pathStr: PathKey): (object: any) => any;
  data(): PathAccessor;
  attributes(): PathAccessor;
}
export function path(obj: any): PathAccessor;
export function getPath(pathStr: PathKey): (obj: any) => any;
export function makePath(...parts: Array<string | null | undefined>): string;

// ---------------------------------------------------------------------------
// dom / isInView, scrollManager, utils
// ---------------------------------------------------------------------------

export interface IsInViewOptions {
  isMobile?: () => boolean;
  mobileOffset?: number;
  desktopOffset?: number;
}
export function isInView(
  element: Element | null,
  align?: 'top' | 'center' | 'bottom',
  options?: IsInViewOptions
): boolean;
export function createInViewChecker(
  selector: string,
  align?: 'top' | 'center' | 'bottom',
  options?: IsInViewOptions
): () => boolean;

export interface ScrollData {
  y: number;
  direction: 'up' | 'down';
  timestamp: number;
}
export interface ScrollSubscribeOptions {
  throttle?: number;
  debounce?: number;
}
export interface OneTimeTriggerOptions {
  direction?: 'up' | 'down';
  callback: (data: ScrollData) => void;
  resetOnStop?: boolean;
  resetDelay?: number;
  requireActualScroll?: boolean;
  debounceInterval?: number;
}
export interface ScrollManagerInstance {
  subscribe(
    callback: (data: ScrollData) => void,
    options?: ScrollSubscribeOptions
  ): () => void;
  unsubscribe(callback: (data: ScrollData) => void): void;
  getScrollPosition(): ScrollData;
  addOneTimeTrigger(options: OneTimeTriggerOptions): string | null;
  removeOneTimeTrigger(triggerId: string): void;
  resetOneTimeTrigger(triggerId: string): void;
  resetAllOneTimeTriggers(): void;
}
export const scrollManager: ScrollManagerInstance;

export function getElement(selector: string, parent?: Element): Maybe<Element>;
export function getElements(selector: string): Element[];
export function addClass(className: string): (element: Element) => Maybe<Element>;
export function removeClass(className: string): (element: Element) => Maybe<Element>;
export function toggleClass(
  className: string,
  force?: boolean
): (element: Element) => Maybe<Element>;
export function addEvent(
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): (element: Element) => Maybe<Element>;
export function on(
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): (element: Element | null | undefined) => () => void;
export function delegate(
  parent: Element | null | undefined,
  event: string,
  selector: string,
  handler: (event: Event, matchedElement: Element) => void
): () => void;
export function onIntersect(
  target: string | Element | NodeListOf<Element> | Element[] | null | undefined,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): () => void;
export function onResize(
  target: string | Element | NodeListOf<Element> | Element[] | null | undefined,
  callback: ResizeObserverCallback,
  options?: ResizeObserverOptions
): () => void;
export function onMutation(
  target: string | Element | NodeListOf<Element> | Element[] | null | undefined,
  callback: MutationCallback,
  options?: MutationObserverInit
): () => void;
export function ready(): Task<never, Document | undefined>;

// ---------------------------------------------------------------------------
// dom / pure lazy DOM ops (domIO) + functional element construction
// ---------------------------------------------------------------------------

type Nullable<T> = T | null | undefined;

export interface DomIO {
  query(selector: string, parent?: Element): IO<Element | null>;
  queryAll(selector: string, parent?: Element): IO<Element[]>;
  addClass(className: string): (element: Nullable<Element>) => IO<Nullable<Element>>;
  removeClass(className: string): (element: Nullable<Element>) => IO<Nullable<Element>>;
  toggleClass(
    className: string,
    force?: boolean
  ): (element: Nullable<Element>) => IO<Nullable<Element>>;
  setStyle(
    property: string,
    value: string
  ): (element: Nullable<Element>) => IO<Nullable<Element>>;
  setHtml(html: string): (element: Nullable<Element>) => IO<Nullable<Element>>;
  setText(text: string): (element: Nullable<Element>) => IO<Nullable<Element>>;
  setAttr(
    name: string,
    value: string
  ): (element: Nullable<Element>) => IO<Nullable<Element>>;
  removeAttr(name: string): (element: Nullable<Element>) => IO<Nullable<Element>>;
  remove(): (element: Nullable<Element>) => IO<Nullable<Element>>;
}

export const domIO: DomIO;

export function create(
  tag: string,
  props?: Record<string, unknown>,
  children?: string | Node | Array<string | Node>
): IO<Element>;
export function setStyle(
  property: string,
  value: string
): (element: Element) => Maybe<Element>;
export function getStyle(
  property: string
): (element: Element) => Maybe<string>;
export function setHtml(html: string): (element: Element) => Maybe<Element>;
export function setText(text: string): (element: Element) => Maybe<Element>;

// ---------------------------------------------------------------------------
// namespace re-exports (import * as core from '@efthemiosprime/polyx')
// ---------------------------------------------------------------------------

export * as core from './core';
export * as data from './data';
export * as dom from './dom';
export * as async from './async';
