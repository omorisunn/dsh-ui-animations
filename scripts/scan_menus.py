import re

js = open(r'D:\Projects\dsh-ui-animations\_inspect\index-BXV-oxvX.js', encoding='utf-8').read()

print('--- css module class names mentioning menu/dropdown/popover/panel/dialog/toast ---')
names = set(re.findall(r'_([A-Za-z]+(?:_[A-Za-z]+)*)_[a-z0-9]{5}_', js))
# CSS-module pattern in this build seems like _name_hash_ ; look for interesting words
words = ['menu', 'popup', 'pop', 'overlay', 'sheet', 'drawer', 'panel', 'mask', 'dialog', 'modal', 'toast', 'bubble', 'tooltip', 'dropdown', 'select', 'combobox', 'listbox', 'option', 'notice', 'snackbar', 'hovercard', 'card']
found = {}
for n in names:
    ln = n.lower()
    for w in words:
        if w in ln:
            found.setdefault(w, []).append(n)
for w in words:
    if w in found:
        print(w, '=>', sorted(set(found[w]))[:12])
