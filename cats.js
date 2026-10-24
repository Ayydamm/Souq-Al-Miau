/* ==========================================================================
   Souq al-Miau — the six merchants
   Every cat is drawn from scratch with SVG. No image files, no CDN, no mercy.
   ========================================================================== */

const CATS = [
  {
    id: 'addin',
    name: 'Ad-din Dibiazah',
    first: 'Ad-din',
    title: 'The Honey Baron',
    quote: 'The honey is genuine. The receipt is not.',
    slap: 'Mind the hat.',
    stats: [['Haggling', 92], ['Charm', 71], ['Patience', 34]],
    eyes: 'sly',
    acc: 'fez',
    art: {
      fur: '#e2a866', shadow: '#c0854a', light: '#f9e3c2', inner: '#dd8f98',
      white: '#fff7e8', pupil: '#2a1a10', nose: '#d9758c', mouth: '#4a2f1c',
      whisker: '#fff4e2', collar: '#3c2a1e'
    }
  },
  {
    id: 'sumbul',
    name: 'Muhammad Sumbul',
    first: 'Sumbul',
    title: 'Keeper of the Hyacinth',
    quote: 'I have heard everything. I have remembered none of it.',
    slap: 'I was asleep. Continue.',
    stats: [['Gossip', 96], ['Napping', 88], ['Bravery', 21]],
    eyes: 'sleepy',
    acc: 'flower',
    art: {
      fur: '#a9a3bd', shadow: '#8b85a1', light: '#ece8f7', inner: '#d7a3bb',
      white: '#fffafd', pupil: '#241d33', nose: '#d68aa6', mouth: '#3a3048',
      whisker: '#f6f1ff', collar: '#5a4a78'
    }
  },
  {
    id: 'kashmiri',
    name: 'Khalid Kashmiri',
    first: 'Khalid',
    title: 'The Shawl Merchant',
    quote: 'This shawl has survived three empires and one cat.',
    slap: 'You creased it. You absolute fool.',
    stats: [['Style', 90], ['Rizz', 84], ['Paying Taxes', 12]],
    eyes: 'open',
    acc: 'shawl',
    art: {
      fur: '#f3ead8', shadow: '#d3c8b2', light: '#fffdf7', inner: '#e0a9ad',
      white: '#ffffff', pupil: '#2a2119', nose: '#d97f8f', mouth: '#4a3527',
      whisker: '#a8957c', collar: '#a92b3c'
    }
  },
  {
    id: 'karawita',
    name: 'Khidir Karawita',
    first: 'Khidir',
    title: 'Bookkeeper of Three Ledgers',
    quote: 'Please sign here. And here. And here. Also here.',
    slap: 'This is going in the ledger.',
    stats: [['Ledgers', 97], ['Staring', 89], ['Fun', 6]],
    eyes: 'focus',
    acc: 'glasses',
    art: {
      fur: '#8b5c3d', shadow: '#6e4529', light: '#d8a97f', inner: '#c98b86',
      white: '#fdf4e6', pupil: '#241408', nose: '#c4777f', mouth: '#3d2314',
      whisker: '#f0dcc2', collar: '#2c3a4a'
    }
  },
  {
    id: 'kanabawi',
    name: 'Ismail Ahmad Kanabawi',
    first: 'Ismail',
    title: 'The Skewer Sultan',
    quote: 'Four skewers. No, five. You will come back for the sixth.',
    slap: 'Careful! The skewer is load-bearing.',
    stats: [['Fire', 94], ['Skewers', 99], ['Hygiene', 40]],
    eyes: 'wide',
    acc: 'bandana',
    grin: true,
    art: {
      fur: '#d9803f', shadow: '#b3622b', light: '#f6c193', inner: '#d98a7a',
      white: '#fff6e8', pupil: '#2a1206', nose: '#cf6f76', mouth: '#4a2213',
      whisker: '#ffeacd', stripe: '#a8542a', collar: '#2f7d6f'
    }
  },
  {
    id: 'usman',
    name: 'Usman Abdul Jalil Shisha',
    first: 'Usman',
    title: 'The Cloud Artist',
    quote: "I don't sell shisha. I sell the shape of the smoke.",
    slap: 'Ah. The smoke remembers you now.',
    stats: [['Smoke', 100], ['Cool', 96], ['Punctuality', 18]],
    eyes: 'cool',
    acc: 'shisha',
    art: {
      fur: '#3d3550', shadow: '#2b2439', light: '#6f6390', inner: '#8b6b8f',
      white: '#d9c48d', pupil: '#120e1a', nose: '#a8657f', mouth: '#0f0b14',
      whisker: '#cbb7d8', collar: '#2a2135'
    }
  }
];

const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));

/* --------------------------------------------------------------------------
   Small drawing helpers
   -------------------------------------------------------------------------- */

function catEyes(cat) {
  const a = cat.art;
  const open = (cx, rx, ry, prx, pry) => `
    <ellipse cx="${cx}" cy="62" rx="${rx}" ry="${ry}" fill="${a.white}"/>
    <ellipse cx="${cx}" cy="62" rx="${prx}" ry="${pry}" fill="${a.pupil}"/>
    <circle cx="${cx + prx * 0.35}" cy="${62 - pry * 0.45}" r="1.6" fill="#ffffff" opacity=".85"/>`;
  const lid = (cx) =>
    `<path d="M${cx - 10} 64 Q${cx} 53 ${cx + 10} 64 L${cx + 10} 44 L${cx - 10} 44 Z" fill="${a.fur}"/>`;
  const lash = (cx) =>
    `<path d="M${cx - 9} 56.4 Q${cx} 50.6 ${cx + 9} 56.4" stroke="${a.pupil}" stroke-width="2" opacity=".38" fill="none" stroke-linecap="round"/>`;

  switch (cat.eyes) {
    case 'sleepy':
      return `
        <path d="M37 61 Q46 70 55 61" stroke="${a.pupil}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <path d="M65 61 Q74 70 83 61" stroke="${a.pupil}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <path d="M37 58.4 Q46 66.4 55 58.4" stroke="${a.light}" stroke-width="1.2" opacity=".45" fill="none"/>`;

    case 'sly':
      return `${open(46, 9, 10, 3.1, 7.6)}${open(74, 9, 10, 3.1, 7.6)}${lid(46)}${lid(74)}`;

    case 'focus':
      return `
        ${open(46, 9, 10, 4.1, 8.2)}${open(74, 9, 10, 4.1, 8.2)}
        <path d="M36.5 50.5 L55 54" stroke="${a.shadow}" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
        <path d="M83.5 50.5 L65 54" stroke="${a.shadow}" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`;

    case 'wide':
      return `${open(46, 10, 11, 4.5, 8.8)}${open(74, 10, 11, 4.5, 8.8)}${lash(46)}${lash(74)}`;

    case 'cool':
      return `
        <path d="M36.4 55 Q46 46.5 55.6 54.4" stroke="#e8b45a" stroke-width="4" opacity=".75" fill="none" stroke-linecap="round"/>
        <path d="M83.6 55 Q74 46.5 64.4 54.4" stroke="#e8b45a" stroke-width="4" opacity=".75" fill="none" stroke-linecap="round"/>
        ${open(46, 9.2, 7.4, 2.1, 6.6)}${open(74, 9.2, 7.4, 2.1, 6.6)}
        <path d="M36.8 56.2 Q46 50.4 55.2 56.2" stroke="${a.pupil}" stroke-width="2.2" opacity=".55" fill="none" stroke-linecap="round"/>
        <path d="M65 56.2 Q74 50.4 83.2 56.2" stroke="${a.pupil}" stroke-width="2.2" opacity=".55" fill="none" stroke-linecap="round"/>`;

    case 'open':
    default:
      return `${open(46, 8.8, 9.8, 3, 7.4)}${open(74, 8.8, 9.8, 3, 7.4)}${lash(46)}${lash(74)}`;
  }
}

function catMouth(cat) {
  const a = cat.art;
  if (cat.grin) {
    return `
      <path d="M50 76 Q60 88 70 76" stroke="${a.mouth}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="60" cy="83" rx="5" ry="2.8" fill="#e07a89"/>`;
  }
  return `
    <path d="M60 75.4 Q56 80 52.5 76.6" stroke="${a.mouth}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M60 75.4 Q64 80 67.5 76.6" stroke="${a.mouth}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
}

function catWhiskers(cat) {
  const a = cat.art;
  return `
    <g stroke="${a.whisker}" stroke-width="1.3" stroke-linecap="round" opacity=".55">
      <path d="M40 74 L20 69"/><path d="M40 78 L18 78"/><path d="M40 82 L21 88"/>
      <path d="M80 74 L100 69"/><path d="M80 78 L102 78"/><path d="M80 82 L99 88"/>
    </g>`;
}

function catStripes(cat) {
  const a = cat.art;
  if (!a.stripe) return '';
  return `
    <g stroke="${a.stripe}" stroke-width="3.2" stroke-linecap="round" opacity=".5" fill="none">
      <path d="M50 33.5 Q55 42 52 48.5"/>
      <path d="M60 30.5 L60 47.5"/>
      <path d="M70 33.5 Q65 42 68 48.5"/>
    </g>
    <g stroke="${a.stripe}" stroke-width="2.6" stroke-linecap="round" opacity=".45" fill="none">
      <path d="M30 62 L22 63"/><path d="M31 68 L23 70"/>
      <path d="M90 62 L98 63"/><path d="M89 68 L97 70"/>
    </g>`;
}

function catCoat(cat) {
  const a = cat.art;
  if (cat.acc !== 'shawl') return '';
  const dots = [
    [28, 100], [38, 94], [24, 110], [42, 108], [30, 118],
    [92, 100], [82, 94], [96, 110], [78, 108], [90, 118],
    [60, 112], [52, 118], [68, 118]
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#e6c27a" opacity=".65"/>`)
    .join('');

  return `
    <g>
      <path d="M20 122 C20 101 33 89 46 85 Q60 110 74 85 C87 89 100 101 100 122 Z" fill="#a92b3c"/>
      <path d="M20 122 C20 101 33 89 46 85 Q60 110 74 85 C87 89 100 101 100 122 Z" fill="none" stroke="#7d1c2a" stroke-width="1.4"/>
      <path d="M46 85 Q60 110 74 85" stroke="#e6c27a" stroke-width="2.2" fill="none" opacity=".85"/>
      <path d="M22 120 C22 102 34 91 45 87" stroke="#e6c27a" stroke-width="1.2" fill="none" opacity=".35"/>
      <path d="M98 120 C98 102 86 91 75 87" stroke="#e6c27a" stroke-width="1.2" fill="none" opacity=".35"/>
      ${dots}
    </g>`;
}

function catAccessories(cat) {
  const a = cat.art;

  switch (cat.acc) {
    case 'fez':
      return `
        <g>
          <path d="M46 30 L50 9 Q60 4 70 9 L74 30 Q60 35 46 30 Z" fill="#8f2438"/>
          <path d="M46.6 25.5 L46 30 Q60 35 74 30 L73.4 25.5 Q60 30.5 46.6 25.5 Z" fill="#d9a441"/>
          <path d="M60 6 Q71 7 73 17" stroke="#f0c763" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <circle cx="73.6" cy="19" r="3" fill="#f0c763"/>
          <path d="M57 78 Q50 82 45 78 Q41 75.5 39 79" stroke="#4a2f1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <path d="M63 78 Q70 82 75 78 Q79 75.5 81 79" stroke="#4a2f1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        </g>`;

    case 'flower':
      return `
        <g>
          <path d="M96 58 Q100 44 95 35" stroke="#5f8f5a" stroke-width="2.4" fill="none"/>
          <path d="M97 50 Q105 48 108 54 Q101 57 97 50 Z" fill="#5f8f5a" opacity=".9"/>
          <circle cx="95" cy="32" r="4.7" fill="#a77bd8"/>
          <circle cx="102" cy="37" r="4.2" fill="#bb93e8"/>
          <circle cx="91" cy="41" r="3.8" fill="#9a6dd0"/>
          <circle cx="100" cy="26" r="3.6" fill="#c9a6f0"/>
          <circle cx="104" cy="46" r="3.2" fill="#a77bd8"/>
          <circle cx="96" cy="35" r="1.8" fill="#f3e6ff" opacity=".8"/>
          <circle cx="60" cy="106" r="4" fill="none" stroke="#e6c27a" stroke-width="1.6" opacity=".8"/>
          <path d="M60 102.4 a3.6 3.6 0 1 0 .1 7.2" stroke="#e6c27a" stroke-width="1.6" fill="none" opacity=".8"/>
        </g>`;

    case 'glasses':
      return `
        <g>
          <path d="M92 44 L106 20" stroke="#e0b061" stroke-width="4.4" stroke-linecap="round"/>
          <path d="M92.4 43 L89.5 48.5" stroke="#2f2732" stroke-width="4.4" stroke-linecap="round"/>
          <circle cx="46" cy="62" r="12.2" fill="none" stroke="#e5b45c" stroke-width="2.4"/>
          <circle cx="74" cy="62" r="12.2" fill="none" stroke="#e5b45c" stroke-width="2.4"/>
          <path d="M58.2 62 H61.8" stroke="#e5b45c" stroke-width="2.4"/>
          <path d="M33.8 60 L26 56.5" stroke="#e5b45c" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M86.2 60 L94 56.5" stroke="#e5b45c" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M39.5 56.5 Q44 51.5 50 52.5" stroke="#ffffff" stroke-width="1.8" opacity=".4" fill="none" stroke-linecap="round"/>
        </g>`;

    case 'bandana':
      return `
        <g>
          <path d="M28 46 Q60 31 92 46 L92 54 Q60 39 28 54 Z" fill="#2f7d6f"/>
          <path d="M28.6 50.5 Q60 36.5 91.4 50.5" stroke="#f2e3c9" stroke-width="1.3" fill="none" opacity=".45"/>
          <circle cx="27.5" cy="50" r="4.6" fill="#256a5e"/>
          <path d="M26 52 L12 45.5 L15.5 58 Z" fill="#256a5e"/>
          <path d="M98 122 L112 70" stroke="#d9b47e" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="101.5" cy="110" r="5.6" fill="#a8552c"/>
          <circle cx="105" cy="96" r="5.6" fill="#b9632f"/>
          <circle cx="108.5" cy="82" r="5.4" fill="#96471f"/>
        </g>`;

    case 'shawl':
      return '';

    case 'shisha':
      return `
        <g>
          <g opacity=".28" fill="#cfc6e0">
            <circle cx="84" cy="38" r="7.5"/>
            <circle cx="94" cy="27" r="5.4"/>
            <circle cx="77" cy="27" r="4.2"/>
          </g>
          <circle cx="96" cy="74" r="4.6" fill="none" stroke="#e8b45a" stroke-width="1.9"/>
          <path d="M43 98 Q60 116 77 98" stroke="#e0ac52" stroke-width="2.2" fill="none"/>
          <g fill="#ffd88a" opacity=".9">
            <circle cx="47" cy="102" r="1.5"/><circle cx="53" cy="107" r="1.5"/>
            <circle cx="67" cy="107" r="1.5"/><circle cx="73" cy="102" r="1.5"/>
          </g>
          <path d="M60 111 l3.2 4.2 l-3.2 4.2 l-3.2 -4.2 Z" fill="#e8b45a"/>
          <path d="M118 122 C104 118 100 100 96 90 C91 78 78 76 70 76" stroke="#5f1f2b" stroke-width="4.6" fill="none" stroke-linecap="round"/>
          <rect x="65.5" y="72.6" width="9.5" height="6.4" rx="3.2" fill="#e0ac52"/>
        </g>`;

    default:
      return '';
  }
}

/* --------------------------------------------------------------------------
   Main portrait
   -------------------------------------------------------------------------- */

function catSVG(cat) {
  const a = cat.art;
  const hasCollar = cat.acc !== 'shawl' && cat.acc !== 'shisha';

  return `
<svg viewBox="0 0 120 122" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <path d="M17 122 C17 95 33 83 60 83 C87 83 103 95 103 122 Z" fill="${a.shadow}"/>
  <ellipse cx="60" cy="118" rx="19" ry="12" fill="${a.light}" opacity=".42"/>
  ${catCoat(cat)}
  ${hasCollar ? `
  <path d="M37 97 Q60 109 83 97" stroke="${a.collar}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="107" r="3.4" fill="#e8b45a" stroke="#b98a3c" stroke-width="1"/>` : ''}

  <path d="M30 50 L23 13 L53 32 Z" fill="${a.fur}" stroke="${a.shadow}" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M90 50 L97 13 L67 32 Z" fill="${a.fur}" stroke="${a.shadow}" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M34 45 L30 22 L48 34 Z" fill="${a.inner}"/>
  <path d="M86 45 L90 22 L72 34 Z" fill="${a.inner}"/>

  <path d="M60 27 C84 27 97 43 97 64 C97 84 82 97 60 97 C38 97 23 84 23 64 C23 43 39 27 60 27 Z" fill="${a.fur}"/>
  <path d="M60 27 C84 27 97 43 97 64 C97 84 82 97 60 97 C38 97 23 84 23 64 C23 43 39 27 60 27 Z" fill="none" stroke="${a.shadow}" stroke-width="1.2" opacity=".55"/>

  ${catStripes(cat)}
  ${catEyes(cat)}

  <ellipse cx="51" cy="79" rx="9" ry="6.4" fill="${a.light}" opacity=".5"/>
  <ellipse cx="69" cy="79" rx="9" ry="6.4" fill="${a.light}" opacity=".5"/>
  <path d="M60 72.6 L56.4 68.7 Q60 66.9 63.6 68.7 Z" fill="${a.nose}"/>
  <path d="M60 72.6 V75.4" stroke="${a.mouth}" stroke-width="1.8" stroke-linecap="round"/>
  ${catMouth(cat)}
  ${catWhiskers(cat)}
  ${catAccessories(cat)}
</svg>`;
}
