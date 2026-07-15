// Type-level tests for the hand-written declarations in types/.
// Not shipped (outside package.json "files"); run via `npm run typecheck`.
import {
  Maybe,
  Either,
  ArrayTransform,
  IO,
  Task,
  compose,
  pipe,
  ifElse,
  identity,
  always,
  complement,
  flatten,
  path,
  getPath,
  isInView,
  scrollManager,
  getElement,
} from '../types/index';
import { Maybe as CoreMaybe } from '../types/core';
import { flatten as DataFlatten } from '../types/data';
import { scrollManager as DomScroll } from '../types/dom';
import { IO as AsyncIO } from '../types/async';

// --- Maybe ---
const m: Maybe<number> = Maybe.of(5);
const folded: string = m.fold(() => 'none', (x) => `just:${x}`);
const or: Maybe<number> = m.orElse(() => Maybe.of(0));
const apM: Maybe<number> = Maybe.of((x: number) => x + 1).ap(Maybe.of(9));

// --- Either ---
const e: Either<string, number> = Either.of(5);
const chained = e.chain((x) => Either.Right(x + 1));
const wrapped: Either<string, number> = Either.Left<string>('boom').mapLeft((s) => s.toUpperCase());
const bi = e.bimap((l) => l.length, (r) => r * 2);
const apE = Either.Right((x: number) => x + 1).ap(Either.Right(9));
const recovered = Either.Left<string>('e').orElse((s) => Either.Right(s.length));

// --- ArrayTransform ---
const at = ArrayTransform.from([1, 2, 3]);
const sum: number = at.reduce((acc, x) => acc + x, 0);
const first: Maybe<number> = at.find((x) => x > 1);
const flat = at.flatMap((x) => [x, x * 10]).toArray();

// --- compose helpers ---
const inc = (x: number) => x + 1;
const dbl = (x: number) => x * 2;
const f = compose(inc, dbl);
const g = pipe(inc, dbl);
const id: number = identity(5);
const seven = always(7);
const isOdd = complement((x: number) => x % 2 === 0);
const cond = ifElse((x: number) => x > 0, inc, identity);

// --- async ---
const io: IO<number> = IO.of(1).map((x) => x + 1);
const task: Task<never, number> = Task.of(1).map((x) => x + 1);

// --- data / dom ---
const flat2 = flatten({ a: { b: 1 } });
const title = path({ a: { b: 2 } }).get('a.b');
const getter = getPath('a.b');
const inView: boolean = isInView(null);
const pos = scrollManager.getScrollPosition();
const el = getElement('.x');

// touch everything so the fixture stays valid regardless of noUnusedLocals
void [folded, or, apM, chained, wrapped, bi, apE, recovered, sum, first, flat,
  f, g, id, seven, isOdd, cond, io, task, flat2, title, getter, inView, pos, el,
  CoreMaybe, DataFlatten, DomScroll, AsyncIO];
