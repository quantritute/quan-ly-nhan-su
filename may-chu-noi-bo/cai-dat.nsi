; Bộ cài Phần mềm quản lý nhân sự toàn diện – máy chủ nội bộ Windows (Quản trị tử tế, AGPL-3.0)
; Dựng:  makensis -DVER=1.0.5 cai-dat.nsi   (chạy trong thư mục goi/ đã có node.exe, node_modules, app…)
Unicode true
ManifestDPIAware true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!ifndef VER
  !define VER "1.0.5"
!endif
!define TEN "Phần mềm quản lý nhân sự (máy chủ nội bộ)"
!define SVC "QuanLyNhanSu"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\QuanLyNhanSu-MayChuNoiBo"
!define FW "Quan ly nhan su"

Name "${TEN} ${VER}"
OutFile "..\QuanLyNhanSu-MayChuNoiBo-${VER}-Setup.exe"
InstallDir "$PROGRAMFILES64\QuanLyNhanSu"
RequestExecutionLevel admin
BrandingText "Quản trị tử tế · quantritute.com"
VIProductVersion "${VER}.0"
VIAddVersionKey /LANG=0 "ProductName" "Phan mem quan ly nhan su - may chu noi bo"
VIAddVersionKey /LANG=0 "CompanyName" "Quan tri tu te"
VIAddVersionKey /LANG=0 "FileDescription" "Bo cai Phan mem quan ly nhan su (may chu noi bo)"
VIAddVersionKey /LANG=0 "FileVersion" "${VER}"
VIAddVersionKey /LANG=0 "ProductVersion" "${VER}"
VIAddVersionKey /LANG=0 "LegalCopyright" "AGPL-3.0 - Quan tri tu te"

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Cài ${TEN}"
!define MUI_WELCOMEPAGE_TEXT "Bộ cài sẽ cài Phần mềm quản lý nhân sự toàn diện ${VER} lên máy này thành một dịch vụ Windows chạy nền.$\r$\n$\r$\nNhân viên trong mạng nội bộ (LAN, VPN) truy cập bằng trình duyệt. Toàn bộ dữ liệu nằm trên máy này, tại C:\ProgramData\QuanLyNhanSu.$\r$\n$\r$\nNếu đã cài bản trước, bộ cài tự giữ nguyên dữ liệu và cấu hình."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
Page custom PageCong PageCongXong
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE "Đã cài xong"
!define MUI_FINISHPAGE_TEXT "Phần mềm đang chạy trên máy này.$\r$\n$\r$\nBước tiếp theo: mở trang quản lý, nhập MÃ CÀI ĐẶT (trong file Thông tin truy cập) để tạo tài khoản quản trị đầu tiên.$\r$\n$\r$\nCác công cụ Sao lưu, Khôi phục, Sửa cấu hình… nằm trong Start → Quản lý nhân sự (máy chủ)."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Mở trang quản lý (tạo tài khoản quản trị)"
!define MUI_FINISHPAGE_RUN_FUNCTION MoTrang
!define MUI_FINISHPAGE_SHOWREADME "$APPDATA\QuanLyNhanSu\THONG-TIN-TRUY-CAP.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Xem thông tin truy cập và mã cài đặt"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Vietnamese"

Var Cong
Var CongBox
Var CoCfg
Var DuLieu

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "Phần mềm chỉ chạy trên Windows 64-bit."
    Abort
  ${EndIf}
  SetRegView 64
  SetShellVarContext all
  StrCpy $DuLieu "$APPDATA\QuanLyNhanSu"
  StrCpy $Cong "8080"
  StrCpy $CoCfg "0"
  ${If} ${FileExists} "$DuLieu\cau-hinh.json"
    StrCpy $CoCfg "1"
  ${EndIf}
  ReadRegStr $0 HKLM "${UNKEY}" "InstallLocation"
  ${If} $0 != ""
    StrCpy $INSTDIR $0
  ${EndIf}
FunctionEnd

Function PageCong
  ${If} $CoCfg == "1"
    Abort ; cập nhật: giữ cấu hình cũ, bỏ qua trang chọn cổng
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "Cổng truy cập" "Nhân viên sẽ vào phần mềm bằng địa chỉ http://<IP máy chủ>:<cổng>"
  nsDialogs::Create 1018
  Pop $0
  ${NSD_CreateLabel} 0 0 100% 36u "Cổng (port) phần mềm lắng nghe trong mạng nội bộ. Giữ 8080 nếu không có chương trình nào khác đang dùng cổng này. Bộ cài sẽ mở tường lửa Windows cho cổng này."
  Pop $0
  ${NSD_CreateLabel} 0 44u 60u 12u "Cổng:"
  Pop $0
  ${NSD_CreateNumber} 64u 42u 60u 14u $Cong
  Pop $CongBox
  nsDialogs::Show
FunctionEnd
Function PageCongXong
  ${NSD_GetText} $CongBox $Cong
  ${If} $Cong < 1
  ${OrIf} $Cong > 65535
    MessageBox MB_ICONEXCLAMATION "Cổng phải từ 1 đến 65535."
    Abort
  ${EndIf}
FunctionEnd

Function MoTrang
  nsExec::ExecToStack '"$INSTDIR\node.exe" "$INSTDIR\may-chu.mjs" --cong'
  Pop $0
  Pop $1
  IntOp $1 $1 + 0
  ; mở bằng explorer để trình duyệt chạy với quyền người dùng thường, không chạy dưới quyền quản trị của bộ cài
  Exec '"$WINDIR\explorer.exe" "http://localhost:$1/quan-ly"'
FunctionEnd

Section "Cài đặt" SEC0
  SetShellVarContext all
  SetOutPath "$INSTDIR"
  ; cập nhật: dừng dịch vụ đang chạy trước khi thay file
  ${If} ${FileExists} "$INSTDIR\${SVC}.exe"
    DetailPrint "Dừng dịch vụ bản cũ…"
    nsExec::ExecToLog '"$INSTDIR\${SVC}.exe" stop'
    Sleep 3000
    RMDir /r "$INSTDIR\node_modules"
    RMDir /r "$INSTDIR\app"
  ${EndIf}

  DetailPrint "Chép chương trình…"
  File "node.exe"
  File "may-chu.mjs"
  File "phien-ban.json"
  File "${SVC}.exe"
  File "${SVC}.xml"
  File "HUONG-DAN.txt"
  File "LICENSE.txt"
  File "NOTICE.md"
  File "THIRD-PARTY-NOTICES.md"
  File "icon.ico"
  File /r "app"
  File /r "node_modules"
  File /r "cong-cu"

  ; thư mục dữ liệu: chỉ Administrators + SYSTEM mở được (dữ liệu nhân sự nhạy cảm)
  CreateDirectory "$DuLieu"
  nsExec::ExecToLog 'icacls "$DuLieu" /inheritance:r /grant:r *S-1-5-18:(OI)(CI)F *S-1-5-32-544:(OI)(CI)F'
  ${If} $CoCfg == "0"
    FileOpen $0 "$DuLieu\cau-hinh.json" w
    FileWrite $0 '{$\r$\n  "cong": $Cong,$\r$\n  "tin_proxy": false,$\r$\n  "https": null,$\r$\n  "sao_luu": { "gio": "23:30", "giu": 30 }$\r$\n}$\r$\n'
    FileClose $0
  ${EndIf}
  ; tạo mã cài đặt (nếu chưa có) + file thông tin truy cập
  nsExec::ExecToStack '"$INSTDIR\node.exe" "$INSTDIR\may-chu.mjs" --cong'
  Pop $0
  Pop $Cong
  IntOp $Cong $Cong + 0 ; lấy số, bỏ ký tự xuống dòng
  nsExec::ExecToLog 'cmd /c chcp 65001 >nul & "$INSTDIR\node.exe" "$INSTDIR\may-chu.mjs" --thong-tin > "$DuLieu\THONG-TIN-TRUY-CAP.txt"'

  DetailPrint "Mở tường lửa cho cổng $Cong…"
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="${FW}"'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="${FW}" dir=in action=allow protocol=TCP localport=$Cong'

  DetailPrint "Cài và chạy dịch vụ Windows ${SVC}…"
  nsExec::ExecToLog '"$INSTDIR\${SVC}.exe" install'
  nsExec::ExecToLog '"$INSTDIR\${SVC}.exe" refresh' ; cập nhật: nạp lại cấu hình dịch vụ
  nsExec::ExecToLog '"$INSTDIR\${SVC}.exe" start'
  Sleep 6000
  nsExec::ExecToLog '"$INSTDIR\${SVC}.exe" status'

  ; lối tắt
  CreateDirectory "$SMPROGRAMS\Quản lý nhân sự (máy chủ)"
  WriteINIStr "$INSTDIR\Mo trang quan ly.url" "InternetShortcut" "URL" "http://localhost:$Cong/quan-ly"
  WriteINIStr "$INSTDIR\Mo phan mem quan tri.url" "InternetShortcut" "URL" "http://localhost:$Cong/quan-tri"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Mở trang quản lý chấm công.lnk" "$INSTDIR\Mo trang quan ly.url" "" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Mở phần mềm quản lý nhân sự.lnk" "$INSTDIR\Mo phan mem quan tri.url" "" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Thông tin truy cập.lnk" "$INSTDIR\cong-cu\thong-tin-truy-cap.cmd" "" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Sao lưu ngay.lnk" "$INSTDIR\cong-cu\sao-luu-ngay.cmd"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Khôi phục dữ liệu.lnk" "$INSTDIR\cong-cu\khoi-phuc-du-lieu.cmd"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Sửa cấu hình.lnk" "$INSTDIR\cong-cu\sua-cau-hinh.cmd"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Khởi động lại.lnk" "$INSTDIR\cong-cu\khoi-dong-lai.cmd"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Xem nhật ký.lnk" "$INSTDIR\cong-cu\xem-nhat-ky.cmd"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Hướng dẫn.lnk" "$INSTDIR\HUONG-DAN.txt"
  CreateShortcut "$SMPROGRAMS\Quản lý nhân sự (máy chủ)\Gỡ cài đặt.lnk" "$INSTDIR\go-cai-dat.exe"
  CreateShortcut "$DESKTOP\Quản lý nhân sự.lnk" "$INSTDIR\Mo phan mem quan tri.url" "" "$INSTDIR\icon.ico"

  WriteUninstaller "$INSTDIR\go-cai-dat.exe"
  WriteRegStr HKLM "${UNKEY}" "DisplayName" "${TEN}"
  WriteRegStr HKLM "${UNKEY}" "DisplayVersion" "${VER}"
  WriteRegStr HKLM "${UNKEY}" "Publisher" "Quản trị tử tế"
  WriteRegStr HKLM "${UNKEY}" "URLInfoAbout" "https://quantritute.com"
  WriteRegStr HKLM "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNKEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKLM "${UNKEY}" "UninstallString" '"$INSTDIR\go-cai-dat.exe"'
  WriteRegDWORD HKLM "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNKEY}" "NoRepair" 1
SectionEnd

Function un.onInit
  SetRegView 64
  SetShellVarContext all
FunctionEnd

Section "Uninstall"
  SetShellVarContext all
  nsExec::ExecToLog '"$INSTDIR\${SVC}.exe" stop'
  Sleep 3000
  nsExec::ExecToLog '"$INSTDIR\${SVC}.exe" uninstall'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="${FW}"'
  RMDir /r "$SMPROGRAMS\Quản lý nhân sự (máy chủ)"
  Delete "$DESKTOP\Quản lý nhân sự.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "${UNKEY}"
  MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 "Xóa luôn TOÀN BỘ DỮ LIỆU nhân sự và các bản sao lưu trong $APPDATA\QuanLyNhanSu?$\r$\n$\r$\nChọn Không (khuyến nghị) để giữ lại dữ liệu – cài lại phần mềm là dùng tiếp được." IDYES xoa IDNO giu
  xoa:
    RMDir /r "$APPDATA\QuanLyNhanSu"
  giu:
SectionEnd
