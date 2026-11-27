// Phần mềm quản lý nhân sự toàn diện – bản cài trên máy chủ nội bộ (Windows)
// Chạy đúng mã nguồn bản đầy đủ (src/worker.js) bằng Miniflare/workerd của Cloudflare,
// cơ sở dữ liệu D1 lưu thành file SQLite trên chính máy chủ. Không gửi dữ liệu ra ngoài.
//
//   node may-chu.mjs                 chạy máy chủ (dịch vụ Windows gọi lệnh này)
//   node may-chu.mjs --sao-luu       sao lưu ngay (chạy được cả khi máy chủ đang chạy)
//   node may-chu.mjs --khoi-phuc F   khôi phục từ file sao lưu F (phải dừng dịch vụ trước)
//   node may-chu.mjs --thong-tin     in địa chỉ truy cập, thư mục dữ liệu
//   node may-chu.mjs --cong          in cổng đang dùng (để mở tường lửa)
//
// Quản trị tử tế – AGPL-3.0
import { Miniflare, Log, LogLevel } from 'miniflare';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, 'app');
const DATA = process.env.QLNS_DATA || (process.platform === 'win32' ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'QuanLyNhanSu') : path.join(HERE, 'du-lieu'));
const CFG_FILE = path.join(DATA, 'cau-hinh.json');
const DB_DIR = path.join(DATA, 'csdl');
const BK_DIR = path.join(DATA, 'sao-luu');
const LOG_DIR = path.join(DATA, 'nhat-ky');
const VER = (() => { try { return JSON.parse(fs.readFileSync(path.join(HERE, 'phien-ban.json'), 'utf8')).ver || ''; } catch (e) { return ''; } })();

for (const d of [DATA, DB_DIR, BK_DIR, LOG_DIR]) fs.mkdirSync(d, { recursive: true });

/* ---------- cấu hình ---------- */
const MAC_DINH = {
  cong: 8080,                 // cổng truy cập: http://<IP máy chủ>:8080
  https: null,                // { pfx: 'C:\\...\\cert.pfx', mat_khau: '...' } hoặc { key: '...key.pem', cert: '...cert.pem' }
  tin_proxy: false,           // true nếu đặt sau IIS / nginx / Cloudflare Tunnel… (lấy IP thật từ X-Forwarded-For)
  sao_luu: { gio: '23:30', giu: 30 }, // sao lưu tự động mỗi ngày, giữ 30 bản gần nhất
  ma_cai_dat: ''              // mã dùng một lần khi tạo tài khoản quản trị đầu tiên ở /quan-ly
};
function docCfg() {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { if (fs.existsSync(CFG_FILE)) { ghi('LỖI', 'File cau-hinh.json viết sai, dùng cấu hình mặc định: ' + e.message); } }
  const cfg = Object.assign({}, MAC_DINH, c, { sao_luu: Object.assign({}, MAC_DINH.sao_luu, c.sao_luu || {}) });
  if (!cfg.ma_cai_dat || String(cfg.ma_cai_dat).length < 8) {
    cfg.ma_cai_dat = crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toUpperCase();
    try { fs.writeFileSync(CFG_FILE, JSON.stringify(Object.assign({}, c, { ma_cai_dat: cfg.ma_cai_dat }), null, 2)); } catch (e) { }
  }
  if (!fs.existsSync(CFG_FILE)) fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2));
  return cfg;
}

/* ---------- nhật ký ---------- */
function ghi(muc, ...a) {
  const line = new Date().toLocaleString('vi-VN', { hour12: false }) + ' [' + muc + '] ' + a.join(' ');
  console.log(line);
  try {
    const f = path.join(LOG_DIR, 'may-chu.log');
    if (fs.existsSync(f) && fs.statSync(f).size > 5e6) { try { fs.renameSync(f, f + '.1'); } catch (e) { } }
    fs.appendFileSync(f, line + '\n');
  } catch (e) { }
}

function diaChi(cfg) {
  const out = [], sch = cfg.https ? 'https' : 'http';
  for (const [ten, ds] of Object.entries(os.networkInterfaces())) for (const n of ds || []) if (n.family === 'IPv4' && !n.internal) out.push(sch + '://' + n.address + ':' + cfg.cong + '  (' + ten + ')');
  return [sch + '://localhost:' + cfg.cong].concat(out);
}

/* ---------- sao lưu / khôi phục ---------- */
function fileCsdl() {
  const out = [];
  const walk = d => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.sqlite$/.test(e.name) && !/metadata/.test(e.name)) out.push(p); } };
  walk(DB_DIR); return out;
}
async function saoLuu(ly) {
  const { DatabaseSync } = await import('node:sqlite');
  const ds = fileCsdl(); if (!ds.length) { ghi('SAO LƯU', 'Chưa có dữ liệu để sao lưu.'); return null; }
  const t = new Date(), st = t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0') + '-' + String(t.getHours()).padStart(2, '0') + String(t.getMinutes()).padStart(2, '0') + String(t.getSeconds()).padStart(2, '0');
  const dir = path.join(BK_DIR, st + (ly ? '-' + ly : '')); fs.mkdirSync(dir, { recursive: true });
  for (const f of ds) {
    const rel = path.relative(DB_DIR, f), dst = path.join(dir, rel); fs.mkdirSync(path.dirname(dst), { recursive: true });
    const db = new DatabaseSync(f, { readOnly: true });
    try { db.exec("VACUUM INTO '" + dst.replace(/'/g, "''") + "'"); } finally { db.close(); }
  }
  fs.writeFileSync(path.join(dir, 'thong-tin.json'), JSON.stringify({ luc: t.toISOString(), phien_ban: VER, may: os.hostname(), so_file: ds.length }, null, 2));
  ghi('SAO LƯU', 'Đã sao lưu vào ' + dir);
  return dir;
}
function donSaoLuu(giu) {
  const ds = fs.readdirSync(BK_DIR, { withFileTypes: true }).filter(e => e.isDirectory() && /^\d{8}-\d{6}-tu-dong$/.test(e.name)).map(e => e.name).sort();
  while (ds.length > giu) { const x = ds.shift(); try { fs.rmSync(path.join(BK_DIR, x), { recursive: true, force: true }); } catch (e) { } }
}
async function khoiPhuc(src) {
  if (!src || !fs.existsSync(src)) throw new Error('Không thấy thư mục sao lưu: ' + src);
  const st = fs.statSync(src); if (!st.isDirectory()) throw new Error('Hãy chọn THƯ MỤC sao lưu (trong ' + BK_DIR + '), không phải một file.');
  const files = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.sqlite$/.test(e.name)) files.push(p); } };
  walk(src); if (!files.length) throw new Error('Thư mục này không có dữ liệu sao lưu.');
  if (fileCsdl().length) await saoLuu('truoc-khoi-phuc'); // giữ lại dữ liệu hiện tại phòng khi chọn nhầm
  fs.rmSync(DB_DIR, { recursive: true, force: true }); fs.mkdirSync(DB_DIR, { recursive: true });
  for (const f of files) { const dst = path.join(DB_DIR, path.relative(src, f)); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(f, dst); }
  ghi('KHÔI PHỤC', 'Đã khôi phục dữ liệu từ ' + src);
}

/* ---------- lệnh phụ ---------- */
const arg = process.argv.slice(2);
if (arg[0] === '--sao-luu') { try { const d = await saoLuu('thu-cong'); console.log(d ? 'Xong: ' + d : 'Chưa có dữ liệu.'); process.exit(0); } catch (e) { console.error('Lỗi sao lưu: ' + e.message); process.exit(1); } }
if (arg[0] === '--khoi-phuc') { try { await khoiPhuc(arg[1]); console.log('Xong. Khởi động lại dịch vụ để dùng dữ liệu vừa khôi phục.'); process.exit(0); } catch (e) { console.error('Lỗi khôi phục: ' + e.message); process.exit(1); } }
if (arg[0] === '--cong') { console.log(docCfg().cong); process.exit(0); }
if (arg[0] === '--thong-tin') { const c = docCfg(); console.log('Phiên bản: ' + VER + '\nDữ liệu: ' + DATA + '\nĐịa chỉ truy cập:\n  ' + diaChi(c).join('\n  ') + '\nTrang quản trị: /quan-ly   ·   Ứng dụng nhân viên: /\nMã cài đặt (tạo tài khoản quản trị đầu tiên): ' + c.ma_cai_dat); process.exit(0); }

/* ---------- máy chủ ---------- */
const cfg = docCfg();
const mf = new Miniflare({
  rootPath: APP,
  scriptPath: path.join(APP, 'src', 'worker.js'),
  modules: true,
  modulesRules: [{ type: 'Text', include: ['**/*.html'] }, { type: 'ESModule', include: ['**/*.js', '**/*.mjs'] }],
  compatibilityDate: '2025-09-01',
  d1Databases: { DB: 'quan-ly-nhan-su-db' },
  d1Persist: DB_DIR,
  bindings: { MA_CAI_DAT: String(cfg.ma_cai_dat), MAY_CHU_NOI_BO: '1' },
  host: '127.0.0.1', port: 0,
  cf: false, // không hỏi workers.cloudflare.com – máy chủ nội bộ chạy được cả khi không có internet
  log: new Log(LogLevel.WARN)
});
await mf.ready;

// Khi sao lưu tự động: tạm giữ yêu cầu mới, chờ yêu cầu đang chạy xong, rồi chụp dữ liệu
let dangChay = 0, khoa = null;
const HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer']);
function ipThat(req) {
  if (cfg.tin_proxy) { const x = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (x) return x; const c = req.headers['cf-connecting-ip']; if (c) return String(c); }
  return String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}
async function xuLy(req, res) {
  if (khoa) await khoa;
  dangChay++;
  try {
    const proto = cfg.tin_proxy && req.headers['x-forwarded-proto'] ? String(req.headers['x-forwarded-proto']).split(',')[0] : (cfg.https ? 'https' : 'http');
    const host = (cfg.tin_proxy && req.headers['x-forwarded-host']) || req.headers.host || ('localhost:' + cfg.cong);
    const h = new Headers();
    for (let i = 0; i < req.rawHeaders.length; i += 2) { const k = req.rawHeaders[i].toLowerCase(); if (HOP.has(k) || k === 'cf-connecting-ip' || k === 'x-test-ip') continue; h.append(req.rawHeaders[i], req.rawHeaders[i + 1]); }
    h.set('cf-connecting-ip', ipThat(req));
    const coBody = !['GET', 'HEAD'].includes(req.method);
    const r = await mf.dispatchFetch(proto + '://' + host + req.url, { method: req.method, headers: h, body: coBody ? req : undefined, duplex: coBody ? 'half' : undefined, redirect: 'manual' });
    const out = {};
    r.headers.forEach((v, k) => { if (k === 'set-cookie' || HOP.has(k) || k === 'content-length' || k === 'content-encoding') return; out[k] = v; });
    let ck = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
    // truy cập bằng http trong mạng nội bộ: trình duyệt không nhận cookie có cờ Secure → bỏ cờ này (có HTTPS thì giữ nguyên)
    if (proto !== 'https') ck = ck.map(c => c.replace(/;\s*Secure/ig, ''));
    if (ck.length) out['set-cookie'] = ck;
    // undici đã giải nén sẵn nội dung → bỏ content-encoding/content-length gốc
    res.writeHead(r.status, out);
    if (r.body && req.method !== 'HEAD') { for await (const ch of r.body) res.write(ch); }
    res.end();
  } catch (e) {
    ghi('LỖI', req.method + ' ' + req.url + ' – ' + (e && e.stack || e));
    if (!res.headersSent) { res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Máy chủ phần mềm nhân sự đang bận hoặc vừa gặp lỗi. Thử lại sau ít giây.'); } else res.end();
  } finally { dangChay--; }
}

let srv;
if (cfg.https) {
  const o = {};
  try {
    if (cfg.https.pfx) { o.pfx = fs.readFileSync(cfg.https.pfx); o.passphrase = cfg.https.mat_khau || ''; }
    else { o.key = fs.readFileSync(cfg.https.key); o.cert = fs.readFileSync(cfg.https.cert); }
  } catch (e) { ghi('LỖI', 'Không đọc được chứng chỉ HTTPS trong cau-hinh.json: ' + e.message); process.exit(1); }
  srv = https.createServer(o, xuLy);
} else srv = http.createServer(xuLy);
srv.requestTimeout = 0; srv.headersTimeout = 65000; srv.keepAliveTimeout = 60000;
srv.on('error', e => { ghi('LỖI', e.code === 'EADDRINUSE' ? 'Cổng ' + cfg.cong + ' đang bị chương trình khác dùng. Đổi "cong" trong ' + CFG_FILE + ' rồi khởi động lại dịch vụ.' : e.message); process.exit(1); });
srv.listen(cfg.cong, '0.0.0.0', () => {
  ghi('CHẠY', 'Phần mềm quản lý nhân sự ' + VER + ' – máy chủ nội bộ đã chạy. Dữ liệu: ' + DATA);
  for (const a of diaChi(cfg)) ghi('CHẠY', '  ' + a);
});

/* ---------- việc định kỳ: báo cáo (15 phút/lần, như cron trên Cloudflare) + sao lưu hằng ngày ---------- */
async function chayCron() {
  try { const w = await mf.getWorker(); await w.scheduled({ cron: '*/15 * * * *', scheduledTime: new Date() }); }
  catch (e) { ghi('LỖI', 'Việc định kỳ: ' + (e && e.message || e)); }
}
function henCron() { const t = 15 * 60e3, d = t - (Date.now() % t) + 5e3; setTimeout(() => { chayCron().finally(henCron); }, d); }
henCron();

let ngaySl = '';
async function kiemSaoLuu() {
  const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'), ng = n.toDateString();
  if (hm < String(cfg.sao_luu.gio || '23:30') || ngaySl === ng) return;
  ngaySl = ng;
  let mo; khoa = new Promise(r => { mo = r; });
  try { for (let i = 0; dangChay > 0 && i < 600; i++) await new Promise(r => setTimeout(r, 100)); await saoLuu('tu-dong'); donSaoLuu(+cfg.sao_luu.giu || 30); }
  catch (e) { ghi('LỖI', 'Sao lưu tự động: ' + e.message); }
  finally { khoa = null; mo(); }
}
// lần đầu chạy trong ngày đã qua giờ sao lưu thì không sao lưu bù ngay, chờ đến hôm sau
{ const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); if (hm >= String(cfg.sao_luu.gio || '23:30')) ngaySl = n.toDateString(); }
setInterval(kiemSaoLuu, 60e3);

async function dung() { ghi('DỪNG', 'Đang dừng máy chủ…'); try { srv.close(); await mf.dispose(); } catch (e) { } process.exit(0); }
process.on('SIGINT', dung); process.on('SIGTERM', dung);
process.on('uncaughtException', e => ghi('LỖI', 'uncaught: ' + (e && e.stack || e)));
process.on('unhandledRejection', e => ghi('LỖI', 'unhandled: ' + (e && e.stack || e)));
