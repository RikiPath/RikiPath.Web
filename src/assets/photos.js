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
  // Auth banners: high-resolution JPGs avoid upscaling the original 831px WebP pack.
  bannerFujiLake: {
    jpg: '/images/rikipath-banner-fuji-lake-hd.jpg',
    webp: [],
    width: 1672,
    height: 941,
    alt: 'Hồ Kawaguchi phản chiếu núi Phú Sĩ dưới tán hoa anh đào lúc bình minh',
  },
  bannerPagodaSunrise: {
    jpg: '/images/rikipath-banner-pagoda-sunrise-hd.jpg',
    webp: [],
    width: 1672,
    height: 941,
    alt: 'Chùa năm tầng Chureito và núi Phú Sĩ trong nắng sớm mùa hoa anh đào',
  },
  bannerKyotoStreet: {
    jpg: '/images/rikipath-banner-kyoto-street-hd.jpg',
    webp: [],
    width: 1672,
    height: 941,
    alt: 'Phố cổ Kyoto với đèn lồng ấm áp và hàng cây hoa anh đào nở rộ',
  },
  bannerJapaneseGarden: {
    jpg: '/images/rikipath-banner-japanese-garden-hd.jpg',
    webp: [],
    width: 1672,
    height: 941,
    alt: 'Vườn Nhật với cầu gỗ đỏ, hồ nước và cánh hoa anh đào rơi',
  },
  // 8 Japan Sakura Banners pack (1916 x 821 optimized WebP; original PNGs stored in resources/japan-banners-original/).
  bannerHokkaido: {
    jpg: '/images/japan-banners/01_homepage_hokkaido.webp',
    webp: [['/images/japan-banners/01_homepage_hokkaido.webp', 1916]],
    width: 1916,
    height: 821,
    alt: 'Cánh đồng hoa anh đào và núi tuyết Hokkaido trong nắng mai mùa xuân',
  },
  bannerKyotoSakura: {
    jpg: '/images/rikipath-banner-kyoto-sakura-hd.webp',
    webp: [['/images/rikipath-banner-kyoto-sakura-hd.webp', 1916]],
    width: 1916,
    height: 821,
    alt: 'Phố cổ Kyoto ánh đèn lồng ấm áp cùng chùa tháp và núi Phú Sĩ phía xa',
  },
  bannerTokyo: {
    jpg: '/images/japan-banners/03_register_tokyo.webp',
    webp: [['/images/japan-banners/03_register_tokyo.webp', 1916]],
    width: 1916,
    height: 821,
    alt: 'Đường chân trời Tokyo rực sáng cùng tháp Tokyo và sắc hoa anh đào buổi sớm',
  },
  bannerOsaka: {
    jpg: '/images/japan-banners/04_jlpt_osaka.webp',
    webp: [['/images/japan-banners/04_jlpt_osaka.webp', 1916]],
    width: 1916,
    height: 821,
    alt: 'Lâu đài Osaka uy nghiêm phản chiếu trên mặt nước dưới rặng hoa anh đào',
  },
  bannerKanazawa: {
    jpg: '/images/japan-banners/05_srs_kanazawa.webp',
    webp: [['/images/japan-banners/05_srs_kanazawa.webp', 1916]],
    width: 1916,
    height: 821,
    alt: 'Khu vườn Kenrokuen Kanazawa tĩnh lặng với cầu cong, đèn đá và mặt hồ soi bóng hoa',
  },
  bannerMiyajima: {
    jpg: '/images/japan-banners/06_groupclass_miyajima.webp',
    webp: [['/images/japan-banners/06_groupclass_miyajima.webp', 1916]],
    width: 1916,
    height: 821,
    alt: 'Cổng torii son đỏ nổi trên mặt biển Miyajima trong ánh hoàng hôn dịu êm',
  },
  bannerNara: {
    jpg: '/images/japan-banners/07_culture_nara.webp',
    webp: [['/images/japan-banners/07_culture_nara.webp', 1916]],
    width: 1916,
    height: 821,
    alt: 'Lối đèn đá công viên Nara với hươu hiền hòa hướng về chính điện cổ kính',
  },
  bannerOkinawa: {
    jpg: '/images/japan-banners/08_community_okinawa.webp',
    webp: [['/images/japan-banners/08_community_okinawa.webp', 1916]],
    width: 1916,
    height: 821,
    alt: 'Vịnh biển xanh trong Okinawa bên cổng đá ngói đỏ Ryukyu và hoa dâm bụt mùa xuân',
  },
};
