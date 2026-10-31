# 001+002 · 弹窗动效（合并 brief · 已批准 2026-10-31）

证据版本戳：_inspect/facts-2026-10-31.md（合并稿）+ _inspect/facts-2026-10-31-te-side.md
工作稿：memory（bots/…/memory/projects/）：001-settings-panel-motion/、002-dialog-motion/inventory-dialogs.md
落地：plugin/dsh-ui-animations/（dsh-ui-animations 0.0.1，已装入桌面 profile；全部动效合并此一个插件，本地预览插件已移除）
版本规则：版本号锁死 0.0.1，内部更改用 commit 编号（Human 2026-10-31）

## 一、分析（现状 + 证据）

弹窗全量 8 面（web bundle + asar 插件源实证，检索方法与行号见 inventory-dialogs.md）：

| 面 | 进场 | 退场 | 处置 |
|---|---|---|---|
| settings 面板（插件自绘，data-shortcut-modal="settings"） | 无 | 无 | 本轮加进+退 |
| shortcuts 面板（primitives.Modal headless，="shortcuts"） | modalEnter ✓ | 无 | 加退场 |
| reset 确认框（shortcuts:847，Modal 无属性值） | modalEnter ✓ | 无 | 加退场 |
| HostReleasePrompt（settings-general:930，Modal 无属性值） | modalEnter ✓ | 无 | 加退场 |
| Modal/RiskConfirmation（UI kit 导出，未来实例） | modalEnter ✓ | 无 | 退场桥预置接住 |
| 图片查看器（19zw2，backdrop 即 dialog 根） | 无 | 无 | T3 跳过（无稳定锚点，记档） |
| 菜单系/dock 菜单（高频面） | — | — | 不做（/animate 频率门槛） |
| toast/hover 预览卡 | 已有 | 已有 | 不动 |

关键结构事实：Modal 渲染 root[role=presentation] > [mask(真 div 首子元素), dialog[role=dialog]]；settings 面板同构；关闭三路径（×钮/mask 点击/Escape）全走 open=false → React 即刻卸载 → 纯 CSS 退场不可能，需桥接（长期上游化=38jqx 式 closing 态）。

## 二、CSS 方案（plugin/dsh-ui-animations/client.js）

- 进场（仅 settings，@starting-style 纯 CSS）：opacity 0 + scale(0.97) → 1，mask 首子元素同步淡入；Modal 族自带 modalEnter 不叠加。
- 退场（通用结构靶）：`[role="presentation"] > [role="dialog"]` + 桥接挂 data-closing → opacity 0 + scale(0.98)；mask `:has(>[role=dialog][data-closing])>:first-child` 同步淡出。结构选择器天然排除行内编辑器（role=group）、图片查看器（backdrop 即根）、菜单/toast/preview。
- 桥接：window 捕获 click/keydown，close 钮识别以类名 _close_ 为主（HostReleasePrompt aria=「稍后」，aria 仅兜底）；时长读 computed --ds-transition-duration；分层取最上层面板、armed 判活用面板自身引用；reduced-motion 全禁=瞬关。
- 全部复用 --ds-ease-in-out / --ds-transition-duration，零新增 keyframes，零 hash 选择器。

## 三、验收

静态（te，2026-10-31 全绿）：S1 零 hash 选择器 / S2 零 transition:all 零裸时长 / S3 只动 opacity+transform / S4 reduced-motion 覆盖 / S5 存量 transition:none 与 o6lrb/6nhg2 不触及 / S6 零新增 keyframes；J1–J7（作用域/非关闭类不吞/卸载取消定时器/reduced 即关/时长跟 computed/teardown 全清/三路径一致）。

视觉（Human 目检通过 2026-10-31）：4 弹窗 × 3 关闭路径（×钮/遮罩/Esc）0.2s 淡出；减少动态=瞬开瞬关。

已知项/边界：P4 reset busy 期拒关→淡出后隐身、重试自愈；footer 取消/稍后钮与主操作钮（程序化关闭）=瞬关；camelCase 类名（btnClose 型）正则不中（现存全为 _close_ 哈希式）；Phase 2 上游 closing 态后桥接退役、CSS 不变。

未定项/后续：lightbox 小轮（等上游锚点）；插件设置页（动效总开关+时长跟 token）单独 brief 过目后做。
