// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { domIO, create } from './domIO.js';

const { query, queryAll, addClass, toggleClass, setStyle, setText, setAttr, remove } = domIO;

describe('domIO — laziness & purity', () => {
  it('does not mutate until run() is called', () => {
    const el = document.createElement('div');
    const program = addClass('active')(el); // built, not run

    expect(el.classList.contains('active')).toBe(false);

    const returned = program.run();
    expect(el.classList.contains('active')).toBe(true);
    expect(returned).toBe(el); // yields the element for chaining
  });

  it('is null-safe — a nullish element is a no-op that yields the value', () => {
    expect(() => addClass('x')(null).run()).not.toThrow();
    expect(addClass('x')(null).run()).toBe(null);
    expect(setText('hi')(undefined).run()).toBe(undefined);
  });

  it('applies effects only once per run, and re-run repeats them', () => {
    const el = document.createElement('div');
    const program = toggleClass('on')(el);

    program.run();
    expect(el.classList.contains('on')).toBe(true);
    program.run(); // toggle again
    expect(el.classList.contains('on')).toBe(false);
  });
});

describe('domIO — composition via query + chain', () => {
  it('chains a query source through several ops in one run', () => {
    document.body.innerHTML = '<button id="save">x</button>';

    const program = query('#save')
      .chain(addClass('is-active'))
      .chain(setText('Saved'))
      .chain(setAttr('data-state', 'done'));

    const el = program.run();

    expect(el.classList.contains('is-active')).toBe(true);
    expect(el.textContent).toBe('Saved');
    expect(el.getAttribute('data-state')).toBe('done');
  });

  it('a chain over a missing element completes without throwing', () => {
    const program = query('#nope').chain(addClass('x')).chain(setText('y'));
    expect(() => program.run()).not.toThrow();
    expect(program.run()).toBe(null);
  });

  it('queryAll yields an array without running side effects', () => {
    document.body.innerHTML = '<p class="a"></p><p class="a"></p>';
    const io = queryAll('.a');
    expect(io.run()).toHaveLength(2);
  });

  it('setStyle sets a style property through the pipeline', () => {
    const el = document.createElement('div');
    setStyle('color', 'red')(el).run();
    expect(el.style.color).toBe('red');
  });

  it('remove detaches the element', () => {
    document.body.innerHTML = '<span id="gone"></span>';
    query('#gone').chain(remove()).run();
    expect(document.getElementById('gone')).toBe(null);
  });
});

describe('create', () => {
  it('is lazy — nothing is created until run()', () => {
    const spy = vi.spyOn(document, 'createElement');
    create('div');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('applies class, style, dataset, text and attributes', () => {
    const el = create('a', {
      class: 'link',
      href: 'https://example.com',
      style: { color: 'blue' },
      dataset: { id: '7' },
      text: 'go',
    }).run();

    expect(el.tagName).toBe('A');
    expect(el.className).toBe('link');
    expect(el.getAttribute('href')).toBe('https://example.com');
    expect(el.style.color).toBe('blue');
    expect(el.dataset.id).toBe('7');
    expect(el.textContent).toBe('go');
  });

  it('wires on* handlers as event listeners', () => {
    const onClick = vi.fn();
    const el = create('button', { onClick }, ['ok']).run();

    el.dispatchEvent(new Event('click'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(el.textContent).toBe('ok');
  });

  it('handles boolean and skipped attributes', () => {
    const el = create('input', { disabled: true, placeholder: false }).run();
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('placeholder')).toBe(false);
  });

  it('appends string and Node children (single or array)', () => {
    const child = create('span', { text: 'kid' }).run();
    const el = create('div', {}, ['text ', child]).run();

    expect(el.childNodes[0].textContent).toBe('text ');
    expect(el.querySelector('span').textContent).toBe('kid');
  });

  it('skips nullish/false children', () => {
    const el = create('div', {}, ['a', null, false, 'b']).run();
    expect(el.textContent).toBe('ab');
  });
});
