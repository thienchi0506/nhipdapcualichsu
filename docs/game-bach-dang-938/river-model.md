# Mô phỏng sông và thuyền — bản thử 1

02/11/2026 · Phạm vi: lớp sông nước của **game mới**. Toàn bộ là tái dựng gameplay, không phải số đo thủy văn/thông số tàu năm 938. Không thay game 2D/3D cũ. Kết quả triển khai/kiểm tra: [river-handoff.md](river-handoff.md).

## Nguồn tham số và dữ liệu

[river-config.json](../../game-bach-dang-938/data/river-config.json), version `bd938-river-lab-1`, là nguồn thực thi duy nhất cho nhịp mô phỏng, kiểu thuyền/tải, trường sông, đáy/cọc, damage, gỡ mắc và sửa. `shell-scene.json` chỉ còn vai trò/đồ họa, không còn bộ tốc độ di chuyển cũ. `core/demo.js` đã được thay bởi `sim/*` và `core/clock.js`.

Hệ tay phải: `+Y` lên, `XZ` mặt sông, m/giây/kg/radian; hướng mũi ban đầu `-Z`. Dòng mặc định xuôi `+Z` có thành phần ngang và xoáy nhỏ theo hàm xác định. Không dùng `Math.random`, giờ hệ thống hoặc FPS trong core.

## Cách tính

| Yếu tố | Đã triển khai | Mức xấp xỉ |
|---|---|---|
| Lực đẩy/quán tính | W/S đặt tốc độ tương đối mong muốn; gia tốc hữu hạn hướng tới mục tiêu, tải nặng đáp ứng chậm. Lực cản dọc/ngang đưa vận tốc dần về dòng khi ngừng chèo. S phanh trước khi lùi. | Mô hình động học có cản tuyến tính, không tính đầy đủ lực sóng/vỏ tàu/chân vịt. |
| Quay | Tốc độ quay có quán tính, phụ thuộc vận tốc qua nước, bánh lái và giới hạn lớp thuyền. Hỏng lái về 0 thì không sinh quyền lái mới; quán tính quay cũ được giảm dần. | Một bậc quay yaw; không tích phân roll/pitch vật lý. |
| Dòng chảy | Trường vector giải tích theo x/z, đổi chiều khi triều lên; thuyền không neo trôi dần theo dòng. | Một trường 2D, không Navier–Stokes, không xoáy tạo bởi từng vật thể. Các thuyền còn lại được neo làm chướng ngại tĩnh. |
| Độ sâu | Đáy lòng sông, bờ dốc và bãi cạn từ cùng config cho sim và mesh. Lấy cao độ đáy cao nhất quanh thân, cả hai đầu, để cảnh báo/mắc cạn. | Lấy mẫu thân dạng capsule theo trục, hai bên và tám hướng ở mỗi đầu; không kiểm tra mọi tam giác render. Bản đồ mẫu có bãi dốc rộng, không rãnh/cạnh đá vài cm. |
| Mớn | `baseDraft + (crew+cargo+flood)/(density*waterplaneArea)`; khối lượng không tải đã nằm trong baseDraft, không cộng hai lần vào phần tăng mớn. | Mặt cắt nổi cố định, nước mẫu 1.000kg/m³; không tái hiện khoang tàu hay độ mặn thực. Mớn là mớn cần để nổi, không là độ lún vào đất khi mắc cạn. |
| Triều | Nội suy tuyến tính các key cùng clock sim. Dùng đường triều từ thiết kế 0→1.500 giây; không dùng bộ đếm 15 giây của game cũ. | Mực nước đồng nhất trong cảnh, không giải hệ cửa sông. Cảnh `ebb` bắt đầu từ giây 420 của cùng đường triều, không tăng tốc đồng hồ. |
| Va cọc | Chỉ kích hoạt khi keel tới tip theo độ xuyên tối thiểu. Sweep các đĩa bao thân qua chuyển động; chuyển động góc được chia bước theo khoảng chạy của điểm thân. Có cả trường hợp triều ép thuyền đứng yên xuống cọc. | Cọc là trụ đứng có radius/tipY; không mô phỏng biến dạng/gãy đàn hồi từng cọc. Thân là capsule bảo thủ, sai khác hình silhouette vài cm. |
| Va bến/thuyền neo | Cùng swept collision, trượt/tán vận tốc theo pháp tuyến. Bờ/bãi cạn chặn theo depth. | Bến và thuyền neo có proxy 2D; chưa có phản lực giữa hai thuyền tự do, chưa AI hạm đội. |
| Hư hại | Năng lượng pháp tuyến `0.5*m*vNormal²/1000` kJ; hệ số/cap trong config. Phân vào hull và bộ phận thứ hai tùy vị trí/góc. Rò thân làm thêm nước/khối lượng/mớn; chèo giảm lực đẩy, lái giảm quay, dây giằng hỏng tăng cản. | Integrity chuẩn hóa; hệ số là balance đề xuất, không số liệu vật liệu lịch sử. Chưa có chìm tàu/di tản người hay hậu quả chiến dịch. |

## Va chạm liên tục và vòng đời tiếp xúc

`sim/collision.js` giải thời điểm giao của đoạn chuyển động một đĩa thân với trụ cọc bằng phương trình bậc hai, không chỉ kiểm tra vị trí cuối frame. Dãy đĩa dọc thân được tăng bán kính vừa đủ để bao khoảng giữa các mẫu. Mỗi tick còn chia nhỏ theo quãng đường tịnh tiến + quay của điểm ngoài thân, tối đa trong config. Bản đồ đáy có bờ/bãi chuyển tiếp rộng, được kiểm tra trong các bước con đó.

Mỗi obstacleId có episode tiếp xúc. Va vào tạo `StakeImpact`/`SolidImpact` **một lần** cho episode; giữ nguyên damage nếu chỉ đang tì/mắc. Hysteresis không gian và cao độ tránh trạng thái ở sát epsilon bị “thoát/rồi mắc lại” mỗi tick. Khi thực sự tách khỏi cọc hoặc được nước nâng lên rồi chạm lại, đó là episode mới và được gây impact mới.

Damage do triều ép vào cọc dùng độ xuyên ở lúc nhập episode; không cộng lại damage cọc theo frame. Nước tiếp tục vào qua lỗ rò là cơ chế khác: tăng `floodKg`, không trừ hull integrity mỗi khung hình. Event ID dựa trên tick/sequence, ledger sự kiện gần nhất có giới hạn và tổng eventCounts phục vụ kiểm tra.

## Gỡ, neo và sửa

- **Neo:** dây neo cân bằng dòng đều trong bản thử, hãm quán tính sẵn có về 0. W/S không thắng được một neo đang giữ. Chưa tính đứt dây/quá tải neo hoặc lực đáy neo thật.
- **Mắc cạn:** thuyền dừng khi vệt thân chạm vùng không đủ nước. Tìm hướng độ sâu tăng để hỗ trợ kéo ra. Nếu mớn lại đủ nhờ giảm tải/bơm/triều lên thì có thể nổi lại tự nhiên.
- **Mắc cọc:** muốn gỡ cần mái chèo còn đủ, độ xuyên nông trong ngưỡng và thời gian chuẩn bị. Sau đó tổ thuyền kê/giằng và kéo lùi chậm, có giới hạn quãng kéo. Keel nâng tạm một lượng giảm theo tải để biểu diễn đòn kê/trợ lực. Vị trí đi liên tục, không teleport; collision vẫn kiểm tra cao độ đáy đã kê. Khi ra khỏi vùng mắc thì hạ lại, không có hiệu ứng miễn nhiễm tồn tại sau đó.
- Phép kê thuyền là **xấp xỉ gameplay rõ ràng**, không lời khẳng định con người có thể nâng tàu lịch sử theo lực đã đo. Kẹt quá sâu hoặc tải lớn vượt lực kê thì nút không tự giải thoát. Cần giảm hàng, bơm, chờ triều phù hợp hoặc chơi lại lượt thử. Nếu thả trôi sau khi gỡ có thể mắc vùng cạn khác; cần neo/đổi hướng.
- **Sửa:** chỉ ở vòng bến sửa, phải neo, đủ chậm và có gỗ. Mỗi job hoàn thành sau thời gian công việc mới trừ gỗ và phục hồi một lượng integrity của bộ phận bị hỏng nặng nhất. Job kết thúc, không tự chi gỗ mãi. Lệnh trùng ID không khởi động/trừ lại. Hủy giữa chừng không phát miễn phí điểm sửa.
- Bơm dùng năng lực hữu hạn, không chắc thắng được rò nặng; khi đang bơm lực chèo giảm. Bỏ hàng giảm cargo thật trong lượt thử, không bỏ quân, không hoàn lại hàng ngay sau thao tác khác.

## Nhịp mô phỏng và render

Core cố định **30Hz**. `core/clock.js` giữ thời gian còn nợ khi frame chậm, không bỏ thời gian như primitive cũ. Bản thử đặt ngân sách tối đa **8 tick/frame** (thay 4 của vỏ) để bài kiểm tra lịch render 5Hz có thể xử lý 6 tick/frame; timestep và luật không đổi. Nếu cực chậm, nợ được giữ và HUD báo mô phỏng chậm, không hứa giữ tốc độ thời gian thực trên mọi thiết bị.

Timestamp RAF đầu tiên có thể cũ hơn thời điểm handler Start/Resume. Scheduler thiết lập mốc từ callback đầu, không truyền elapsed âm vào clock. Pause/ẩn tab dừng RAF và không cộng thời gian nền; resume đặt lại mốc. Menu pause dừng cả triều, trôi, gỡ, sửa/rò; bảng thông tin thuyền chỉ là UI trong lượt đang chạy, **không pause**.

Các bài 5/10/15/30/60/144 là **đưa lịch elapsed khác nhau vào scheduler**, cùng commands gắn tick. Kết quả so bằng tick/vị trí/góc/hậu quả; có bài stall 500ms và tốc độ thử quá mức để phát hiện xuyên cọc. Đây không phải phép đo GPU/FPS thật hay cam kết đạt 144FPS. Khi phần cứng không theo kịp, điều khiển có thể có thêm latency vì nợ sim; không đổi damage để che điều đó.

## Dữ liệu và ranh giới hiện tại

State sông, component damage, hàng/nước, timber, contacts/jobs đều nằm trong session. **Đây là phòng thử mô phỏng; replay khởi tạo lượt mới**, được ghi trong UI. Không có binh sĩ tử trận ở lớp này, không ghi mất mát chiến dịch, không sửa khóa game cũ/Firebase. Event ledger hiện là trong RAM, chưa phải journal IndexedDB bền vững của [thiết kế lưu](save-and-recovery.md). Trước khi ghép vào chương thật có mất mát lâu dài, phải nối các event/transfer/repair vào commit protocol đó.

HUD đọc trạng thái ở 10Hz, không theo từng frame; vì vậy test UI đợi tối đa một nhịp HUD sau event. Có cảnh báo mớn/độ sâu còn lại, vùng cạn theo hướng chuyển động, cọc ngầm, rò, mất lái và việc đang neo. Màu/vòng chỉ trợ giúp; nguy hiểm luôn có chữ. Chất lượng hình ảnh không đi vào công thức sim.
