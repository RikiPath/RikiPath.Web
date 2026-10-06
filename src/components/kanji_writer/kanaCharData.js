const KANA_DATA_URL = 'https://cdn.jsdelivr.net/gh/ailectra/kana-json@v0.0.1/data';

export function loadKanaCharData(char, onLoad, onError) {
  fetch(`${KANA_DATA_URL}/${encodeURIComponent(char)}.json`)
    .then((response) => {
      if (!response.ok) throw new Error('Không tải được dữ liệu nét chữ.');
      return response.json();
    })
    .then(onLoad)
    .catch(onError);
}
