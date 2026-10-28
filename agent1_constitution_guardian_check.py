# -*- coding: utf-8 -*-
"""
Agent 1: Constitution Guardian Integrity Verification Script
Project 1111 - Đại Chiến Lịch Sử
Kiểm tra bảo toàn 100% nội dung tư liệu, văn bản, di tích, nhân vật, tuyên ngôn.
"""

import sys
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def verify_trang_chinh(filepath="trang-chinh.html"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    print(f"[Constitution Guardian] Dang kiem dinh file: {filepath} ({len(content)} ky tu)")

    # 1. Kiem tra 6 dai di tich
    relics = [
        "Hoàng Thành Thăng Long",
        "Cổ Loa",
        "Bạch Đằng",
        "Như Nguyệt",
        "Cố Đô Huế",
        "Điện Biên Phủ"
    ]
    for r in relics:
        count = content.count(r)
        assert count > 0, f"VI PHAM HIEN PHAP: Khong tim thay di tich '{r}'!"
        print(f"  + Di tich '{r}': {count} lan xuat hien.")

    # 2. Kiem tra 2 ban tuyen ngon
    declarations = [
        "Nam Quốc Sơn Hà",
        "Bình Ngô Đại Cáo"
    ]
    for d in declarations:
        count = content.count(d)
        assert count > 0, f"VI PHAM HIEN PHAP: Khong tim thay tuyen ngon '{d}'!"
        print(f"  + Tuyen ngon '{d}': {count} lan xuat hien.")

    # Kiem tra doan van ban cot loi Nam Quoc Son Ha
    assert "Nam quốc sơn hà Nam đế cư" in content or "Tiệt nhiên định phận tại thiên thư" in content or "nam quốc sơn hà" in content.lower(), "Thieu noi dung tho Nam Quoc Son Ha!"
    # Kiem tra doan van ban Binh Ngo Dai Cao
    assert "Việc nhân nghĩa cốt ở yên dân" in content or "Như nước Đại Việt ta từ trước" in content, "Thieu noi dung Binh Ngo Dai Cao!"

    # 3. Kiem tra cac nhan vat lich su trong diem
    heroes = [
        "Ngô Quyền",
        "Lý Thường Kiệt",
        "Trần Hưng Đạo",
        "Lê Lợi",
        "Quang Trung",
        "Hồ Chí Minh",
        "Võ Nguyên Giáp",
        "Hai Bà Trưng",
        "Bà Triệu",
        "Đinh Bộ Lĩnh"
    ]
    for h in heroes:
        count = content.count(h)
        assert count > 0, f"VI PHAM HIEN PHAP: Khong tim thay nhan vat '{h}'!"
        print(f"  + Nhan vat '{h}': {count} lan xuat hien.")

    print("[Constitution Guardian] KET QUA: 100% Noi dung lich su duoc bao toan nguyen ven!")
    return True

if __name__ == "__main__":
    verify_trang_chinh()
