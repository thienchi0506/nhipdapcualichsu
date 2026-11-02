# Bàn giao tích hợp lưu game Bạch Đằng 938

Cập nhật 02-11-2026. **Đã triển khai và kiểm thử cục bộ việc lưu cho các trạng thái hiện có của sandbox. Chưa công bố Rules hoặc ghi tài khoản production.** Việc bật quyền bên ngoài thuộc chủ dự án, theo [hướng dẫn Firebase](firebase-save-setup.md). Chặng này chưa phải hoàn thiện chương chiến đấu.

## Hệ thống thực tế

Website dùng Firebase JavaScript SDK 10.12.2, Auth lưu phiên bằng IndexedDB/local persistence. Game quan sát phiên đó bằng getAuth/onAuthStateChanged, dùng đúng cấu hình sẵn có và kiểm tra app/project trùng khớp. Lớp lưu không đăng nhập, đăng xuất, đổi persistence hoặc tạo dự án mới.

- IndexedDB riêng: `dcls.bd938.saves.v1`, phân vùng theo loại người dùng, UID và slot.
- Firestore riêng: `gameBachDang938/{uid}/versions/v1/slots/{slot}`; các phần bất biến nằm trong `snapshots/{chunkId}` bên dưới slot.
- Save schema 1; kiểm tra phiên bản sim/config/content trước khi phục hồi. Có nhân vật/trang bị, checkpoint, chương/lượt, ID quân, thương tích/thương vong, kho/vận tải, kết quả nhiệm vụ và nhật ký. Trường nâng cấp bảo toàn dữ liệu trong campaignLedger khi có; sandbox hiện chưa có hệ thống nâng cấp gameplay.

## Đã hoàn tất trong mã

1. Checkpoint, projection, journal, receipt và outbox ghi nguyên tử. Batch/event trùng chỉ được xử lý lặp khi nội dung khớp. Hậu quả được xác nhận cục bộ trước khi hiển thị; lỗi ghi dừng phiên và giữ mốc tốt trước đó.
2. Khôi phục Map/Set và tham chiếu quân/tổ/hàng; kiểm tra checksum, phiên bản và projection. Không cho xóa người, xóa dấu thương hoặc hồi sinh người chết/mất tích/bị bắt bằng checkpoint. Bản chưa hỗ trợ được giữ và có thể xuất để bảo quản.
3. Kết quả failed_command được ghi một lần trước thông báo. Nút Về trại / Chơi lại có xem trước và xác nhận; giao dịch retry được tính lại từ checkpoint cũ trước khi chấp nhận. Đã thử 5 retry qua repository/controller.
4. Khóa writer theo tab/epoch, CAS revision giữa thiết bị, giữ hai nhánh khi xung đột. Đổi UID dừng phiên. Đăng xuất/thoát giữ outbox; chỉ xóa mục chờ sau xác nhận đúng revision/sync ID. Có xuất bản lưu cục bộ.
5. Firebase gửi theo đợt khoảng 30 giây, không mỗi frame. Lỗi mạng giữ bản cục bộ và thử lại; lỗi quyền, checksum hoặc vượt ngân sách dừng thử tự động, báo rõ vẫn giữ dữ liệu. Sau sửa quyền có thể mở lại bản lưu để thử lại.
6. Vẫn đọc document inline cũ. Gói lớn dùng transport 2: upload các phần bất biến, kiểm checksum từng phần và cả gói, rồi mới CAS head. Upload dở không công bố mốc; gửi lại cùng sync ID dùng lại các phần đã có. Gói thiếu/hỏng bị từ chối.

## Kết toán và trở lại chặng

Tham số tập trung tại `src/save/retry.js`, dựa trên gameplay defaults: điều trị nhân vật chính dùng 1 thuốc và 6 giờ chiến dịch; thiếu thuốc là 12 giờ, không phải chờ ngoài đời. Khi trở lại: sức khỏe 70%, sức bền 85%, giữ số vết thương. Binh sĩ/sĩ quan tử trận không được hưởng quy tắc bảo toàn nhân vật chính.

Thuyền chỉ thu hồi khi thân còn trên 0, không mắc và đang trong vùng bến sửa. Nhân vật chính phải ở trên thuyền đó hoặc trong vùng hậu phương có thể ứng cứu. Không đủ điều kiện thì UI giải thích và cho xuất bản lưu/về sa bàn, không dịch chuyển an toàn vô điều kiện.

Quân ở kho hậu phương còn hoạt động, bán kính mặc định thử nghiệm 12 m, có thể thu hồi. Người ngoài vùng thu hồi được ghi mất tích. Người chết/mất tích/bị bắt và người còn bị thương không trở lại đội hình. Giữ HP/đạn của quân còn lại, kho, hàng đã bỏ, nước trong thuyền và hư hại bộ phận. Chi phí job chưa dùng chỉ trả về kho còn hoạt động một lần; hàng vận tải ngoài vùng thu hồi bị mất. Không phát thưởng, tuyển người hoặc cấp loadout khởi đầu miễn phí.

Lượt mới đặt lại con nước và vị trí lực lượng địch còn sống, giữ sức khỏe/đạn và thương vong của họ. Tick mô phỏng tăng liên tục; đồng hồ lượt và giờ chiến dịch lưu riêng. Chưa có đợt quân địch mới hoặc trại điều trị đầy đủ cho mọi loại nhân sự.

## Kiểm tra

- [Core, giao dịch, vòng đời lưu và retry](evidence/save-2026-11-02/save-core.json): 71/71; gồm kiểm tra ngữ nghĩa checkpoint trước khi thay bản lưu cũ.
- [Hồi quy mô phỏng sông, nhân vật và quân đội](evidence/save-2026-11-02/related-core.json): 129/129.
- [Giao diện lưu trên thiết bị](evidence/save-2026-11-02/device-ui.json): 7/7.
- [Thất bại → xác nhận trại → chơi lại → điều khiển → tải mốc](evidence/save-2026-11-02/retry-ui.json): 9/9, viewport giả lập 390 px; [ảnh xác nhận](evidence/save-2026-11-02/camp-confirmation-390.png).
- [Hồi quy 5 vòng mở/đóng, 320/360/375/390/430 px và điều hướng cũ](evidence/save-2026-11-02/browser-checks.json): 62/62. Thử đường vào không tương đương chơi hết game cũ hoặc hoàn thành một bài thi.
- [Firestore/Auth/Rules và bản lưu lớn](evidence/save-2026-11-02/README.md) chỉ dùng demo project và tài khoản giả lập. Kết quả cuối trong JSON cùng thư mục; có upload gián đoạn, phần bất biến, quyền UID, xung đột và nhận điều trị từ thiết bị khác.
- [Đối chiếu nguồn được bảo toàn](evidence/save-2026-11-02/protected-integrity.json): 12/12 tệp trang/game cũ, Auth/config và Rules giữ nguyên hash trong lượt này.

## Giới hạn và quyết định triển khai

- Lưu toàn checkpoint ở tick có hậu quả, mỗi 5 giây mô phỏng cho di chuyển và khi tạm dừng/tải mốc. Đây là cách thay replay tail trong bản hiện tại: khôi phục đúng committed tick, không chạy lại sát thương hoặc trừ vật tư từ journal. Thoát đột ngột có thể mất phần di chuyển chưa ghi; hậu quả đã xác nhận vẫn giữ. Không hứa giữ mọi frame khi tắt ứng dụng đột ngột.
- Ngân sách: checkpoint 8.000.000 byte, gói cloud 16.000.000 byte, tối đa 100.000 sự kiện. Vượt ngân sách báo lỗi và giữ bản hiện có; chưa thu gọn nhật ký vô hạn. Phần upload bỏ dở có thể còn trên cloud; không tự xóa nhầm dữ liệu đang được một mốc dùng.
- Schema hiện tại là 1; transport 2 đọc được inline cũ. Schema/sim mới chưa biết trước bị chặn và cho xuất, không tự hạ phiên bản. Migration gameplay tương lai cần kiểm tra khi có schema mới thật sự.
- Kết quả hiện chỉ có failed_command, đúng trạng thái engine hỗ trợ. Chưa có kết quả thắng/rút lui hoặc tiến độ chương 15–25 phút để lưu; sẽ nối khi các hệ thống đó tồn tại.
- Chưa thử tài khoản production, thiết bị thật hay soak nhiều giờ. Kiểm tra lưu 400 quân mỗi bên không phải chứng nhận FPS chiến đấu.

## Điểm tiếp tục

Phần mã và kiểm thử lưu của sandbox đã bàn giao. Chủ dự án tự xem xét/áp dụng Rules khi muốn bật đồng bộ production; không bật thanh toán. Chặng tiếp theo là **dữ liệu nội dung game mới đúng schema**, giữ engine/Firebase/trang-chinh ngoài phạm vi chặng nội dung theo prompt đã thống nhất.
