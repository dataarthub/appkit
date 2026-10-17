import { describe, expect, it } from 'bun:test';
import { resolveSealLabel, createFallbackSealSvg, createFallbackSealDataUrl } from './stamp';

describe('PDF Stamp & Seal Generator', () => {
  describe('resolveSealLabel', () => {
    it('prefers explicit sealLabel over familyName and fullName', () => {
      expect(resolveSealLabel('佐藤 健', { sealLabel: '承認印', familyName: '佐藤' })).toBe('承認印');
    });

    it('prefers familyName over fullName', () => {
      expect(resolveSealLabel('佐藤 健', { familyName: '鈴木' })).toBe('鈴木');
    });

    it('extracts family name for Japanese full names with spaces', () => {
      expect(resolveSealLabel('山田 太郎')).toBe('山田');
      expect(resolveSealLabel('田中　一郎')).toBe('田中');
    });

    it('extracts surname for Western names in auto mode', () => {
      expect(resolveSealLabel('John Smith', { maxChars: 5 })).toBe('Smith');
      expect(resolveSealLabel('Smith, John', { maxChars: 5 })).toBe('Smith');
    });

    it('respects maxChars option', () => {
      expect(resolveSealLabel('Alexander Hamilton', { maxChars: 3 })).toBe('Ham');
      expect(resolveSealLabel('長谷川 太郎', { maxChars: 2 })).toBe('長谷');
    });

    it('returns empty string for empty inputs', () => {
      expect(resolveSealLabel('')).toBe('');
      expect(resolveSealLabel(undefined)).toBe('');
    });
  });

  describe('createFallbackSealSvg and DataUrl', () => {
    it('generates valid SVG markup with createFallbackSealSvg', () => {
      const svg = createFallbackSealSvg('山田 太郎');
      expect(svg).toContain('<svg');
      expect(svg).toContain('山');
      expect(svg).toContain('田');
      expect(svg).toContain('</svg>');
    });

    it('generates valid SVG data URL with createFallbackSealDataUrl', () => {
      const dataUrl = createFallbackSealDataUrl('山田 太郎', { outputFormat: 'svg' });
      expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('customizes size, colors and stroke width in SVG', () => {
      const svg = createFallbackSealSvg('佐藤', {
        size: 128,
        circleColor: '#1e40af',
        textColor: '#1e40af',
        strokeWidth: 6,
      });
      expect(svg).toContain('width="128"');
      expect(svg).toContain('height="128"');
      expect(svg).toContain('stroke="#1e40af"');
      expect(svg).toContain('fill="#1e40af"');
    });
  });
});
