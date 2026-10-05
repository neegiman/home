/* Original adult human avatars: stable roster assignment and local motion sheets. */
((root) => {
  "use strict";
  const themes = [
    ["minimal", "미니멀", "#a8adb5"], ["utility", "유틸리티", "#5778ba"],
    ["rider", "라이더", "#b55b67"], ["explorer", "탐험가", "#8b9961"],
    ["captain", "캡틴", "#cda965"], ["runner", "러너", "#8d70bb"],
    ["traveler", "여행자", "#bd9b71"], ["tech", "테크", "#5da6aa"]
  ];
  const catalog = Object.freeze(themes.flatMap(([theme, label, accent]) => [
    { key: `${theme}-m`, label: `${label} M`, theme, appearance: "m", accent },
    { key: `${theme}-f`, label: `${label} F`, theme, appearance: "f", accent }
  ]).map(Object.freeze));
  const variants = Object.freeze([
    ["기본", null], ["코발트", "#4679bc"], ["버건디", "#a04b64"],
    ["포레스트", "#43886f"], ["오커", "#bd994b"], ["바이올렛", "#8063b0"],
    ["틸", "#38949b"], ["테라코타", "#b97354"], ["슬레이트", "#788dad"],
    ["올리브", "#859a54"], ["로즈", "#b67087"], ["아이스", "#79a5ae"]
  ].map(([label, accent], index) => Object.freeze({ label, accent, index, hue: 0, saturation: 1, brightness: 1 })));
  const images = new Map();
  const loads = new Map();
  const browser = typeof document !== "undefined";

  function normalize(value, count, fallback = 0) {
    const index = Number(value);
    return Number.isInteger(index) && index >= 0 && index < count ? index : Math.abs(Number(fallback) || 0) % count;
  }
  const normalizeIndex = (value, fallback) => normalize(value, catalog.length, fallback);
  const normalizeVariant = (value, fallback) => normalize(value, variants.length, fallback);
  function legacyIndex(id) {
    let hash = 0;
    for (const char of String(id || "")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return Math.abs(hash) % catalog.length;
  }
  const indexOf = (participant, fallback) => normalizeIndex(participant?.character, fallback ?? legacyIndex(participant?.id));
  const character = (participant, fallback) => ({ ...catalog[indexOf(participant, fallback)], index: indexOf(participant, fallback) });
  const variant = (participant) => variants[normalizeVariant(participant?.colorVariant)];

  function pickBalanced(participants, random = Math.random) {
    const counts = Array(catalog.length).fill(0);
    participants.forEach((participant, index) => { counts[indexOf(participant, index)]++; });
    const minimum = Math.min(...counts);
    const available = counts.flatMap((count, index) => count === minimum ? [index] : []);
    return available[Math.min(available.length - 1, Math.floor(Math.max(0, random()) * available.length))];
  }
  function pickColor(participants, characterIndex) {
    const counts = Array(variants.length).fill(0);
    participants.filter((participant) => indexOf(participant) === characterIndex).forEach((participant) => { counts[normalizeVariant(participant.colorVariant)]++; });
    if (!counts.some(Boolean)) return 0;
    const rgb = color => [1,3,5].map(offset => parseInt(color.slice(offset,offset+2),16));
    const colors = variants.map(tone => rgb(tone.accent || catalog[normalizeIndex(characterIndex)].accent));
    const used = counts.flatMap((count,index) => count ? [colors[index]] : []);
    const minimum = Math.min(...counts);
    let chosen = 0, bestDistance = -1;
    counts.forEach((count,index) => {
      if (count !== minimum) return;
      // Among equally unused palettes, maximize separation from colors already
      // on this identity. A blue outfit should not get a near-identical blue.
      const distance = Math.min(...used.map(color => colors[index].reduce((sum,value,channel) => sum+(value-color[channel])**2,0)));
      if (distance > bestDistance) { chosen = index; bestDistance = distance; }
    });
    return chosen;
  }
  function normalizeRoster(participants) {
    const seen = [];
    return participants.map((participant, index) => {
      const current = { ...participant, character: indexOf(participant, index), colorVariant: normalizeVariant(participant.colorVariant) };
      if (seen.some((other) => other.character === current.character && other.colorVariant === current.colorVariant)) {
        current.colorVariant = pickColor(seen, current.character);
      }
      seen.push(current);
      return current;
    });
  }
  function url(participant, fallback) {
    const avatar = character(participant, fallback);
    const tone = normalizeVariant(participant?.colorVariant);
    return `assets/characters/human-v1/${avatar.key}${tone ? `-c${tone}` : ""}.png`;
  }
  function image(participant) {
    if (!browser) return null;
    const source = url(participant);
    if (!images.has(source)) {
      const sprite = new Image(); sprite.decoding = "async";
      const ready = new Promise((resolve) => {
        sprite.addEventListener("load", resolve, { once: true });
        sprite.addEventListener("error", resolve, { once: true });
      });
      images.set(source, sprite); loads.set(source, ready); sprite.src = source;
    }
    return images.get(source);
  }
  function readyForRoster(participants) {
    participants.forEach(image);
    return Promise.allSettled(participants.map(participant => loads.get(url(participant))));
  }
  function style(participant, fallback) {
    const avatar = character(participant, fallback), tone = variant(participant);
    const heights = root.HumanCharacterMetrics?.[avatar.key];
    const cryHeadroom = heights ? 1-Math.max(...heights.slice(4,8))-4/128 : .42;
    image(participant);
    // Generated local paths contain no spaces/quotes; unquoted url() also stays
    // valid when this declaration is inserted into an HTML style attribute.
    return `--character-sheet:url(${url(participant, fallback)});--zodiac-motion-sheet:url(${url(participant, fallback)});--zodiac-x:0%;--zodiac-y:100%;--zodiac-tone:none;--fighter-accent:${tone.accent || avatar.accent};--zodiac-motion-scale:1;--zodiac-center-shift:0%;--zodiac-ground-shift:0%;--cry-headroom:${cryHeadroom}`;
  }
  const poseHeight = (participant,row,column) => root.HumanCharacterMetrics?.[character(participant).key]?.[row*4+column] ?? (row===1?.54:.84);
  const api = { catalog, variants, normalizeIndex, normalizeVariant, indexOf, character, variant, pickBalanced, pickColor, normalizeRoster, url, image, readyForRoster, style, poseHeight, columns: 4, rows: 3, ground: 124 / 128 };
  api.ready = browser ? readyForRoster(catalog.map((_, character) => ({ character, colorVariant: 0 }))) : Promise.resolve();
  root.HumanCharacters = Object.freeze(api);
  if (typeof module !== "undefined") module.exports = root.HumanCharacters;
})(typeof window !== "undefined" ? window : globalThis);
