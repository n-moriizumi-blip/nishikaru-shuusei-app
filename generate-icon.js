// アプリアイコンPNGを生成する（1回限り実行）。Node.jsのzlibで正しく圧縮したPNGを作る。
// 2026-08-06：申請全般を扱う統合アプリへの拡張にあわせ、単色の正方形から
// 「書類（フォーム）」のデザインに変更した
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// pixelColor(x, y) => [r, g, b] を返す関数を渡すと、1ピクセルずつ呼び出して絵を描く
function buildIconFromFn(size, pixelColorFn, outPath) {
  const raw = Buffer.alloc(size * (1 + size * 3));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // フィルタタイプ：None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelColorFn(x, y);
      raw[offset++] = r; raw[offset++] = g; raw[offset++] = b;
    }
  }
  const idatData = zlib.deflateSync(raw);
  const ihdr = Buffer.concat([
    Buffer.from([(size >>> 24) & 0xFF, (size >>> 16) & 0xFF, (size >>> 8) & 0xFF, size & 0xFF]),
    Buffer.from([(size >>> 24) & 0xFF, (size >>> 16) & 0xFF, (size >>> 8) & 0xFF, size & 0xFF]),
    Buffer.from([8, 2, 0, 0, 0]),
  ]);
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(outPath, png);
  console.log('作成しました：' + outPath + '（' + png.length + 'バイト）');
}

// 青地に、折れた角のある白い書類＋グレーの罫線3本を描く「申請フォーム」アイコン
function makeDocIcon(size) {
  const BLUE = [0x2E, 0x75, 0xB6];
  const WHITE = [0xFF, 0xFF, 0xFF];
  const LINE = [0xB9, 0xCF, 0xE4]; // 罫線は薄い青系グレー

  // 書類の矩形（サイズに対する比率で指定）
  const px1 = size * 0.27, px2 = size * 0.73;
  const py1 = size * 0.18, py2 = size * 0.82;
  const foldSize = size * 0.14; // 右上の折れ角の大きさ

  // 罫線（横棒）の位置・太さ（比率）
  const lines = [0.34, 0.48, 0.62].map((t) => py1 + (py2 - py1) * t);
  const lineThickness = size * 0.045;
  const lineInsetLeft = size * 0.06;
  const lineInsetRightShort = size * 0.16; // 一番下の罫線は少し短くする

  return function pixelColor(x, y) {
    // 書類の外側は背景色
    const inDocBox = x >= px1 && x <= px2 && y >= py1 && y <= py2;
    if (!inDocBox) return BLUE;

    // 右上の折れ角（三角形部分）は背景色に見せる
    const foldX1 = px2 - foldSize;
    if (x >= foldX1 && y <= py1 + foldSize) {
      const dx = x - foldX1, dy = y - py1;
      if (dx > dy) return BLUE; // 対角線より右上側は折れて見えている裏側＝背景色
    }

    // 罫線（横棒）
    for (let i = 0; i < lines.length; i++) {
      const ly = lines[i];
      if (y >= ly && y < ly + lineThickness) {
        const rightInset = (i === lines.length - 1) ? lineInsetRightShort : size * 0.08;
        if (x >= px1 + lineInsetLeft && x <= px2 - rightInset) return LINE;
      }
    }
    return WHITE;
  };
}

buildIconFromFn(192, makeDocIcon(192), 'icon-192.png');
buildIconFromFn(512, makeDocIcon(512), 'icon-512.png');
