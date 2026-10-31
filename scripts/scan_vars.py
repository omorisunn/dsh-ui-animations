import re

js = open(r'D:\Projects\dsh-ui-animations\_inspect\index-BXV-oxvX.js', encoding='utf-8').read()

print('--- ds ease vars ---')
for m in re.finditer(r'--ds-[a-zA-Z-]*ease[a-zA-Z-]*\s*:\s*["\']?[^;"\'\\,]{2,60}', js):
    print(m.group(0))
print('--- ds duration vars ---')
for m in re.finditer(r'--ds-[a-zA-Z-]*duration[a-zA-Z-]*\s*:\s*["\']?[^;"\'\\,]{1,60}', js):
    print(m.group(0))
print('--- motion-related vars ---')
for m in re.finditer(r'--dsh-[a-zA-Z-]*motion[a-zA-Z-]*\s*:\s*["\']?[^;"\'\\,]{1,60}', js):
    print(m.group(0))
print('--- exit/unmount handling in react (presence/popmotion/CSSTransition) ---')
for kw in ['react-transition-group', 'framer-motion', '@floating-ui', 'presence', 'onExit', 'exit:', 'AnimatePresence']:
    print(kw, js.count(kw))
print('--- radix / headless ui ---')
for kw in ['radix', 'headlessui', 'ariakit', 'base-ui']:
    print(kw, js.count(kw))
