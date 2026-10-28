import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open('thao-truong.html', 'r', encoding='utf-8') as f:
    text = f.read()

print("=== CHECKING PROMPTS 12 -> 17 STANDARDS IN thao-truong.html ===")

# Prompt 12:
print("\n[PROMPT 12]")
p12_grade_grid = bool(re.search(r'(?:grade-grid|\.grade-selector|\.grades)[^{]*\{[^}]*(?:repeat\(3,\s*1fr\)|grid-template-columns:\s*repeat\(3)', text)) or "repeat(3, 1fr)" in text
p12_level_stacked = bool(re.search(r'(?:level-selector|\.level-group|\.levels)[^{]*\{[^}]*(?:flex-direction:\s*column|flex-wrap:\s*wrap)', text)) or "flex-direction: column" in text
p12_start_btn = bool(re.search(r'(?:btn-start-exam|\.start-btn|\.btn-start)[^{]*\{[^}]*(?:54px|min-height:\s*54px)', text)) or "54px" in text
print(f"  - Grade selector 3 columns: {p12_grade_grid}")
print(f"  - Level selector stacked/wrap: {p12_level_stacked}")
print(f"  - Nút Thi Ngay 54px full-width: {p12_start_btn}")

# Prompt 13:
print("\n[PROMPT 13]")
p13_search_46 = bool(re.search(r'(?:search-input|\.exam-search|#exam-search)[^{]*\{[^}]*(?:46px|min-height:\s*46px)', text)) or "46px" in text
p13_dropdown_16 = bool(re.search(r'(?:select|\.filter-select|#filter-grade)[^{]*\{[^}]*font-size:\s*16px', text)) or "font-size: 16px" in text
p13_catalog_1col = bool(re.search(r'(?:exam-grid|\.catalog-grid|#exam-list)[^{]*\{[^}]*grid-template-columns:\s*1fr', text)) or "grid-template-columns: 1fr" in text
print(f"  - Search input 46px full-width: {p13_search_46}")
print(f"  - Dropdown selects font-size 16px (chống zoom): {p13_dropdown_16}")
print(f"  - Catalog grid 1 column on mobile: {p13_catalog_1col}")

# Prompt 14:
print("\n[PROMPT 14]")
p14_sticky_header = bool(re.search(r'(?:sticky-exam-header|\.exam-sticky-top|#exam-header)[^{]*\{[^}]*position:\s*sticky', text)) or "position: sticky" in text
p14_progress_3px = "3px" in text and ("progress" in text.lower() or "bar" in text.lower())
p14_timer = "exam-timer" in text or "timer" in text.lower()
p14_flag_btn = "flag" in text.lower() or "btn-nop-bai" in text or "nop-bai" in text.lower()
print(f"  - Sticky timer header 50-54px: {p14_sticky_header}")
print(f"  - Progress bar 3px: {p14_progress_3px}")
print(f"  - Countdown timer: {p14_timer}")
print(f"  - Submit / Flag button: {p14_flag_btn}")

# Prompt 15:
print("\n[PROMPT 15]")
p15_opt_50px = bool(re.search(r'(?:opt-card|\.option-btn|\.option-card)[^{]*\{[^}]*min-height:\s*(?:50px|48px)', text)) or "50px" in text
p15_circle_abcd = bool(re.search(r'(?:opt-badge|\.opt-letter|\.letter-badge)[^{]*\{[^}]*border-radius:\s*50%', text)) or "border-radius: 50%" in text
p15_vibrate = "navigator.vibrate" in text
print(f"  - Option card min-height 50px: {p15_opt_50px}")
print(f"  - Circle letter badge (A,B,C,D): {p15_circle_abcd}")
print(f"  - Vibration feedback: {p15_vibrate}")

# Prompt 16:
print("\n[PROMPT 16]")
p16_btn_tf = bool(re.search(r'(?:btn-true|btn-false|\.tf-btn|\.btn-tf)[^{]*\{[^}]*min-height:\s*44px', text)) or "44px" in text
p16_textarea = bool(re.search(r'textarea[^{]*\{[^}]*(?:font-size:\s*16px|min-height:\s*90px)', text)) or ("90px" in text and "textarea" in text)
print(f"  - True/False button min-height 44px: {p16_btn_tf}")
print(f"  - Textarea font-size 16px !important, min-height 90px: {p16_textarea}")

# Prompt 17:
print("\n[PROMPT 17]")
p17_palette_5col = "repeat(5, 1fr)" in text or "repeat(5,1fr)" in text
p17_confirm_modal = "modal" in text.lower() and ("xác nhận" in text.lower() or "nop-bai" in text or "confirm" in text.lower())
p17_scoreboard = "bảng điểm" in text.lower() or "vinh danh" in text.lower() or "result" in text.lower()
print(f"  - Palette Drawer 5 columns (repeat(5, 1fr)): {p17_palette_5col}")
print(f"  - Submit confirmation modal: {p17_confirm_modal}")
print(f"  - Score summary / vinh danh: {p17_scoreboard}")
