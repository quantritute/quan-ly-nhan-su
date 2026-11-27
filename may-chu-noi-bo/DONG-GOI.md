# Đóng gói bộ cài máy chủ nội bộ (Windows)

Dựng trên Linux (máy ảo Cowork hoặc container Claude) – cần `makensis` (gói nsis) và Node 22.

1. Thư mục `goi/` gồm:
   - `node.exe` – từ gói npm `node-win-x64@22.x` (bản chính thức, có chữ ký số OpenJS Foundation; kiểm bằng `osslsigncode verify`).
   - `node_modules/` – `npm i miniflare@4 --os=win32 --cpu=x64`, rồi xóa: `sharp`, `@img`, `@emnapi`, `.bin`, `workerd/bin/workerd`, `workerd/lib/downloaded-*` (bản Linux).
   - `QuanLyNhanSu.exe` – WinSW-x64.exe v2.12.0 (github.com/winsw/winsw, MIT) đổi tên.
   - `app/src/` – chép nguyên `phan-mem-nhan-su/ban-day-du/src/` của bản cần phát hành.
   - các file trong thư mục `nguon/` này + `LICENSE` (đổi tên LICENSE.txt), `NOTICE.md`, `THIRD-PARTY-NOTICES.md` (= bản gốc + phần THIRD-PARTY-NOTICES-may-chu.md).
   - `phien-ban.json`: `{"ver":"1.0.5","ngay":"25/11/2026","loai":"may-chu-noi-bo"}`
2. `makensis -DVER=1.0.5 cai-dat.nsi` → `../QuanLyNhanSu-MayChuNoiBo-1.0.5-Setup.exe` (~56 MB).

Cách chạy: `may-chu.mjs` dùng Miniflare (workerd) chạy đúng `worker.js` của bản đầy đủ, D1 lưu SQLite tại
`C:\ProgramData\QuanLyNhanSu\csdl`; lớp Node phía trước nghe 0.0.0.0:<cổng>, gắn IP thật vào `cf-connecting-ip`,
bỏ cờ `Secure` của cookie khi chạy http, gọi cron 15 phút/lần, sao lưu tự động (VACUUM INTO) mỗi ngày.
Không sửa gì trong worker.js / app.html – bản mới của phần mềm chỉ cần chép lại `app/src` rồi đóng gói.
