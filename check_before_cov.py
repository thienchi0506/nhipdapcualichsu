import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos_coverts = text.find('id="lac-wing-covert-scales"')
pos_coverts_comment = text.rfind('<!-- ===', 0, pos_coverts)
# check 300 chars before pos_coverts_comment
print("Before coverts comment:")
print(repr(text[pos_coverts_comment-200:pos_coverts_comment]))
