# Kiểm định bản hiện tại — 03/11/2026

**Kết luận: CHƯA ĐỦ ĐIỀU KIỆN phát hành game mới như chương chiến dịch hoàn chỉnh theo yêu cầu.** Có thể tiếp tục thử nghiệm nội bộ bản sandbox đã ghi nhãn. Không có thao tác phát hành, commit/push, thay Rules production, đăng nhập tài khoản thật hoặc bật thanh toán trong lượt này.

Mã được kiểm định: commit **`03aedcd8d85924a35329580774e53d117870284a`**, working tree sạch lúc bắt đầu. Đây là lượt đọc mã và chạy lại độc lập sau bước 11, không suy kết quả từ báo cáo cũ. Mọi tệp mới của lượt kiểm định nằm trong hồ sơ `docs/game-bach-dang-938/`.

## 1. Căn cứ và môi trường

- Đối chiếu quy định chung người dùng cung cấp, [hồ sơ phạm vi](README.md), [chương mẫu](chapter-sample.md), source thực tế trong `src/app`, `src/sim`, `src/save`, `src/presentation`, Rules hiện hành và các trang cũ.
- Windows, Chrome **156.0.8078.80**, headless với SwiftShader, profile tạm; localhost. Mobile là viewport giả lập, **không phải điện thoại thật**. Backend production được chặn; các thao tác sửa trạng thái fixture chỉ áp dụng trên đối tượng thử hoặc profile tạm.
- Kiểm tra 360/390/430 px, desktop 1365×900; thêm 320×740, ngang 844×390, 667×375, 568×320 và đổi chiều khi đang chơi. Không đo FPS bằng cách chỉ nhìn ảnh.
- Hai máy chủ cục bộ: root ở 8765 và origin riêng 8767 **chỉ phục vụ đường dẫn `/nhipdapcualichsu/`**. Đường dẫn ngoài prefix trả 404, để không vô tình che lỗi absolute path.
- Firebase Auth/Firestore emulator dùng `demo-bd938-save`, cổng 9099/8089. Thử cả Rules gốc của checkout và Rules ghép fragment game; không coi kết quả emulator là xác nhận cấu hình production.

## 2. Kết quả kiểm tra lại

| Khu vực | Quan sát từ lượt này | Kết luận/phạm vi |
|---|---|---|
| Bảo toàn nguồn cũ | 23/24 tệp HTML/JS/CSS/Rules trong baseline trước game mới giữ nguyên hash. Tệp khác duy nhất là `trang-chinh.html`; diff chỉ thêm một thẻ liên kết game mới. Hai href cũ vẫn là `sa-ban.html`, `sa-ban-3d.html`. | Không phát hiện thay đổi nguồn ngoài điểm tích hợp trong tập đối chiếu; hash không thay cho kiểm tra hành vi. [Nguồn](evidence/release-2026-11-03/source-audit.json). |
| Chưa mở game mới | Trang chủ không request tài nguyên dưới `game-bach-dang-938/`, không nạp module game mới. Sau thoát, trang chủ/phòng thi/đăng nhập cũng không có request đó. | Đạt cô lập tải trong các luồng đã thử. Three.js/hiệu ứng vốn có của trang chủ không được tính là game mới chạy ngầm. [Quan sát](evidence/release-2026-11-03/current-validation.json). |
| Game cũ | Vào 2D/3D từ thẻ Sa Bàn sau khi thoát game mới, mở trận, render, pause và về trang chủ đều chạy ở desktop/390 px. Bạch Đằng 3D có đội thuyền; Như Nguyệt 3D mở đúng campaign 2. | Lối vào được giữ; vẫn có lỗi chọn lại trận/khởi tạo lặp bên dưới. [Luồng](evidence/release-2026-11-03/routes-observations.json), [chuyển trận](evidence/release-2026-11-03/legacy-switch.json). |
| Cơ chế game cũ | Chạy lại fixture runtime/sát thương/cooldown/kết quả: 2D mỗi trận 11/11, 3D mỗi trận 17/17, tổng **56/56**. | Có fixture đặt vị trí/HP và gọi hàm sát thương; không tuyên bố đã chơi tự nhiên hết cả bốn trận. [Chi tiết](evidence/release-2026-11-03/legacy-mechanics.json). |
| Phòng thi | Chọn kho đề → standard → chọn một đáp án → nộp/xác nhận → xem điểm → làm lại, cả desktop/390 px, không lỗi JS. | Luồng còn dùng được; đề `de-01` mở 22 TN + 2 Đ/S, chưa đúng cấu trúc chuẩn yêu cầu. [Bằng chứng](evidence/release-2026-11-03/routes-observations.json). |
| Kho kiến thức | Mở bài khối 12, đóng bằng chuột 3 lần liên tiếp sau khi animation ổn định, gõ `WASD Space` vào tìm kiếm được. | Không bị input game mới chiếm. Click quá sớm trong script route ban đầu trượt nút đang chuyển động; xem phần sai số công cụ. [Theo dõi](evidence/release-2026-11-03/boundaries.json), [ảnh](evidence/release-2026-11-03/library-stable-pointer.png). |
| Đăng nhập | Form hiện hành chặn email/password trống, nút hiện mật khẩu và tab ghi danh hoạt động; không tải game mới. Auth emulator đăng nhập/đăng xuất/đổi UID/khôi phục phiên qua trang đạt **7/7**. | Chưa thử Google popup hoặc tài khoản production. [UI](evidence/release-2026-11-03/boundaries.json), [Auth](evidence/release-2026-11-03/auth-emulator.json). |
| Sông/chiến đấu mới | **47/47** sông; **45/45** nhân vật; **37/37** quân đội. Có sweep va chạm khi frame chậm, tên/đòn hữu hạn, đỡ/né, bơi/cứu có điều kiện, hết dự bị chỉ kết thúc một lần. | Đạt các tình huống core đã thiết kế; không bao phủ mọi tổ hợp gameplay. [Kết quả mới](evidence/release-2026-11-03/current-validation.json). |
| Chơi trực tiếp | Bắn trúng → lái/mở bản đồ khi trận chạy → neo/áp sát → rời lái → nhảy lên boong địch → cận chiến → nhân vật gục, R01 tiếp quản tại vị trí thật. | Thao tác bàn phím/chuột thực qua CDP, không tiêm trạng thái cho chuỗi này. [Trạng thái](evidence/release-2026-11-03/combat-observations.json), [ảnh cận chiến](evidence/release-2026-11-03/combat-melee-on-deck.png), [tiếp quản](evidence/release-2026-11-03/combat-reserve-takes-over.png). |
| Lưu/retry | **49/49** repository, **11/11** retry, **8/8** session-save. Gồm 5 lần retry không hồi sinh chết/mất tích, không cấp lại tên/hàng/thuyền, không trừ lại thuốc/hàng hoàn. | Tổng sáu bộ core/lưu **197/197** chạy mới. [Chi tiết](evidence/release-2026-11-03/current-validation.json). |
| Lưu bằng UI và mất mạng | Chọn lưu thiết bị; bỏ hàng 600→0; tải mốc và thoát rồi mở lại vẫn 0. Ngắt mạng khi game đã tải vẫn chạy và lưu cục bộ, không có `lastFault`. | Xác nhận đường UI/IDB thật trong profile tạm; không chứng nhận khả năng mở trang lần đầu khi offline. [Kết quả](evidence/release-2026-11-03/boundaries-followup.json), [ảnh](evidence/release-2026-11-03/local-save-reopened.png). |
| Hai tab/thiết bị và quyền | Hai cửa sổ thật dùng cùng IDB đạt **3/3**: độc quyền writer, cùng đọc thương vong, epoch cũ không ghi đè. Rules ghép **20/20**; Firestore SDK tới emulator **15/15**, gồm revision conflict, upload chunk gián đoạn/retry, UID, checksum. | “Hai thiết bị” là các client thử độc lập; chưa thử hai thiết bị vật lý. [Tab](evidence/release-2026-11-03/boundaries-followup.json), [Rules](evidence/release-2026-11-03/rules-emulator.json), [SDK](evidence/release-2026-11-03/browser-emulator.json). |
| Gần/xa, chất lượng | Bản hiện tại **không có hai thuật toán mô phỏng gần/xa**. Mọi quân dùng cùng state; renderer chỉ thay hiển thị. 960 người, gồm chết/thương, qua ba mức chất lượng và camera gần/xa vẫn giữ nguyên checkpoint. Khôi phục rồi chạy tiếp 240 tick khớp snapshot quân của bản không khôi phục. | Đạt tách render khỏi sim ở fixture này. Không tuyên bố đã kiểm định chuyển LOD mô phỏng chưa tồn tại. [Render](evidence/release-2026-11-03/cycles-current.json), [restore](evidence/release-2026-11-03/current-validation.json). |
| Focus/resize/input | Blur giả lập khi đang giữ W làm pause, tick đứng; tiếp tục/đổi chiều còn dùng được. Đa chạm đi+đỡ và touchCancel đạt. 320/667/568 không tràn, nút >=44px; **12/12** kiểm tra biên. | Blur được dispatch trong trình duyệt, không phải chuyển ứng dụng trên điện thoại thật. [Biên](evidence/release-2026-11-03/edges-validation.json), [resize](evidence/release-2026-11-03/current-validation.json). |
| Vào/ra nhiều lần | 5 vòng trong **cùng document**: created/disposed lần lượt 1…5, mọi vòng có 0 activeLoops/listeners/observers/renderers/geometries/materials/canvases sau đóng. Hủy tải có độ trễ và lỗi thiếu tài nguyên đều về SHELL, không tạo cảnh muộn. | Không thấy tài nguyên còn sở hữu sau thoát; không chứng minh không rò rỉ sau hàng giờ. [Vòng đời](evidence/release-2026-11-03/cycles-current.json), [lỗi mạng](evidence/release-2026-11-03/boundaries.json). |
| GitHub Pages | Mở từ `/nhipdapcualichsu/trang-chinh.html` → game mới render → về đúng `/nhipdapcualichsu/trang-chinh.html#khu-vuc`. | Module/data/engine trong game dùng đúng prefix. 404 duy nhất ghi nhận là favicon mặc định của trang chủ, không phải asset game. Không kiểm tra bản deploy thực tế. [Bằng chứng](evidence/release-2026-11-03/current-validation.json), [ảnh](evidence/release-2026-11-03/pages-prefixed-game.png). |

## 3. Những mục bắt buộc xử lý trước nghiệm thu đầy đủ

### RC-01 — P1: Chưa có chương, thắng và rút lui cấp nhiệm vụ

**Tái hiện:** trong fixture riêng dùng cấu hình thật, loại toàn bộ actor địch và quân địch, chạy tiếp 600 tick. Địch sống còn 0; `phase` vẫn `active`. Giao lệnh `retreat` cho tổ: đến đích và báo `holding`, nhưng không có kết quả nhiệm vụ hoặc kết toán rút lui. UI “Kết thúc lượt thử” nói rõ đây chưa phải chiến thắng.

**Đối chiếu mã:** `src/sim/encounter.js:388` chỉ kết thúc ở `failed_command`; `src/save/attempt-resolution.js:5` và `src/save/repository.js:67` chỉ hỗ trợ kết quả đó. Thư mục data chỉ có shell, river, character config; chưa có chuỗi trinh sát → bố trí → triển khai → giao chiến → ứng cứu/rút → kết quả của chương 15–25 phút. [Fixture và kết quả](evidence/release-2026-11-03/current-validation.json).

**Cần sửa ở chặng triển khai riêng:** nối mission state machine và nội dung chương theo đặc tả; thêm kết toán thắng/rút cùng giao dịch lưu idempotent, sau đó chơi từ đầu đến kết quả. Không đổi tên nút kết thúc sandbox thành “thắng” để vượt kiểm tra. Đây là thiếu chức năng đã được ghi nhận trước đó, không phải hồi quy do tối ưu.

### RC-02 — P1: Đồng bộ production chưa đủ căn cứ bật cho người dùng

Rules trong checkout hiện chỉ có posts/comments. Emulator chạy **đúng file này** từ chối cả get và create slot game của chính chủ. Rules ghép fragment riêng vượt bộ kiểm tra quyền và đồng bộ. [Bằng chứng gap](evidence/release-2026-11-03/current-rules-gap.json).

Không suy ra Rules trên server chắc chắn giống checkout. Cần chủ dự án xác nhận/cập nhật riêng nhánh quyền game theo [hướng dẫn](firebase-save-setup.md), rồi kiểm tra bằng tài khoản thử được phép. Không mở quyền chung hoặc sửa dữ liệu phòng thi. Nếu chưa bật được, chưa được quảng bá đồng bộ tài khoản là chức năng đã sẵn sàng production. Lượt này không áp dụng cấu hình bên ngoài.

### RC-03 — P1 với mục tiêu 400+: Chưa đạt ngân sách mô phỏng và chưa có đo dài

Lượt mới có 400 quân mỗi bên: AI p95 **21,1 ms**; 480 mỗi bên: **19,4 ms**, vượt ngân sách CPU mô phỏng ban đầu 8 ms/tick chỉ riêng AI. Duy trì đủ 800/960 ID và 240 tick; không giảm quân hoặc bỏ mô phỏng. Frame interval có lúc 33,3 ms trong phép thử ngắn. Xem bảng đo bên dưới.

Cần profile dài trên máy/điện thoại đích, gồm chiến đấu có lưu, path queue có tải và thời điểm thương vong dồn. Dùng [gói tái hiện Astra](astra-performance-handoff.md), kèm số đo mới; không coi một lượt tốt hơn là đã đóng nút thắt. Sandbox bình thường hiện khởi tạo 40 quân mỗi bên; chưa có chương thật 400+ để nghiệm thu.

### RC-04 — P1, lỗi nền: Bạch Đằng 2D mở nhầm sau Như Nguyệt

**Tái hiện desktop và 390 px:** Sa Bàn 2D → vào Như Nguyệt → Chọn Ải → chọn Bạch Đằng. URL đúng trang 2D, nhưng `currentStageId` vẫn **1**, tiêu đề vẫn “PHÒNG TUYẾN SÔNG NHƯ NGUYỆT”. [JSON](evidence/release-2026-11-03/legacy-switch.json), [ảnh](evidence/release-2026-11-03/legacy-2d-wrong-campaign-390.png).

`sa-ban.html:8155` (`vaoThangSaBanChienDau`) không khôi phục stage 2 trước khi chuyển trận. Cần một sửa nhỏ riêng, kèm kiểm tra chuyển qua/lại hai trận. Hash tệp giữ nguyên so baseline trước game mới: **lỗi tồn tại sẵn, không do tích hợp mới**; lượt kiểm định không sửa.

### RC-05 — P1 nếu công bố đề chuẩn 25+4, lỗi nền

Thao Trường → Kho đề tự chọn → standard `de-01` mở **22 trắc nghiệm + 2 đúng/sai**, vẫn cho làm/chấm/làm lại. Xác nhận lại ở desktop và 390 px. [Luồng](evidence/release-2026-11-03/routes-observations.json), [ảnh](evidence/release-2026-11-03/exam-answer-after-new-390.png).

Cần phân biệt đề thiếu nguồn với đề chuẩn: chỉ cho luyện ngân hàng/ghi rõ chưa đủ, hoặc chọn đủ câu hợp lệ theo chính sách đã chốt; không bịa thêm nội dung. Mã phòng thi không thay đổi so baseline. Đây là vấn đề riêng cần sửa trước khi tuyên bố website đáp ứng toàn bộ yêu cầu, không phải mất dữ liệu do game mới.

## 4. Có thể xử lý sau các mục chặn

- **RC-06 — P2, lỗi nền:** một lần click `#btn-enter-campaign-2` gọi `chuyenSangChienDichNhuNguyet` **2 lần**, cả hai viewport. `sa-ban-3d.html:3449` và `:3455` gắn cùng handler vào article cha và button. Nên chỉ có một nơi xử lý hoặc ngăn bubbling phù hợp, rồi đo reset/cleanup. Hiện trận vẫn render và fixture cơ chế đạt; chưa có bằng chứng vòng lặp bị nhân đôi lâu dài. [Bằng chứng](evidence/release-2026-11-03/legacy-switch.json).
- **RC-07 — P2 hoàn thiện sản phẩm:** nhân vật, binh sĩ và cảnh vẫn là mô hình thủ tục tạm; chưa có chuỗi hội thoại/bốn hồ sơ nhân vật hoàn chỉnh hoặc âm thanh nước/mái chèo/trống/nhạc theo trạng thái. Có thể để sau khi đóng lỗi logic trong bản thử nội bộ, **vẫn phải hoàn tất trước nghiệm thu chương hoàn chỉnh**. Không lấy hiệu ứng thay cho RC-01.
- Thu gọn/snapshot nhật ký dài, dọn chunk upload bỏ dở và kiểm tra sau nhiều giờ là công việc tiếp theo. Chưa ghi nhận mất dữ liệu trong lượt này; không nâng nguy cơ chưa tái hiện thành lỗi đã xác nhận.

## 5. Số đo mới của đúng commit đang kiểm định

Đo ở localhost, Chrome headless/SwiftShader, DPR1. Không thay source để tối ưu trong lượt này, vì vậy bảng này **không phải một lần cải thiện trước/sau mới**. So với số đo biến động ở bước 11, điều kiện máy hiện tại thuận lợi hơn; chưa xác định được quan hệ nhân quả.

Mở cảnh từ khi state LOAD đến BRIEFING: lần đầu **631,3 ms**, bốn lần mở lại **169,8 / 110,5 / 158,4 / 134,6 ms** (median **146,5 ms**). Không bao gồm thời gian người chơi chọn nhân vật và không đại diện mạng Internet lạnh. Mẫu 4 giây cảnh mặc định: frame p95 **8,5 ms**, p99 **8,9 ms**, max **16,7 ms**.

| Quân mỗi bên | Tổng ID thật | Frame p95 / max (ms) | AI p95 (ms) | Path p95 (ms) | Draw calls cuối |
|---:|---:|---:|---:|---:|---:|
| 50 | 100 | 8,7 / 25,1 | 1,0 | 0,1 | 183 |
| 100 | 200 | 8,6 / 16,9 | 2,4 | 0,1 | 183 |
| 200 | 400 | 8,7 / 16,9 | 7,4 | 0,3 | 183 |
| 400 | 800 | 16,4 / 33,3 | 21,1 | 0,4 | 183 |
| 480 | 960 | 16,6 / 33,3 | 19,4 | 0,5 | 182 |

Mỗi quy mô chạy khoảng 8 giây/240 tick. AI đo theo tick, RAF gồm cả frame không có tick nên không so trực tiếp hai percentile. Path bao gồm tick không có job, chưa phải percentile riêng cho mọi truy vấn A*. Không có lượt >50 ms trong mẫu 480 này; điều đó không xóa các đợt chậm đã ghi ở bước 11.

Cuối mẫu: 220 scene objects, 171 GPU geometry ở fixture 480; JS heap khoảng 15,43 MiB. Heap sau 5 lần đóng cảnh cùng document: **7,45 → 9,36 → 10,50 → 5,90 → 5,68 MiB**. Các bộ đếm sở hữu đều về 0; đây không phải số VRAM hoặc chứng minh không có leak dài hạn.

[JSON workload](evidence/release-2026-11-03/performance-current.json), [tải/vòng đời/render consistency](evidence/release-2026-11-03/cycles-current.json). Ba mức đồ họa thay đổi lượng tam giác thực trong fixture và đều giữ state mô phỏng nguyên vẹn.

## 6. Tài nguyên, chi phí và ranh giới dữ liệu

- Three.js r128 của game mới có MIT LICENSE, nguồn/bytes/hash trong manifest; **cả module và license đều khớp SHA-256** ở lượt này. [Kiểm tra](evidence/release-2026-11-03/source-audit.json).
- Cảnh hiện dùng hình học được tạo bởi mã; không tải GLB cọc 1288, ảnh/nhạc cũ chưa có giấy phép vào game mới. Font hệ thống. Đây là xác nhận tài nguyên đang dùng, không phải phê duyệt tài nguyên mỹ thuật tương lai hoặc mọi asset cũ của website.
- Rà tham chiếu mạng của runtime mới: chỉ SDK Firebase hiện hữu khi chọn lưu tài khoản; không thấy API AI trả phí, mua asset, Cloud Functions hoặc phụ thuộc dịch vụ thanh toán mới. Không xác minh gói/billing thực tế của tài khoản chủ dự án.
- Lưu mới nằm trong IndexedDB `dcls.bd938.saves.v1` và nhánh `gameBachDang938/{uid}/versions/v1/slots/...`; không có phép thử ghi production. Việc giữ dữ liệu chờ khi sign-out và chống nhầm UID đã được kiểm tra lại bằng emulator.

## 7. Những phần chưa đủ điều kiện xác minh

1. Chơi tự nhiên toàn chương 15–25 phút tới thắng/rút/hậu chiến: chương và trạng thái đó chưa có. Chưa thể nghiệm thu lịch sử, nhiệm vụ, mỹ thuật/âm thanh cuối hoặc trải nghiệm 400+ trong chương thật.
2. Đăng nhập Google, Rules đang deploy, đồng bộ thật giữa điện thoại và máy tính, hạn mức Firebase/billing, mạng Internet thực và bản GitHub Pages công khai. Chỉ kiểm thử cấu hình cục bộ/emulator/prefix; không phát hành để thử.
3. Thiết bị mobile thật; Safari/iOS, Firefox, tai thỏ/thanh địa chỉ động thật, GPU/VRAM, pin/nhiệt, đổi ứng dụng thật, BFCache đặc thù trình duyệt, soak nhiều giờ hoặc hết quota đĩa ở hệ điều hành.
4. Mọi câu hỏi và đáp án của phòng thi/mọi bài kho kiến thức. Lượt này kiểm tra các luồng tiêu biểu và toàn vẹn nguồn, không tái kiểm duyệt toàn bộ nội dung học thuật.
5. Kết quả cuối của game cũ được kiểm tra bằng fixture hàm sát thương/kết quả; không tuyên bố đã chơi tự nhiên đủ bốn trận tới hết hậu chiến.

Không phát hiện lỗi ghi nhầm UID, hồi sinh quân đã chết hoặc nhân vật tư trong các trường hợp đã chạy. Kết luận đó có phạm vi kiểm thử, không phải bảo đảm tuyệt đối.

## 8. Sai số công cụ và bằng chứng được giữ

- Lần đầu test hai cửa sổ bị Chrome chặn popup do thiếu user gesture trong harness. Chạy lại với user gesture, không sửa game: 3/3. Hai kết quả nằm ở `boundaries.json` và `boundaries-followup.json`.
- Script route bấm đóng bài học ngay lúc animation mở còn chạy, sau đó hit-test ô tìm kiếm bị che. Chạy riêng sau 0,8 giây ổn định và mouse down/up 120 ms: đóng lần đầu 3/3. Chưa đủ căn cứ kết luận có lỗi đóng popup ở thao tác thông thường; không xóa quan sát đầu.
- Lần đầu kiểm tra lưu đã qua bỏ hàng/tải mốc/offline nhưng click liên kết trang chủ quá sớm không điều hướng. Chạy lại riêng bước phục hồi bằng navigation cùng origin đạt. Đường liên kết đã được kiểm tra riêng ở suite route và prefix.
- Trường `newPrefixedElements` của probe trang chủ đếm mọi ID bắt đầu `bd938`, gồm link `bd938-entry`; không được diễn giải thành canvas chạy ngầm.
- Máy chủ thử ghi `ConnectionResetError / WinError 10054` khi Chrome hủy request hoặc đóng profile; đây là đóng kết nối trong harness, không có lỗi JS tương ứng của game. Máy chủ và emulator đã dừng sau kiểm định.

## 9. Điểm bàn giao

**Hoàn tất chặng kiểm định; không hoàn tất game.** Đề nghị chặng tiếp theo xử lý RC-01 trong phạm vi game mới, song song về lịch công việc với việc chủ dự án chuẩn bị RC-02; các lỗi cũ RC-04/05/06 cần sửa riêng có kiểm soát. RC-03 tiếp tục theo gói profile, giữ nguyên quân số/luật mô phỏng. Sau từng nhóm sửa, chạy lại nhóm hồi quy liên quan và cập nhật quyết định phát hành.

Để chạy lại: xem [README bằng chứng](evidence/release-2026-11-03/README.md). Không dùng số bài test đạt làm thay thế tiêu chí chơi hết chương.
