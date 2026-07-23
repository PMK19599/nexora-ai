import { afterEach, describe, expect, it } from 'vitest';
import { applyAccessibilityToDocument } from '@/App';

const defaults = { fontSize:'normal',fontFamily:'default',lineSpacing:'normal',focusMode:false,readingMode:false,reducedDistractions:false,predictableNavigation:false,animations:true,reducedMotion:false,colorContrast:'normal',highContrast:false };
describe('accessibility lifecycle', () => {
  afterEach(() => { document.body.className=''; document.documentElement.className=''; });
  it('maps every offered preference to document state', () => {
    applyAccessibilityToDocument({ ...defaults,fontSize:'large',fontFamily:'verdana',lineSpacing:'wider',readingMode:true,reducedDistractions:true,predictableNavigation:true,animations:false,colorContrast:'high' });
    expect(document.body.classList.contains('font-size-large')).toBe(true);
    expect(document.body.classList.contains('font-verdana')).toBe(true);
    expect(document.body.classList.contains('line-spacing-wider')).toBe(true);
    expect(document.body.classList.contains('reading-mode')).toBe(true);
    expect(document.body.classList.contains('reduced-distractions')).toBe(true);
    expect(document.body.classList.contains('predictable-navigation')).toBe(true);
    expect(document.body.classList.contains('no-animations')).toBe(true);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
  });
});
