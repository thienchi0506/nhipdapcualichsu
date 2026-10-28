import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos_coverts = text.find('id="lac-wing-covert-scales"')
print("pos_coverts:", pos_coverts)
print(text[pos_coverts-200:pos_coverts])
