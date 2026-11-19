/*
 * Haru — RikiPath's study companion, drawn natively for the Web.
 * Identity kept from the brand character: white fox, charcoal outline,
 * Sakura-pink ear tips & tail tip, rosy cheeks, five-petal Sakura crest.
 * Web adds expressions and study activities so Haru can play a role on
 * larger layouts (hero, onboarding, empty states, results) without being
 * repeated everywhere.
 *
 * <Haru mood="happy|wink|thinking|cheer|calm|sad" activity="none|book|pencil|flag|headset|trophy|wave" />
 */

const INK = '#2D282A';
const FUR = '#FFFFFF';
const FUR_SHADE = '#F6EFF1';
const PINK = '#E05A7A';
const PINK_SOFT = '#FFE3EA';
const CHEEK = '#F8BBD0';
const GOLD = '#F2B84B';

function Eyes({ mood }) {
  if (mood === 'cheer' || mood === 'happy') {
    return (
      <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M91 104 q7 -8 14 0" />
        <path d="M135 104 q7 -8 14 0" />
      </g>
    );
  }
  if (mood === 'wink') {
    return (
      <g>
        <ellipse cx="98" cy="104" rx="5.2" ry="6.4" fill={INK} />
        <circle cx="100" cy="101.5" r="1.8" fill="#fff" />
        <path d="M135 105 q7 -7 14 0" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  if (mood === 'calm') {
    return (
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M91 104 q7 5 14 0" />
        <path d="M135 104 q7 5 14 0" />
      </g>
    );
  }
  if (mood === 'sad') {
    return (
      <g>
        <ellipse cx="98" cy="106" rx="5" ry="5.6" fill={INK} />
        <ellipse cx="142" cy="106" rx="5" ry="5.6" fill={INK} />
        <circle cx="99.5" cy="104" r="1.6" fill="#fff" />
        <circle cx="143.5" cy="104" r="1.6" fill="#fff" />
        <path d="M89 95 l12 4 M151 95 l-12 4" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  }
  // default + thinking: open attentive eyes
  return (
    <g>
      <ellipse cx="98" cy="104" rx="5.2" ry="6.4" fill={INK} />
      <ellipse cx="142" cy="104" rx="5.2" ry="6.4" fill={INK} />
      <circle cx="100" cy="101.5" r="1.9" fill="#fff" />
      <circle cx="144" cy="101.5" r="1.9" fill="#fff" />
      {mood === 'thinking' && <path d="M134 92 q8 -4 16 1" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />}
    </g>
  );
}

function Mouth({ mood }) {
  if (mood === 'cheer') {
    return <path d="M111 116 q9 12 18 0 z" fill="#C24362" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />;
  }
  if (mood === 'sad') return <path d="M114 121 q6 -5 12 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />;
  if (mood === 'thinking') return <path d="M115 119 h9" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />;
  return <path d="M114 117 q3 4 6 0 q3 4 6 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />;
}

function Activity({ activity }) {
  switch (activity) {
    case 'book':
      return (
        <g>
          <path d="M84 150 L120 158 L156 150 L156 184 L120 192 L84 184 Z" fill="#fff" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M120 158 V192" stroke={INK} strokeWidth="2.2" />
          <path d="M92 160 l20 4 M92 168 l20 4 M128 164 l20 -4 M128 172 l20 -4" stroke="#C9BEC2" strokeWidth="2" strokeLinecap="round" />
          <text x="102" y="181" fontSize="11" fontWeight="700" fill={PINK} fontFamily="Noto Sans JP, sans-serif">あ</text>
          <ellipse cx="86" cy="170" rx="8" ry="10" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="154" cy="170" rx="8" ry="10" fill={FUR} stroke={INK} strokeWidth="2.4" />
        </g>
      );
    case 'pencil':
      return (
        <g>
          <g transform="translate(150 150) rotate(-35)">
            <rect x="-4" y="-34" width="8" height="40" rx="2" fill={GOLD} stroke={INK} strokeWidth="2" />
            <path d="M-4 6 L0 15 L4 6 Z" fill="#FCE3C0" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <rect x="-4" y="-40" width="8" height="7" rx="2" fill={PINK} stroke={INK} strokeWidth="2" />
          </g>
          <ellipse cx="150" cy="158" rx="8.5" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="94" cy="160" rx="8" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
        </g>
      );
    case 'flag':
      return (
        <g>
          <path d="M162 66 V150" stroke="#8A5A16" strokeWidth="3" strokeLinecap="round" />
          <path d="M162 68 h34 l-8 11 l8 11 h-34 z" fill={PINK} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="176" cy="79" r="4" fill="#fff" />
          <ellipse cx="160" cy="146" rx="8.5" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="94" cy="160" rx="8" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
        </g>
      );
    case 'headset':
      return (
        <g>
          <path d="M70 104 q0 -58 50 -58 q50 0 50 58" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="60" y="96" width="16" height="26" rx="7" fill={PINK} stroke={INK} strokeWidth="2.4" />
          <rect x="164" y="96" width="16" height="26" rx="7" fill={PINK} stroke={INK} strokeWidth="2.4" />
          <path d="M70 120 q6 18 28 16" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="136" r="4" fill={INK} />
          <ellipse cx="94" cy="160" rx="8" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="146" cy="160" rx="8" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
        </g>
      );
    case 'trophy':
      return (
        <g>
          <path d="M104 146 h32 v10 q0 18 -16 20 q-16 -2 -16 -20 z" fill={GOLD} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M104 150 q-10 0 -10 8 q2 8 12 8 M136 150 q10 0 10 8 q-2 8 -12 8" stroke={INK} strokeWidth="2.2" fill="none" />
          <rect x="112" y="176" width="16" height="6" fill="#D99A2B" stroke={INK} strokeWidth="2" />
          <rect x="106" y="182" width="28" height="7" rx="2" fill="#8A5A16" stroke={INK} strokeWidth="2" />
          <path d="M120 152 l2.4 5 5.4 .6 -4 3.6 1.2 5.2 -5 -2.8 -5 2.8 1.2 -5.2 -4 -3.6 5.4 -.6 z" fill="#fff" />
          <ellipse cx="98" cy="160" rx="8" ry="10.5" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="142" cy="160" rx="8" ry="10.5" fill={FUR} stroke={INK} strokeWidth="2.4" />
        </g>
      );
    case 'wave':
      return (
        <g>
          <ellipse cx="94" cy="160" rx="8" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <g className="rp-haru-wave" style={{ transformOrigin: '150px 150px' }}>
            <path d="M146 152 q14 -16 18 -34" stroke={INK} strokeWidth="2.4" fill="none" />
            <ellipse cx="164" cy="114" rx="9" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
          </g>
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx="96" cy="160" rx="8" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="144" cy="160" rx="8" ry="11" fill={FUR} stroke={INK} strokeWidth="2.4" />
        </g>
      );
  }
}

export default function Haru({ mood = 'happy', activity = 'none', size = 160, title, className, halo = false }) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      className={className}
    >
      {halo && <circle cx="120" cy="126" r="104" fill="#FFF3F6" />}
      {/* shadow */}
      <ellipse cx="120" cy="212" rx="62" ry="8" fill="#2D282A" opacity="0.08" />
      {/* tail */}
      <path d="M160 178 C198 172 218 136 206 108 C198 90 172 96 164 116 C156 134 154 162 160 178 Z" fill={FUR} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M193 124 C208 108 206 96 196 92 C186 88 176 96 172 106 C180 116 187 120 193 124 Z" fill={PINK} />
      {/* body */}
      <ellipse cx="120" cy="168" rx="48" ry="40" fill={FUR} stroke={INK} strokeWidth="3" />
      <ellipse cx="120" cy="174" rx="30" ry="25" fill={PINK_SOFT} opacity="0.75" />
      {/* feet */}
      <ellipse cx="94" cy="203" rx="16" ry="9" fill={FUR} stroke={INK} strokeWidth="3" />
      <ellipse cx="146" cy="203" rx="16" ry="9" fill={FUR} stroke={INK} strokeWidth="3" />
      {/* ears */}
      <path d="M80 92 L62 44 C60 38 68 34 74 39 L104 74 Z" fill={FUR} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M79 82 L68 52 L95 72 Z" fill={PINK_SOFT} />
      <path d="M68 51 L62 44 L74 39 Z" fill={PINK} />
      <path d="M160 92 L178 44 C180 38 172 34 166 39 L136 74 Z" fill={FUR} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M161 82 L172 52 L145 72 Z" fill={PINK_SOFT} />
      <path d="M172 51 L178 44 L166 39 Z" fill={PINK} />
      {/* head */}
      <ellipse cx="120" cy="106" rx="54" ry="47" fill={FUR} stroke={INK} strokeWidth="3" />
      <path d="M78 124 q42 26 84 0 q-10 22 -42 24 q-32 -2 -42 -24z" fill={FUR_SHADE} />
      {/* sakura crest */}
      <g transform="translate(120 78) scale(0.72)">
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="0" cy="-9" rx="6" ry="7.5" fill={PINK} transform={`rotate(${r})`} />
        ))}
        <circle r="4" fill={GOLD} />
      </g>
      {/* cheeks */}
      <ellipse cx="86" cy="118" rx="9.5" ry="5.5" fill={CHEEK} opacity="0.85" />
      <ellipse cx="154" cy="118" rx="9.5" ry="5.5" fill={CHEEK} opacity="0.85" />
      <Eyes mood={mood} />
      <polygon points="120,113 116.5,109.5 123.5,109.5" fill={INK} />
      <Mouth mood={mood} />
      <Activity activity={activity} />
      {mood === 'thinking' && (
        <g fill="#fff" stroke="#E5E0E2" strokeWidth="2">
          <circle cx="182" cy="62" r="5" />
          <circle cx="196" cy="44" r="8" />
          <ellipse cx="214" cy="22" rx="18" ry="13" />
        </g>
      )}
      {mood === 'cheer' && (
        <g fill={GOLD}>
          <path d="M44 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path d="M196 54 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" />
        </g>
      )}
    </svg>
  );
}
