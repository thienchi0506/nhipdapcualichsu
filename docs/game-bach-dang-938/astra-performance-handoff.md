# Gói tái hiện nút thắt để chuyển Astra

03/11/2026, game mới, chưa đạt gate CPU/tải ổn định. [Báo cáo đầy đủ](optimization-handoff.md). Không cần tài khoản hoặc dữ liệu production.

## Chạy

Từ gốc repo chạy HTTP local theo README. Mở `game-bach-dang-938/tests/performance.html`, trong DevTools gọi:

```js
const result = await window.runVisualBenchmark(480, 30);
console.table(result.phases);
console.log(result.totalPeople, result.uniqueIds, result.ticks, result.backlogMs);
```

Đây là 480 ta +480 địch thực, ID riêng, trong hành lang có giao chiến; không phải mô hình trang trí. Fixture không lưu, không kết nối Firebase; tự dispose cuối lượt. Lặp 50/100/200/400/480, giữ cùng cấu hình và thời gian, chờ máy ổn định giữa lượt. Mở lại trang để đo cold riêng. `window.benchmarkOwnership()` phải về 0 sau lượt.

Công cụ tự động và dữ liệu tại `evidence/perf-2026-11-03/`: `measure.py`, `paired_stress.py`, `paired_load.py`, `equivalence.py`, các JSON trước/sau và ảnh. Máy cần Chrome + Python + websocket-client như hướng dẫn kiểm tra đang có. `paired_stress.py` tự xuất HEAD bằng git archive vào thư mục tạm, chạy server 8766 và dọn sau thử; server working copy 8765 phải chạy sẵn.

## Hiện tượng cần giải

- Trong cặp ít backlog hơn: AI p95 **30,3 → 28,2ms**, max **49,1 → 60,4ms**. Frame p95 gần như giữ nguyên **24,9 → 25,0ms**, đợt chậm max tăng **50,1 → 66,6ms**. CPU mục tiêu trong đặc tả là 8ms/tick, nên chưa đạt. Render submission cũng chưa cải thiện ổn định dù draw calls giảm 225→182.
- Lượt cuối trên máy chịu tải: AI p95 45,1ms, frame max 299,9ms ở 480 mỗi bên. Có lượt bản gốc chỉ xử lý 64 tick/8s, còn 6,17s backlog. Không bỏ những mẫu này hoặc cắt tick để đạt FPS.
- Tải cold/warm thay đổi mạnh: bộ trước 345ms/149ms trung vị warm; lượt cuối 2.594ms/788ms. Thử song song fetch/import không chứng minh lợi ích nên đã rút. Tài nguyên engine không đổi; cần tách đọc/parse/module, shader/WebGL compile, dựng scene và áp lực bộ nhớ. Lúc kiểm tra hệ thống còn khoảng 1,27 GiB RAM vật lý trống. Không tự tắt ứng dụng người dùng hoặc suy ra thông số Internet từ localhost.

## Hướng phân tích

1. Profile AI/formation separation và perception ở đám đông; đếm ứng viên/ô và allocation/GC. Spatial buckets đang dùng lại, query xa duyệt ô có người. Có thể cần hai cấp grid cho separation/vision; giữ thứ tự tie-break và vòng perception theo tick.
2. Profile path riêng khi thực sự có đường chờ; số p95 nhỏ của cả tick có nhiều lần không tìm đường. A* có budget 3/tick, không đổi kết quả vì quality.
3. CPU profiler + tracing quanh load/createScene/renderer.compile; đo shader/driver và frame time trên GPU thật. Đừng chuyển A* sang worker nếu AI hoặc driver mới là bottleneck.
4. Bộ đo hiện có chỉ tách `stepArmyAI`, path, combat, logistics, encounter và render; HUD/IndexedDB ở route thực cần profile bổ sung trước khi tối ưu chúng. Fixture hiệu năng không bật lưu nên không dùng nó chứng minh I/O lưu đã đạt ngân sách.

## Ràng buộc nghiệm thu

- So `equivalence-before.json` với kết quả mới: 40 mốc hash của toàn bộ roster hai phe, path, event và snapshot phải khớp hoặc giải thích/duyệt thay đổi luật riêng. Không đổi schema/config save để né kiểm tra.
- Giữ số quân và trạng thái qua chuyển mức render, đủ 400/480. Không bỏ projectile/damage hoặc thương vong khi frame chậm.
- Giữ các sửa camera, panel mobile, lưu theo UID và journal/retry; chạy core/lưu/UI liên quan sau thay đổi.
- Không sửa game cũ, phòng thi, kiến thức, Auth, Rules production; không triển khai hoặc bật thanh toán.
- Báo p50/p95/p99/max, số frame >50ms, backlog và số tick thực. So cả các lượt chậm, không chỉ lượt tốt nhất. Chỉ kết luận FPS/latency trên thiết bị đã đo.
