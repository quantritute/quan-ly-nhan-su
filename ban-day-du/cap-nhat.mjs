// CẬP NHẬT bản đầy đủ cài bằng gói cài (cách 2) – Phần mềm quản lý nhân sự toàn diện, Quản trị tử tế (AGPL-3.0)
//   node cap-nhat.mjs           tải bản mới nhất (nếu có), giữ nguyên cơ sở dữ liệu, đưa lên Cloudflare
//   node cap-nhat.mjs lai       đưa lại bản đang có trong thư mục (không tải) – dùng khi lần trước dừng giữa chừng
//   node cap-nhat.mjs moi-nhat  tải và cài lại bản mới nhất kể cả khi đang là bản mới nhất
//   node cap-nhat.mjs --loi-tat chỉ tạo biểu tượng "Cập nhật phần mềm nhân sự" ngoài màn hình (cai-dat.cmd gọi)
// Dữ liệu nằm trong cơ sở dữ liệu D1 trên Cloudflare – tệp này không đọc, không sửa, không gửi dữ liệu nhân sự đi đâu.
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const NGUON = process.env.QTT_THU_JSON ? [{ json: process.env.QTT_THU_JSON, zip: process.env.QTT_THU_ZIP }] : [ // 1) web Quản trị tử tế, 2) dự phòng: kho mã nguồn công khai trên GitHub (tải công khai, không cần tài khoản)
  { json: 'https://quantritute.com/quan-ly-nhan-su/phien-ban-moi.json', zip: 'https://quantritute.com/quan-ly-nhan-su/tai/quan-ly-nhan-su-ban-day-du.zip' },
  { json: null, zip: 'https://github.com/quantritute/quan-ly-nhan-su/archive/refs/heads/main.zip' }
];
const arg = process.argv[2] || '';
const say = s => console.log(s), stop = (s, code = 1) => { console.error('\n[Lỗi] ' + s); process.exit(code); };
const verNum = v => { const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v || '')); return m ? +m[1] * 1e6 + +m[2] * 1e3 + +m[3] : 0; };
const ps = cmd => spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(cmd, 'utf16le').toString('base64')], { encoding: 'utf8' });
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const run = (cmd, label) => { say('\n' + label); const r = spawnSync(cmd, { cwd: HERE, stdio: 'inherit', shell: true }); if (r.status !== 0) stop(label + ' chưa xong. Dữ liệu trên máy chủ không bị ảnh hưởng. Chụp màn hình gửi người hỗ trợ, hoặc chạy lại tệp cập nhật.'); };

function loiTat() { // biểu tượng ngoài màn hình (cả khi Desktop nằm trong OneDrive)
  if (process.platform !== 'win32') return;
  const r = ps('$d=[Environment]::GetFolderPath("Desktop");$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d "Cập nhật phần mềm nhân sự.lnk"));' +
    '$s.TargetPath=' + q(join(HERE, 'cap-nhat.cmd')) + ';$s.WorkingDirectory=' + q(HERE) + ';$s.Description="Tải và cài bản mới của Phần mềm quản lý nhân sự (dữ liệu giữ nguyên)";$s.IconLocation="shell32.dll,238";$s.Save()');
  say(r.status === 0 ? 'Đã tạo biểu tượng "Cập nhật phần mềm nhân sự" ngoài màn hình.' : '(Chưa tạo được biểu tượng ngoài màn hình – vẫn cập nhật được bằng cách bấm đúp cap-nhat.cmd trong thư mục này.)');
}
if (arg === '--loi-tat') { loiTat(); process.exit(0); }

const pkg = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8')), CUR = pkg.version || '0.0.0';
say('Phần mềm quản lý nhân sự – bản đang cài trong thư mục này: ' + CUR);

async function taiVe(url, file) {
  const r = await fetch(url, { redirect: 'follow' }); if (!r.ok) throw new Error('HTTP ' + r.status + ' – ' + url);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
function timThuMuc(d, n = 0) { // thư mục có wrangler.jsonc + src/worker.js (gói web: gốc zip; gói GitHub: <kho>-main/ban-day-du)
  if (existsSync(join(d, 'wrangler.jsonc')) && existsSync(join(d, 'src', 'worker.js'))) return d;
  if (n > 3) return null;
  for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory() && x !== 'node_modules') { const f = timThuMuc(p, n + 1); if (f) return f; } }
  return null;
}
function chepThuMuc(a, b) { mkdirSync(b, { recursive: true }); for (const x of readdirSync(a)) { const p = join(a, x), t = join(b, x); statSync(p).isDirectory() ? chepThuMuc(p, t) : copyFileSync(p, t); } }

async function taiBanMoi() {
  let moi = null;
  try { const r = await fetch(NGUON[0].json, { cache: 'no-store' }); if (r.ok) moi = await r.json(); } catch (e) { }
  if (moi && /^\d+\.\d+\.\d+$/.test(moi.ver || '')) {
    say('Bản mới nhất đã phát hành: ' + moi.ver + (moi.ngay ? ' (' + moi.ngay + ')' : ''));
    if (verNum(moi.ver) <= verNum(CUR) && arg !== 'moi-nhat') { say('\nĐang là bản mới nhất – không cần cập nhật.\n(Muốn cài lại bản mới nhất: mở cửa sổ lệnh tại thư mục này, gõ  node cap-nhat.mjs moi-nhat)'); return false; }
  } else say('Chưa đọc được thông tin bản mới trên quantritute.com – thử tải trực tiếp gói mới nhất.');
  const T = join(tmpdir(), 'qtt-cap-nhat-' + Date.now()), Z = join(T, 'goi.zip'), X = join(T, 'giai-nen'); mkdirSync(X, { recursive: true });
  let ok = false;
  for (const n of NGUON) { try { say('Đang tải: ' + n.zip); await taiVe(n.zip, Z); ok = true; break; } catch (e) { say('  không tải được (' + e.message + ')'); } }
  if (!ok) stop('Không tải được bản mới. Kiểm tra kết nối mạng rồi chạy lại.');
  const g = process.platform === 'win32' ? ps('Expand-Archive -LiteralPath ' + q(Z) + ' -DestinationPath ' + q(X) + ' -Force') : spawnSync('unzip', ['-q', '-o', Z, '-d', X], { encoding: 'utf8' });
  if (g.status !== 0) stop('Không giải nén được gói tải về: ' + (g.stderr || '').slice(0, 300));
  const SRC = timThuMuc(X); if (!SRC) stop('Gói tải về không đúng cấu trúc (thiếu wrangler.jsonc / src/worker.js).');
  const pk2 = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8'));
  if (verNum(pk2.version) < verNum(CUR)) stop('Gói tải về (' + pk2.version + ') cũ hơn bản đang cài (' + CUR + ') – dừng, không cài.');
  // giữ bản cũ để quay lại khi cần
  const BK = join(HERE, '_ban-cu', CUR + '-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')); mkdirSync(BK, { recursive: true });
  for (const f of ['package.json', 'wrangler.jsonc', 'cai-dat.mjs', 'cap-nhat.mjs']) if (existsSync(join(HERE, f))) copyFileSync(join(HERE, f), join(BK, f));
  if (existsSync(join(HERE, 'src'))) chepThuMuc(join(HERE, 'src'), join(BK, 'src'));
  // wrangler.jsonc mới, giữ tên Worker + cơ sở dữ liệu đang dùng
  const cu = readFileSync(join(HERE, 'wrangler.jsonc'), 'utf8'); let wj = readFileSync(join(SRC, 'wrangler.jsonc'), 'utf8');
  const lay = (s, k) => (new RegExp('"' + k + '":\\s*"([^"]*)"').exec(s) || [])[1];
  for (const k of ['name', 'database_name', 'database_id']) { const v = lay(cu, k); if (v) wj = wj.replace(new RegExp('("' + k + '":\\s*")[^"]*(")'), '$1' + v + '$2'); }
  writeFileSync(join(HERE, 'wrangler.jsonc'), wj);
  rmSync(join(HERE, 'src'), { recursive: true, force: true }); chepThuMuc(join(SRC, 'src'), join(HERE, 'src'));
  for (const f of ['package.json', 'cai-dat.mjs', 'cap-nhat.mjs', 'cai-dat.cmd', 'README.md']) if (existsSync(join(SRC, f))) copyFileSync(join(SRC, f), join(HERE, f));
  // cap-nhat.cmd đang chạy: chỉ ghi khi nội dung khác (tránh cửa sổ lệnh đọc nhầm giữa chừng)
  if (existsSync(join(SRC, 'cap-nhat.cmd')) && readFileSync(join(SRC, 'cap-nhat.cmd'), 'utf8') !== readFileSync(join(HERE, 'cap-nhat.cmd'), 'utf8')) writeFileSync(join(HERE, 'cap-nhat.cmd.moi'), readFileSync(join(SRC, 'cap-nhat.cmd')));
  try { rmSync(T, { recursive: true, force: true }); } catch (e) { }
  say('Đã chép bản ' + pk2.version + ' vào thư mục (bản cũ giữ ở ' + BK + ').');
  return true;
}

if (arg !== 'lai') { const co = await taiBanMoi(); if (!co) process.exit(0); }
if (process.env.QTT_THU_KHO) { say('(chạy thử: bỏ qua npm / wrangler)'); process.exit(0); }
run('npm install --no-fund --no-audit', '1/3  Cập nhật công cụ...');
let dn = ''; try { dn = execSync('npx wrangler whoami', { cwd: HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true }); } catch (e) { }
if (!/logged in/i.test(dn)) run('npx wrangler login', '     Đăng nhập Cloudflare – trình duyệt mở ra, đăng nhập đúng tài khoản Cloudflare của đơn vị rồi bấm Allow...');
run('node cai-dat.mjs', '2/3  Kiểm tra cơ sở dữ liệu...');
run('npx wrangler deploy', '3/3  Đưa bản mới lên Cloudflare...');
loiTat();
say('\nXONG – đã cập nhật lên bản ' + JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8')).version + '. Mở lại trang quản trị, bấm Ctrl+F5. Dữ liệu giữ nguyên.');
