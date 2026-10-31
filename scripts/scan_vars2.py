import re

js = open(r'D:\Projects\dsh-ui-animations\_inspect\index-BXV-oxvX.js', encoding='utf-8').read()
css = open(r'D:\Projects\dsh-ui-animations\_inspect\index-BNyAYEM7.css', encoding='utf-8').read()

print('--- "ease" occurrences in JS (cubic-bezier) ---')
for m in list(re.finditer(r'cubic-bezier\([^)]*\)', js))[:20]:
    print(m.group(0))
print('--- --ds-transition-duration in JS ---')
print(js.count('--ds-transition-duration'), js.count('--ds-ease-in-out'))
print('--- definitions maybe in theme css chunk? search all css var defs with ds-transition ---')
for m in re.finditer(r'--ds-transition-duration\s*:[^;}]{1,60}', css):
    print(m.group(0))
print('--- how is the var used in css ---')
for m in re.finditer(r'var\(--ds-transition-duration[^)]*\)', css):
    print(m.group(0))
for m in re.finditer(r'var\(--ds-ease-in-out[^)]*\)', css):
    print(m.group(0))
print('--- check for other css assets in dist ---')
# look for popup/dropdown/menu components in JS: class names like menu/dropdown
for kw in ['_menu_', '_dropdown_', '_popover_', '_select_', 'menu', 'Popover', 'Dropdown', 'ContextMenu']:
    print(kw, js.count(kw))
