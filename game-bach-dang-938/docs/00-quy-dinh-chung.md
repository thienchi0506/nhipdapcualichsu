# QUY ĐỊNH CHUNG — DỰ ÁN GAME BẠCH ĐẰNG 938

> Tài liệu gốc — áp dụng cho toàn bộ các chặng công việc.
> Ngày tạo: 2026-11-03

---

## A. PHẠM VI WEBSITE

Website hiện có phòng thi lịch sử, tổng hợp kiến thức, sa bàn và nhiều chức năng khác. Phần sa bàn nằm trong trang-chinh và đã có game 2D cùng game 3D.

### YÊU CẦU ƯU TIÊN CAO NHẤT

- Giữ nguyên khả năng sử dụng game 2D và game 3D cũ.
- Chỉ thêm một lựa chọn game mới trong phần sa bàn.
- Không thay thế game cũ bằng game mới.
- Không xóa, đổi tên hoặc chuyển hướng các lối vào game cũ.
- Không đổi cách hoạt động của phòng thi, kho kiến thức, tài khoản và các chức năng ngoài phạm vi.
- Không viết lại toàn bộ trang-chinh hoặc chuyển framework toàn website để phục vụ game mới.
- Được chỉnh tối thiểu phần tích hợp để thêm lựa chọn mới; phải chỉ rõ những thay đổi đó.
- Giữ các thay đổi sẵn có của người dùng trong dự án.

**Tên hiển thị đề xuất:** "Bạch Đằng 938 — Chiến dịch nhập vai"

Đây là một mục mới bên cạnh hai game cũ, không phải bản nâng cấp đè lên chúng.

---

## B. GAME ĐÃ CHỐT

1. Game web 3D, chơi đơn với đồng đội AI. Không co-op, PvP, phòng chơi mạng hoặc máy chủ mô phỏng trận đấu.
2. Ưu tiên chất lượng PC, đồng thời có điều khiển và đồ họa phù hợp điện thoại.
3. Kết hợp nhập vai hành động, chiến thuật thời gian thực và mô phỏng sông nước.
4. Bối cảnh Bạch Đằng 938; phân biệt thông tin lịch sử với nhân vật, nhiệm vụ và hội thoại hư cấu.
5. Bốn nhân vật chính có câu chuyện riêng. Người chơi chọn một nhân vật làm trung tâm. Đề xuất ba người còn lại làm chỉ huy AI.
6. Nhân vật tiến từ chỉ huy đơn vị nhỏ đến phối hợp các cánh quân.
7. Câu chuyện nhấn vào đồng đội, niềm tin và trách nhiệm trước thương vong.
8. Chuyển giữa góc sau lưng và góc chéo từ trên xuống; có bản đồ chiến thuật.
9. Khi mở bản đồ, trận không tạm dừng. Khi đang lái thuyền, thuyền giữ hướng và chỉ tự bắn trả.
10. Khi nhân vật rời thuyền, phó tướng giữ vị trí, tự bắn trả và nhận lệnh.
11. Có lái thuyền, bắn cung, đổ bộ, cận chiến, nhảy sang thuyền địch và nguy cơ rơi xuống nước.
12. Cận chiến có sức bền, đỡ đúng lúc, phản đòn và sơ hở. Không có phép thuật.
13. Mục tiêu cuối chiến dịch: hơn 400 quân thuộc lực lượng người chơi, có danh tính và trạng thái, quản lý qua cấp chỉ huy.
14. Người chơi giao mục tiêu và ngưỡng tổn thất; tổ trưởng AI tự thực hiện.
15. Có sương mù chiến trường, thông tin địch cũ có thể lỗi thời.
16. Có độ sâu, tải trọng, dòng chảy, thủy triều, va chạm, hư hại bộ phận, mắc cọc và thoát mắc.
17. Cho phép bố trí trận địa theo nguồn lực, địa hình và thời gian.
18. Có tuyến vận chuyển, kho tiền phương, tiếp tế đạn, sửa chữa và cứu thương.
19. Binh sĩ có thể tử trận vĩnh viễn. Nhân vật chính sống nhưng có thể bị thương; khi gục, sĩ quan dự bị tiếp quản. Hết người dự bị thì chơi lại chặng, giữ mất mát đã ghi.
20. Được rút quân, chịu hậu quả và bổ sung lực lượng.
21. Kết hợp kỹ năng nhân vật, trang bị, nâng cấp thuyền, kinh nghiệm đơn vị và kỹ thuật người chơi.
22. Các chương thường dài 15–25 phút, có lưu tiến độ.
23. Đồ họa được chọn trước trận và ghi nhớ trên thiết bị.
24. Không sử dụng lại các luật HP, triều 15 giây, số thuyền cố định hoặc chiêu chim bồ câu của ý tưởng cũ.
25. Trước hết làm một chương mẫu hoàn chỉnh; không tuyên bố đã hoàn thành toàn chiến dịch khi mới có chương mẫu.

---

## C. TÍCH HỢP VÀ CHI PHÍ

- Website đang phát hành qua GitHub, có Firebase đăng nhập và lưu dữ liệu.
- Khảo sát mã nguồn trước khi chọn thư viện hoặc phương án lưu.
- Không tự bật thanh toán, đổi gói Firebase hoặc thêm dịch vụ trả phí.
- Không tích hợp API AI trả phí vào game. AI binh sĩ là thuật toán game chạy cục bộ.
- Không dùng Cloud Functions hay dịch vụ yêu cầu trả phí nếu chưa có phương án phù hợp ràng buộc chi phí bằng 0.
- Không thay đổi dữ liệu phòng thi, điểm số hoặc tiến độ game cũ.
- Game mới có vùng dữ liệu riêng theo tài khoản và phiên bản.
- Không đưa khóa quản trị hoặc thông tin xác thực máy chủ vào mã trình duyệt.
- Chưa triển khai công khai, đẩy lên nhánh phát hành hoặc sửa cấu hình Firebase production trong các chặng triển khai cục bộ.

---

## D. CÔ LẬP GAME MỚI

- Tải mã và tài nguyên game mới khi người dùng mở game.
- Khi chưa mở game, trang-chinh không được chạy vòng lặp, tải mô hình lớn hoặc phát âm thanh game mới.
- CSS phải có phạm vi riêng, tránh selector toàn cục làm đổi website.
- Không thay thư viện dùng chung của game cũ bằng phiên bản mới một cách ngầm định.
- Không ghi đè biến global, ID, sự kiện bàn phím hoặc khóa lưu trữ của hệ thống cũ.
- Khi thoát game, hủy vòng lặp, listener, âm thanh và tài nguyên đồ họa thuộc game mới.
- Chỉ nhận thao tác bàn phím/cảm ứng khi game đang được sử dụng.
- Không để phím điều khiển game ảnh hưởng ô nhập đáp án của phòng thi.

---

## E. CÁCH LÀM VIỆC VÀ BÀN GIAO

### Hồ sơ game mới cần gồm:

- Quy định phạm vi và yêu cầu đã chốt.
- Kết quả khảo sát.
- Kiến trúc và giao tiếp giữa các hệ thống.
- Thông số gameplay.
- Tiến độ các chặng.
- Kết quả kiểm tra.
- Nguồn và giấy phép tài nguyên.

### Mỗi chặng:

1. Đọc hồ sơ và kiểm tra thay đổi đang có.
2. Làm đúng phần được giao, không âm thầm đổi luật chơi hoặc kiến trúc.
3. Triển khai và chạy kiểm tra phù hợp.
4. Cập nhật hồ sơ: tệp sửa, phần hoàn thành, lỗi còn lại và bước tiếp theo.
5. Phân biệt rõ "đã triển khai", "đã chạy thử" và "chưa xác minh".
6. Dừng ở cuối chặng; không tự thực hiện toàn bộ các chặng tiếp theo.

### Nguyên tắc:

- Không mặc định hỏi lại những lựa chọn đã có trong tài liệu.
- Chỉ hỏi khi thiếu thông tin thực sự chặn công việc hoặc phải thay đổi yêu cầu quan trọng.

