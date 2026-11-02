/*
 * سرور چندنفره‌ی «فرار از زیرزمین شهر فرش»
 * بدون هیچ پکیج اضافه (فقط Node 18+).   اجرا:   node server.js
 * هم خود بازی (zirzamin.html) رو سرو می‌کنه، هم WebSocket رو.
 * متغیرهای اختیاری: PORT, ALLOWED_ORIGIN (مثلا https://my-site.com)
 */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = +process.env.PORT || 8080;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const MAX_PLAYERS = 3;
const MAX_ROOMS = 300;
const MAX_FRAME = 2048;            // پیام بازی خیلی کوچیکه؛ بزرگ‌تر از این رد می‌شه
const RATE_LIMIT = 150;            // حداکثر پیام در ثانیه برای هر اتصال
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const HTML_FILE = path.join(__dirname, 'zirzamin.html');

/* پیام‌هایی که فقط میزبان می‌تونه بفرسته */
const HOST_ONLY = new Set(['m', 'caught', 'bo', 'go', 'lobby']);
/* پیام‌های مجاز برای رله */
const RELAY = new Set(['s', 'm', 'k', 'b', 'tg', 'tp', 'stun', 'bo', 'caught', 'esc', 'f']);

const rooms = new Map();           // code -> {code, players:Map(id->client), started}

/* ---------------- HTTP (سرو خود بازی) ---------------- */
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  const headers = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' };
  if (url === '/' || url === '/index.html' || url === '/zirzamin.html') {
    fs.readFile(HTML_FILE, (err, buf) => {
      if (err) { res.writeHead(404, headers); return res.end('zirzamin.html کنار server.js نیست'); }
      res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buf);
    });
  } else if (url === '/healthz') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/plain' });
    res.end('ok rooms=' + rooms.size);
  } else {
    res.writeHead(404, headers); res.end('not found');
  }
});

/* ---------------- WebSocket (پیاده‌سازی کوچک RFC6455) ---------------- */
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  const origin = req.headers.origin || '';
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket' ||
      (ALLOWED_ORIGIN && origin !== ALLOWED_ORIGIN)) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); return socket.destroy();
  }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);         // مهم‌ترین خط برای پینگ کم: بسته‌ها رو نگه نمی‌داره
  socket.setKeepAlive(true, 15000);
  socket.setTimeout(45000, () => socket.destroy());
  new Client(socket);
});

function frame(opcode, payload) {
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | opcode, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, payload]);
}

class Client {
  constructor(socket) {
    this.socket = socket; this.buf = Buffer.alloc(0);
    this.room = null; this.id = -1; this.name = '';
    this.alive = true; this.winStart = Date.now(); this.winCount = 0;
    socket.on('data', d => this.onData(d));
    socket.on('close', () => this.close());
    socket.on('error', () => this.close());
  }
  sendRaw(str) { if (this.alive) { try { this.socket.write(frame(0x1, Buffer.from(str))); } catch (e) { } } }
  send(obj) { this.sendRaw(JSON.stringify(obj)); }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    if (this.buf.length > 70000) return this.socket.destroy();
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (!masked || len > 65000) return this.socket.destroy();       // مرورگر همیشه mask می‌کنه
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4);
      const data = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < len; i++) data[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);
      if (op === 0x8) { this.socket.end(frame(0x8, Buffer.alloc(0))); return; }
      if (op === 0x9) { this.socket.write(frame(0xA, data)); continue; }
      if (op === 0xA) continue;
      if (!fin || op === 0x0 || op !== 0x1) continue;                  // فقط پیام متنی کامل
      this.onMessage(data.toString('utf8'));
    }
  }
  onMessage(str) {
    const now = Date.now();
    if (now - this.winStart > 1000) { this.winStart = now; this.winCount = 0; }
    if (++this.winCount > RATE_LIMIT) return;                          // فلود → نادیده
    if (str.length > MAX_FRAME) return;
    let m; try { m = JSON.parse(str); } catch (e) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    if (m.t === 'ping') return this.send({ t: 'pong', n: m.n });
    if (m.t === 'join') return this.join(m);
    const room = this.room; if (!room) return;
    const isHost = room.hostId === this.id;
    if (m.t === 'go') {
      if (!isHost) return;
      room.started = true;
      const seed = crypto.randomInt(1, 2147483647);
      return broadcast(room, { t: 'go', seed, players: listPlayers(room) });
    }
    if (m.t === 'lobby') {
      if (!isHost) return;
      room.started = false;
      return broadcast(room, { t: 'lobby', players: listPlayers(room), host: room.hostId });
    }
    if (!RELAY.has(m.t)) return;
    if (HOST_ONLY.has(m.t) && !isHost) return;
    m.from = this.id;
    const out = JSON.stringify(m);
    for (const c of room.players.values()) if (c !== this) c.sendRaw(out);
  }
  join(m) {
    if (this.room) return;
    const name = cleanName(m.name);
    if (!name) return this.send({ t: 'err', m: 'اسم رو درست بنویس' });
    let code = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    let room;
    if (m.create) {
      if (rooms.size >= MAX_ROOMS) return this.send({ t: 'err', m: 'سرور پره، چند لحظه دیگه امتحان کن' });
      do { code = randCode(); } while (rooms.has(code));
      room = { code, players: new Map(), started: false, hostId: -1 };
      rooms.set(code, room);
    } else {
      room = rooms.get(code);
      if (!room) return this.send({ t: 'err', m: 'اتاقی با این کد پیدا نشد' });
      if (room.players.size >= MAX_PLAYERS) return this.send({ t: 'err', m: 'اتاق پره (حداکثر ۳ نفر)' });
      if (room.started) return this.send({ t: 'err', m: 'بازی شروع شده؛ صبر کن دور تموم شه' });
    }
    let id = 0; while (room.players.has(id)) id++;
    this.id = id; this.room = room; this.name = uniqueName(room, name);
    room.players.set(id, this);
    if (room.hostId < 0) room.hostId = id;
    this.send({ t: 'joined', id, room: code, host: room.hostId, players: listPlayers(room), name: this.name });
    broadcast(room, { t: 'peers', players: listPlayers(room), host: room.hostId }, this);
  }
  close() {
    if (!this.alive) return; this.alive = false;
    try { this.socket.destroy(); } catch (e) { }
    const room = this.room; if (!room) return;
    room.players.delete(this.id);
    if (!room.players.size) { rooms.delete(room.code); return; }
    if (room.hostId === this.id) room.hostId = Math.min(...room.players.keys());   // ارتقای میزبان
    broadcast(room, { t: 'peers', players: listPlayers(room), host: room.hostId, left: this.id });
  }
}

function listPlayers(room) { return [...room.players.values()].map(c => ({ id: c.id, name: c.name })); }
function broadcast(room, obj, except) {
  const s = JSON.stringify(obj);
  for (const c of room.players.values()) if (c !== except) c.sendRaw(s);
}
function randCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < 4; i++) s += A[crypto.randomInt(A.length)];
  return s;
}
/* اسم: حروف کنترلی و بیدی‌ی خطرناک پاک می‌شن، حداکثر ۱۶ حرف */
function cleanName(n) {
  n = String(n == null ? '' : n)
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF<>]/g, '')
    .replace(/\s+/g, ' ').trim();
  return [...n].slice(0, 16).join('');
}
function uniqueName(room, name) {
  const used = new Set([...room.players.values()].map(c => c.name.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  for (let i = 2; i < 10; i++) { const t = name + ' ' + i; if (!used.has(t.toLowerCase())) return t; }
  return name + ' ' + crypto.randomInt(10, 99);
}

server.listen(PORT, () => {
  console.log('بازی روی  http://localhost:' + PORT + '  بالا اومد');
  console.log('دوستات باید به همین سرور وصل بشن (آدرس عمومی یا IP همین سیستم).');
});
