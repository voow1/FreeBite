# 不牛马厨房｜菜品图片来源与收录规范

> 最后核验：2026-07-24。许可条款可能更新，每张图片入库前仍须回到原作品页复核。

## 可用来源

| 优先级 | 网站 | 用法与许可核验 |
|---|---|---|
| A | [Openverse](https://openverse.org/about) | 只作为开放许可聚合检索入口。Openverse 明确说明不会逐项验证许可，必须回到 Wikimedia Commons、Flickr 等原始作品页核验作者、许可和原图。 |
| A | [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) | 优先使用公共领域、CC0、CC BY、CC BY-SA。逐文件核对许可；CC BY/CC BY-SA 保留作者、原作页和许可，裁切压缩后的衍生图继续按原许可记录。 |
| A | [Flickr Creative Commons](https://www.flickr.com/creativecommons/) | 只收录原作品页明确标记为 CC0、Public Domain、CC BY 或 CC BY-SA 的照片。排除 NC、ND 和 All Rights Reserved。 |
| A | [Foodiesfeed](https://www.foodiesfeed.com/license/) | 网站声明实拍图按等同 CC0 的规则免费复用。只选真实摄影，排除其 AI 生成内容，并保存具体照片页。 |
| B | [Pexels](https://www.pexels.com/license/) | 许可允许免费下载、修改并用于网站或 App。保存摄影师与具体作品页；不收录人物、品牌或包装明显的图，不把未修改原图作为独立图库再分发。 |
| B | [Unsplash](https://unsplash.com/license) | 许可允许免费商业/非商业使用和修改。保存摄影师与具体作品页；不收录 Unsplash+、品牌植入明显或无法确认普通 Unsplash 许可的素材。 |
| B | [Pixabay](https://pixabay.com/service/license-summary/) | 许可允许免费使用和修改。保存作者与具体作品页；排除品牌、商标、人物权利不清或仅能作为独立素材再分发的内容。 |

## 禁止收录

- 许可不明、无法回到原作品页、页面只显示搜索缩略图或二次搬运图。
- CC BY-NC、CC BY-NC-SA、CC BY-ND、CC BY-NC-ND、All Rights Reserved、仅编辑用途。
- 带版权水印、明显商标、包装、菜单文字、人物脸部或可能暗示品牌背书的照片。
- AI 生成图、插画、原料图、未完成烹饪过程图，或与菜名核心食材/成品形态明显不符的图。
- 为凑覆盖而把不同蛋白质、不同菜型或差异过大的近似图强行复用。

## 视觉筛选顺序

1. 同名成品菜或核心食材与烹饪形态完全一致。
2. 优先约 45° 俯视；没有合格候选时依次考虑更高俯视、正侧 30°—60°，最后才是近正面。
3. 主体清楚、光线自然、颜色真实、有食欲；餐具和背景克制，避免同框多道无关菜。
4. 图片应适合 4:3 卡片裁切，裁切后仍完整保留主菜和关键食材。
5. 新收录图片不得与项目已有图片重复；即使菜名相近，也不复用同一原图或其不同尺寸、裁切、调色、重压缩版本。

## 入库与压缩

- 文件名使用稳定的 ASCII kebab-case，存放在 `site/assets/dishes/`。
- 发布格式统一为 WebP，最大边 640px，质量 76；保留原始宽高比并围绕主菜主体裁切，不拉伸。
- 压缩后检查解码尺寸、文件大小、主体清晰度和色彩，不做过饱和、过锐化或改变菜品真实性的处理。
- 入库前同时执行文件哈希与感知哈希比对；发现同源或高度相似图时剔除候选，不以改尺寸、裁切或重压缩规避重复。
- 每张图在 `ATTRIBUTION.md` 记录：菜名、文件名、作者、具体作品页、许可、许可链接、原图差异与裁切说明。
- 每完成 18 张新图片，连同映射、授权记录、版本文档一起创建一次中文 Git 提交并推送。
