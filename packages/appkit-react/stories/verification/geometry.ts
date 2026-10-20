import { expect } from 'storybook/test';

/** These checks require the real layout engine used by the Storybook browser tests. */
export function expectNoHorizontalOverflow(root: HTMLElement = document.documentElement) {
  expect(root.scrollWidth, 'horizontal overflow').toBeLessThanOrEqual(root.clientWidth);
}

export function expectInViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  expect(rect.left, 'left edge').toBeGreaterThanOrEqual(0);
  expect(rect.top, 'top edge').toBeGreaterThanOrEqual(0);
  expect(rect.right, 'right edge').toBeLessThanOrEqual(window.innerWidth);
  expect(rect.bottom, 'bottom edge').toBeLessThanOrEqual(window.innerHeight);
}

export function expectClickable(element: Element) {
  const rect = element.getBoundingClientRect();
  expect(rect.width * rect.height, 'element has no size').toBeGreaterThan(0);
  const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  expect(
    top && (element === top || element.contains(top)),
    `${element.getAttribute('data-slot') ?? element.tagName.toLowerCase()} covered by <${top?.tagName.toLowerCase()} ${top?.getAttribute('data-slot') ?? ''}>`,
  ).toBe(true);
}

export function expectMinTapTarget(element: Element, minimum = 24) {
  const rect = element.getBoundingClientRect();
  expect(Math.min(rect.width, rect.height), 'tap target size').toBeGreaterThanOrEqual(minimum);
}

export function expectNoClippedText(element: HTMLElement) {
  expect(element.scrollWidth, 'text clipped horizontally').toBeLessThanOrEqual(element.clientWidth);
  // Glyph ink can extend past a line box (for example leading-none labels).
  // It is clipped only when an overflow rule actually masks that extra height.
  const overflowY = getComputedStyle(element).overflowY;
  if (overflowY !== 'visible') {
    expect(element.scrollHeight, 'text clipped vertically').toBeLessThanOrEqual(element.clientHeight);
  }
}

export function expectUsableControl(element: HTMLElement) {
  expectInViewport(element);
  expectMinTapTarget(element);
  expectClickable(element);
  expectNoClippedText(element);
}
