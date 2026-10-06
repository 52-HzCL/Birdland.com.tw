# 原版三個 App 還原

2026-10-03 使用者明確要求：除了新名稱，原本三個 App 的外型設計與內容都保留。此決定優先於之前的 App 精簡、資料呈現及功能去重方案。

- Supply Updates：原 ABrief 的完整報刊、導覽、成本板、台灣／中國消息、運輸／政策、訂閱與日曆。
- Market Compare：原 My Market 的 Desk 與 This edition 雙視圖、完整市場比較、選取及清單操作。
- Product Studio：原 AsiaSource 的目錄、材料、製程、產品路線及工程工作區。

原版來源為目前 checkout 的基礎版本 be20e6a。模板存放 tools/restored-executive_template.html、restored-market_template.html、restored-partner_template.html，舊目錄保留於 tools/restored-catalog_partial.html、data/restored-catalog.json，外觀及互動由 restored-catalog.css/js 承接。這些頁面不套用新版 buyer-navigation.js，避免改寫原版版型。app-bar 和圖示回復原版，三格 blueprint 保留原圖示與標題風格，僅 App 名稱更新。既有新聞更新資料仍由原有 outlook-data.json 注入。

新版官方 Products 目錄移到 products.html，主導覽與採購規劃中的官方 SKU 深連結同步調整，製造 Wiki 及採購計算的其他改善保留。Product Studio 的原版目錄不被精簡或替換；原版目錄偏好使用 bl-cat-original，避免與官方 SKU 清單 bl-cat 混用。原有 App URL 保留，產品工作區工程 hash 不再轉離 partner.html。

先前版本已保存於 workspace 的 app-backup-before-restore，未執行 git reset 或刪除累積變更。config/build.json 原版 App 使用 originalApp 標記，Products 使用独立模板。npm run build、npm run check、npm test 與桌面／手機原版視覺檢查。沒有 push、merge 或正式部署。
