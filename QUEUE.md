# QUEUE.md — 工作佇列(對話 compact 後以此檔為準)

更新:2026-08-18(深夜:速度優先,Fable 代理平行跑,檔案範圍互斥)。規則:任何會動使用者可見英文文案的工單標 `pre-i18n`,
Q4 開跑前必須清空該標記;插隊工單只掃核心不展開;研究凍結(素材/新需求前不再開研究代理)。

## 順序

1. ~~V7 微批次:promo XSS 跳脫 + 裸單價防火牆補丁 + 翻譯重試~~(2026-08-18 完成)
2. ~~U-F CostNow 計算機正確性~~(2026-08-18 完成:MPF min/max 31/615→33.58/651.50 FY2026;其餘常數全數查證無誤;costnow-harness.js 逐字副本+漂移守衛+不變量選測進 CI;commit 38456b7)
3. ~~Q3 配置器互動本體~~(2026-08-18 完成:configurator.html 上線,入口在 AsiaSource Buying tools;bl-sketch 標籤 clamp 修裁切;SW v58;commit e284b27)`Q4 仍要收它的字串`
4. ~~**R1a** 假日 JSON(CI 週更)+ 交期承諾區間(保守值~樂觀值,建議承諾日=保守值)`pre-i18n`~~(2026-08-21 完成:假日 JSON + 交期承諾區間 commit 54e85ca)
~~5. **T1-T3** 工廠信任面(60秒摘要/聚焦聲明/分類卡/能力矩陣/打樣時程/介紹包PDF;認證徽章與影片留插槽,素材到位即插)`pre-i18n`~~(2026-08-21 完成:ebfee63/f2efe35/cd5c790)
~~6. **U-A 誠實性、U-C 死控制項**~~(2026-08-21 完成:U-A 改 about.html 一處絕對保證措辭;U-C 五頁查證後無需修改;commit 08278e7)
~~7. **Q4** 配置器 i18n:機器已就緒(UI 字串抽進 DATA.ui;58 選項+116 句沿用 product-101 既有九語譯文;verify-configurator-i18n.js 進 CI)。**尚缺**:UI 23 鍵九語翻譯(代理跑中)、語言頁 build、T/R 新文案的 facade 補譯~~(2026-08-21 完成:c2580b7)
~~8. U-B 可達性、U-D 手機落地、U-E 打磨、U2 希伯來文RTL~~(2026-08-21 完成:U-B privacy.html 補 skip link 與 id="main",其餘四頁查證後無需修改;U-D/U-E my-market/configurator/manufacturing 手機溢出、hover/focus、觸控區修復;U2 查證後 he 語系不存在,無需修改;commit f2741d5)
~~9. V2 效能、V3 SEO、V6 相容性、V7 全站完整版~~(2026-08-21 完成:index/about 首圖補 width/height+decoding、index 首圖 fetchpriority=high;index/about/contact/privacy 補 self-canonical;privacy 補 meta description `pre-i18n`;修復 configurator 模板漂移(f2741d5 的兩條 CSS 未回寫模板,下次 build 會被清掉);my-market/news/manufacturing 與 robots/llms/sitemap 查證後無需修改——sitemap 不重生以免 lastmod 假新鮮、og/twitter 全站皆無屬慣例、noindex 轉址殼是刻意的;commit 2c9e0ed)
~~10. R1b 信草稿+異議卡、R1c 破冰卡、R1d 報價分享頁(先盤點與 /p/ 管線重疊)~~(2026-08-22 完成:三卡落在 PIN 保護的 team.html;R1d 走 team.html#qs= 純前端 base64url,不進 /p/ 管線、價格不落地、內部成本毛利不入 payload;sw v59→v60;新增中英文案標 pre-i18n 併入 45;commit 197b68f)

## 已知待處理

- i18n-drift 報 45 個語言頁 STALE(index/about/contact/privacy/product-101 × 9 語)——product-101 查證為指紋過期非缺譯(1019 段 0 未譯);facade 四頁待 T 批次落地後一次重建+補譯

## 待使用者的事(不阻塞上面)

- Entra/SharePoint secrets(手冊:C:\Users\JasonLiao\Birdland-Promotion-設定手冊.md)
- S1 B 組素材(認證掃描件/實拍影片)——使用者已知,到位即插 T 批次插槽
- 回訪量測(GoatCounter/CF Analytics 需開帳號)——提案中,等點頭

## 已接受的風險(勿重複提案)

- p/index.json 可枚舉(無價格)
- promo 內容進公開 git 歷史(到期=移出線上站,歷史可考;搬部署架構 CP 不划算)
- 業務 email 出現在客人頁(那是功能:客人要能聯絡業務)
