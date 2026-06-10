// visual-prompts.mjs — baut fertige Higgsfield-Prompts aus Marke × Post.
// Marken-Basis (Bildwelt/Licht/Kamera) + Winkel-Szene (was passiert im Bild).
// Prompts auf Englisch (beste Ergebnisse), Text im Bild ist verboten —
// Typo legt render-image.mjs als Marken-Layer darueber.

const BRAND_BASE = {
  fnf: 'cinematic documentary photo, German financial advisor mid-30s with light stubble in dark shirt, warm evening light, modern home office with family photos, teal-orange grade, 35mm f2.0, natural skin texture, lived-in space',
  mamamoney: 'soft lifestyle film photo, young German mother early 30s messy bun cream knit sweater, bright scandinavian living room, morning light through sheer curtains, pastel pink-beige grade, 50mm f1.8, grainy film look, cozy',
  paparechnet: 'high-contrast desaturated photo with yellow accent, German father late 30s glasses flannel shirt, desk with calculator and whiteboard full of numbers, harsh desk lamp light, 28mm, documentary style, gritty',
  sparfuchs: 'candid family snapshot photo, German family kitchen with shopping lists on fridge and piggy bank, warm daylight, orange-green accents, 35mm, slightly tilted spontaneous framing, authentic clutter',
  enkelgeld: 'heartwarming golden hour photo, German grandparents in their 60s with young grandchild, garden with wooden table, soft sepia warmth, 85mm f2.0, gentle vignette, nostalgic film look',
  elternzeit: 'authentic smartphone photo at night, exhausted but tender young German parent in hoodie with newborn, dimly lit living room, warm lamp glow in darkness, slight phone camera noise, candid selfie angle, real imperfection',
  kindergeldhacks: 'clean editorial photo, top-down desk with German official forms folders and red highlighter, laptop and coffee, near-monochrome grade with red accent, 50mm, newspaper investigation aesthetic',
  zukunftskind: 'minimalist japandi photo, bright empty room with light wooden floor, large negative space, matte muted tones with sage green accent, 50mm tripod shot, calm architectural composition',
  familienkasse: 'documentary reportage photo, German family at kitchen table, available window light, photojournalism grain, slightly desaturated, shot through doorframe, authentic apartment',
  mit18frei: 'cinematic film still, warm golden backlight with anamorphic flare, amber grade, 40mm anamorphic shallow depth of field, emotional German coming-of-age moment',
  minimoney: 'bright playful educational photo, child hands and parent hand with coins building blocks and labeled jars on white table, primary color pop, clean daylight, 35mm top-down, joyful learning aesthetic'
};

// Was im Bild PASSIERT — abgeleitet vom Content-Winkel.
const ANGLE_SCENE = {
  schmerz: 'worried parent looking at savings passbook and bills at kitchen table, concern slowly turning into resolve',
  aha: 'parent having a lightbulb moment looking at phone, surprised smile, leaning in',
  frage: 'parent pausing thoughtfully mid-task, questioning look, head slightly tilted',
  einwand: 'sceptical parent with crossed arms gradually softening, listening',
  story: 'intimate everyday family moment, mid-action, natural interaction between family members',
  'how-to': 'hands following clear steps: writing a checklist, setting up banking app on phone, organized desk',
  vergleich: 'two jars side by side, one nearly empty one growing with coins and a small plant sprouting from it',
  mythos: 'contrast scene: scattered casino chips versus a young plant growing out of a jar of coins',
  emotion: 'emotional milestone moment, tears of joy or proud embrace, golden light',
  saison: 'family celebration scene with gift envelope being placed in a savings jar instead of toy pile'
};

const ANGLE_MOTION = {
  schmerz: 'slow push-in on face, papers slightly rustling',
  aha: 'quick rack focus from phone to smiling face',
  frage: 'subtle handheld sway, eyes lifting toward camera',
  einwand: 'slow dolly around subject, posture relaxing',
  story: 'observational handheld documentary movement',
  'how-to': 'top-down hands working, snappy insert cuts',
  vergleich: 'split-screen feel, coins dropping in slow motion',
  mythos: 'chips scatter in slow motion, plant grows via subtle timelapse',
  emotion: 'slow motion embrace, lens flare drifting',
  saison: 'confetti or candle light bokeh, gentle slow motion'
};

export function imagePrompt(brandId, post) {
  const base = BRAND_BASE[brandId] || BRAND_BASE.fnf;
  const scene = ANGLE_SCENE[post.angle] || ANGLE_SCENE.story;
  return `${base}, ${scene}, photorealistic, authentic, no text, no watermark, 4:5 portrait`;
}

export function videoPrompt(brandId, post) {
  const base = BRAND_BASE[brandId] || BRAND_BASE.fnf;
  const scene = ANGLE_SCENE[post.angle] || ANGLE_SCENE.story;
  const motion = ANGLE_MOTION[post.angle] || ANGLE_MOTION.story;
  return `${base}, ${scene}, ${motion}, cinematic motion, 5 seconds, photorealistic, no text, 9:16 vertical`;
}
