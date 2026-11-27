# Bản cài máy chủ nội bộ (Windows)

Bộ cài `.exe` đưa **bản đầy đủ** lên một máy chủ Windows của đơn vị: phần mềm chạy thành dịch vụ Windows,
cơ sở dữ liệu là file SQLite tại `C:\ProgramData\QuanLyNhanSu`, nhân viên truy cập qua LAN, VPN hoặc tên miền riêng.

- **Tải bộ cài:** mục *Releases* của kho này (file `QuanLyNhanSu-MayChuNoiBo-<bản>-Setup.exe`).
- **Hướng dẫn cài đặt, thiết lập:** https://quantritute.com/quan-ly-nhan-su/may-chu-noi-bo/ (bản chữ: `HUONG-DAN.txt`).

## Thư mục này gồm

| File | Vai trò |
|---|---|
| `may-chu.mjs` | Chạy đúng `ban-day-du/src/worker.js` bằng Miniflare/workerd; D1 lưu SQLite; cổng LAN; gắn IP thật vào `cf-connecting-ip`; bỏ cờ `Secure` của cookie khi chạy http; cron 15 phút; sao lưu hằng ngày (`VACUUM INTO`); lệnh `--sao-luu`, `--khoi-phuc`, `--thong-tin`, `--cong` |
| `cai-dat.nsi` | Script bộ cài NSIS: dịch vụ Windows (WinSW), tường lửa, quyền thư mục dữ liệu, lối tắt Start menu, gỡ cài đặt |
| `QuanLyNhanSu.xml` | Cấu hình dịch vụ WinSW |
| `cong-cu/*.cmd` | Thông tin truy cập, Sao lưu ngay, Khôi phục dữ liệu, Sửa cấu hình, Khởi động lại, Xem nhật ký |
| `DONG-GOI.md` | Cách dựng lại bộ cài |
| `THIRD-PARTY-NOTICES-may-chu.md` | Giấy phép các thành phần đi kèm (Node.js, workerd, Miniflare, WinSW…) |
