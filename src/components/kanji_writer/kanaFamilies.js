const youon = (base, voiced, maru) => ({
  plain: base,
  tenten: voiced,
  maru,
});

const ROWS = [
  {
    id: 'a',
    name: 'Nguyên âm',
    hira: ['あ', 'い', 'う', 'え', 'お'],
    kata: ['ア', 'イ', 'ウ', 'エ', 'オ'],
    romaji: ['a', 'i', 'u', 'e', 'o'],
  },
  {
    id: 'k',
    name: 'Hàng K',
    hira: ['か', 'き', 'く', 'け', 'こ'],
    kata: ['カ', 'キ', 'ク', 'ケ', 'コ'],
    romaji: ['ka', 'ki', 'ku', 'ke', 'ko'],
    tenten: {
      hira: ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
      kata: ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
      romaji: ['ga', 'gi', 'gu', 'ge', 'go'],
    },
    youon: youon(
      [['きゃ', 'キャ', 'kya'], ['きゅ', 'キュ', 'kyu'], ['きょ', 'キョ', 'kyo']],
      [['ぎゃ', 'ギャ', 'gya'], ['ぎゅ', 'ギュ', 'gyu'], ['ぎょ', 'ギョ', 'gyo']],
    ),
  },
  {
    id: 's',
    name: 'Hàng S',
    hira: ['さ', 'し', 'す', 'せ', 'そ'],
    kata: ['サ', 'シ', 'ス', 'セ', 'ソ'],
    romaji: ['sa', 'shi', 'su', 'se', 'so'],
    tenten: {
      hira: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
      kata: ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
      romaji: ['za', 'ji', 'zu', 'ze', 'zo'],
    },
    youon: youon(
      [['しゃ', 'シャ', 'sha'], ['しゅ', 'シュ', 'shu'], ['しょ', 'ショ', 'sho']],
      [['じゃ', 'ジャ', 'ja'], ['じゅ', 'ジュ', 'ju'], ['じょ', 'ジョ', 'jo']],
    ),
  },
  {
    id: 't',
    name: 'Hàng T',
    hira: ['た', 'ち', 'つ', 'て', 'と'],
    kata: ['タ', 'チ', 'ツ', 'テ', 'ト'],
    romaji: ['ta', 'chi', 'tsu', 'te', 'to'],
    tenten: {
      hira: ['だ', 'ぢ', 'づ', 'で', 'ど'],
      kata: ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
      romaji: ['da', 'di', 'du', 'de', 'do'],
    },
    youon: youon(
      [['ちゃ', 'チャ', 'cha'], ['ちゅ', 'チュ', 'chu'], ['ちょ', 'チョ', 'cho']],
    ),
  },
  {
    id: 'n',
    name: 'Hàng N',
    hira: ['な', 'に', 'ぬ', 'ね', 'の'],
    kata: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
    romaji: ['na', 'ni', 'nu', 'ne', 'no'],
    youon: youon(
      [['にゃ', 'ニャ', 'nya'], ['にゅ', 'ニュ', 'nyu'], ['にょ', 'ニョ', 'nyo']],
    ),
  },
  {
    id: 'h',
    name: 'Hàng H',
    hira: ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    kata: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
    romaji: ['ha', 'hi', 'fu', 'he', 'ho'],
    tenten: {
      hira: ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
      kata: ['バ', 'ビ', 'ブ', 'ベ', 'ボ'],
      romaji: ['ba', 'bi', 'bu', 'be', 'bo'],
    },
    maru: {
      hira: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
      kata: ['パ', 'ピ', 'プ', 'ペ', 'ポ'],
      romaji: ['pa', 'pi', 'pu', 'pe', 'po'],
    },
    youon: youon(
      [['ひゃ', 'ヒャ', 'hya'], ['ひゅ', 'ヒュ', 'hyu'], ['ひょ', 'ヒョ', 'hyo']],
      [['びゃ', 'ビャ', 'bya'], ['びゅ', 'ビュ', 'byu'], ['びょ', 'ビョ', 'byo']],
      [['ぴゃ', 'ピャ', 'pya'], ['ぴゅ', 'ピュ', 'pyu'], ['ぴょ', 'ピョ', 'pyo']],
    ),
  },
  {
    id: 'm',
    name: 'Hàng M',
    hira: ['ま', 'み', 'む', 'め', 'も'],
    kata: ['マ', 'ミ', 'ム', 'メ', 'モ'],
    romaji: ['ma', 'mi', 'mu', 'me', 'mo'],
    youon: youon(
      [['みゃ', 'ミャ', 'mya'], ['みゅ', 'ミュ', 'myu'], ['みょ', 'ミョ', 'myo']],
    ),
  },
  {
    id: 'y',
    name: 'Hàng Y',
    hira: ['や', 'ゆ', 'よ'],
    kata: ['ヤ', 'ユ', 'ヨ'],
    romaji: ['ya', 'yu', 'yo'],
  },
  {
    id: 'r',
    name: 'Hàng R',
    hira: ['ら', 'り', 'る', 'れ', 'ろ'],
    kata: ['ラ', 'リ', 'ル', 'レ', 'ロ'],
    romaji: ['ra', 'ri', 'ru', 're', 'ro'],
    youon: youon(
      [['りゃ', 'リャ', 'rya'], ['りゅ', 'リュ', 'ryu'], ['りょ', 'リョ', 'ryo']],
    ),
  },
  {
    id: 'w',
    name: 'Hàng W',
    hira: ['わ', 'を'],
    kata: ['ワ', 'ヲ'],
    romaji: ['wa', 'o'],
  },
  {
    id: 'nn',
    name: 'Âm ngắt',
    hira: ['ん'],
    kata: ['ン'],
    romaji: ['n'],
  },
];

function glyphs(row, script) {
  const letters = script === 'kata' ? row.kata : row.hira;
  return letters.map((kana, index) => ({ kana, romaji: row.romaji[index] }));
}

function comboGlyphs(list, script) {
  if (!list) return [];
  return list.map(([hira, kata, romaji]) => ({ kana: script === 'kata' ? kata : hira, romaji }));
}

export function kanaFamily(character, script) {
  const row = ROWS.find((entry) => {
    const letters = [...entry.hira, ...entry.kata, ...(entry.tenten?.hira || []), ...(entry.tenten?.kata || []), ...(entry.maru?.hira || []), ...(entry.maru?.kata || [])];
    return letters.includes(character);
  });
  if (!row) return null;
  const sections = [
    { title: 'Chữ gốc', items: glyphs(row, script) },
  ];
  if (row.tenten) sections.push({ title: 'Tenten', hint: 'Thêm ゛', items: glyphs(row.tenten, script) });
  if (row.maru) sections.push({ title: 'Maru', hint: 'Thêm ゜', items: glyphs(row.maru, script) });
  if (row.youon?.plain) sections.push({ title: 'Âm ghép', hint: 'Ghép với ゃ ゅ ょ', items: comboGlyphs(row.youon.plain, script) });
  if (row.youon?.tenten) sections.push({ title: 'Tenten + âm ghép', items: comboGlyphs(row.youon.tenten, script) });
  if (row.youon?.maru) sections.push({ title: 'Maru + âm ghép', items: comboGlyphs(row.youon.maru, script) });
  return { name: row.name, sections };
}
