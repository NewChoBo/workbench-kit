// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getEnabledOptionIndex, parseOptions } from './options';

function nativeValues(children: ReactNode): string[] {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(<select>{children}</select>);
  return Array.from(container.querySelector('select')!.options, (option) => option.value);
}

describe('parseOptions plain-text values', () => {
  it('agrees with native implicit Alpha and Beta values', () => {
    const children = [<option key="a">Alpha</option>, <option key="b">Beta</option>];
    expect(nativeValues(children)).toEqual(['Alpha', 'Beta']);
    expect(parseOptions(children).map((option) => option.value)).toEqual(nativeValues(children));
  });

  it.each([
    ['ASCII whitespace', ' \tAlpha\n\r\f Beta  ', 'Alpha Beta'],
    [
      'nonbreaking spaces',
      '\u00a0 Alpha\u00a0\u00a0Beta \u00a0',
      '\u00a0 Alpha\u00a0\u00a0Beta \u00a0',
    ],
    ['other Unicode whitespace', '\u2003Alpha\u2003', '\u2003Alpha\u2003'],
    ['numeric zero', 0, '0'],
    ['numeric text', 42, '42'],
    ['nested text arrays', [' Alpha', null, false, 0, ['\tBeta ', undefined, true]], 'Alpha0 Beta'],
    ['empty string', '', ''],
    ['empty children', [null, false, undefined, true], ''],
  ] satisfies [string, ReactNode, string][])(
    'matches the native option oracle for %s',
    (_name, children, expected) => {
      const option = <option>{children}</option>;
      expect(nativeValues(option)).toEqual([expected]);
      expect(parseOptions(option)[0]!.value).toBe(nativeValues(option)[0]);
      expect(parseOptions(option)[0]!.label).toBe(children);
    },
  );

  it('infers omitted, undefined and null values without replacing explicit empty or zero', () => {
    const children = [
      <option key="omitted">Alpha</option>,
      <option key="undefined" value={undefined}>
        Beta
      </option>,
      createElement('option', { key: 'null', value: null as unknown as string }, 'Gamma'),
      <option key="empty" value="">
        Empty
      </option>,
      <option key="zero" value={0}>
        Zero
      </option>,
    ];
    expect(nativeValues(children)).toEqual(['Alpha', 'Beta', 'Gamma', '', '0']);
    expect(parseOptions(children).map((option) => option.value)).toEqual(nativeValues(children));
  });

  it('preserves disabled options and enabled keyboard traversal', () => {
    const children = [
      <option key="a">Alpha</option>,
      <option key="disabled" disabled>
        Unavailable
      </option>,
      <option key="b">Beta</option>,
    ];
    const options = parseOptions(children);
    expect(options.map((option) => option.value)).toEqual(nativeValues(children));
    expect(options.map((option) => option.disabled)).toEqual([false, true, false]);
    expect(getEnabledOptionIndex(options, 0, 1)).toBe(2);
    expect(getEnabledOptionIndex(options, 2, -1)).toBe(0);
  });

  it('preserves duplicate values and source order without fabricating identities', () => {
    const children = [
      <option key="first">Same</option>,
      <option key="second" value="Same">
        Second label
      </option>,
      <option key="third">Same</option>,
    ];
    const options = parseOptions(children);
    expect(options.map((option) => option.value)).toEqual(nativeValues(children));
    expect(options.map((option) => option.value)).toEqual(['Same', 'Same', 'Same']);
    expect(options.map((option) => option.label)).toEqual(['Same', 'Second label', 'Same']);
  });

  it('preserves explicit rich labels and does not execute components to infer missing values', () => {
    const Component = vi.fn(() => <span>Component label</span>);
    const rich = <span>Rich label</span>;
    const component = <Component />;
    const options = parseOptions([
      <option key="explicit" value="rich">
        {rich}
      </option>,
      <option key="element">{rich}</option>,
      <option key="component">{component}</option>,
      <option key="mixed">{['prefix', rich, 'suffix']}</option>,
    ]);
    expect(options.map((option) => option.value)).toEqual(['rich', '', '', '']);
    expect(options[0]!.label).toBe(rich);
    expect(options[1]!.label).toBe(rich);
    expect(options[2]!.label).toBe(component);
    expect(Component).not.toHaveBeenCalled();
  });
});
