// PWAテスト用のアイコンPNGを生成する（1回限り実行）。Node.jsのzlibで正しく圧縮したPNGを作る。
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

function buildIcon(size, [r, g, b], outPath) {
  const raw = Buffer.alloc(size * (1 + size * 3));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // フィルタタイプ：None
    for (let x = 0; x < size; x++) {
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

// 西軽精機のブランドカラー（青）で192x192・512x512の2サイズを作る
buildIcon(192, [0x2E, 0x75, 0xB6], 'icon-192.png');
buildIcon(512, [0x2E, 0x75, 0xB6], 'icon-512.png');
