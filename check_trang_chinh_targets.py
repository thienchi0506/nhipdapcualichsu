import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('trang-chinh.html', 'r', encoding='utf-8') as f:
    text = f.read()

t1 = '.welcome-banner::before {'
t2 = '.welcome-banner__bg-layer {'
t3 = '<section class="welcome-banner" id="welcome-banner-3d">'
t4 = "var banner = document.getElementById('welcome-banner-3d');"

print('t1 in text:', t1 in text)
print('t2 in text:', t2 in text)
print('t3 in text:', t3 in text)
print('t4 in text:', t4 in text)
