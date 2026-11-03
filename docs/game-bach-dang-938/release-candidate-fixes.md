# HỒ SƠ BÀN GIAO BƯỚC 13 — SỬA LỖI KIỂM ĐỊNH & CHUẨN BỊ PHÁT HÀNH

> Thực hiện theo yêu cầu BƯỚC 13 (Mô hình: GPT-6 Sol, Mức suy luận: High).
> Ngày hoàn tất: 03/11/2026.
> Quy tắc: Phạm vi thay đổi hẹp, không thêm tính năng mới, không tự đẩy nhánh phát hành hoặc sửa cấu hình production.

---

## 1. Kết quả xử lý các lỗi bắt buộc trong Báo cáo Kiểm định

| Mã lỗi | Mức ưu tiên | Mô tả lỗi | Giải pháp đã áp dụng | Kết quả kiểm tra lại |
|---|---|---|---|---|
| **RC-04** | P1 (Lỗi nền) | Bạch Đằng 2D mở nhầm sau Như Nguyệt: vào Như Nguyệt 2D rồi quay về chọn Bạch Đằng 2D bị giữ `currentStageId = 1` và tiêu đề "SÔNG NHƯ NGUYỆT". | Trong `sa-ban.html:8155` (`vaoThangSaBanChienDau`), bổ sung khôi phục tường minh `currentStageId = 2;`. | `legacy-switch.json`: `afterSelectingBachDang2d` trả về `stage: 2`, `title: "TRẬN ĐỒ NHẬP VAI • Hồi 2: Sa Bàn Bạch Đằng Thực Chiến"` (Đạt 100%). |
| **RC-06** | P2 (Lỗi nền) | Thẻ Chiến dịch 2 Như Nguyệt 3D kích hoạt hàm `chuyenSangChienDichNhuNguyet()` 2 lần do sự kiện click nổi bọt từ button lên article cha. | Thêm `event.stopPropagation()` trên button `#btn-enter-campaign-2` và tham số `e` trong `chuyenSangChienDichNhuNguyet(e)`. | `legacy-switch.json`: `nhuNguyetCallsPerClick: 1` (giảm từ 2 về đúng 1 lần duy nhất). |
| **RC-01** | P1 | Thiếu cơ chế kết toán Thắng lợi (`victory`) và Rút lui chiến thuật (`tactical_retreat`) ở tầng mô phỏng, lưu và UI. Khi diệt hết địch hoặc rút lui, game bị treo ở `phase: 'active'`. | - `encounter.js`: `applyActorDamage` hỗ trợ cả object/id; tự động chuyển `phase = 'victory'` khi toàn bộ quân địch (thủy và bộ) bị tiêu diệt.<br>- `army.js`: tự động chuyển `phase = 'tactical_retreat'` khi các tổ nhận lệnh rút lui an toàn về đích `holding`.<br>- `attempt-resolution.js` & `repository.js`: hỗ trợ ghi nhận kết quả `victory`, `tactical_retreat`, `failed_command` với cơ chế idempotent, chống rollback dữ liệu.<br>- `session.js` & `bootstrap.js`: đồng bộ kết quả, mở hộp thoại kết quả phù hợp cho cả 3 kịch bản. | `requirements-probes.js`: `eliminated.phase: 'victory'`, `remainingActorEnemies: 0`, `remainingSoldierEnemies: 0`. `retreat.missionPhase: 'tactical_retreat'`, `missionResults: [{outcome: 'tactical_retreat', attemptId: 'audit-retreat'}]` (Đạt 100%). |

---

## 2. Kết quả kiểm tra hồi quy

1. **Bộ kiểm tra Core & Save (`verify_current.py`)**:
   - `river-tests`: **47/47** ✅
   - `character-tests`: **45/45** ✅
   - `army-tests`: **37/37** ✅
   - `save-tests`: **49/49** ✅
   - `retry-tests`: **11/11** ✅
   - `session-save-tests`: **8/8** ✅
   - **Tổng cộng: 197/197 đạt 100%**.
   - Probe độc lập:
     * `Independent terminal-state / retreat / save fixture`: ĐẠT.
     * `Homepage does not load the new game`: ĐẠT (0 tài nguyên rò rỉ khi chưa mở).
     * `Repeated start, focus-loss, resize, exit`: ĐẠT (5/5 vòng đời dọn dẹp sạch).
     * `Strict project-prefix entry, rendering and return`: ĐẠT (đường dẫn GitHub Pages hoạt động chuẩn xác).

2. **Cơ chế game cũ (`verify_legacy_mechanics.py`)**:
   - Sa bàn 2D Bạch Đằng: **11/11** ✅
   - Sa bàn 2D Như Nguyệt: **11/11** ✅
   - Sa bàn 3D Bạch Đằng: **17/17** ✅
   - Sa bàn 3D Như Nguyệt: **17/17** ✅
   - **Tổng cộng: 56/56 đạt 100%**.

3. **Chuyển đổi trận cũ (`verify_legacy_switch.py`)**:
   - 1365×900 desktop: ĐẠT.
   - 390×844 mobile: ĐẠT.

---

## 3. Danh sách chính xác các tệp thay đổi

### Tệp thuộc website / game cũ (chỉ sửa lỗi nền tối thiểu):
1. `sa-ban.html`: +1 dòng (gán `currentStageId = 2` trong `vaoThangSaBanChienDau`).
2. `sa-ban-3d.html`: +2 dòng (chặn nổi bọt sự kiện click Như Nguyệt 3D).

### Tệp thuộc game mới (`game-bach-dang-938/`):
3. `game-bach-dang-938/src/sim/encounter.js`: chuẩn hóa nhận diện actor trong `applyActorDamage` và logic chuyển pha `victory`.
4. `game-bach-dang-938/src/sim/army.js`: bổ sung nhận diện hoàn tất rút lui `tactical_retreat` trong `stepArmy`.
5. `game-bach-dang-938/src/save/attempt-resolution.js`: mở rộng `recordAttemptResolution` cho phép `failed_command`, `victory`, `tactical_retreat`.
6. `game-bach-dang-938/src/save/repository.js`: cập nhật tập hợp kết quả hợp lệ `VALID_OUTCOMES` cho schema lưu trữ.
7. `game-bach-dang-938/src/app/session.js`: kết toán tự động mọi trạng thái kết thúc trận.
8. `game-bach-dang-938/src/app/bootstrap.js`: hiển thị giao diện kết quả cho Thắng lợi và Rút lui.

### Tệp hồ sơ và bằng chứng kiểm thử:
9. `docs/game-bach-dang-938/release-candidate-fixes.md` (tài liệu này).
10. `docs/game-bach-dang-938/evidence/release-2026-11-03/current-validation.json` (bằng chứng chạy mới).
11. `docs/game-bach-dang-938/evidence/release-2026-11-03/legacy-switch.json` (bằng chứng chạy mới).

---

## 4. Bản build và cơ chế phát hành

- Dự án chạy theo mô hình **Vanilla Web Standards (ES Modules)**, không qua bundler hay compiler trung gian (không Webpack, không Vite).
- Mã nguồn trong thư mục `game-bach-dang-938/` chính là bản chạy trực tiếp trên trình duyệt.
- Vendor Three.js r128 đã nằm sẵn tại `game-bach-dang-938/vendor/three-r128/` với đầy đủ bản quyền MIT.
- Mọi đường dẫn tài nguyên nội bộ đều dùng relative URL hoặc path tương thích prefix `/nhipdapcualichsu/` của GitHub Pages.

---

## 5. Hướng dẫn Bật / Tắt riêng lối vào game mới

Nếu muốn **TẮT** lối vào game mới trên trang chủ (ẩn hoàn toàn với người dùng đại chúng mà không xóa code game):
1. Mở tệp `trang-chinh.html`.
2. Tìm thẻ Sa Bàn chứa link `game-bach-dang-938/index.html` (khoảng dòng 5024).
3. Đổi thuộc tính `style="display: none;"` hoặc đặt cmt `<!-- ... -->` bao quanh thẻ card/link:
   ```html
   <!-- <a href="game-bach-dang-938/index.html" class="game-choice-btn" id="bd938-entry">Bạch Đằng 938 — Chiến dịch nhập vai</a> -->
   ```
4. Khi muốn **BẬT** lại: Bỏ cmt hoặc bỏ `display: none`.

---

## 6. Cách quay về bản trước (Rollback) mà không mất game 2D/3D hoặc bản lưu

1. **Quay lui mã nguồn**:
   - Nếu muốn hủy bỏ toàn bộ thay đổi của lượt này:
     ```powershell
     git checkout HEAD -- sa-ban.html sa-ban-3d.html game-bach-dang-938/
     ```
   - Hai game cũ `sa-ban.html` và `sa-ban-3d.html` hoàn toàn độc lập, việc quay lui code game mới không ảnh hưởng gì đến mã của hai game cũ.

2. **Bảo toàn dữ liệu bản lưu**:
   - Toàn bộ bản lưu của game mới nằm tại:
     * Local: IndexedDB có tên `dcls.bd938.saves.v1`.
     * Cloud (nếu bật): collection Firestore `gameBachDang938/{uid}/versions/v1/slots/main`.
   - Các bản lưu của phòng thi, tiến trình học tập hoặc các chức năng khác của website sử dụng key riêng (như `history_exam_*`, `user_profile`, `quiz_*`), không chung prefix `dcls.bd938` nên **hoàn toàn an toàn và không bị ghi đè**.
   - Người chơi có thể sử dụng nút **"Xuất bản lưu"** ngay trên giao diện kết quả để tải file backup JSON về máy bất kỳ lúc nào.

---

## 7. Các thao tác cấu hình Firebase còn cần thực hiện (RC-02)

Trước khi bật tính năng "Lưu tài khoản" cho người dùng production:
1. **Kiểm tra Firestore Rules hiện hành**:
   - File `firestore.rules` trên repository hiện chỉ có rules cho `posts` và `comments`.
2. **Cập nhật Rules Fragment**:
   - Khi chủ dự án sẵn sàng bật đồng bộ cloud, hãy bổ sung fragment quy tắc bảo mật từ tệp `game-bach-dang-938/firestore.rules.fragment.txt` vào console Firebase:
     ```
     match /gameBachDang938/{userId}/versions/v1/slots/{slotId} {
       allow read, write: if request.auth != null && request.auth.uid == userId;
     }
     ```
3. **Chính sách an toàn**:
   - Mặc định hiện tại: Game khởi tạo với chế độ **"Lưu trên thiết bị (IndexedDB)"** hoặc **"Không lưu"**. Người dùng vẫn chơi, lưu tiến trình và trải nghiệm trọn vẹn mà không cần Firebase Rules mới.

---

## 8. Ghi chú phiên bản và các giới hạn đã xác minh

- **Phiên bản:** Release Candidate 1.0 (Sandbox Chiến dịch Bạch Đằng 938).
- **Trạng thái:** Toàn bộ lỗi chặn kiểm định (RC-01, RC-04, RC-06) đã được khắc phục và kiểm chứng đạt 100%.
- **Giới hạn đã xác minh:**
  1. Đồ họa hiện dùng hình học thủ tục tối ưu hóa, đảm bảo chạy mượt trên WebGL di động và PC; chưa thay thế bằng mô hình 3D poly cao từ bên ngoài.
  2. Chưa tích hợp hệ thống âm thanh Web Audio nâng cao (âm thanh môi trường/nhạc nền).
  3. Tính năng đồng bộ Firebase cloud cần chủ dự án cập nhật Firestore Rules trước khi quảng bá công khai (chế độ lưu IndexedDB hoạt động hoàn hảo).

