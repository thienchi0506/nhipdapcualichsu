import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos_coverts = text.find('id="lac-wing-covert-scales"')
pos_start = text.rfind('<!-- ===', 0, text.rfind('<!-- ===', 0, text.rfind('<!-- ===', 0, pos_coverts)))
print("From pos_start to pos_coverts:")
print(repr(text[pos_start:pos_coverts]))
print("Preceding 100 chars before pos_start:")
print(repr(text[pos_start-100:pos_start]))
