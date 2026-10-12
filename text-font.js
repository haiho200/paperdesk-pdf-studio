// Store portable font descriptions, not PDF.js's temporary per-document font IDs.
export function canvasFont(mark, pixels) {
  return `${mark.fontStyle || 'normal'} ${mark.fontWeight || 'normal'} ${pixels}px ${mark.fontFamily || 'Arial, sans-serif'}`;
}

export function detectFont(font = {}, style = {}) {
  const name = (font.name || font.systemFontInfo?.baseFontName || '').replace(/^[A-Z]{6}\+/, '');
  const description = `${name} ${style.fontFamily || ''}`;
  const fontWeight = font.black || /black|heavy/i.test(name) ? '900' : font.bold || /bold|demi|semibold/i.test(name) ? 'bold' : 'normal';
  const fontStyle = font.italic || /italic|oblique/i.test(name) ? 'italic' : 'normal';
  const families = [
    [/times|liberationserif|nimbusroman/i, '"Times New Roman", Times, serif', 'Times New Roman'],
    [/courier|liberationmono|nimbusmono/i, '"Courier New", Courier, monospace', 'Courier New'],
    [/helvetica|arial|liberationsans|nimbussans/i, 'Arial, Helvetica, sans-serif', 'Arial / Helvetica'],
    [/calibri|carlito/i, 'Calibri, Carlito, Arial, sans-serif', 'Calibri'],
    [/cambria/i, 'Cambria, Georgia, serif', 'Cambria'],
    [/georgia/i, 'Georgia, serif', 'Georgia'],
    [/verdana/i, 'Verdana, sans-serif', 'Verdana'],
    [/tahoma/i, 'Tahoma, sans-serif', 'Tahoma'],
    [/garamond/i, 'Garamond, "Times New Roman", serif', 'Garamond'],
    [/trebuchet/i, '"Trebuchet MS", sans-serif', 'Trebuchet MS']
  ];
  const found = families.find(([re]) => re.test(description));
  const fallback = /mono/i.test(description) ? 'monospace' : /serif/i.test(description) && !/sans/i.test(description) ? 'serif' : 'sans-serif';
  // Unknown embedded/subset fonts cannot safely render arbitrary Unicode through
  // their private character maps. Use a visible, explicitly labelled substitute.
  const base = name.replace(/[-,]?(bolditalic|boldoblique|semibold|bold|italic|oblique|regular|roman|psmt|mt)$/ig, '').replace(/[^\w -]/g, ' ').trim();
  return {
    fontFamily: found?.[1] || (base ? `"${base}", ${fallback}` : fallback),
    fontLabel: found?.[2] || base || fallback,
    originalFont: name || style.fontFamily || 'Unspecified font',
    fontWeight, fontStyle, fontApproximate: true
  };
}
