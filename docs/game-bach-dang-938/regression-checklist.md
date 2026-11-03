# Danh sách kiểm tra hồi quy khi thêm game mới

Mốc hiện trạng: [survey.md](survey.md), working tree HEAD `0393e60` cộng các thay đổi có sẵn. Ký hiệu: **Đạt**, **Lỗi nền**, **Chưa xác minh**. Kết quả hiện tại không thay cho chạy lại trên diff cuối cùng của chặng tích hợp.

| ID | Kiểm tra và tiêu chí | Mốc hiện tại |
|---|---|---|
| P01 | So hash/diff của các tệp game cũ, đề, kiến thức, Auth/Rules; chỉ chấp nhận diff tích hợp đã ghi rõ. | Có manifest trước/sau; không sửa mã chạy trong khảo sát. |
| P02 | Giữ mọi khóa localStorage/sessionStorage cũ; dữ liệu test mới không dùng prefix cũ. | Đã kiểm kê nguồn và khóa; kiểm tra dữ liệu người dùng thật chưa làm. |
| N01 | Bấm bắt đầu ở `index.html` vào trang chính, menu Trang chủ quay lại index. | Đạt desktop/mobile. |
| N02 | Hai link Sa Bàn cũ trên `.card--sa-ban` giữ nguyên href, đều mở đúng trang. | Đạt desktop/mobile. |
| N03 | Menu bảo tàng, footer, Quần Anh Hội và các link query/hash vào game cũ giữ nguyên. | Đã rà nguồn; bấm thẻ chính. Chưa bấm toàn bộ bản sao link. |
| N04 | Modal bảo tàng mở/đóng được, nút đóng tiếp cận được, trang nền tiếp tục cuộn. | Đạt modal bảo tàng thường; model 3D nặng chưa thử hết. |
| G201 | Mở mới 2D → Bạch Đằng, canvas có nội dung và frame tăng. | Đạt. |
| G202 | 2D tạm dừng/tiếp tục, mở/đóng settings và về chọn ải/trang chính. | Đạt. |
| G203 | 2D vào Như Nguyệt đúng trận, quay lại rồi chọn Bạch Đằng. | Như Nguyệt đạt; chuyển lại Bạch Đằng có lỗi nền B02. |
| G204 | Deep links `#saban/#chien-dau/#nhu-nguyet/#ai-1/#saban-nhu-nguyet` vẫn được giải đúng. | Đã rà source; helper chạy hai hash chính. |
| G205 | Sát thương, cooldown, pause/timer, projectile và cài đặt 2D giữ hành vi. | Suite hiện có 11/11 cho mỗi trận. |
| G301 | 3D sảnh → chuẩn bị → hướng dẫn → trận; camera tactical và renderer hoạt động. | Đạt cả hai viewport; có screenshot. |
| G302 | 3D pause/resume, kết quả và nút về bản đồ. | Đạt với kết quả fixture; chưa chơi tự nhiên toàn trận. |
| G303 | Chơi lại từ bảng kết quả tải lại đúng campaign, không đưa sang game mới. | Đạt Bạch Đằng `?campaign=1` ở cả hai viewport. |
| G304 | Như Nguyệt 3D vào đúng trận, sáu bè được tạo; một click chỉ khởi tạo một lần. | Vào trận đạt; gọi hai lần là lỗi nền B03. |
| G305 | Máu, sát thương, đầu hàng, thắng/kết quả và đổi campaign giữ hành vi. | Suite hiện có 17/17 cho mỗi trận; có chỉnh trạng thái trong profile tạm. |
| G306 | Nút/nhãn kỹ năng nằm trong viewport và chạm được trên mobile. | Nhãn bị cắt: lỗi nền B06; chưa kiểm tra máy thật. |
| E01 | Giữ ngân hàng câu hỏi/đáp án/ID; catalog vẫn có số mục cũ. | 70 mục, nguồn chưa chỉnh; không rà học thuật toàn bộ. |
| E02 | Nút thi chuẩn chỉ mở đúng cấu trúc, bài luyện giữ ngân hàng. | Lỗi nền B04: standard đầu tiên mở 22+2. |
| E03 | Chọn một đáp án → xác nhận nộp → thấy điểm/lời giải → làm lại xóa lựa chọn. | Đạt de-01 ở desktop/mobile. |
| E04 | Đúng/sai, tự luận/điền, câu dài, đề khối 10/11/12 và lưu điểm vẫn hoạt động. | Mới kiểm tra một flow TN; các nhánh còn lại phải chạy thêm ở chặng đụng tới phần này. |
| K01 | Đổi khối 10/11/12, mở/đóng bài học, thẻ ghi nhớ, đánh dấu và tìm kiếm. | Đạt mẫu khối 12; thấy số bài 13/13/17, bài mẫu có 4 thẻ, tìm ASEAN có 6 kết quả. |
| K02 | Trạng thái đã học vẫn lưu sau reload và không đổi khi mở/đóng game mới. | Toggle đã duy trì qua điều hướng cùng profile; chưa thử game mới vì chưa có. |
| A01 | Tab đăng nhập/ghi danh, ô required và handler Firebase vẫn nạp. | Đạt UI; không gửi credentials. |
| A02 | Email, Google popup, refresh phiên, đăng xuất và chuyển tài khoản. | Chưa xác minh backend. |
| A03 | Cloud save game mới chỉ cho chủ UID, không đọc/ghi điểm thi/kiến thức/game cũ. | Chưa có game mới/Rules mới; bắt buộc test emulator và tài khoản thử trước bật cloud. |
| A04 | Bài đăng/bình luận/media cộng đồng và Rules hiện hành không bị đổi do tích hợp. | Đã kiểm kê source/hash; không thực hiện thao tác production. |
| M01 | Nhạc chỉ bật bằng click, giữ lựa chọn qua trang, dừng trong phòng thi và phát lại khi rời. | Đạt audio state desktop/mobile emulation. |
| M02 | Nhạc/giọng đọc khi ẩn tab, rời app, narration trong game và loa thật. | Đã rà nguồn; chưa kiểm tra thiết bị thật/nghe toàn bộ. |
| I01 | Ở trang chính không tải JS/model/audio hay tạo loop của game mới. | Baseline resource list đã lưu; chặng tích hợp phải so thêm request của game mới. |
| I02 | Thoát game mới giải phóng frame/timer/listener/audio/GPU; mở lại không tạo nhiều loop. | Chưa có game mới; cần đo số loop/listener/tài nguyên trước/sau nhiều lần. |
| I03 | Rời game rồi nhập WASD/P/Space vào ô thi/tìm kiếm: không bị game bắt phím hay chặn nhập. | Hiện các trang là document riêng; kiểm tra lại sau khi có input module mới. |
| I04 | CSS/ID/global/thư viện và khóa save của game mới không xung đột hệ cũ. | Đã có danh mục bảo toàn; chưa có mã mới để so. |
| V01 | Desktop 1365×900, mobile 390×844 không thêm tràn ngang/che nút. | Trang chính/hai game chính không tràn document trong lượt tải; B05/B06 ghi riêng. |
| V02 | Chrome/Safari/Firefox, 320–430px, xoay màn, bàn phím ảo, mạng chậm và mất WebGL context. | Chưa xác minh trong chặng khảo sát này. |
| R01 | So commit kiểm tra với commit phát hành; lưu báo cáo trước thao tác release. | Đã lưu Pages deployment success tại 0393e60; working tree 3D khác bản phát hành. |
| R02 | Xác minh Settings Pages/branch protection, không push/deploy trong chặng cục bộ. | Không push/deploy; Settings API 404 nên cấu hình chưa truy cập được. |

Điều kiện qua chặng tích hợp: P01/P02/N02/I01–I04 phải đạt với mã mới; các lỗi nền phải được đối chiếu và không tệ hơn. Mọi sửa lỗi nền cần phạm vi riêng được giao, không gộp ngầm vào thay đổi game mới.

## Chặng 2 — kết quả 02/11/2026

Theo [bàn giao khung](shell-handoff.md): P01 đạt (234 tệp cũ giữ hash, trang chính chỉ thêm anchor), P02 đạt ở phạm vi source/key mới (chỉ ghi preferences riêng; chưa kiểm tra dữ liệu tài khoản thật). N02 đạt bằng click thật cả ba entry. I01 đạt network: không tải code/assets mới ở trang chính, shell chưa tải engine. I02 đạt 5 lần mở/đóng và kiểm chứng độc lập RAF/context/listeners. I03 đạt nhập WASD/Space vào search thư viện sau thoát; phòng thi không nạp game mới. I04 đạt kiểm kê module/CSS/storage, không global gameplay handlers.

V01/V02 đã bổ sung kích thước 320/360/375/390/430px và landscape 844×390 cho khung mới, chưa có máy thật/Safari/Firefox. G205/G305 suite cũ chạy lại 56/56; N02 mở đúng lobby 2D/3D, thư viện/phòng thi điều hướng được. Các ca học thuật, Auth/backend/cloud và chơi tự nhiên toàn trận cũ vẫn có giới hạn khảo sát, không tự chuyển thành “đạt” vì khung mới chạy được. B01–B06 chưa sửa.

## Lớp sông — 02/11/2026

[Bàn giao và kết quả](river-handoff.md): thêm bộ core/scheduler 47/47 và UI sông 17/17; bộ hồi quy khung 62/62, lỗi/cleanup 21/21. P01 giữ nguyên mã mọi trang cũ/trang chính so với đầu chặng; chỉ route mới/docs thay đổi. I01–I04 được chạy lại với mô phỏng: không payload trên trang chính, 5 lần mở/đóng, kiểm chứng listener/context/RAF và phím sau thoát. V02 có cả panel hệ thống 320px và landscape trong emulation; máy thật vẫn chưa xác minh. Journal A03/campaign save chưa triển khai, không suy ra từ việc state trong RAM đúng.

## Lớp nhân vật/chiến đấu — 02/11/2026

[Bàn giao](combat-handoff.md): core nhân vật 45/45, UI/input thật 17/17, sông 47/47, vòng đời/mobile/liên kết 62/62 và biên/lỗi 21/21. Chuỗi lái → map vẫn chạy → áp mạn → nhảy → chọn bằng chuột → cận chiến → hero gục/An tiếp quản đạt; không ép state trong chuỗi này. Đủ hai dự bị rồi hết người kiểm tra riêng bằng fixture core. Đa chạm nhả riêng/cancel, pause và đổi quyền xóa held input; mọi avatar/label/input/RAF được dọn khi thoát. 235 tệp website cũ giữ nguyên so đầu chặng, hash trong báo cáo nguồn. Các lỗi nền B01–B06, backend tài khoản và các giới hạn thiết bị của khảo sát vẫn giữ nguyên ghi nhận; chưa có journal/cloud mới.

## Lớp quân đội — 02/11/2026

[Bàn giao](army-handoff.md): 36/36 core quân đội, giao hai lệnh/tuyến hàng qua giao diện rồi cận chiến trong khi hai tổ tiếp tục nhiệm vụ; đo ngắn 50/100/200/400/480 quân mỗi bên, duy trì ID và trạng thái. Bộ UI/vòng đời và lỗi được chạy lại, kết quả tách trong thư mục evidence của chặng. 400/480 chưa qua gate hiệu năng dài, chưa có lưu thương vong qua retry; không nhầm benchmark core ngắn với chứng nhận FPS hoặc chương đã hoàn chỉnh.

## Cập nhật chặng lưu, 02-11-2026

[Bàn giao lưu](save-handoff.md): 71/71 core/lưu/retry; 7/7 UI lưu thiết bị; 9/9 UI trại/retry, 62/62 hồi quy vỏ game và các lối vào. Rules emulator 20/20, Firestore trình duyệt 15/15, Auth emulator 7/7; dữ liệu thử duy nhất thuộc project demo. Có thử phục hồi 400 quân mỗi bên, bản 1.487.033 byte chia 22 phần và upload bị ngắt. Đây là kết quả kiểm thử lưu, không phải benchmark FPS. Xem JSON trong evidence/save-2026-11-02 để phân biệt fixture và tương tác thật. Các ghi nhận ở những chặng trước là lịch sử tại thời điểm bàn giao; cloud production và thiết bị thật vẫn chưa được kiểm tra.

## Bước 10–11, 03-11-2026

[Báo cáo UX](ux-review.md) và [bàn giao sửa lỗi/hiệu năng](optimization-handoff.md): sửa camera bị cột buồm che, panel đè nút ở ngang, HUD/bản đồ mobile, nút theo/giữ trùng và thông báo tổn thất/tiếp tế. Core/lưu 197/197; UI năm kích thước 55/55, biên 320px/667×375/568×320 và multi-touch/cancel 12/12. Chơi áp mạn/cận chiến và tiếp quản thực; không ép thắng. Sáu lần vào/ra trả các bộ đếm tài nguyên về 0. Hash 40 mốc mô phỏng đủ 50/100/200/400/480 mỗi bên khớp; 97 tệp ngoài game mới trong manifest không đổi.

Bổ sung nút tạm dừng ngay trong header bản đồ, kiểm tra pointer → pause đóng băng tick → tiếp tục → đóng bản đồ 15/15 tại năm kích thước. Tổng kiểm tra UI/biên/pause là 82/82; các trường hợp ngang ngắn còn kiểm cả chiều cao và vị trí nút trong viewport.

N02/G201/G301/E03/I01/I03 kiểm lại qua click sau thoát game mới: hai game cũ vào trận/pause, phòng thi chọn/nộp/làm lại ở desktop/390px; thư viện mở/đóng bài và nhập phím đạt ở lượt kiểm bổ sung. Lưu cả lượt harness đóng thư viện chưa thành công, không sửa mã thư viện. Chưa chơi hết trận cũ hoặc kiểm production Firebase. UX01/chương 15–25 phút còn mở; 480 quân chưa qua gate hiệu năng, có số đo chậm và gói tái hiện Astra. Không dùng số draw calls giảm để tự đánh dấu FPS đạt.
