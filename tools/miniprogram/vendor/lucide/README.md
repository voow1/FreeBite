# 菜谱线性图标来源

- `list-checks`、`clipboard-list`、`sparkles`、`shopping-basket`：Lucide 官方仓库 `icons/`，2026-10-16 获取。
- `history`、`circle-check`：官方 npm 包 `lucide-static@0.468.0/icons/`。
- 许可：本目录 `LICENSE`；随小程序分发的副本为 `miniprogram/assets/LUCIDE-LICENSE.txt`。
- 用途：`miniprogram/recipe-card.wxss` 将 SVG 以 UTF-8 URL 编码内嵌到标准和 WebKit 遮罩中，填色继承 `currentColor`，不依赖网络。修改轮廓时同时更新对应源 SVG 与样式；WXML 只保留一个空的图标节点，不叠加文字符号。
