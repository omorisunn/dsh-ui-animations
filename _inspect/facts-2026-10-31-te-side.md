# facts-2026-10-31 — panel/dialog/mask 动效证据（轮次 001 证据基线）

来源：D:\Projects\dsh-ui-animations\_inspect\index-BNyAYEM7.css（77471B）、index-BXV-oxvX.js（941436B），2026-10-31 实测扫描。

## keyframes 全量（14 个，CSS-module 哈希名）
spin、dsh-state-dot-spin、dsh-state-dot-dash、dsh-row-shimmer-sweep、dsh-row-shimmer-highlight、
modalEnter、indicator-enter、reveal-second-dot、reveal-third-dot、tooltip-in、
dsh-toast-in、dsh-toast-fade、dockHintIn、dockScrimIn

## 入场（与 panel 直接相关）
- `@keyframes modalEnter { 0%{opacity:0} to{opacity:1} }`（纯 opacity，无位移/缩放）
  - 使用者：`._mask_o6lrb_18:after` 与 `._dialog_o6lrb_33`，声明均为
    `animation: _modalEnter_o6lrb_1 var(--ds-transition-duration) var(--ds-ease-in-out)`
  - dialog 结构（o6lrb 模块）：_root_6 / _mask_18 / _dialog_33 / _content_63 / _header_71 / _title_79 / _close_87 / _description_106 / _body_115；dialog 样式 width:min(380px,100%)、border-radius:var(--dsw-radius-panel)、bg --dsw-alias-bg-layer-2、box-shadow --dsw-elevation-prominent；mask 为 inset 遮罩 + backdrop-filter:var(--dsw-mask-blur)，色 --dsw-alias-bg-mask-1
- `@keyframes dockScrimIn { 0%{opacity:0} to{opacity:1} }` → `._dockScrim_6nhg2_599`，`animation: _dockScrimIn_6nhg2_1 .14s ease-out`（**裸值，token 漂移**）
- `@keyframes dockHintIn { 0%{opacity:0;transform:scale(.98)} to{opacity:1;transform:none} }` → `._dockHintCard_6nhg2_606`（dockHintCard 另有 .12s ease-out 硬编码 transition：color/background-color/border-color）
- `@keyframes dsh-toast-in { 0%{opacity:0;transform:translate(-50%,-6px)} to{opacity:1;transform:translate(-50%)} }` → `._toast_l6cvn_6` 用 `.16s ease-out`（裸值）

## 出场（关键缺口）
- **全库唯一出场动画 = toast**：`._toast_l6cvn_6 { animation: _dsh-toast-in_l6cvn_1 .16s ease-out, _dsh-toast-fade_l6cvn_1 1s ease var(--dsh-toast-hold, 3s) forwards }`
  - `@keyframes dsh-toast-fade { to{opacity:0;visibility:hidden} }` —— 元件**保持挂载**，靠 forwards+visibility 收尾，无卸载协调
- dialog/mask/dock 面板**均无出场动画**（关闭即卸载，瞬跳）
- JS 侧 `animationend` 仅 4 处且全为库内部（React 事件 polyfill、darwin transition 追踪），**无任何 UI 组件用 animationend 协调卸载** → 「播完再卸载」机制目前不存在，需新建或改常驻

## reduced-motion 现状
- dialog/mask：有 — `@media(prefers-reduced-motion:reduce){ ._mask_o6lrb_18:after,._dialog_o6lrb_33{animation:none} }`（正对 modalEnter）
- spinner/shimmer 装饰：有（animation:none / display:none）
- toast、dockScrim、dockHint、tooltip、indicator：**无** reduced-motion 分支（存量欠账）

## token 事实
- 动效 token：--ds-ease-in-out、--ds-transition-duration（引用于 CSS，值在运行时主题侧）、--dsh-toast-hold（默认 3s）
- 样式 token：--dsw-alias-*（bg-mask-1/bg-layer-2/label 等）、--dsw-radius-panel、--dsw-elevation-panel/prominent、--dsw-mask-blur
- 裸值漂移清单（不新增，验收红线）：dockScrimIn .14s ease-out；dockHintCard .12s ease-out；toast .16s ease-out / fade 1s

## 设置界面定位
- JS 内有 SettingsForm/SettingsFormModel/SettingsSec*、settingsNumberField/settingsTextField、SegmentedControl/SegmentedTabs（设置表单元件）
- "settings"字符串 8 处，无 Settings+Panel/Modal/Dialog 直接命名 → 设置面板容器即通用 dialog（o6lrb）或 dock 容器（6nhg2），提案需指认

## 高频面（不得引入动效）
- 5 处 transition:none 保持原样（此前扫描已确认，本轮不变）
