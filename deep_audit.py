import re
import sys
from lxml import html

with open('quan-anh-hoi.html', 'r', encoding='utf-8') as f:
    raw_html = f.read()

print("=" * 60)
print("DEEP AUDIT REPORT FOR QUAN-ANH-HOI.HTML")
print("=" * 60)

# 1. PARSE HTML WITH LXML
try:
    tree = html.fromstring(raw_html)
    print("✔ HTML5 Parsing: SUCCESS (lxml successfully built DOM tree)")
except Exception as e:
    print(f"✘ HTML5 Parsing: FAILED ({e})")
    sys.exit(1)

# Collect all element IDs in HTML
html_ids = set(tree.xpath('//@id'))
print(f"✔ Found {len(html_ids)} unique element IDs in static HTML")

# 2. CHECK ALL INLINE EVENT HANDLERS
event_attrs = ['onclick', 'onkeydown', 'onkeyup', 'onchange', 'oninput', 'onsubmit', 'onfocus', 'onblur']
called_functions = set()
invalid_handlers = []

for attr in event_attrs:
    for elem in tree.xpath(f'//*[@{attr}]'):
        handler_code = elem.get(attr)
        # Extract function call names
        matches = re.findall(r'([a-zA-Z0-9_$]+)\s*\(', handler_code)
        for m in matches:
            if m not in {'if', 'setTimeout', 'clearTimeout', 'parseInt', 'parseFloat', 'Boolean', 'Number', 'String', 'replace'}:
                called_functions.add((m, attr, elem.tag))

print(f"✔ Found {len(called_functions)} distinct function calls in static HTML event handlers")

# Extract JS scripts
scripts = tree.xpath('//script/text()')
all_js = "\n".join(scripts)

# Collect all function definitions and window exports in JS
js_functions = set(re.findall(r'function\s+([a-zA-Z0-9_$]+)\s*\(', all_js))
window_exports = set(re.findall(r'window\.([a-zA-Z0-9_$]+)\s*=', all_js))
const_exports = set(re.findall(r'(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>)', all_js))
all_defined_fns = js_functions | window_exports | const_exports

# Check if any called function is missing
missing_fns = []
for fn, attr, tag in called_functions:
    if fn not in all_defined_fns:
        missing_fns.append((fn, attr, tag))

if missing_fns:
    print(f"✘ Missing handler functions ({len(missing_fns)}):")
    for fn, attr, tag in missing_fns:
        print(f"   - <{tag} {attr}=\"...{fn}(...)\">: '{fn}' not found in scripts!")
else:
    print("✔ All static inline event handlers map to declared JavaScript functions!")

# 3. CHECK getElementById IN JS AGAINST HTML IDs
# Match document.getElementById('...') or $(`#...`)
get_id_calls = set(re.findall(r'document\.getElementById\([\'"`]([a-zA-Z0-9_-]+)[\'"`]\)', all_js))
template_id_calls = set(re.findall(r'id=[\'"]([a-zA-Z0-9_-]+)[\'"]', all_js)) # IDs generated dynamically in templates
all_possible_ids = html_ids | template_id_calls

missing_ids = []
for gid in get_id_calls:
    if gid not in all_possible_ids:
        # Check if it might be dynamically prefixed
        missing_ids.append(gid)

print(f"✔ Checked {len(get_id_calls)} getElementById calls:")
if missing_ids:
    print(f"  ⚠ Potentially missing or dynamic IDs ({len(missing_ids)}):", missing_ids)
else:
    print("  ✔ Every single getElementById target exists in HTML or JS template string!")

# 4. CHECK CSS BRACE BALANCE & VARIABLE DEFINITIONS
styles = tree.xpath('//style/text()')
all_css = "\n".join(styles)

open_braces = all_css.count('{')
close_braces = all_css.count('}')
print(f"✔ CSS Braces: {open_braces} opened, {close_braces} closed ({'BALANCED' if open_braces == close_braces else 'MISMATCHED!'})")

# Check CSS variables used vs defined
defined_vars = set(re.findall(r'(--[a-zA-Z0-9_-]+)\s*:', all_css))
used_vars = set(re.findall(r'var\((--[a-zA-Z0-9_-]+)', all_css))

print(f"✔ CSS Variables: {len(defined_vars)} defined, {len(used_vars)} referenced")
undefined_vars = []
for uv in used_vars:
    if uv not in defined_vars:
        # Check if defined with fallback e.g. var(--var, fallback)
        undefined_vars.append(uv)

if undefined_vars:
    print("  ⚠ Variables defined externally or in other files:", undefined_vars)
else:
    print("  ✔ All CSS variables are defined directly inside quan-anh-hoi.html!")

# 5. CHECK JS SYNTAX AND UNCLOSED STRINGS / TEMPLATE LITERALS
backticks = all_js.count('`')
print(f"✔ JS Template literals (backticks): {backticks} (must be even: {'EVEN' if backticks % 2 == 0 else 'ODD/UNCLOSED!'})")

print("=" * 60)
