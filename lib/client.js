// All DSH desktop UI motion in one plugin: dialog enter/exit, menu enter,
// menu exit, and the settings section that switches each family on or off.
//
// Dialog exit and menu exit cannot be CSS alone: React unmounts both the
// moment the close intent runs. Dialogs keep the intent bridge (window
// capture, set data-closing, replay the same event after one token
// duration); menus instead clone the open surface and let the original
// handler run immediately while the clone fades.
//
// Menu enter is pure CSS: every menu surface is the data-menu-material div of
// the single menu primitive, so one attribute selector covers the plain
// dropdown, nested submenus and the dock tab context menu.
//
// Preferences live in localStorage under dsh-ui-animations:prefs and drive the
// html[data-anim-*] attributes; the settings section writes them live.

window.__ModuleLoader__.load({
  id: 'dsh-ui-animations',
  factory(require) {
    const React = require('react');
    const { jsx, jsxs } = require('react/jsx-runtime');

    let primitives = null;
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    } catch {
      // Fall back to a plain checkbox if the primitives package is not
      // registered; the tab must still render for the preview check.
    }

    const NS = 'dsh-ui-animations';

    const CSS = `
/* ===== 001/002 dialog motion, gated by the settings tab ===== */

/* Enter: settings panel only — Modal dialogs already animate in via their
   own modalEnter keyframes; adding this there would double-fade. */
html[data-anim-dialogs="on"] [data-shortcut-modal="settings"] {
  transition:
    opacity   var(--ds-transition-duration) var(--ds-ease-in-out),
    transform var(--ds-transition-duration) var(--ds-ease-in-out);
}
@starting-style {
  html[data-anim-dialogs="on"] [data-shortcut-modal="settings"] {
    opacity: 0;
    transform: scale(0.97);
  }
}

/* Settings mask fades in together (opacity carries backdrop-filter). The
   mask is tagged by the bridge instead of being selected with :has(): a
   document-wide :has() invalidates on every mutation, which made the panel
   feel delayed on open. */
html[data-anim-dialogs="on"] [data-anim-mask] {
  transition: opacity var(--ds-transition-duration) var(--ds-ease-in-out);
}
@starting-style {
  html[data-anim-dialogs="on"] [data-anim-mask] {
    opacity: 0;
  }
}

/* Exit: the whole dialog family. data-closing is set by the bridge below. */
html[data-anim-dialogs="on"] [role="presentation"] > [role="dialog"] {
  transition:
    opacity   var(--ds-transition-duration) var(--ds-ease-in-out),
    transform var(--ds-transition-duration) var(--ds-ease-in-out);
}
html[data-anim-dialogs="on"] [role="presentation"] > [role="dialog"][data-closing] {
  opacity: 0;
  transform: scale(0.98);
  pointer-events: none;
}

/* Mask exit: the bridge tags the mask that belongs to the closing panel. */
html[data-anim-dialogs="on"] [data-anim-mask][data-closing] {
  opacity: 0;
}

/* ===== 004 menu enter ===== */

/* Motion lives on the content nodes, never on the surface. The surface wraps
   an absolutely positioned material layer whose backdrop-filter samples the
   backdrop; a transform or opacity on that ancestor collapses the sample into
   an empty group and the glass turns transparent ("the background is gone").
   scale is dropped for the same reason it cannot shrink the content without
   shrinking the glass. */
html[data-anim-menus="on"] [data-menu-material]:not([data-menu-clone]) > :not([aria-hidden="true"]) {
  transform-origin: top center;
  transition:
    opacity   var(--ds-transition-duration-fast) var(--ds-ease-in-out),
    transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);
}
@starting-style {
  html[data-anim-menus="on"] [data-menu-material]:not([data-menu-clone]) > :not([aria-hidden="true"]) {
    opacity: 0;
    transform: translateY(-4px);
  }
}

/* Submenus open sideways out of their parent item (nested material divs). */
html[data-anim-menus="on"] [data-menu-material] [data-menu-material]:not([data-menu-clone]) > :not([aria-hidden="true"]) {
  transform-origin: left center;
}
@starting-style {
  html[data-anim-menus="on"] [data-menu-material] [data-menu-material]:not([data-menu-clone]) > :not([aria-hidden="true"]) {
    opacity: 0;
    transform: translateX(-6px);
  }
}

/* ===== 004 menu exit (cloned snapshot) ===== */

/* The bridge clones the open menu, pins the clone over the original box and
   fades it; the real menu unmounts immediately so the action (and anything it
   opens) runs without waiting.

   The glass layer cannot fade by animating the clone root: an ancestor with
   opacity < 1 becomes a backdrop root and cuts the material's backdrop sample,
   so the glass turns transparent and the page behind flashes sharp mid-fade.
   Instead the material itself fades (its own opacity still samples the page)
   together with the content nodes. Every other descendant still needs its
   transition and starting style suppressed, so only the marked fade nodes keep
   a transition. */
html[data-anim-menus="on"] [data-menu-clone] *:not([data-anim-fade]) { transition: none !important; }
html[data-anim-menus="on"] [data-menu-clone] :not([aria-hidden="true"]):not([data-anim-fade]) {
  opacity: 1 !important;
  transform: none !important;
}

@media (prefers-reduced-motion: reduce) {
  html[data-anim-dialogs="on"] [data-shortcut-modal="settings"],
  html[data-anim-dialogs="on"] [data-anim-mask],
  html[data-anim-dialogs="on"] [role="presentation"] > [role="dialog"],
  html[data-anim-menus="on"] [data-menu-material]:not([data-menu-clone]) > :not([aria-hidden="true"]) {
    transition: none;
  }
}
`;

    // ---- preferences ----
    const PREFS_KEY = 'dsh-ui-animations:prefs';
    const DEFAULTS = { enabled: true, dialogs: true, menus: true };
    const clampPrefs = (raw) => {
      const out = { ...DEFAULTS };
      if (raw && typeof raw === 'object') {
        for (const key of Object.keys(DEFAULTS)) {
          if (typeof raw[key] === 'boolean') out[key] = raw[key];
        }
      }
      return out;
    };

    let cached = null;
    const subscribers = new Set();

    const prefs = {
      get() {
        if (!cached) {
          let raw = null;
          try {
            const text = window.localStorage.getItem(PREFS_KEY);
            raw = text ? JSON.parse(text) : null;
          } catch {
            raw = null;
          }
          cached = clampPrefs(raw);
        }
        return cached;
      },
      subscribe(fn) {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
      set(key, value) {
        cached = { ...prefs.get(), [key]: !!value };
        try {
          window.localStorage.setItem(PREFS_KEY, JSON.stringify(cached));
        } catch {
          // Private mode / quota: keep the in-memory value for this session.
        }
        prefs.apply();
        subscribers.forEach((fn) => fn());
      },
      apply() {
        const p = prefs.get();
        const flag = (on) => (on ? 'on' : 'off');
        const root = document.documentElement;
        root.setAttribute('data-anim-dialogs', flag(p.enabled && p.dialogs));
        root.setAttribute('data-anim-menus', flag(p.enabled && p.menus));
      },
      dialogsOn() {
        return prefs.get().enabled && prefs.get().dialogs &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      },
      menusOn() {
        return prefs.get().enabled && prefs.get().menus &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      },
    };

    // ---- dialog exit bridge (same contract as the shipped plugin) ----
    function installCloseBridge() {
      // Topmost dialog under a presentation root: later portals stack on top
      // (e.g. the reset confirm over the shortcuts panel).
      const SEL = '[role="presentation"] > [role="dialog"]';
      let armed = false;
      let armedPanel = null;
      let armedMask = null;
      let timer = 0;

      const findPanel = () => {
        const all = document.querySelectorAll(SEL);
        return all.length ? all[all.length - 1] : null;
      };

      // The mask is tagged by us instead of selected with :has(): :has() on a
      // document this large invalidates broadly and cannot be scoped to the
      // one overlay we care about.
      const maskOf = (panel) => {
        const overlay = panel && panel.parentElement;
        const first = overlay && overlay.firstElementChild;
        return first && first !== panel ? first : null;
      };

      const tagMask = (panel) => {
        const mask = maskOf(panel);
        if (mask && !mask.hasAttribute('data-anim-mask')) mask.setAttribute('data-anim-mask', '');
      };

      // Tag before the first paint of a newly mounted overlay so the
      // @starting-style fade still applies to the mask.
      const tagAdded = (node) => {
        if (!node || node.nodeType !== 1) return;
        if (node.matches && node.matches('[data-shortcut-modal="settings"]')) tagMask(node);
        if (node.querySelectorAll) {
          node.querySelectorAll('[data-shortcut-modal="settings"]').forEach(tagMask);
        }
      };

      // Follow --ds-transition-duration instead of assuming 200ms.
      const exitDurationMs = (panel) => {
        const v = getComputedStyle(panel).transitionDuration || '0.2s';
        const n = parseFloat(v);
        return v.includes('ms') ? (isNaN(n) ? 200 : n) : isNaN(n) ? 200 : n * 1000;
      };

      const isCloseIntent = (e) => {
        const p = findPanel();
        if (!p) return false;
        if (p.contains(e.target)) {
          const b = e.target.closest ? e.target.closest('button') : null;
          if (!b) return false;
          // The class match is load-bearing: HostReleasePrompt labels its
          // close button 「稍后」, so the aria check alone would miss it.
          const hay = String(b.className) + ' ' + (b.getAttribute('aria-label') || '');
          return /(^|[\s_-])close/i.test(hay) || hay.includes('关闭');
        }
        const overlay = p.parentElement;
        return !!(overlay && overlay.contains(e.target));
      };

      const beginClosing = (panel, redispatch) => {
        armed = true;
        armedPanel = panel;
        armedMask = maskOf(panel);
        panel.setAttribute('data-closing', '');
        if (armedMask) {
          armedMask.setAttribute('data-anim-mask', '');
          armedMask.setAttribute('data-closing', '');
        }
        timer = window.setTimeout(() => {
          armed = false;
          const panel = armedPanel;
          const mask = armedMask;
          armedPanel = null;
          armedMask = null;
          redispatch();
          // Redispatch was a no-op (busy panel refuses to close): restore so
          // the panel does not stay invisible or dimmed.
          window.setTimeout(() => {
            if (panel && panel.isConnected) {
              panel.removeAttribute('data-closing');
              if (mask) mask.removeAttribute('data-closing');
            }
          }, 250);
        }, exitDurationMs(panel));
      };

      const onClickCapture = (e) => {
        if (!e.isTrusted) return;
        const close = isCloseIntent(e);
        if (armed) {
          if (close) e.stopPropagation();
          return;
        }
        if (!prefs.dialogsOn() || e.button !== 0 || !close) return;
        e.stopPropagation();
        const target = e.target;
        const { clientX, clientY } = e;
        beginClosing(findPanel(), () => {
          if (!target || !target.isConnected) {
            // Original target gone: fall back to the Escape path so the
            // panel cannot stay on screen invisible.
            document.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true,
              }),
            );
            return;
          }
          target.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, clientX, clientY }),
          );
        });
      };

      const onKeydown = (e) => {
        if (!e.isTrusted || e.key !== 'Escape') return;
        if (armed) { e.stopPropagation(); return; }
        if (!prefs.dialogsOn() || !findPanel()) return;
        e.stopPropagation();
        beginClosing(findPanel(), () => {
          document.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true,
            }),
          );
        });
      };

      // Judge liveness by the armed panel itself: a lower layer may still be
      // open when the top one unmounts (programmatic close / layer swap).
      // The same observer tags masks of settings overlays as they mount: the
      // callback runs before the first paint, so @starting-style still hits.
      const mo = new MutationObserver((records) => {
        for (const record of records) {
          if (record.addedNodes && record.addedNodes.length && prefs.dialogsOn()) {
            record.addedNodes.forEach(tagAdded);
          }
        }
        if (armed && armedPanel && !armedPanel.isConnected) {
          window.clearTimeout(timer);
          armed = false;
          armedPanel = null;
          armedMask = null;
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });

      window.addEventListener('click', onClickCapture, true);
      window.addEventListener('keydown', onKeydown, true);
      return () => {
        window.removeEventListener('click', onClickCapture, true);
        window.removeEventListener('keydown', onKeydown, true);
        window.clearTimeout(timer);
        mo.disconnect();
        document.querySelectorAll(SEL + '[data-closing]').forEach((p) =>
          p.removeAttribute('data-closing'),
        );
        document.querySelectorAll('[data-anim-mask]').forEach((m) => {
          m.removeAttribute('data-anim-mask');
          m.removeAttribute('data-closing');
        });
        armed = false;
        armedPanel = null;
        armedMask = null;
      };
    }

    // ---- menu exit bridge ----
    // Close paths, verified in the web bundle: an outside pointerdown bubbles
    // to a document listener that closes the menu, Escape is handled in a
    // document capture listener, and an item click runs its action and lets
    // React unmount the menu. The action must run immediately: waiting for a
    // fade before replaying made everything opened from a menu feel delayed.
    // So the bridge only takes a clone snapshot of the open tree, pins it over
    // the original box and fades the clone; the real menu unmounts untouched.
    function installMenuBridge() {
      const MENU = '[data-menu-material]';
      const ITEM =
        '[role="menuitem"],[role="option"],[role="tab"],[role="switch"],' +
        '[data-dockkit-menu-close],button,a[href]';
      const SUBMENU_TRIGGER = '[aria-haspopup],[aria-expanded]';
      const CLONE = '[data-menu-clone]';

      const openMenus = () =>
        Array.from(document.querySelectorAll(MENU)).filter((m) => !m.closest(CLONE));

      // The surface itself carries no transition any more (motion lives on the
      // content nodes), so read the token from a content child. A missing value
      // must never collapse the fade to 0ms.
      const fadeMs = (menu) => {
        const probe = menu.querySelector(':scope > :not([aria-hidden="true"])') || menu;
        const v = getComputedStyle(probe).transitionDuration || '';
        const first = String(v).split(',')[0].trim();
        const n = parseFloat(first);
        if (!n) return 100;
        return first.includes('ms') ? n : n * 1000;
      };

      const inMenu = (target) => (target && target.closest ? target.closest(MENU) : null);

      const isItemClick = (target) => {
        const item = target && target.closest ? target.closest(ITEM) : null;
        if (!item || !inMenu(item)) return false;
        // A submenu trigger keeps the menu open; there is nothing to fade.
        return !item.closest(SUBMENU_TRIGGER);
      };

      // Only the outermost surfaces are cloned: submenus are nested inside
      // their parent, so one clone already carries the whole open tree.
      // Reduced motion means no clone at all: the menu unmounts instantly.
      const snapshot = () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const menus = openMenus();
        if (!menus.length) return;
        const roots = menus.filter((m) => !menus.some((o) => o !== m && o.contains(m)));
        roots.forEach((menu) => {
          const rect = menu.getBoundingClientRect();
          if (!rect.width && !rect.height) return;
          const duration = fadeMs(menu);
          const clone = menu.cloneNode(true);
          clone.setAttribute('data-menu-clone', '');
          clone.setAttribute('aria-hidden', 'true');
          clone.removeAttribute('id');
          clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
          const cs = getComputedStyle(menu);
          Object.assign(clone.style, {
            position: 'fixed',
            left: rect.left + 'px',
            top: rect.top + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
            margin: '0',
            zIndex: cs.zIndex && cs.zIndex !== 'auto' ? cs.zIndex : '70',
            pointerEvents: 'none',
            transition: 'none',
          });
          document.body.appendChild(clone);
          // Fade the glass and the content themselves. Animating an ancestor's
          // opacity would make it the backdrop root and cut the material's
          // backdrop sample, which is what made the page behind flash sharp.
          void clone.offsetWidth;
          const surfaces = [clone, ...clone.querySelectorAll(MENU)];
          surfaces.forEach((surface) => {
            const glass = Array.from(surface.children).find(
              (el) => el.getAttribute('aria-hidden') === 'true',
            );
            const targets = glass ? [glass] : [];
            Array.from(surface.children).forEach((el) => {
              if (el.getAttribute('aria-hidden') === 'true') return;
              // A content node that contains a nested menu cannot fade here:
              // its own opacity would cut the nested glass's backdrop sample.
              // The nested surface fades its own glass and content instead.
              if (!el.querySelector(MENU)) targets.push(el);
            });
            targets.forEach((el) => {
              el.setAttribute('data-anim-fade', '');
              el.style.transition = 'opacity ' + duration + 'ms var(--ds-ease-in-out)';
              el.style.opacity = '0';
            });
          });
          window.setTimeout(() => clone.remove(), duration + 120);
        });
      };

      // Events are never intercepted or replayed: the original handler runs in
      // the same tick, and the snapshot survives it.
      const onPointerDown = (e) => {
        if (!e.isTrusted || !prefs.menusOn()) return;
        if (!openMenus().length || inMenu(e.target)) return;
        snapshot();
      };

      const onClickCapture = (e) => {
        if (!e.isTrusted || !prefs.menusOn() || e.button !== 0) return;
        if (!isItemClick(e.target)) return;
        snapshot();
      };

      const onKeydown = (e) => {
        if (!e.isTrusted || e.key !== 'Escape' || !prefs.menusOn()) return;
        if (!openMenus().length) return;
        snapshot();
      };

      window.addEventListener('pointerdown', onPointerDown, true);
      window.addEventListener('click', onClickCapture, true);
      window.addEventListener('keydown', onKeydown, true);
      return () => {
        window.removeEventListener('pointerdown', onPointerDown, true);
        window.removeEventListener('click', onClickCapture, true);
        window.removeEventListener('keydown', onKeydown, true);
        document.querySelectorAll(CLONE).forEach((n) => n.remove());
      };
    }

    // ---- settings section ----
    // The settings shell already gives the section `padding: 0 24px 24px`, so only
    // the top gap is ours; row separators match the built-in rows.
    const rowStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '16px 0',
      borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
      cursor: 'pointer',
    };
    const textStyle = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };
    const labelStyle = { fontSize: 13 };
    const hintStyle = { fontSize: 12, opacity: 0.6 };

    function Toggle({ checked, label, onChange }) {
      if (primitives && primitives.Switch) {
        return jsx(primitives.Switch, { checked, label, onChange });
      }
      return jsx('input', {
        type: 'checkbox',
        checked,
        'aria-label': label,
        onChange: (e) => onChange(e.target.checked),
      });
    }

    function MotionTab(props) {
      const t = props.t;
      const snap = React.useSyncExternalStore(prefs.subscribe, prefs.get, prefs.get);
      const rows = [
        ['all', 'enabled', 'allHint'],
        ['dialogs', 'dialogs', 'dialogsHint'],
        ['menus', 'menus', 'menusHint'],
      ];
      return jsxs('div', {
        style: { padding: '4px 0 0', display: 'flex', flexDirection: 'column' },
        children: [
          jsx('h3', {
            style: { margin: '0 0 8px', fontSize: 14, fontWeight: 600 },
            children: t('title'),
          }),
          ...rows.map(([labelKey, key, hintKey], index) =>
            jsxs('label', {
              style: index === rows.length - 1 ? { ...rowStyle, borderBottom: 'none' } : rowStyle,
              children: [
                jsxs('span', {
                  style: textStyle,
                  children: [
                    jsx('span', { style: labelStyle, children: t(labelKey) }),
                    jsx('span', { style: hintStyle, children: t(hintKey) }),
                  ],
                }),
                jsx(Toggle, {
                  checked: !!snap[key],
                  label: t(labelKey),
                  onChange: (value) => prefs.set(key, value),
                }),
              ],
            }, key),
          ),
          jsx('p', {
            style: { margin: '12px 0 0', fontSize: 12, opacity: 0.6 },
            children: t('note'),
          }),
        ],
      });
    }

    const zh = {
      tab: '动效',
      title: '动效',
      all: '所有动效',
      allHint: '关掉后菜单与对话框全部瞬切（官方原版行为）',
      dialogs: '对话框与面板',
      dialogsHint: '设置面板与 Modal 族的淡入淡出',
      menus: '下拉菜单',
      menusHint: '菜单内容从锚点方向滑入；关闭时留一份快照淡出，动作立即执行',
      note: '时长跟随主题变量（--ds-transition-duration*）；系统开启「减少动态」时自动全部关闭。',
    };
    const en = {
      tab: 'Motion',
      title: 'Motion',
      all: 'All motion',
      allHint: 'Turns every menu and dialog animation off (stock behavior).',
      dialogs: 'Dialogs and panels',
      dialogsHint: 'Fade and scale for the settings panel and the Modal family.',
      menus: 'Dropdown menus',
      menusHint: 'Menu content eases in from its anchor; closing fades a snapshot while the action runs at once.',
      note: 'Duration follows the theme tokens (--ds-transition-duration*); "Reduce motion" turns everything off.',
    };

    function apply(ctx) {
      prefs.apply();

      const style = document.createElement('style');
      style.setAttribute('data-plugin-css-src', 'dsh-ui-animations');
      style.textContent = CSS;
      document.head.appendChild(style);

      const teardownBridge = installCloseBridge();
      const teardownMenuBridge = installMenuBridge();

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ui-animations: dictionaries');
      const t = ctx.locale.bind(NS);
      // Lives in the settings left nav as its own section, so the switches are
      // one click from the gear without opening the Plugins page.
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register({
          name: 'settings.section',
          id: 'motion',
          order: 20,
          label: () => t('tab'),
          locale: NS,
          inject: () => ({ t }),
        }, MotionTab),
      );

      return () => {
        teardownMenuBridge();
        teardownBridge();
        style.remove();
      };
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    };
  },
});
