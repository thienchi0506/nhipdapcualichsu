import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

p = c.find('chimLacCtx.clearRect')
print(c[p:p+1200])
