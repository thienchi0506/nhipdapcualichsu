import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'khoiTaoHoatHoaNhanVat' in line:
        start = max(0, i - 5)
        end = min(len(lines), i + 250)
        print(f"Lines {start+1} to {end}:")
        for j in range(start, end):
            print(f"{j+1}: {lines[j]}", end='')
        print("\n" + "="*50)
