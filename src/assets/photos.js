// Photography used on public/auth surfaces. Files live in /public/images (responsive WebP + JPG fallback).
// Provenance: pre-existing repository assets (added 2026-09-18); confirm licence before public launch.
export const PHOTOS = {
  sakura: {
    jpg: '/images/sakura-hero.jpg',
    webp: [['/images/sakura-hero-800.webp', 800], ['/images/sakura-hero-1400.webp', 1400]],
    width: 1400,
    height: 927,
    alt: 'Cành hoa anh đào nở rộ trên nền trời xanh',
  },
  fuji: {
    jpg: '/images/sakura-fuji.jpg',
    webp: [['/images/sakura-fuji-720.webp', 720], ['/images/sakura-fuji-1200.webp', 1200]],
    width: 1200,
    height: 781,
    alt: 'Núi Phú Sĩ và chùa Chureito lúc hoàng hôn',
  },
  // Team-owned illustration shared with RikiPath.Mobile (assets/images/learning/sakura_garden.png).
  garden: {
    jpg: '/images/sakura-garden.jpg',
    webp: [['/images/sakura-garden-640.webp', 640], ['/images/sakura-garden-1024.webp', 1024]],
    width: 1024,
    height: 1536,
    alt: 'Khu vườn Nhật với đèn đá, hồ cá và núi Phú Sĩ mùa hoa anh đào',
  },
  // RikiPath Sakura Banner Pack (4 generated banners with WebP primary + JPG fallback).
  bannerFujiLake: {
    jpg: '/images/rikipath-banner-fuji-lake.jpg',
    webp: [['/images/rikipath-banner-fuji-lake.webp', 831]],
    width: 831,
    height: 465,
    alt: 'Hồ Kawaguchi phản chiếu núi Phú Sĩ dưới tán hoa anh đào lúc bình minh',
  },
  bannerPagodaSunrise: {
    jpg: '/images/rikipath-banner-pagoda-sunrise.jpg',
    webp: [['/images/rikipath-banner-pagoda-sunrise.webp', 831]],
    width: 831,
    height: 465,
    alt: 'Chùa năm tầng Chureito và núi Phú Sĩ trong nắng sớm mùa hoa anh đào',
  },
  bannerKyotoStreet: {
    jpg: '/images/rikipath-banner-kyoto-street.jpg',
    webp: [['/images/rikipath-banner-kyoto-street.webp', 831]],
    width: 831,
    height: 466,
    alt: 'Phố cổ Kyoto với đèn lồng ấm áp và hàng cây hoa anh đào nở rộ',
  },
  bannerJapaneseGarden: {
    jpg: '/images/rikipath-banner-japanese-garden.jpg',
    webp: [['/images/rikipath-banner-japanese-garden.webp', 831]],
    width: 831,
    height: 466,
    alt: 'Vườn Nhật với cầu gỗ đỏ, hồ nước và cánh hoa anh đào rơi',
  },
};
