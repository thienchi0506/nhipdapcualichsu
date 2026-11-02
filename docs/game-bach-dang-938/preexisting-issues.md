# Lỗi nền trước game mới

Các mục dưới đây thuộc working tree khảo sát ngày 01/11/2026, trước khi có mã game mới. Chưa sửa trong chặng này. Không mặc định đồng nhất với bản website đang phát hành vì HTML 3D public khác working tree.

## Lỗi đã tái hiện

| ID | Mức ảnh hưởng | Cách tái hiện và kết quả | Bằng chứng |
|---|---|---|---|
| B01 | Vừa — tài nguyên mở đầu thiếu | Mở `index.html`: request `hero-loop.mp4` trả 404. Literal có tại thẻ source nhưng không có tệp trong checkout. Trang vẫn có nội dung/fallback, không kết luận toàn trang hỏng. | `source-inventory.json`, `additional-source-checks.json`, `browser-pages.json` trong thư mục bằng chứng. |
| B02 | Cao — chọn sai trận 2D | Mở `sa-ban.html` → vào Như Nguyệt → Chọn Ải → bấm Vào Sa Bàn Chiến Đấu của Bạch Đằng. Vẫn `currentStageId=1`, tiêu đề/phần chơi Như Nguyệt ở cả desktop/mobile. `vaoThangSaBanChienDau` không đặt lại stage 2; `chuyenSangTranDo` chuyển tiếp theo stage hiện tại. | [browser-flows-2d-roundtrip.json](evidence/audit-2026-11-01/browser-flows-2d-roundtrip.json); nguồn `sa-ban.html:8155`, `sa-ban.html:8172`, `sa-ban.html:11911`. |
| B03 | Vừa — khởi tạo lặp 3D | Một lần bấm nút “Tiến vào Như Nguyệt” gọi `chuyenSangChienDichNhuNguyet` hai lần. Button và article cha đều có onclick cùng hàm; quan sát wrapper trong profile tạm đếm được 2 ở cả hai viewport. Trận vẫn mở, nên chưa khẳng định tác động lâu dài về memory/state. | [browser-flows-3d.json](evidence/audit-2026-11-01/browser-flows-3d.json); nguồn `#campaign-card-2` và `#btn-enter-campaign-2` trong `sa-ban-3d.html`. |
| B04 | Cao — đề chuẩn thiếu cấu trúc | Thao Trường → Kho đề tự chọn → nút thi standard đầu tiên (`de-01`). Đề được mở với 22 câu TN và 2 đoạn Đ/S, thay vì cấu trúc 25+4. Chọn đáp án, chấm và làm lại vẫn chạy; nhãn/điều kiện cho phép thi chuẩn cần rà riêng sau. | [browser-flows-exam-flow.json](evidence/audit-2026-11-01/browser-flows-exam-flow.json), [exam-result-390.png](evidence/audit-2026-11-01/exam-result-390.png); nguồn `thao-truong.html:48830`. |
| B05 | Vừa — giao diện trang 2D phụ | `tran-do-nhap-vai.html` ở 390×844 có document width 443px, HUD bị cắt ngang và điều khiển chồng vùng nhiệm vụ. Đây là trang phụ hiện hữu, không phải hai lối vào chính trên trang chủ. | [tran-do-nhap-vai-390.png](evidence/audit-2026-11-01/tran-do-nhap-vai-390.png), `browser-pages.json`. |
| B06 | Vừa — nhãn chiêu 3D bị cắt | Vào trận Bạch Đằng 3D ở 390×844. Các nhãn “Cung lớn”, “Hỏa tiễn”, “Hòa bình” có y=838px, cao 15px, đáy 853px vượt viewport 844px. Nút bấm còn hiện, chữ chú thích bị cắt. Desktop 1365×900 không bị ở lượt này. | [browser-flows-3d.json](evidence/audit-2026-11-01/browser-flows-3d.json), [3d-bachdang-battle-390.png](evidence/audit-2026-11-01/3d-bachdang-battle-390.png); CSS `.ability-label`/dock trong `sa-ban-3d.html`. |

## Hiện trạng và điểm cần lưu ý khi tích hợp

- Trang chính dùng tên localStorage để đổi nút tài khoản sang `#`, không theo dõi Firebase Auth state tại trang đó. Vì thế UI tên cache không đủ làm căn cứ phân quyền cho game mới. Xác nhận từ nguồn; chưa tái hiện một phiên Auth hết hạn bằng tài khoản thật.
- Lưu tiến độ/điểm cũ là các khóa localStorage toàn origin, phần lớn không tách UID. `sa-ban.html` và `tran-do-nhap-vai.html` còn dùng chung `bangVang_BachDang_938`. Đây là hiện trạng dữ liệu phải bảo toàn, không di chuyển hay viết đè trong chặng game mới.
- Local Rules hiện chỉ có `posts`/`comments` và media bài đăng. Game mới chưa có quyền lưu Firestore; chưa xác minh Rules trên production có giống các tệp này.
- Trang chính đã nạp Three.js, model-viewer, loader và animation riêng. Không quy những request/vòng lặp sẵn có này thành lỗi lazy-load do game mới gây ra. Khi tích hợp cần so thêm request/loop của riêng game mới với baseline.
- GLB và wrapper base64 có tệp lớn, chưa có sổ giấy phép. Đây là điểm cần đo/đối chiếu trước khi dùng trong game mới, không phải bằng chứng game 3D cũ đang tải tất cả chúng.

## Không xếp thành lỗi ứng dụng

- Console Quần Anh Hội báo Firestore unavailable trong lượt UI do phép thử chủ động chặn endpoint production. Không dùng kết quả đó để kết luận Firebase thật đang hỏng.
- Lượt probe đầu gặp `KeyError: phase` ở trang phụ vì trang không có trường gameState tương ứng; snapshot tải trang đã thành công. Đã sửa công cụ bằng chứng và chạy lại tại `browser-pages-targeted.json`.
- Lượt flow đầu chọn trúng nút quay về lobby đang ẩn vì có nhiều phần tử cùng onclick. Đã sửa bộ chọn để chỉ bấm phần tử hiển thị, chạy lại và xác nhận nút quay về hoạt động. Lỗi B02 được phát hiện sau bước quay về thành công.
- Bộ đếm thẻ ghi nhớ ban đầu dùng sai class. Lượt đích `browser-flows-library-flow.json` dùng số con thật của grid, xác nhận có bốn thẻ ở bài được thử.
- Log HTTP server của công cụ game có thể in `ConnectionResetError/WinError 10054` khi Chrome đóng kết nối trong teardown. Kết quả JS và các assertion được đọc từ JSON; mã thoát Python được lưu riêng. Không tự xếp traceback server teardown thành lỗi trò chơi.

Danh sách này là mốc so sánh, không cho phép âm thầm sửa các lỗi ngoài nhiệm vụ tích hợp game mới.
