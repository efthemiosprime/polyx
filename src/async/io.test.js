import { describe, it, expect, vi } from 'vitest';
import { IO } from './io.js';

describe('IO', () => {
  it('is lazy: the effect does not run until run() is called', () => {
    const effect = vi.fn(() => 42);
    const io = IO(effect);
    expect(effect).not.toHaveBeenCalled();
    expect(io.run()).toBe(42);
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('maps over the eventual result without running early', () => {
    const effect = vi.fn(() => 5);
    const io = IO(effect).map((x) => x + 1);
    expect(effect).not.toHaveBeenCalled();
    expect(io.run()).toBe(6);
  });

  it('flatMap / chain sequences IO computations', () => {
    const io = IO(() => 5).flatMap((x) => IO(() => x * 2));
    expect(io.run()).toBe(10);
    expect(IO(() => 5).chain((x) => IO(() => x * 2)).run()).toBe(10);
  });

  it('concat runs this for effects and returns the other result', () => {
    const first = vi.fn(() => 'a');
    const io = IO(first).concat(IO(() => 'b'));
    expect(io.run()).toBe('b');
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('catchError recovers from a thrown effect', () => {
    const io = IO(() => {
      throw new Error('boom');
    }).catchError((e) => IO(() => `handled:${e.message}`));
    expect(io.run()).toBe('handled:boom');
  });

  describe('statics', () => {
    it('IO.of returns a fixed value', () => {
      expect(IO.of(7).run()).toBe(7);
    });

    it('IO.from wraps a function', () => {
      expect(IO.from(() => 8).run()).toBe(8);
    });

    it('IO.log returns the message', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      expect(IO.log('hi').run()).toBe('hi');
      spy.mockRestore();
    });

    it('IO.prop reads a property lazily', () => {
      expect(IO.prop('name')({ name: 'polyx' }).run()).toBe('polyx');
    });
  });
});
