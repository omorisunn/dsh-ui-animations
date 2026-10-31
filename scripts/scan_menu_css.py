import re

css = open(r'D:\Projects\dsh-ui-animations\_inspect\index-BNyAYEM7.css', encoding='utf-8').read()

# Extract full rules for menu / menuItem / submenu selectors
for target in ['_menu_', '_menuItem_', '_submenu_', '_mask_', '_dialog_', '_bubble_', '_toast_']:
    print(f'===== {target} =====')
    for m in re.finditer(r'([^{}]{0,80}' + re.escape(target) + r'[^{}]*)\{([^{}]*)\}', css):
        sel = re.sub(r'\s+', ' ', m.group(1).strip())
        body = re.sub(r'\s+', ' ', m.group(2).strip())
        print(f'{sel} {{ {body[:220]} }}')
    print()
