# dsh-ui-animations

All UI motion for the DSH desktop web app in one plugin. Current: enter and
exit fade for dialogs — settings panel, shortcuts panel, confirmation
dialogs — via CSS plus a small close bridge, reusing the --ds design tokens.

Install (local checkout):

```
dsh plugin --profile desktop add D:/Projects/dsh-ui-animations
```

Version stays 0.0.1; internal changes are tracked by commits, not version
bumps. Layout follows the dsh-remote convention: plugin package at the repo
root, source in `lib/`, dev tools in `scripts/`.
