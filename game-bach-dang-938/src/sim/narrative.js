// Narrative & Campaign Dialogue Engine for Bach Dang 938
// Authored by Agent 02 (Narrative & Campaign Scriptwriter)

export const COMMANDERS = {
  NGO_QUYEN: {
    id: 'ngo_quyen',
    title: 'Tổng Chỉ Huy Ngô Quyền',
    role: 'Tiết Độ Sứ - Chủ Soái',
    color: '#e2ba6f'
  },
  DUONG_TAM_KHA: {
    id: 'duong_tam_kha',
    title: 'Tiên Phong Tướng Quân Dương Tam Kha',
    role: 'Chỉ Huy Thuyền Nhẹ Tiên Phong',
    color: '#8bd1b6'
  },
  DINH_CONG_TRU: {
    id: 'dinh_cong_tru',
    title: 'Tướng Quân Đinh Công Trứ',
    role: 'Chỉ Huy Trận Địa Phục Binh Hai Bờ',
    color: '#ed9f89'
  },
  KIEU_CONG_HAN: {
    id: 'kieu_cong_han',
    title: 'Đô Đốc Kiều Công Hãn',
    role: 'Chỉ Huy Trận Địa Cọc Ngầm & Hỏa Công',
    color: '#a1c8f2'
  },
  LUU_HOANG_THAO: {
    id: 'luu_hoang_thao',
    title: 'Hoằng Tháo',
    role: 'Chủ Soái Hạm Đội Nam Hán',
    color: '#e74c3c'
  }
};

export const TACTICAL_BARKS = {
  volley: [
    { speaker: COMMANDERS.DUONG_TAM_KHA, text: "Toàn đội giương cung! Mưa tên che khuất mặt trời, bắn rát vào boong giặc!" },
    { speaker: COMMANDERS.DINH_CONG_TRU, text: "Cung nỏ hai bờ sông đồng loạt khai hỏa! Áp chế lầu chỉ huy của địch!" },
    { speaker: COMMANDERS.NGO_QUYEN, text: "Bắn loạt liên hồi! Giữ cự ly, không để chúng tiếp cận mạn thuyền!" }
  ],
  fireArrow: [
    { speaker: COMMANDERS.DINH_CONG_TRU, text: "Tên lửa tẩm dầu chuẩn bị! Nhắm thẳng vào cánh buồm đen của Lâu Thuyền mà bắn!" },
    { speaker: COMMANDERS.DUONG_TAM_KHA, text: "Buồm giặc bốc cháy ngùn ngụt rồi! Chúng mất lái, rối loạn đội hình!" },
    { speaker: COMMANDERS.LUU_HOANG_THAO, text: "Lửa cháy buồm rồi! Mau dập lửa! Mau dập lửa cứu buồm chính!" }
  ],
  feignRetreat: [
    { speaker: COMMANDERS.NGO_QUYEN, text: "Thuyền nhẹ quay mũi, vờ thua rút lui! Dụ quân giặc lọt sâu vào trận địa cọc ngầm!" },
    { speaker: COMMANDERS.DUONG_TAM_KHA, text: "Giả vờ tháo chạy! Giữ đúng tốc độ, kéo Soái Hạm của Hoằng Tháo vào bẫy!" },
    { speaker: COMMANDERS.LUU_HOANG_THAO, text: "Quân Nam man tháo chạy rồi! Toàn quân thúc trống, đuổi cùng giết tận!" }
  ],
  stakeAmbush: [
    { speaker: COMMANDERS.KIEU_CONG_HAN, text: "Nước triều đã rút! Đầu cọc bịt sắt nhô lên rồi! Đáy thuyền giặc bị xé toạc!" },
    { speaker: COMMANDERS.NGO_QUYEN, text: "Trận địa cọc ngầm phát huy uy lực! Thuyền lớn của giặc đã mắc cạn, không thể quay đầu!" },
    { speaker: COMMANDERS.LUU_HOANG_THAO, text: "Trời ơi! Dưới đáy sông có cọc nhọn bọc sắt! Thuyền ta vỡ đáy rồi, nước tràn vào!" }
  ],
  fireRaft: [
    { speaker: COMMANDERS.KIEU_CONG_HAN, text: "Châm lửa các bè rơm tẩm dầu! Thả trôi thuận dòng sông thiêu rụi hạm đội Nam Hán!" },
    { speaker: COMMANDERS.DINH_CONG_TRU, text: "Gió đông nam nổi lên rồi! Bè lửa xông thẳng vào sườn Lâu Thuyền giặc!" },
    { speaker: COMMANDERS.LUU_HOANG_THAO, text: "Bè lửa... Bè lửa của quân Nam đang lao tới! Mau quay thuyền tránh ra!" }
  ],
  counterattack: [
    { speaker: COMMANDERS.NGO_QUYEN, text: "Trống trận vang lên! Toàn quân quay đầu tổng phản công! Bắt sống Hoằng Tháo!" },
    { speaker: COMMANDERS.DUONG_TAM_KHA, text: "Áp mạn thuyền giặc! Gươm giáo sẵn sàng, quyết chiến vì sông núi nước Nam!" },
    { speaker: COMMANDERS.DINH_CONG_TRU, text: "Tướng sĩ xông lên! Quét sạch quân xâm lược trên sóng Bạch Đằng giang!" }
  ],
  victory: [
    { speaker: COMMANDERS.NGO_QUYEN, text: "Sông Bạch Đằng cuộn sóng, ngàn năm rửa sạch nhục Bắc thuộc! Nước Đại Việt từ đây mở nền độc lập tự chủ!" },
    { speaker: COMMANDERS.DUONG_TAM_KHA, text: "Chủ tướng Hoằng Tháo đã đền tội dưới chân cọc ngầm! Quân giặc tan rã hoàn toàn!" }
  ]
};

export function getRandomBark(orderKey) {
  const barks = TACTICAL_BARKS[orderKey] || TACTICAL_BARKS.volley;
  return barks[Math.floor(Math.random() * barks.length)];
}

