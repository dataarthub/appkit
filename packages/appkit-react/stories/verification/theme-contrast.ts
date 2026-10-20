import { expect } from 'storybook/test';

export const textTokenPairs = [
  ['background', 'foreground'], ['primary', 'primary-foreground'],
  ['secondary', 'secondary-foreground'], ['accent', 'accent-foreground'],
  ['muted', 'muted-foreground'], ['destructive', 'destructive-foreground'],
  ['card', 'card-foreground'], ['popover', 'popover-foreground'],
  ['sidebar', 'sidebar-foreground'], ['sidebar-primary', 'sidebar-primary-foreground'],
  ['sidebar-accent', 'sidebar-accent-foreground'],
] as const;

/** Let Chromium convert OKLCH and composite alpha in the canvas's sRGB space. */
export function tokenContrast(background: string, foreground: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const tokens = getComputedStyle(document.documentElement);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, 1, 1);
  for (const token of ['background', background]) {
    context.fillStyle = tokens.getPropertyValue(`--${token}`).trim();
    context.fillRect(0, 0, 1, 1);
  }
  const before = context.getImageData(0, 0, 1, 1).data.slice(0, 3);
  context.fillStyle = tokens.getPropertyValue(`--${foreground}`).trim();
  context.fillRect(0, 0, 1, 1);
  const after = context.getImageData(0, 0, 1, 1).data.slice(0, 3);
  const luminance = (rgb: Uint8ClampedArray) => Array.from(rgb).reduce((sum, value, i) => {
    const channel = value / 255;
    return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
  }, 0);
  const a = luminance(before), b = luminance(after);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function expectReadableTheme() {
  for (const [background, foreground] of textTokenPairs) {
    expect(tokenContrast(background, foreground), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
  }
}
