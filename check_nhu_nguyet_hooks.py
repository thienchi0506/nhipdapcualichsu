import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('sa-ban-3d.html', 'r', encoding='utf-8') as f:
    text = f.read()

s = text.find('function taoChienLuyLuyTre3D()')
e = text.find('/* ==========================================================================\n   K. ĐĂNG KÝ SỰ KIỆN', s)
if e == -1:
    e = text.find('/* ==========================================================================', s)
print(repr(text[s:e]))
