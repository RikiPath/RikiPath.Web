export const RIKI_MASCOT_ASSETS = {
  welcome: new URL('../../assets/mascot/riki-welcome.webp', import.meta.url).href,
  studying: new URL('../../assets/mascot/riki-studying.webp', import.meta.url).href,
  thinking: new URL('../../assets/mascot/riki-thinking.webp', import.meta.url).href,
  celebrating: new URL('../../assets/mascot/riki-celebrating.webp', import.meta.url).href,
  achievement: new URL('../../assets/mascot/riki-achievement.webp', import.meta.url).href,
  encouraging: new URL('../../assets/mascot/riki-encouraging.webp', import.meta.url).href,
  resting: new URL('../../assets/mascot/riki-resting.webp', import.meta.url).href,
  confused: new URL('../../assets/mascot/riki-confused.webp', import.meta.url).href,
};

export const RIKI_POSE_MAP = {
  welcome: 'welcome',
  studying: 'studying',
  thinking: 'thinking',
  celebrating: 'celebrating',
  achievement: 'achievement',
  encouraging: 'encouraging',
  resting: 'resting',
  confused: 'confused',
  // Aliases kept compatible across existing screens
  greeting: 'welcome',
  guiding: 'encouraging',
  listening: 'studying',
  writing: 'studying',
  sad: 'confused',
};
