import re
from lxml import html

with open('quan-anh-hoi.html', 'r', encoding='utf-8') as f:
    raw_html = f.read()

tree = html.fromstring(raw_html)
scripts = tree.xpath('//script/text()')
all_js = "\n".join(scripts)

# Collect all function definitions and window exports in JS
js_functions = set(re.findall(r'function\s+([a-zA-Z0-9_$]+)\s*\(', all_js))
window_exports = set(re.findall(r'window\.([a-zA-Z0-9_$]+)\s*=', all_js))
const_exports = set(re.findall(r'(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>)', all_js))
all_defined_fns = js_functions | window_exports | const_exports

# Extract all onclick, onkeydown, onchange, etc. INSIDE JS strings
builtins = {
    'if', 'setTimeout', 'clearTimeout', 'parseInt', 'parseFloat', 'Boolean', 'Number', 
    'String', 'replace', 'stopPropagation', 'preventDefault', 'close', 'showModal',
    'getElementById', 'querySelector', 'querySelectorAll', 'reset', 'trim', 'toLowerCase'
}

matches = re.findall(r'on(?:click|keydown|keyup|change|input|submit|focus|blur)=["\']([^"\']+)["\']', all_js)
template_calls = set()
for code in matches:
    fns = re.findall(r'([a-zA-Z0-9_$]+)\s*\(', code)
    for fn in fns:
        if fn not in builtins:
            template_calls.add(fn)

print(f"Functions called in JS template event handlers ({len(template_calls)}):")
missing_in_template = []
for fn in sorted(template_calls):
    if fn in all_defined_fns:
        print(f"  ✔ {fn} -> DEFINED")
    else:
        print(f"  ✘ {fn} -> MISSING!")
        missing_in_template.append(fn)

if missing_in_template:
    print(f"\nCRITICAL ERROR: {len(missing_in_template)} functions called in templates are NOT defined!")
else:
    print("\nALL FUNCTIONS CALLED IN DYNAMIC TEMPLATES ARE FULLY DEFINED!")
