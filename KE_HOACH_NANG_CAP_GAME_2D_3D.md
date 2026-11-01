# Kịch bản nâng cấp toàn diện hai sa bàn 2D/3D

## 1. Mục tiêu sản phẩm

Nâng cấp các trận Bạch Đằng và Như Nguyệt thành hai trải nghiệm chiến thuật lịch sử có hình ảnh giàu chiều sâu, điều khiển dễ hiểu, chiến thuật có hậu quả rõ ràng và chạy ổn định trên laptop/PC phổ thông. Giữ lối chơi, nội dung học tập và quyền khóa sa bàn trên điện thoại như hiện tại; không đưa thêm nội dung lịch sử chưa kiểm chứng vào lời dẫn hoặc nhiệm vụ.

Mục tiêu hình ảnh là một game web chỉn chu, có bản sắc và giàu không khí; không cam kết mô phỏng ngang game thương mại AAA. Chất lượng cần đến từ bố cục, ánh sáng, chuyển động, âm thanh và phản hồi chiến đấu được phối hợp tốt, đồng thời phải có mức đồ họa phù hợp phần cứng.

## 2. Hiện trạng mã nguồn đã rà

- `sa-ban.html` chứa sa bàn 2D và nhiều nhánh Bạch Đằng/Như Nguyệt. Canvas chính của một nhánh được đặt ở 1000×560; cần tiếp tục đo mọi nhánh vì trang có nhiều vòng lặp/hiệu ứng độc lập.
- `sa-ban-3d.html` khởi tạo Three.js, đặt giới hạn pixel ratio 1.5, bật khử răng cưa, PCF soft shadows, tone mapping, địa hình, nước, bãi cọc dùng `InstancedMesh`, hạt và các đơn vị 3D.
- Vòng `renderLoop3D()` đang cập nhật từng đỉnh mặt nước, từng vị trí hạt, ánh đèn lửa, thủy triều và nhiều hiệu ứng khác trước mỗi lần render. Đây là nơi cần đo trước để biết chi phí CPU/GPU, không nên mặc định rằng chỉ giảm hạt là hết giật.
- Mã gameplay, giao diện, hiệu ứng và dữ liệu hiện nằm trong các tệp HTML lớn. Vì vậy, kế hoạch yêu cầu chia logic theo mô-đun nhỏ có thể thay dần, không viết lại toàn bộ trang trong một lần.
- Nhật ký hiện có xác nhận đã sửa một số lỗi khởi tạo/điều kiện thắng; các kiểm tra đó không chứng minh toàn bộ trận đã được chơi tay hoặc hiệu năng đã đạt mục tiêu. Cần chạy lại hồi quy ở từng đợt.

## 3. Trải nghiệm đích và kịch bản trận

### 3.1 Bạch Đằng 938

**Mạch cảm xúc:** chuẩn bị kín đáo → thăm dò và nhử địch → nước lên che bãi cọc → thời điểm thủy triều đổi chiều → lộ chướng ngại → phối hợp quân mai phục → kết trận và giải thích quyết định.

1. Mở trận bằng bản đồ có hướng dòng chảy, bờ sông, các nhánh nước, khu vực cọc dự kiến và vị trí các lực lượng. Dùng chú giải để phân biệt địa hình đã biết với vùng thông tin chưa rõ.
2. Cho người chơi phân công trinh sát, bố trí thuyền nhẹ và chọn thời điểm giao chiến. Mỗi mệnh lệnh hiện vùng tác động, thời gian dự kiến và rủi ro.
3. Trong giai đoạn nước cao, bãi cọc không hiện như vật thể lộ thiên; chỉ có dấu hiệu mặt nước và thông tin tình báo thích hợp. Không để người chơi nhìn thấy trước toàn bộ bố trí nếu kịch bản đang yêu cầu giữ bí mật.
4. Khi triều đổi, thay đổi mực nước theo thời gian có kiểm soát, bãi cọc hiện dần theo từng vùng. Tàu tiếp xúc có phản hồi phân biệt: lệch hướng, giảm tốc, hư hại hoặc mắc kẹt theo điều kiện; tránh một va chạm duy nhất gây chìm tức thì nếu không có căn cứ gameplay.
5. Tạo cửa sổ cho quân mai phục đánh vào sườn/đoạn đội hình bị rối. Địch phản ứng theo tầm nhìn, sĩ khí, tình trạng tàu và lệnh chỉ huy; không tự chạy vào cọc theo đường thẳng.
6. Sau trận, bảng tổng kết giải thích yếu tố nào của kế hoạch có tác dụng, tổn thất, mệnh lệnh chậm và phần nào là tái dựng để phục vụ gameplay.

**Ranh giới lịch sử:** Bảo tàng Lịch sử Quốc gia mô tả kế nghi binh, thuyền nhẹ dụ địch và trận địa cọc gắn với thủy triều; vị trí, mật độ cọc, địa hình chính xác theo từng thời điểm và các chi tiết hoạt họa phải ghi là tái dựng nếu không có nguồn xác nhận. Không sao chép bố trí của trận Bạch Đằng 1288 sang năm 938. [Bảo tàng Lịch sử Quốc gia – Ngô Quyền và chiến thắng Bạch Đằng năm 938](https://baotanglichsu.vn/vi/Articles/3098/13934/ngo-quyen-va-chien-thang-bach-djang-nam-938.html), [Trận địa cọc Bạch Đằng](https://baotanglichsu.vn/vi/Articles/2001/66475/tran-djia-coc-bach-djang.html)

### 3.2 Phòng tuyến Như Nguyệt 1077

**Mạch cảm xúc:** dựng và giữ tuyến phòng thủ → trinh sát ý đồ vượt sông → chống các đợt tiến công → bảo toàn lực lượng → phản công đúng thời cơ → đánh giá quyết sách.

1. Dựng sơ đồ hai bờ sông, tuyến phòng thủ, khu vực bến vượt và hậu cần. Bản đồ cần cho thấy chiều dài tuyến bằng ký hiệu dễ đọc, không biến sơ đồ chiến dịch thành bản đồ địa lý có độ chính xác giả.
2. Cho phép điều quân theo phân khu: giữ bờ, dự bị cơ động, trinh sát, tiếp tế và bảo vệ điểm vượt. Thêm trạng thái mệt mỏi, sĩ khí, quân số và độ sẵn sàng của từng đơn vị.
3. Địch thử nhiều cách vượt và có thể đổi hướng sau khi bị chặn. Người chơi quan sát dấu hiệu trinh sát, tập kết, cầu/phương tiện vượt sông và phải quyết định giữ quân dự bị hay tung ra.
4. Từng đợt đánh tác động đến sĩ khí, thương vong, tiếp tế và độ vững của tuyến; không giải quyết bằng thanh máu duy nhất. Hiển thị rõ vì sao một điểm bị xuyên thủng hoặc giữ được.
5. Cửa sổ phản công phụ thuộc vào tình hình chiến trường, không chỉ một phím tuyệt kỹ. Sau chiến thắng, phần tổng kết phân biệt dữ kiện sử liệu với cách mô hình hóa lệnh và thời gian trong game.

**Ranh giới lịch sử:** Nguồn Bảo tàng Lịch sử Quốc gia nêu phòng tuyến bờ nam sông Cầu/Như Nguyệt, các đợt tiến công và cuộc phản công; quy mô chính xác, tọa độ, lời thoại, trang bị chi tiết hoặc trình tự phút-giờ cần đối chiếu thêm, không tự trình bày như sự thật chắc chắn. [Bảo tàng Lịch sử Quốc gia – Lý Thường Kiệt và phòng tuyến Như Nguyệt](https://baotanglichsu.vn/vi/Articles/2001/65720/ly-thuong-kiet-noi-kinh-hoang-cua-quan-tong.html), [Sơ đồ phản công trên phòng tuyến](https://baotanglichsu.vn/VI/Articles/3098/16192/ly-thuong-kiet-nguoi-chi-huy-kiet-xuat-cua-cuoc-khang-chien-chong-quan-tong-lan-thu-hai.html)

## 4. Nâng cấp hình ảnh theo lớp

### 4.1 Bản 2D

1. **Bản đồ nền:** chia lớp nước, bờ, bãi bùn, lau sậy, rừng xa, công trình và lớp sương; giữ lưới tọa độ/định hướng kín đáo để hỗ trợ chiến thuật. Dùng seed cố định để chi tiết trang trí không nhảy vị trí mỗi lần render.
2. **Độ sâu:** tạo parallax rất nhẹ cho mây/sương/bờ xa; không di chuyển lớp nền chiến thuật làm sai vị trí đơn vị.
3. **Nước:** vẽ dải sáng theo hướng sóng, gợn nước quanh thuyền, vệt sóng phía đuôi và bọt va chạm. Dùng một lớp phủ có chu kỳ thay đổi theo thời gian; tránh vẽ hàng nghìn đường cong mới mỗi khung hình.
4. **Đơn vị:** dùng sprite sheet hoặc vector nhiều hướng; phân cấp kích thước theo vai trò. Chuyển động gồm nghiêng thân thuyền, chèo, cờ bay, bước chân, khiên/giáo và tư thế bị đánh. Không dùng nhấp nháy liên tục gây mỏi mắt.
5. **Bóng:** bóng thuyền mềm, lệch theo hướng sáng; bóng đơn vị mặt đất tiếp xúc chân; bóng khói/lửa mờ hơn. Vẽ lên lớp bóng riêng, giới hạn số lần blur và dùng cache cho bóng tĩnh.
6. **Đòn đánh:** cung tên/đạn đá có đường bay đọc được, va chạm có tia lửa/mảnh gỗ/bọt nước theo loại vật thể; thông tin sát thương hiện ngắn rồi tự tan. Phản hồi màu không được che quân hoặc chữ.
7. **Thời tiết:** mưa, sương, bụi, khói theo lớp trước/sau đơn vị. Số hạt giảm theo chất lượng; hiệu ứng gameplay như tầm nhìn phải được tính riêng với lớp trang trí.
8. **Giao diện:** vòng chọn quân, hướng di chuyển, tầm bắn, vùng nguy hiểm, mục tiêu và trạng thái lệnh có màu + biểu tượng + chữ, không chỉ dựa vào màu. Bản đồ nhỏ có nút phóng to và giữ khả năng thao tác bằng chuột.
9. **Chuyển cảnh:** dùng fade, pan camera giả lập và tiêu đề hồi; không chặn điều khiển quá lâu bằng hoạt cảnh mở đầu.
10. **Âm thanh đồng bộ:** tiếng nước, mái chèo, trống/lệnh, va chạm theo khoảng cách; giới hạn âm thanh lặp, có thanh âm lượng và tắt tiếng.

### 4.2 Bản 3D

1. **Ngôn ngữ tạo hình:** thống nhất chất liệu gỗ, vải, đồng, bùn, đá, nước và khói. Bảng màu phân biệt phe, mục tiêu và địa hình nhưng vẫn giữ tông lịch sử.
2. **Địa hình:** nâng cấp bờ sông, ghềnh/bãi, lau sậy, cây và doanh trại bằng cụm mô-đun tái sử dụng. Đặt silhouette rõ ở khoảng cách xa; chi tiết nhỏ không được làm rối bản đồ.
3. **Thuyền:** thân, boong, mái chèo, cột buồm, cờ, khoang và hư hại có mức LOD. Chuyển động nổi bám mặt nước; nghiêng do cua/quay có giới hạn, tránh rung giật.
4. **Bãi cọc:** dùng instance cho cọc lặp; hoạt ảnh lộ cọc theo mực nước, không tạo/hủy mesh liên tục. Cọc gây va chạm theo vùng gameplay, mặt nạ nhìn và vùng va chạm phải khớp nhau.
5. **Nhân vật/đơn vị:** thêm chuyển động đứng chờ, chạy/chèo, ngắm, đánh, bị trúng đòn, hoảng loạn và đầu hàng. Khi chưa có rig nhân vật hoàn chỉnh, dùng animation đơn giản có nhịp tự nhiên thay vì để mô hình đứng bất động.
6. **Ánh sáng và bóng:** key light tạo hướng nắng/trăng, fill light giữ chi tiết trong vùng tối, ambient occlusion nhẹ nếu hiệu năng cho phép. Bóng ưu tiên thuyền, công trình và đơn vị gần camera; tắt hoặc giảm ở chế độ tiết kiệm. Chống bóng răng cưa, kiểm tra shadow acne và bóng xuyên mặt nước.
7. **Nước:** gợn bằng shader hoặc cập nhật vertex theo vùng cần thiết; thêm sóng đuôi, vòng lan khi vật thể chạm nước, phản xạ giả lập nhẹ. Không chạy cập nhật đỉnh toàn mặt nước dày đặc nếu shader có thể làm rẻ hơn.
8. **VFX:** dùng pool cho lửa, khói, bọt, mảnh vỡ và tia va chạm; đặt tuổi thọ, giới hạn số lượng, kích thước theo khoảng cách. Tránh tạo material/geometry mới mỗi lần bắn.
9. **Camera:** thêm preset toàn cảnh, chiến thuật và theo mục tiêu; có easing, giới hạn khu vực, zoom, pan và nút về vị trí mặc định. Không tự xoay camera khi người chơi đang ngắm/ra lệnh.
10. **Chi tiết môi trường:** cờ phản ứng gió, đèn/lửa nhấp nháy không đồng pha, khói bị gió cuốn, sương phân tầng, lá/cỏ chuyển động nhỏ. Các chi tiết này có thể tắt độc lập khi giảm chất lượng.
11. **Bảng chiến thuật:** chọn quân bằng raycast có vùng bắt ổn định; chỉ hiện nhãn khi cần, tránh dựng quá nhiều DOM 3D/text mesh. Minimap hỗ trợ chọn điểm di chuyển và đồng bộ camera.
12. **Âm thanh không gian:** pan trái-phải và giảm âm lượng theo khoảng cách; âm thanh lệnh phải ưu tiên nghe rõ. Giới hạn số nguồn Web Audio đồng thời.

## 5. Cơ chế chiến thuật cần nâng cấp

### Lệnh và điều khiển

- Chọn một đơn vị, nhóm bằng phím, chọn nhiều bằng khung; thao tác luôn có trạng thái chọn rõ.
- Lệnh di chuyển, giữ vị trí, tấn công mục tiêu, rút lui, bảo vệ, trinh sát và tập hợp. Mỗi lệnh phải phản hồi ngay bằng biểu tượng/đường lệnh và thông báo nếu không thể thực hiện.
- Lệnh mới thay lệnh cũ có quy tắc; lệnh theo hàng đợi được thể hiện riêng. Tránh click không rõ là chọn, di chuyển hay bắn.
- Cài đặt độ nhạy, phím tắt, âm lượng, chất lượng đồ họa, rung màn hình và tốc độ mô phỏng; lưu cục bộ.

### Đơn vị, chiến đấu và AI

- Thống nhất cấu trúc đơn vị: quân số/HP, giáp, tầm nhìn, tầm đánh, tốc độ, sĩ khí, mệt mỏi, trạng thái, mục tiêu và thời gian hồi chiêu.
- Tính sát thương theo vũ khí, hướng, cự ly, địa hình, trạng thái và giáp; tránh xác suất không giới hạn khiến đơn vị đánh mãi không hạ được.
- Mô hình AI theo máy trạng thái hữu hạn hoặc utility đơn giản: giữ đội hình, tìm mục tiêu, đánh, né chướng ngại, rút lui, đầu hàng. Có cooldown tái quyết định để giảm CPU.
- Đường đi tránh vật cản có giới hạn tính toán. Nếu không tìm được đường, đơn vị dừng, báo lý do và thử lại có giãn thời gian; không lặp tìm đường mỗi frame.
- Đội hình giữ khoảng cách, không chồng mesh; va chạm nhẹ có ngưỡng và không tạo vòng đẩy qua lại vô hạn.
- Sĩ khí chịu ảnh hưởng bởi tổn thất, tướng, bao vây, bị tập kích, tiếp tế và chiến thắng gần đó. Trạng thái đầu hàng phải có hoạt ảnh/thông báo và được loại khỏi điều kiện tiếp tục chiến đấu theo quy tắc thống nhất.
- Điều kiện thắng/thua là một bộ quy tắc dùng chung cho HUD, AI, hoạt cảnh và bảng điểm. Bảo đảm không thể mắc kẹt vì tàu còn sống ngoài vùng, đối tượng vô hình, callback bị gọi hai lần hoặc cờ trạng thái lệch.
- Địch có cấp độ khó: dễ báo trước, chuẩn phối hợp cơ bản, khó trinh sát và phản ứng tốt hơn nhưng không gian lận tầm nhìn/tài nguyên.

### Chiến thuật riêng từng trận

- **Bạch Đằng:** triều là đồng hồ chiến thuật, không phải hiệu ứng nền; thuyền nhẹ làm nhiệm vụ nghi binh có rủi ro; bãi cọc tạo vùng nguy hiểm dựa vào mực nước; cánh mai phục cần thời điểm/đường tiếp cận; AI địch có thể nghi ngờ hoặc đổi đội hình.
- **Như Nguyệt:** tuyến phòng thủ chia phân khu; đội dự bị cơ động; trinh sát phát hiện hướng vượt; tiếp tế và sĩ khí giới hạn khả năng giữ trận; người chơi có thể gia cố, điều quân, nghi binh hoặc phản công khi có cửa sổ hợp lý.
- Mỗi cơ chế có hướng dẫn ngắn, bản đồ chú giải và mục “lịch sử / tái dựng gameplay” sau trận để biến quyết định thành hoạt động học tập.

## 6. Kế hoạch giảm giật lag và tối ưu

### Đo trước khi sửa

1. Tạo kịch bản benchmark cố định: sảnh, trận ít quân, trận đông quân, nhiều hiệu ứng, camera nhìn toàn cảnh và camera cận.
2. Đo bằng `performance.now()`, Chrome Performance/Memory/GPU và DevTools FPS; ghi median, p95 frame time, số draw calls, số mesh, số hạt, heap sau 10 phút và sau đổi cảnh.
3. Lập baseline trên tối thiểu máy cấu hình thấp, laptop tầm trung và PC; ghi GPU, trình duyệt, độ phân giải và chế độ nguồn điện.
4. Gắn nhãn theo nguyên nhân: CPU JavaScript, GPU/shader, tải tài nguyên, garbage collection, mạng/CDN hay lỗi logic. Không tối ưu dựa trên cảm giác đơn lẻ.

### Ngân sách mục tiêu

- Mục tiêu 60 FPS ở máy tầm trung nếu cấu hình cho phép; không để frame time p95 vượt 33 ms trong giao tranh chuẩn.
- Chế độ tiết kiệm giữ tối thiểu 30 FPS ổn định trên máy yếu; giảm chi tiết trang trí trước, giữ độ rõ mục tiêu và tín hiệu gameplay.
- Thời gian từ bấm bắt đầu đến điều khiển được: mục tiêu dưới 3 giây sau khi tài nguyên cần thiết đã tải; hiện rõ tiến độ khi tải cảnh.
- Bộ nhớ không tăng liên tục qua nhiều lần chơi lại/đổi hồi; sau 10 phút benchmark không có xu hướng tăng heap không thu hồi.

### Việc tối ưu theo thứ tự

1. **Dừng công việc nền:** pause render, particle, âm thanh và timer không thiết yếu khi tab ẩn, cửa sổ game đóng hoặc người chơi ở menu. Khi quay lại, reset delta để không nhảy mô phỏng.
2. **Tách mô phỏng khỏi vẽ:** bước mô phỏng fixed timestep (ví dụ 1/30 hoặc 1/60), render theo requestAnimationFrame; giới hạn delta lớn và số bước bù để tránh spiral of death.
3. **Giảm việc mỗi frame:** cập nhật nước/hạt/đèn theo tần số phù hợp; chỉ đánh dấu buffer cần update khi dữ liệu đổi; dùng shader cho dao động đều; tránh tạo mảng, object, vector và callback mới trong vòng nóng.
4. **Giới hạn hiệu ứng:** object pool, giới hạn hạt, culling theo camera, spawn theo khoảng cách và tuổi thọ. Bỏ qua animation của vật thể xa hoặc ngoài màn hình.
5. **Tối ưu Three.js:** tái sử dụng geometry/material, InstancedMesh cho vật thể lặp, frustum culling, LOD theo khoảng cách, giảm shadow map và pixel ratio theo thiết bị; tránh gọi renderer.setSize mỗi frame.
6. **Tối ưu Canvas 2D:** vẽ nền tĩnh vào offscreen canvas, dirty regions khi phù hợp, dùng sprite sheet/cache, giới hạn shadowBlur, không resize backing store liên tục; đổi DPR theo cấu hình và giới hạn diện tích canvas.
7. **Tải cảnh:** trì hoãn tài nguyên không thuộc hồi hiện tại, preload có giới hạn cho cảnh kế; nén texture/audio, ưu tiên ảnh WebP/AVIF khi phù hợp, đặt kích thước ảnh đúng nhu cầu, không tải mô hình lớn ở sảnh.
8. **Dọn vòng đời:** khi đổi hồi/chơi lại, hủy listener, timer, animation loop, audio node và dispose texture/material/geometry không còn dùng; chỉ có một render loop hoạt động.
9. **Chất lượng thích ứng:** ba preset Thấp/Trung bình/Cao + Tự động. Tự động chỉ điều chỉnh khi FPS suy giảm liên tục, có thời gian hồi, không thay đổi giữa lúc người chơi đang cần đọc chữ.
10. **Tránh đánh đổi vô hình:** không giảm độ phân giải chữ/HUD, không tắt chỉ báo nguy hiểm hoặc giảm độ chính xác va chạm để đạt FPS; có thể giảm hạt, bóng xa, phản xạ và chi tiết cỏ.

## 7. Cấu trúc triển khai để không làm vỡ trang

1. Tạo lớp `GameConfig` chứa chất lượng, giới hạn hiệu ứng và điều khiển.
2. Tách `Simulation` (trạng thái chiến đấu, thời gian, AI) khỏi `Renderer2D`/`Renderer3D`.
3. Tách `BattleRules` dùng chung cho damage, morale, surrender, win/loss và scoring; các màn hình chỉ đọc trạng thái chuẩn.
4. Tạo `EffectsPool` cho projectile, hit, smoke, fire, wake và floating text.
5. Tạo `AssetRegistry` cache geometry/material/texture/audio và hàm dispose theo scene.
6. Tạo bộ chuyển hồi idempotent: gọi lặp không nhân đôi listener/timer/loop; trạng thái loading/ready/playing/paused/won/lost rõ ràng.
7. Thay từng phần trong HTML hiện có, giữ URL, nút, khóa mobile, dữ liệu nhiệm vụ, bảng xếp hạng và lưu trữ hiện tại.
8. Mỗi đợt sửa phải có checklist hồi quy riêng và có thể rollback độc lập; không trộn đại tu gameplay với thay toàn bộ giao diện trong một commit.

## 8. Lộ trình thực hiện và tiêu chí bàn giao

### Đợt A — Đo và ổn định lõi

- Tạo baseline FPS/frame time/heap trên cả 2D và 3D.
- Vẽ sơ đồ trạng thái trận và tìm loop/timer bị nhân đôi.
- Chuẩn hóa bước thời gian, pause khi tab ẩn, dọn khi đổi cảnh.
- Bàn giao: báo cáo số liệu trước/sau và không có sai khác điều kiện thắng/thua.

### Đợt B — Cơ chế chiến thuật

- Hoàn thiện phản hồi chọn quân/lệnh, đội hình, va chạm, tìm đường, damage, sĩ khí, đầu hàng và AI.
- Bổ sung mạch riêng Bạch Đằng và Như Nguyệt như mục 3/5, theo độ khó.
- Bàn giao: chơi trọn từng trận ở ba mức khó; không có mục tiêu bất tử, không thể thắng nhưng vẫn mắc ở trận, hoặc AI lặp vô hạn.

### Đợt C — Nghệ thuật 2D

- Nâng bản đồ, sprite, bóng, nước, hoạt ảnh, VFX và HUD theo 4.1.
- Bàn giao: mọi tín hiệu lệnh/địch/đòn đánh đọc được ở cửa sổ chuẩn và không che điều khiển.

### Đợt D — Nghệ thuật 3D

- Nâng model, vật liệu, ánh sáng, bóng, nước, camera, animation và VFX theo 4.2.
- Bàn giao: cảnh có chiều sâu, bờ/đơn vị phân biệt rõ, bóng không nhấp nháy, không lộ lỗi xuyên vật thể; preset thấp vẫn chơi được.

### Đợt E — Hiệu năng và thiết bị

- Thử máy yếu/trung bình/mạnh, các độ phân giải, đổi tab, đổi hồi, chơi lại, thời gian dài.
- Bàn giao: đạt ngân sách mục 6 hoặc ghi rõ máy/điều kiện chưa đạt và phương án; không khẳng định “hết lag” nếu chưa đo.

### Đợt F — Kiểm thử và phát hành

- Chạy kiểm thử đơn vị cho battle rules; kiểm thử trình duyệt cho khởi tạo, đầu/cuối trận, pause/resume, chuyển cảnh và dọn tài nguyên.
- Chơi tay đủ cả hai trận 2D/3D; kiểm tra nhiều đội hình, kỹ năng, AI, thắng, thua, rút lui và chơi lại.
- Đối chiếu nội dung lịch sử, rà console/network, kiểm tra desktop; điện thoại vẫn hiện thông báo khóa như yêu cầu.
- Chỉ phát hành khi không có lỗi chặn trận, hiệu năng đạt ngưỡng đã công bố và đường lui phiên bản sẵn sàng.

## 9. Danh sách kiểm tra chi tiết

Đánh dấu mỗi mục theo `Chưa làm / Đang làm / Đạt / Không áp dụng`; mỗi mục `Đạt` phải đính kèm bằng chứng hoặc cách tái hiện.

### A. Hình ảnh, camera và khả năng đọc

- [ ] A01 Bố cục chiến trường 2D có ký hiệu hướng bắc/dòng chảy.
- [ ] A02 Lớp nền 2D phân biệt nước, bờ, bùn, cây và công trình.
- [ ] A03 Lưới chiến thuật bật/tắt được và không lấn át bản đồ.
- [ ] A04 Bãi cọc có trạng thái ẩn/hiện theo điều kiện gameplay.
- [ ] A05 Tầm nhìn chưa khám phá phân biệt với địa hình trống.
- [ ] A06 Sprite từng loại quân có silhouette riêng.
- [ ] A07 Hướng sprite khớp hướng di chuyển/đánh.
- [ ] A08 Hoạt ảnh chờ không đồng bộ máy móc giữa các đơn vị.
- [ ] A09 Chuyển động thuyền có nhịp nổi và nghiêng hợp lý.
- [ ] A10 Bóng đơn vị tiếp xúc đúng mặt đất/mặt nước.
- [ ] A11 Bóng mềm không dùng blur nặng cho toàn bộ đối tượng.
- [ ] A12 Màu phe thân thiện với người khó phân biệt màu.
- [ ] A13 Chữ, thanh máu và nhãn đọc được ở 100% và 125% zoom.
- [ ] A14 Thông tin không chỉ biểu thị bằng màu.
- [ ] A15 HUD không che vùng chiến đấu hoặc nút điều khiển.
- [ ] A16 Minimap có phân biệt quân, mục tiêu, chướng ngại.
- [ ] A17 Camera có giới hạn và không xuyên địa hình.
- [ ] A18 Chuyển camera có easing và có thể dừng.
- [ ] A19 Cảnh mở đầu có nút bỏ qua.
- [ ] A20 Hiệu ứng chiến thắng/thất bại không chặn nút tiếp tục.

### B. VFX, âm thanh và phản hồi

- [ ] B01 Nước có chuyển động nhẹ nhưng không làm lệch đọc hướng.
- [ ] B02 Wake đi theo thuyền và tự tắt sau thời gian định sẵn.
- [ ] B03 Va chạm gỗ, đá, đất và nước có hiệu ứng riêng.
- [ ] B04 Khói/lửa có hướng gió nhất quán.
- [ ] B05 Hạt không sinh vô hạn và được pool tái sử dụng.
- [ ] B06 Hiệu ứng xa giảm chi tiết.
- [ ] B07 Tắt rung màn hình độc lập.
- [ ] B08 Tắt hiệu ứng nhấp nháy độc lập.
- [ ] B09 Chế độ giảm chuyển động tôn trọng hệ điều hành.
- [ ] B10 Âm thanh đòn đánh phát đúng lúc va chạm.
- [ ] B11 Giọng đọc dừng/tiếp tục đúng khi đổi màn hoặc tạm dừng.
- [ ] B12 Không phát chồng vô hạn cùng một âm thanh.
- [ ] B13 Âm lượng nhạc, hiệu ứng, giọng đọc tách riêng.
- [ ] B14 Phản hồi mệnh lệnh xuất hiện trong thời gian ngắn.
- [ ] B15 Sát thương/đầu hàng có biểu tượng và chữ dễ hiểu.

### C. Điều khiển và chiến thuật

- [ ] C01 Chọn đơn vị bằng click chính xác.
- [ ] C02 Chọn nhiều bằng khung hoạt động ổn định.
- [ ] C03 Nhóm phím tắt có hướng dẫn trong game.
- [ ] C04 Click phải/nhấn mục tiêu có quy tắc nhất quán.
- [ ] C05 Lệnh hiển thị điểm đến và đường đi dự kiến.
- [ ] C06 Lệnh không hợp lệ giải thích được lý do.
- [ ] C07 Queue lệnh phân biệt với lệnh tức thời.
- [ ] C08 Đội hình duy trì khoảng cách.
- [ ] C09 Đơn vị không chồng lấn vĩnh viễn ở điểm hẹp.
- [ ] C10 Tìm đường có giới hạn thời gian tính toán.
- [ ] C11 Đơn vị mắc kẹt tự báo hoặc tìm đường lại có giãn cách.
- [ ] C12 Quân tầm xa kiểm tra tầm và vật cản.
- [ ] C13 Cận chiến thể hiện hướng đối diện.
- [ ] C14 Sát thương không âm, vô hạn hoặc bỏ qua trạng thái chết.
- [ ] C15 Thanh HP luôn đồng bộ với dữ liệu mô phỏng.
- [ ] C16 Sĩ khí ảnh hưởng đúng vào hành vi.
- [ ] C17 Đầu hàng dừng hành vi tấn công.
- [ ] C18 Tàu chìm/đơn vị bị hạ được gỡ khỏi chọn mục tiêu.
- [ ] C19 Tuyệt kỹ có cooldown, chi phí và phản hồi rõ.
- [ ] C20 AI không biết mục tiêu ngoài tầm nhìn nếu chưa bị phát hiện.
- [ ] C21 AI giữ mục tiêu và đổi mục tiêu có quy tắc.
- [ ] C22 AI tránh vùng nguy hiểm đã biết.
- [ ] C23 AI có hành vi khác nhau giữa dễ/chuẩn/khó.
- [ ] C24 Địch không tự tăng máu hoặc bất tử do lỗi timer.
- [ ] C25 Tình trạng không thể thắng được phát hiện và có giải pháp.
- [ ] C26 Điều kiện thắng kiểm cả chết, đầu hàng và rút lui.
- [ ] C27 Điều kiện thua có cơ hội tiếp tục/chơi lại phù hợp.
- [ ] C28 Bảng điểm dựa vào trạng thái thật của trận.
- [ ] C29 Như Nguyệt có phân khu tuyến phòng thủ.
- [ ] C30 Bạch Đằng có cơ chế triều/cọc tương tác nhất quán.

### D. Hiệu năng, tài nguyên và độ bền

- [ ] D01 Có số đo baseline FPS và frame time cho 2D.
- [ ] D02 Có số đo baseline FPS và frame time cho 3D.
- [ ] D03 Đo được p50/p95 thay vì chỉ nhìn FPS tức thời.
- [ ] D04 Ghi rõ cấu hình máy và trình duyệt khi benchmark.
- [ ] D05 Tab ẩn không tiếp tục render liên tục.
- [ ] D06 Khi quay lại tab, thời gian mô phỏng không nhảy vọt.
- [ ] D07 Không có hơn một render loop cho mỗi scene.
- [ ] D08 Chơi lại không nhân thêm event listener.
- [ ] D09 Chuyển hồi không để interval cũ chạy.
- [ ] D10 Dùng object pool cho projectile/VFX.
- [ ] D11 Cache geometry/material/texture dùng chung.
- [ ] D12 Dispose tài nguyên theo vòng đời scene.
- [ ] D13 Không tạo material mới mỗi lần bắn.
- [ ] D14 Nước không upload vertex buffer lớn không cần thiết mỗi frame.
- [ ] D15 Particle có giới hạn theo preset.
- [ ] D16 Vật ngoài camera không chạy animation nặng.
- [ ] D17 LOD dùng cho đối tượng xa.
- [ ] D18 Shadow map có preset và kích thước hợp lý.
- [ ] D19 Pixel ratio có mức trần theo thiết bị.
- [ ] D20 Canvas 2D không resize backing store mỗi frame.
- [ ] D21 Nền tĩnh được cache khi phù hợp.
- [ ] D22 ShadowBlur được giới hạn và đo.
- [ ] D23 Tải mô hình/ảnh/âm thanh theo hồi cần dùng.
- [ ] D24 Hiển thị trạng thái tải thay cho màn hình đen.
- [ ] D25 Mất WebGL có thông báo và phương án 2D/fallback thích hợp.
- [ ] D26 Mất mạng/CDN không làm hỏng giao diện hoặc mắc kẹt vô tận.
- [ ] D27 Heap được đo trước/sau nhiều lượt chơi lại.
- [ ] D28 Không tăng heap liên tục qua 10 phút benchmark.
- [ ] D29 Chế độ tiết kiệm giữ tín hiệu chiến thuật quan trọng.
- [ ] D30 Đạt ngưỡng frame time đã thống nhất trên máy mục tiêu.

### E. Lịch sử, hồi quy và bàn giao

- [ ] E01 Mỗi tuyên bố lịch sử trong lời dẫn có nguồn.
- [ ] E02 Chi tiết tái dựng được ghi nhãn rõ.
- [ ] E03 Không lấy tư liệu Bạch Đằng 1288 làm bằng chứng cho 938.
- [ ] E04 Sơ đồ Như Nguyệt phân biệt dữ kiện và minh họa.
- [ ] E05 Không tự thêm nhân vật/sự kiện thành dữ kiện thật.
- [ ] E06 Bạch Đằng chơi trọn từ chuẩn bị đến hậu chiến.
- [ ] E07 Như Nguyệt chơi trọn từ phòng thủ đến kết trận.
- [ ] E08 Thử thắng ở mỗi trận.
- [ ] E09 Thử thua ở mỗi trận.
- [ ] E10 Thử rút lui/chơi lại.
- [ ] E11 Thử mọi tuyệt kỹ ít nhất một lần.
- [ ] E12 Thử trạng thái đầu hàng và HP bằng 0.
- [ ] E13 Thử chuyển hồi nhiều lần liên tiếp.
- [ ] E14 Thử tab ẩn/hiện trong trận.
- [ ] E15 Thử thay đổi kích thước cửa sổ.
- [ ] E16 Thử tải lại trang giữa lúc tải và sau khi vào trận.
- [ ] E17 Không có lỗi console gây dừng trận.
- [ ] E18 Không còn liên kết/tài nguyên bắt buộc bị thiếu.
- [ ] E19 Khóa mobile vẫn hoạt động đúng.
- [ ] E20 Có bản rollback và ghi chú thay đổi.

## 10. Thứ tự ưu tiên

1. **P0 – Không thể chơi:** màn đen, loop dừng, lệnh không nhận, không thể thắng/thua, lỗi JavaScript, tải vô hạn.
2. **P1 – Tính công bằng và rõ ràng:** HP/sát thương, đầu hàng, đường đi, AI, tín hiệu mục tiêu, chuyển cảnh.
3. **P2 – Giật lag:** đo baseline, fixed-step, vòng lặp, pooling, culling, preset chất lượng.
4. **P3 – Chất lượng hình ảnh:** bản đồ, animation, bóng, nước, camera, VFX, âm thanh.
5. **P4 – Đánh bóng:** chuyển cảnh, tùy biến HUD, thống kê chiến thuật và tư liệu tham khảo.

Không làm P3/P4 trước khi P0/P1 ổn định; cũng không chờ hoàn thiện toàn bộ đồ họa mới sửa lỗi giật lag.

## 11. Quy tắc nghiệm thu

- Ghi lại commit/phiên bản, trình duyệt, máy, độ phân giải, FPS p50/p95, heap và cảnh dùng để đo.
- Với thay đổi gameplay, cung cấp bước tái hiện, kết quả trước/sau và xác nhận điều kiện thắng/thua.
- Với thay đổi hình ảnh, chụp cùng góc camera/cùng cảnh để so sánh và kiểm tra chữ/UI không bị che.
- Với lịch sử, dẫn nguồn và đánh dấu điều còn tranh luận/tái dựng; không lấy độ đẹp làm căn cứ cho độ chính xác.
- Chỉ ghi “đã hết lag” khi benchmark trên các máy mục tiêu chứng minh đạt ngưỡng; nếu chỉ cải thiện một số máy, nói chính xác phạm vi đó.

