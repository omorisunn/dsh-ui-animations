// Dialog motion: enter fade for the settings panel, unified exit fade for
// the dialog family. React unmounts dialogs the moment close fires, so exit
// motion cannot be CSS alone: a runtime bridge intercepts close intents
// (mask click / close button / Escape) at window capture phase, sets
// data-closing so the CSS below plays the fade, then re-dispatches the
// original intent to run the real close path.
// Target: [role="presentation"] > [role="dialog"] — covers the Modal family
// (shortcuts panel, reset confirm, HostReleasePrompt) including instances
// without the data-shortcut-modal attribute, and structurally excludes the
// inline shortcut editor (role=group), the image lightbox (its backdrop IS
// the dialog root), menus, toasts and hover previews.
// Long-term: replace the bridge with an upstream closing state (38jqx
// pattern) — the CSS here stays valid for that migration.
window.__ModuleLoader__.load({
  id: 'dsh-ui-animations',
  factory() {
    const CSS = `
/* Enter: settings panel only — Modal dialogs already animate in via
   their own modalEnter keyframes; adding this there would double-fade. */
[data-shortcut-modal="settings"] {
  transition:
    opacity   var(--ds-transition-duration) var(--ds-ease-in-out),
    transform var(--ds-transition-duration) var(--ds-ease-in-out);
}
@starting-style {
  [data-shortcut-modal="settings"] { opacity: 0; transform: scale(0.97); }
}

/* Settings mask fades in together (opacity carries backdrop-filter). */
:has(> [data-shortcut-modal="settings"]) > :first-child {
  transition: opacity var(--ds-transition-duration) var(--ds-ease-in-out);
}
@starting-style {
  :has(> [data-shortcut-modal="settings"]) > :first-child { opacity: 0; }
}

/* Exit: the whole dialog family. data-closing is set by the bridge below. */
[role="presentation"] > [role="dialog"] {
  transition:
    opacity   var(--ds-transition-duration) var(--ds-ease-in-out),
    transform var(--ds-transition-duration) var(--ds-ease-in-out);
}
[role="presentation"] > [role="dialog"][data-closing] {
  opacity: 0;
  transform: scale(0.98);
  pointer-events: none;
}

/* Mask exit: in both structures the first child of the presentation root
   is the mask (verified in the web bundle and the settings panel). */
[role="presentation"]:has(> [role="dialog"]) > :first-child {
  transition: opacity var(--ds-transition-duration) var(--ds-ease-in-out);
}
[role="presentation"]:has(> [role="dialog"][data-closing]) > :first-child {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  [data-shortcut-modal="settings"],
  :has(> [data-shortcut-modal="settings"]) > :first-child,
  [role="presentation"] > [role="dialog"],
  [role="presentation"]:has(> [role="dialog"]) > :first-child { transition: none; }
}
`;

    function installCloseBridge() {
      // Topmost dialog under a presentation root: later portals stack on top
      // (e.g. the reset confirm over the shortcuts panel).
      const SEL = '[role="presentation"] > [role="dialog"]';
      let armed = false;
      let armedPanel = null;
      let timer = 0;

      const findPanel = () => {
        const all = document.querySelectorAll(SEL);
        return all.length ? all[all.length - 1] : null;
      };
      const reduced = () =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        panel.setAttribute('data-closing', '');
        timer = window.setTimeout(() => {
          armed = false;
          if (armedPanel && armedPanel.isConnected) redispatch();
          armedPanel = null;
        }, exitDurationMs(panel));
      };

      const onClickCapture = (e) => {
        if (!e.isTrusted) return;
        const close = isCloseIntent(e);
        if (armed) {
          if (close) e.stopPropagation();
          return;
        }
        if (reduced() || e.button !== 0 || !close) return;
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
        if (reduced() || !findPanel()) return;
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
      const mo = new MutationObserver(() => {
        if (armed && armedPanel && !armedPanel.isConnected) {
          window.clearTimeout(timer);
          armed = false;
          armedPanel = null;
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
        armed = false;
        armedPanel = null;
      };
    }

    return {
      inject: [],
      apply() {
        const el = document.createElement('style');
        el.setAttribute('data-plugin-css-src', 'dsh-ui-animations');
        el.textContent = CSS;
        document.head.appendChild(el);
        const teardownBridge = installCloseBridge();
        return () => {
          teardownBridge();
          el.remove();
        };
      },
    };
  },
});
