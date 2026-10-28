import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('sa-ban-3d.html', 'r', encoding='utf-8') as f:
    text = f.read()

s = text.find('function taoBienTenNoiCongTrinh')
print(text[s:s+1500])
