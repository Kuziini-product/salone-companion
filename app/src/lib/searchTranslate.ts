// Romanian → English/Italian search-term expansion.
//
// The catalog stores categories and products in EN + IT, so a Romanian
// query like "scaun" needs to be expanded to its EN/IT equivalents
// before we ilike the data.
//
// We don't try to translate everything — just the most common furniture
// vocabulary. Anything we don't know is passed through as-is.

const MAP: Record<string, string[]> = {
  // RO singular/plural → likely EN + IT keywords
  scaun:        ['chair', 'sedia'],
  scaune:       ['chair', 'sedia', 'chairs', 'sedie'],
  fotoliu:      ['armchair', 'poltrona'],
  fotolii:      ['armchair', 'poltrona', 'armchairs'],
  canapea:      ['sofa', 'divano'],
  canapele:     ['sofa', 'divano', 'sofas'],
  pat:          ['bed', 'letto'],
  paturi:       ['bed', 'letto', 'beds'],
  masa:         ['table', 'tavolo'],
  mese:         ['table', 'tavolo', 'tables'],
  birou:        ['desk', 'office', 'scrivania', 'ufficio'],
  birouri:      ['desk', 'office', 'scrivanie'],
  sufragerie:   ['dining', 'sala da pranzo'],
  living:       ['living', 'soggiorno'],
  dormitor:     ['bedroom', 'camera da letto'],
  dressing:     ['wardrobe', 'armadio'],
  dulap:        ['wardrobe', 'cabinet', 'armadio'],
  dulapuri:     ['wardrobe', 'cabinet', 'armadi'],
  comoda:       ['sideboard', 'credenza'],
  oglinda:      ['mirror', 'specchio'],
  oglinzi:      ['mirror', 'specchio'],
  lampa:        ['lamp', 'lampada'],
  lampi:        ['lamp', 'lampada'],
  lustra:       ['chandelier', 'lampadario'],
  iluminat:     ['lighting', 'illuminazione'],
  bucatarie:    ['kitchen', 'cucina'],
  bucatarii:    ['kitchen', 'cucina'],
  baie:         ['bathroom', 'bagno'],
  bai:          ['bathroom', 'bagno'],
  cada:         ['bathtub', 'vasca'],
  dus:          ['shower', 'doccia'],
  chiuveta:     ['sink', 'lavabo'],
  robinet:      ['tap', 'faucet', 'rubinetto'],
  faianta:      ['tile', 'piastrella'],
  gresie:       ['tile', 'piastrella'],
  ceramica:     ['ceramic', 'ceramica'],
  exterior:     ['outdoor', 'esterno'],
  outdoor:      ['outdoor', 'esterno'],
  gradina:      ['garden', 'giardino'],
  textile:      ['textile', 'fabric', 'tessuto'],
  covor:        ['rug', 'carpet', 'tappeto'],
  covoare:      ['rug', 'carpet', 'tappeto'],
  perdele:      ['curtain', 'tenda'],
  taburet:      ['stool', 'sgabello'],
  bar:          ['bar stool', 'sgabello'],
  raft:         ['shelf', 'bookcase', 'scaffale', 'libreria'],
  rafturi:      ['shelf', 'bookcase', 'scaffale'],
  decoratiuni:  ['accessory', 'accessori', 'decor'],
  accesorii:    ['accessory', 'accessori'],
  italian:      ['italy', 'italian', 'italia'],
  italiana:     ['italy', 'italian', 'italia'],
  italienesc:   ['italy', 'italian', 'italia'],
};

// Strip Romanian diacritics so "bucătărie" → "bucatarie".
function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ŞȘ]/g, 'S').replace(/[şș]/g, 's')
    .replace(/[ŢȚ]/g, 'T').replace(/[ţț]/g, 't');
}

/**
 * Expand a Romanian-ish query into a set of search terms (RO + EN + IT).
 * Always includes the original tokens too, so "cassina" still works.
 */
export function expandQuery(input: string): string[] {
  const cleaned = stripDiacritics(input.toLowerCase());
  const tokens = cleaned.split(/[\s,]+/).filter(Boolean);
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    const mapped = MAP[t];
    if (mapped) for (const m of mapped) out.add(m);
  }
  // Also add the full phrase for multi-word product names.
  if (tokens.length > 1) out.add(tokens.join(' '));
  return [...out];
}
