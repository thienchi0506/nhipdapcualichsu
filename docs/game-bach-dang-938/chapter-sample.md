# Chương mẫu: Giữ bến, khóa cửa lạch

**Đặc tả chương chơi đơn 15–25 phút, chưa triển khai/playtest.** Đây là một nhiệm vụ tái dựng hư cấu trong bối cảnh chiến dịch Bạch Đằng 938, không phải lời khẳng định rằng từng bến, nhân vật, quân số hoặc nhiệm vụ đã tồn tại đúng như thiết kế.

## 1. Mục đích và ranh giới

Thử một vòng chơi hoàn chỉnh: nhận nhiệm vụ → bố trí lực lượng → lái thuyền/trinh sát → phối hợp phục kích → đổ bộ/chiến đấu/cứu quân → rút hoặc hoàn thành → hậu chiến → lưu/tiếp tục. Phải thể hiện được việc chịu trách nhiệm về thương vong, không chỉ tiêu diệt tàu địch.

Người chơi giữ một bến tiếp tế bên cửa lạch, đưa hàng về kho và ngăn đoàn vận tải đối phương đi xuyên qua khu vực phòng thủ. Cọc và con nước tạo cơ hội nhưng không là công tắc thắng. Có thể thắng bằng chặn đường, vô hiệu hóa lái/chèo, buộc đối phương rút hoặc chiếm tàu; không cần giết hết quân địch.

| Chi tiết | Nhãn và nguồn |
|---|---|
| Bối cảnh năm 938, Ngô Quyền, quân Nam Hán, tận dụng con nước/cọc và lực lượng nghi binh/mai phục | Nền lịch sử tham chiếu trong [sổ nguồn](sources-and-assets.md), đặc biệt bài [Bảo tàng Lịch sử quốc gia](https://baotanglichsu.vn/VI/Articles/3098/13934/ngo-quyen-va-chien-thang-bach-djang-nam-938.html). Chi tiết diễn biến cần đối chiếu trước khi đưa thành lời dẫn chính thức. |
| Bến/cửa lạch cụ thể, tuyến tiếp tế, vận tải địch, bốn nhân vật, lời thoại, đội hình, thời tiết | **Hư cấu phục vụ gameplay**; UI mở đầu/hồ sơ chương phải nói rõ. |
| Cao độ, mớn nước, nhân số, combat/stamina và tide rút trong một chương | **Mô hình đơn giản và nén thời gian**, không phải số đo/sơ đồ lịch sử. |

Chưa viết toàn chiến dịch hoặc hệ tiến quân 400+ người trong nội dung chương này. Kiến trúc và benchmark phải phục vụ quy mô đó; chương mẫu khởi đầu nhỏ để thử đầy đủ cơ chế.

## 2. Đội hình và bốn tuyến nhân vật

Tên riêng chưa chốt; sử dụng mã vai trò khi dựng mẫu, không tùy tiện gán vai cho danh nhân:

| Mã | Vai trò và câu chuyện hư cấu | Giá trị gameplay |
|---|---|---|
| H01 — người dẫn thuyền | Am hiểu lạch nước, học đặt an toàn thủy thủ trước thành tích cá nhân. | Cảnh lái/trinh sát, nhắc độ sâu và đường rút. |
| H02 — chỉ huy cung thủ | Giằng co giữa thời cơ phục kích và tránh bắn vào đồng đội. | Lệnh giữ bắn/tập trung/đổi vị trí, phản hồi friendly fire. |
| H03 — chỉ huy công binh | Phải lựa chọn gỗ cho cọc, sửa thuyền hay giữ bến. | Bố trí trận địa, mắc/thoát cọc, sửa bộ phận. |
| H04 — người phụ trách quân nhu | Ưu tiên đưa thương binh và hàng thiết yếu về. | Tuyến tiếp tế, cứu thương, hậu chiến và niềm tin. |

Chọn một làm trung tâm, ba người còn lại làm chỉ huy AI. Tất cả biết các thao tác cơ bản, không khóa tuyến chơi chỉ vì chọn sai nhân vật; chuyên môn ban đầu là ưu tiên AI/hội thoại, chưa cộng buff chưa kiểm chứng. Camera và bộ điều khiển không phụ thuộc H01.

Cấu hình mẫu: 50 người phía ta gồm 4 mainHero, 2 reserveOfficer, 44 binh sĩ; bốn thuyền có tổng sức chứa 50. Địch 60 người, đội hình scout/transport/escort/transport/escort. Đây là dữ liệu encounter trong `chapter.*`, không luật cố định của engine. Roster phải có ID/tên/trạng thái, phân công tổ và thuyền trước trận; sĩ quan dự bị là người thật trong roster.

## 3. Không gian và nhịp chương

Bản đồ tái dựng có bến xuất quân, kho tiền phương, lòng sông sâu, bãi nông/cọc, hai bờ có vật che, một bến đổ bộ và hành lang rút. Kích thước/đồ thị triều trong [tham số tập trung](gameplay-defaults.json). Map content phải chỉ rõ collision/nav/flow field, điểm ra của vận tải và polygon extraction; không dùng vị trí mesh làm định nghĩa mục tiêu.

| Nhịp | Thời lượng định hướng | Hoạt động và chuyển pha |
|---|---|---|
| 1. Nhận lệnh và chuẩn bị bến | 3 phút | Sau briefing bắt đầu sim. Phân công bốn cánh, chọn hai vị trí xây/sửa trong ngân sách gỗ; tập lái/bắn/cứu. Hoàn lệnh bố trí hoặc hết cửa sổ chuẩn bị → nhịp 2. |
| 2. Trinh sát và đưa hàng | 4 phút | Lái thuyền nhẹ, phát hiện đoàn vận tải; chuyển các kiện hàng về bến, đặt lệnh giữ bắn và ngưỡng tổn thất. Enemy scout hoạt động, không đứng chờ tutorial. Contact đoàn chính hoặc mốc kế hoạch → nhịp 3. |
| 3. Chặn cửa lạch | 6 phút | Triều xuống dần theo clock từ đầu chặng; địch chọn đường theo biết được/độ sâu. Giữ hướng khi mở map, phục kích hai bờ, hư lái/chèo, mắc cọc/thoát mắc. Khi hai transport đã neutralized hoặc một chiếc vượt cổng → đánh giá mục tiêu, chuyển nhịp 4 hoặc rút vì thất bại. |
| 4. Chiếm bến/thu hồi và cứu quân | 5 phút | Cho phép boarding/đổ bộ/cận chiến, cứu quân rơi nước, dập cháy và đưa đồ ra. Nếu không muốn áp sát có thể giữ khu vực từ xa và dùng AI cứu hộ. Kiểm tra kho đủ hàng và đường thoát còn hoạt động. |
| 5. Tập kết và hậu chiến | 2 phút | Gom lực lượng, giữ extraction đủ thời gian, báo kết quả. Phần bảng báo cáo sau resolution không đếm vào deadline chiến đấu. |

Mục tiêu nhịp là khoảng 20 phút sim, nằm trong khoảng 15–25 phút. Không ép người chơi chờ cho đủ 15 phút nếu đã làm xong; chưa có bằng chứng thời lượng thực tế. Hard deadline là 25 phút sim; pause không tính, map vẫn tính. Tổng phaseGuideS là 20 phút, chỉ dùng hướng dẫn spawn/event, không khóa pha bằng năm timer độc lập. Địch vào theo stage event/đường trinh sát và config; load lại không tạo thêm một đoàn vì timer được đăng ký lần hai.

## 4. Quy tắc thế giới của chương

- Nước ban đầu đủ che khu cọc theo map design, nhưng thuyền nặng có thể chạm cọc sớm hơn thuyền nhẹ. Có hành lang an toàn được trinh sát; cọc ta cũng gây hại tàu ta. Không có trigger trừ HP hàng loạt lúc hết đếm ngược.
- Địch gồm vận tải ưu tiên vượt tuyến và hộ tống bảo vệ. Khi bị chặn/hỏng lái/tổn thất cao có thể tìm đường khác hoặc rút; không tự đâm cọc chỉ để diễn kịch bản. Không biết vị trí cọc chưa được phát hiện.
- Cung thường tiêu tên; tên cháy cần dầu và thời gian chuẩn bị, có rủi ro đồng đội/cháy hàng. Lửa dùng component fire state, dập được bằng nhân lực; hiệu ứng không thay thế sát thương.
- Lên thuyền địch cần khoảng cách/vận tốc/sức bền hợp lệ; hụt nhảy rơi nước, bơi tốn sức và cần cứu. Cận chiến có windup, parry, counter, recovery; không combo vô hạn hoặc phép thuật.
- Supply route bị cắt thì cung thủ không được nạp tên từ xa. Sửa và chữa cần lao động, thời gian, vật tư; worker đang đánh nhau sẽ tạm dừng job. Vật tư/job đi qua journal.
- Người chơi có thể không dùng mọi thao tác trong một lượt, nhưng chương phải có đường thử hợp lệ cho lái, bắn, boarding, đổ bộ, melee, trinh sát, xây, sửa, cứu và rút.

## 5. Thắng, thất bại, rút và ưu tiên kết quả

**Thắng chương** khi tất cả điều kiện sau cùng đạt tại một tick:

1. Mọi tàu có tag `blockingTransport` đã bị chiếm, chìm hoặc xác nhận rút ngược khỏi vùng tiến công; tàu chỉ đang mắc cọc hoặc tạm quay đầu chưa tính neutralized.
2. Kho ta đã nhận ít nhất số kiện yêu cầu, mỗi crateId chỉ tính một lần.
3. Control owner hiện tại còn hoạt động và ở extraction; lực lượng được lệnh rút đã settle thành evacuated/wounded/missing/captured/dead, không còn trạng thái mơ hồ.
4. Giữ khu tập kết theo thời gian yêu cầu, trước hoặc đúng deadline, không có cờ thất bại bắt buộc.

**Thất bại bắt buộc** nếu vận tải có tag mục tiêu vượt exit plane đúng chiều (swept crossing), kho thiết yếu bị hủy trước khi hàng được chuyển ra, hết commandable reserve khi người điều khiển gục, hoặc hết deadline mà chưa đạt thắng. Chỉ thuyền vận tải mục tiêu vượt qua gây fail, không phải mọi chiếc scout/hộ tống.

**Rút quân chủ động** có thể yêu cầu bất cứ khi đang RUNNING. Chuyển mục tiêu sang rally/extraction, battle vẫn chạy; giữ khu rút và đưa quân/đồ tới đó. Khi mục tiêu đã thất bại nhưng còn chỉ huy, UI cho rút trong thời gian còn lại thay vì xóa chiến trường ngay. Outcome vẫn là `failed_objective`, phân biệt với `retreated` tự nguyện trước khi nhiệm vụ hỏng.

Khi hết người tiếp quản, resolution bắt buộc: những tổ đã ở vùng an toàn được coi rút; các tổ khác được settle theo vùng/mức bị vây/trạng thái tại tick cuối. MainHero vào nhánh wounded/cứu về sau; quân thường có thể missing/captured/dead. Quy tắc settle phải deterministic và giải thích trong báo cáo, không tự giết tất cả người ngoài polygon.

Thứ tự tie cùng tick: cập nhật damage/escape/command availability → xét fail flag → xét extraction/win → deadline nếu chưa có outcome. Nếu thắng hợp lệ đúng deadline và không có fail flag thì thắng; nếu transport escape cùng tick đủ hàng thì thất bại. Mỗi attempt chỉ một resolutionId.

## 6. Hậu chiến và hậu quả

| Kết quả | Được giữ | Hậu quả và lần chơi tiếp |
|---|---|---|
| Thắng | Vật tư mang về, kinh nghiệm đã cấp đúng một lần, người cứu được, tình tiết hoàn thành | Thương binh cần hồi phục, tàu cần sửa, người chết không trở lại; xuất báo cáo và checkpoint. |
| Tự rút | Quân/đồ thật sự về bến; kinh nghiệm hành động hợp lệ đã ghi | Mất cơ hội mục tiêu, chậm thời gian chiến dịch/giảm niềm tin; không có thưởng hoàn thành. Có thể thử lại với kho/roster còn lại. |
| Thất bại | Phần lực lượng an toàn và đồ thu hồi hợp lệ | Kết quả objective thất bại giữ lại, thương vong/tàu mất persistent; camp quyết định sửa/chữa/tuyển trước retry. |

Hậu chiến có danh sách tên/trạng thái, nguyên nhân mất, quân được cứu, vật tư consumed/lost/recovered; không chỉ một tổng điểm. Cho chọn cứu chữa, sửa tàu, cấp phát cho dân trong **phần tái dựng** theo vật tư còn lại; không bắt người chơi chi âm. Chương mẫu kết thúc bằng tình tiết và trại, không giả vờ đã hoàn tất toàn chiến dịch lịch sử.

MainHero gục được sĩ quan dự bị tiếp quản, sống và trở lại sau settlement/camp recovery theo [save-and-recovery.md](save-and-recovery.md). Reload cùng attempt không chữa; retry giữ người chết/vật tư mất. Bổ sung lực lượng có quota/chi phí, stable ID mới, không hồi sinh roster cũ.

## 7. UI và điều khiển đề xuất

- Briefing ngắn: mục tiêu, map chạy/pause, rút, hậu quả; có nút tiếp tục rõ và điều khiển bàn phím. Không giấu nội dung bắt buộc sau hover.
- PC: WASD đi bộ; trên thuyền W/S ga, A/D lái. Chuột ngắm/đánh, Q đỡ, E tương tác/lên xuống, Space nhảy, Shift chạy, C đổi camera, M bản đồ, Esc menu pause. Đây là keymap **đề xuất cho game mới**, có thể đổi, không thừa kế tổ hợp chiêu của game cũ.
- Mobile: joystick trái, nhóm thao tác theo ngữ cảnh phải, map/pause dễ chạm. Nút ≥44×44px; thông tin dài cuộn được; safe-area/dvh; không khóa zoom/scroll toàn tài liệu. Chỉ vùng canvas/joystick xử lý cử chỉ riêng.
- HUD gọn: actor hiện tại, sức khỏe/sức bền, tổ đang chọn, mục tiêu, triều/độ sâu/cảnh báo, nhãn lưu; cảnh báo đạn ít/cứu người quan trọng hơn hạt lửa. Chỉ gắn tên quân khi chọn/gần, roster đầy đủ ở map.
- Lúc takeover hiển thị “Nhân vật bị thương — [sĩ quan] tiếp quản”, giữ pause/map accessible. Menu kết quả/thoát/chơi lại không bị canvas capture chuột; focus đúng và có keyboard path.

## 8. Tiêu chí chương mẫu hoàn tất sau triển khai

| ID | Cách kiểm tra |
|---|---|
| CH01 | Chơi tự nhiên một lượt thắng 15–25 phút mục tiêu; ghi sim time và wall time, seed, thiết bị, sự kiện; nếu nhanh/chậm thì điều chỉnh config có version. |
| CH02 | Ba đường thua: transport vượt tuyến, hết dự bị, quá deadline; kết quả/nút retry/về trại thao tác được. |
| CH03 | Rút chủ động có quân chết/wounded/cargo lost; retry giữ đúng mọi tổn thất, không nhận thưởng hai lần. |
| CH04 | Bốn lựa chọn nhân vật đều vào được chương, ba người kia AI; lái/map/đổ bộ/takeover không mất điều khiển. |
| CH05 | Thuyền nhẹ/nặng qua cùng cọc khác kết quả theo draft; cứu mắc/sửa/dập lửa hoạt động, không damage mỗi frame. |
| CH06 | Bắn/boarding/rơi nước/parry/counter có đường chơi thật; AI tuân lệnh và ngưỡng rút, không thấy xuyên fog. |
| CH07 | Đường tiếp tế bị chặn không sinh đạn vô hạn; kho/chuyển cargo/cứu thương/khôi phục đúng journal. |
| CH08 | Reload giữa đạn/job/cứu người, pause/map, WebGL loss, UID đổi và storage error; không nhân đôi người/đồ. |
| CH09 | Mobile 320/360/375/390/430px, desktop, landscape và long text; bắt đầu → chơi → kết quả → retry. Máy thật kiểm tra riêng. |
| CH10 | Sử liệu/tái dựng có nhãn, mọi asset có giấy phép; hồi quy game cũ và các trang liên quan không có lỗi mới. |

Không đánh dấu hoàn tất CH01 bằng lệnh console tạo chiến thắng. Các test còn chưa chạy; giai đoạn này bàn giao kịch bản có thể triển khai và kiểm tra.
