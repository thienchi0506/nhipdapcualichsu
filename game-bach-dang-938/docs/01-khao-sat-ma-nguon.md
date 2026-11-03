# KẾT QUẢ KHẢO SÁT MÃ NGUỒN

> Ngày khảo sát: 2026-11-03
> Phạm vi: Toàn bộ repository `nhipdapcualichsu`

---

## 1. Tổng quan website

- **Nền tảng:** Static HTML/CSS/JS — không build tool, không framework
- **Firebase:** Project `nhipdapcualichsu`, GA4: G-JMF58FGDRN
- **Chủ đề:** Giáo dục lịch sử Việt Nam, phong cách "cổ trang"
- **Các trang chính:** index.html → trang-chinh.html → các module (phòng thi, kho kiến thức, sa bàn...)

## 2. Game hiện có trong Sa Bàn

| Game | File | Quy mô | Kiến trúc |
|------|------|--------|-----------|
| 2D Bạch Đằng | `sa-ban.html` | ~13K dòng JS inline | Canvas 2D, monolithic |
| 3D Bạch Đằng | `sa-ban-3d.html` | ~12K dòng JS inline | Three.js r128 (CDN), monolithic |
| Như Nguyệt | `sa-ban-nhu-nguyet.html` | ~3.9K dòng | Trận khác, phạm vi nhỏ |
| Sảnh game | `sanh-game.html` | ~3K dòng | Lobby chọn màn Như Nguyệt |

**Module dùng chung của game cũ:**
- `game-runtime.js` — clock, pause, quality auto-scaling, settings
- `game-upgrades-2d.js` — cached river, wave animation, wake trails
- `game-upgrades-3d.js` — arrow pool, water shader, combat orders, instanced batching

## 3. Game mới: game-bach-dang-938/

### Kiến trúc (ES Modules, không build step)

```
game-bach-dang-938/
├── index.html
├── data/
│   ├── character-config.json    # 4 hero roles
│   ├── river-config.json        # River parameters
│   └── shell-scene.json         # Scene setup
├── src/
│   ├── app/
│   │   ├── bootstrap.js         # Entry point
│   │   ├── diagnostics.js       # Performance tracking
│   │   ├── input.js             # KB + touch + pointer
│   │   ├── loader.js            # Asset loading
│   │   ├── preferences.js       # Graphics settings
│   │   └── session.js           # Session management
│   ├── core/
│   │   └── clock.js             # Fixed 30Hz sim step
│   ├── presentation/
│   │   └── scene.js             # Three.js scene, camera, instanced meshes
│   ├── save/
│   │   ├── controller.js        # Local + cloud sync coordinator
│   │   ├── firebase-bridge.js   # Lazy Firebase SDK, chunked writes
│   │   ├── game-state.js        # Permanent death, injury tracking
│   │   ├── prepare-session.js   # Session init
│   │   ├── repository.js        # IndexedDB with SHA-256, slot leasing
│   │   ├── retry.js             # Retry logic
│   │   └── attempt-resolution.js # Conflict resolution
│   └── sim/
│       ├── actor-space.js       # Entity management
│       ├── army-config.js       # Unit configurations
│       ├── army.js              # A* pathfinding, fog of war, logistics
│       ├── collision.js         # Physics collision
│       ├── encounter.js         # Combat encounters
│       ├── river.js             # Tide, depth, current, flow
│       └── vessel.js            # Boat physics, grounding, repair
├── styles/
│   └── game.css                 # Scoped CSS
├── vendor/
│   └── three-r128/              # Vendored Three.js (not CDN)
├── tests/                       # Multiple test suites
└── docs/                        # Project documentation
```

### Đã triển khai ✅

| Hệ thống | Chi tiết |
|-----------|----------|
| **Vật lý thuyền** | Thrust, drag, mass, draft, va chạm, mắc cạn, sửa chữa |
| **Chiến đấu** | Cận chiến combo, cung tên, đỡ/phản/dodge, stamina, stun |
| **Quân đội** | Squad A* pathfinding, fog of war, intel aging, logistics |
| **Đổ bộ** | Grapple, boarding, bơi, cứu hộ |
| **Lưu trữ** | 3-tier: None / IndexedDB / Firebase, CAS conflict, checksum |
| **Kịch bản** | 6 scenario test: combat, harbor, shoal, ebb, impact, rudder |
| **Thuyền** | 2 loại: nhẹ và vận tải (khác mass, HP, crew) |
| **Nhân vật** | 4 role: Thủy Quân, Cung Thủ, Công Binh, Quân Nhu |
| **Chỉ huy** | Sĩ quan dự bị tiếp quản khi hero gục |
| **Bản đồ** | Tactical map overlay (phím M) |
| **Input** | Keyboard + touch D-pad + pointer |
| **3D Scene** | Instanced meshes lên đến 1000 quân/bên, procedural terrain |

### Chưa hoàn thiện ⚠️

| Hạng mục | Trạng thái |
|----------|------------|
| **Chiến dịch** | Không có chapter hoàn chỉnh, không progression |
| **AI chỉ huy** | Chưa có commander-level strategy |
| **Hiệu năng 400+ quân** | Test sơ bộ, chưa pass FPS gate |
| **Hình ảnh** | Placeholder geometry, chưa có model/art chính thức |
| **Nước** | Flat surface, chưa có water shader |
| **Âm thanh** | Không có AudioContext |
| **Hậu cần** | Chưa có wounded evacuation, river transport |
| **Thưởng/điểm** | Chưa có rewards/progression keys |
| **Firestore rules** | Cần deploy riêng |

## 4. Tích hợp hiện tại

- `trang-chinh.html` (~dòng 5024): Đã có link `<a href="game-bach-dang-938/index.html">` trong Sa Bàn
- Game mới có nút "Về Sa Bàn" → `../trang-chinh.html#khu-vuc`
- Firebase config dùng chung qua `window.__FIREBASE_CONFIG__`
- Game mới **KHÔNG** dùng `game-runtime.js` hay `site-music.js` — hoàn toàn độc lập
- Three.js r128 vendored riêng, không ảnh hưởng CDN của game cũ

## 5. Đánh giá

**Điểm mạnh:**
- Kiến trúc modular ES Modules vượt trội so với game cũ
- Save system chất lượng production (checksum, chunked, conflict resolution)
- Simulation depth phù hợp thiết kế (thủy triều, A*, fog of war)
- Cô lập tốt, không ảnh hưởng game cũ

**Cần làm cho chương mẫu:**
1. Campaign chapter system + AI commander strategy
2. Water shader (có thể tham khảo sa-ban-3d.html)
3. Audio system
4. Finalized 3D art/models
5. Performance certification ≥ 400 quân
6. Progression & rewards
7. UI/UX hoàn chỉnh (HUD, menus, settings)

