## 2026-10-03 — Configurator language routes repaired

Nine real translated configurator pages now build from the existing UI/Wiki dictionaries and new page/structure dictionaries. Canonical option identifiers preserve selections across language changes. Products/Studio language links and state behavior: [CONFIGURATOR-I18N.md](CONFIGURATOR-I18N.md). Use npm run build or the dedicated all-edition builder; service worker v78. This supersedes the earlier missing-language-page blocker. Local only; no submission/push/deploy.

## 2026-10-03 — Buyer workflow repairs

Four local repairs completed: formal Products return, stable empty comparison slots, retained-input context review, and actual-data availability labels. Source ownership, tests and pre-existing configurator localization gap: [BUYER-REPAIRS.md](BUYER-REPAIRS.md). Service worker v77. No push/deploy.

## 2026-10-03 — Product Studio source-linked assembly concepts

User now authorizes publicly documented third-party construction for general concepts. Five new original images replace only the reviewed reference model's anatomy image; all old files/models/options remain available. Source ownership: data/studio-illustrations.json; tools/restored-partner_template.html; studio-references.js/css; ten-language captions tools/build/studio-labels.js. Canonical build embeds manifest JSON. ImagePNG originals outside repo ../catalogue-source/generated-studio; PNG and WebP hashes in manifest. Material choices use the existing generated Manufacturing material-family plate, with explicit grade/performance limitations. Old grade-specific options remain discussion alternatives, never asserted as the reference product's actual BOM. Trowel planning-area names now describe the integrated tang, receiving grip, grip end and transverse locking screw. Rake no longer claims exactly 14 tines or an ash-only shaft. Sprinkler has a closed drive housing and an explicitly unconfirmed drive assembly, rather than asserting a water turbine.

User's SKU photos (69) are not replaced or mapped to these concepts. Model switching hides image and source caption if no reviewed concept exists. No database, login, extra AI job or buyer-text persistence added. Service worker v76. See IMAGE-VERIFICATION.md for revised evidence gate and rejected pruner drafts. No push/deploy.

Manufacturing imagery (2026-10-03): nine material concepts and seven process examples integrated into the original Wiki; actual photos/technical diagrams preserved, scopes translated in ten editions. See MANUFACTURING-ILLUSTRATIONS.md. Product-specific exploded drawings remain blocked by IMAGE-VERIFICATION.md.

Latest image constraint (2026-10-03): no structural image replacement until model-specific construction/BOM verification. Generated candidates are unverified; do not wire them into the site. See IMAGE-VERIFICATION.md.

最新核准（2026-10-03）：Product Studio 已依確認的需求優先示意圖施工，詳見 [STUDIO-NEEDS.md](STUDIO-NEEDS.md)。型號／構想、用途、最多兩項優先需求與可複製摘要置於首頁；原工程工作台與參考資料完整保留於展開區。產品照片與產地共用正式 69 款目錄，不推定型號與通用工程圖的零件規格。此項優先於下方 Product Studio 原版入口的歷史說明。

最新核准（2026-10-03）：Market Compare 依已確認的模擬圖完成閱讀優化，詳見 [MARKET-READING.md](MARKET-READING.md)。深色比較工作台及奶油色本期解讀保留，完整功能收進展開區；Supply Updates 沿用 SUPPLY-READING.md，Product Studio 依 APP-RESTORATION.md 維持原版。此項優先於下方歷史方案。

最新核准（2026-10-03）：Supply Updates 依使用者確認的報刊示意圖實作閱讀版型，詳見 [SUPPLY-READING.md](SUPPLY-READING.md)。原完整欄目與功能保留；另兩個 App 持續依 APP-RESTORATION.md 保留原設計。此項更新優先於下方歷史方案。

最新使用者決定（2026-10-03）：恢復原版三個 App 的設計、圖示、版型與完整內容，只保留新名稱。以 APP-RESTORATION.md 為準，優先於先前精簡與功能去重方案。

最新導覽分工（2026-10-03）：Products 專責產品目錄；Buying tools 三 App 為 Supply Updates、Market Compare、Purchase Planning。保留三格藍圖，第三格直接進採購規劃；Products 頁移除 App 切換列。APP-OWNERSHIP.md 最後一節優先於舊版三 App 配置。

最新命名與視覺修訂（2026-10-03）：Products 與原 Product Studio 統一名稱及目錄；Supply Updates 報刊式、Market Compare 深色工作台。以 [APP-OWNERSHIP.md](APP-OWNERSHIP.md) 為準。

# 給下一位 AI 的執行指令

最新施工狀態（2026-10-02）：三個平行入口、共用產品／市場條件、精簡消息與市場比較，請以 [BUYER-INTELLIGENCE-REDESIGN.md](BUYER-INTELLIGENCE-REDESIGN.md) 為準。市場統計明示 2024 對 2023 年；即時運費及商業條件不預填。

採購工具最新施工結果（2026-10-02）：主操作已合併為成本、補貨、趨勢三個任務。舊採購網址遷移至新入口，工程深連結保留。請以 [BUYING-TOOLS-REDESIGN.md](BUYING-TOOLS-REDESIGN.md) 的流程、公式、相容邊界及驗證紀錄為準。

最新型錄整合（2026-10-02）：Products 已改用獨立模板，展示 69 個經核對的正式型號與照片。金屬製造定位、舊選款相容、世界銀行月資料及詢價／試算邊界，請以 [CATALOGUE-INTEGRATION.md](CATALOGUE-INTEGRATION.md) 為準。

使用 6.1 Sol，Medium；每次完成一項有明確驗收的小改動。先讀 AGENTS.md、docs/BUYER-ARCHITECTURE.md 與 git status，保留既有未提交變更。沿用本機分支，不對 main、既有 PR 或其他任務檔案作未要求的修改。

此網站的目標是讓買家更容易選產品、了解製造能力與聯絡窗口。保留玉綠、米白、銅色、既有字體、圖片與線稿。不要新增資料庫、帳號、後台、訂閱通知、自動報價或需要人員固定維護的服務。

## 維護順序

1. 網址、公開導覽與工具清單改 `config/routes.json`；語言清單與新增短文改 `config/languages.json`。
2. Catalog 的 SKU 改 `catalog.json`；材料與製程參考改 `data/manufacturing-options.json`。兩者不可憑名稱相似就自動映射。
3. 共用畫面改 `buyer-navigation.js`、`buyer-journey.css`；不要各頁複製導覽。
4. 工具樣式與行為改對應 `desk/` 檔案；維持模板裡的同步執行順序。計算改動要有原頁對照測試。
5. 生成頁改來源模板後執行 `npm run build`，不手改產出。Factory/Configurator 使用文件列出的專用 builder。
6. 執行 `npm run check`、`npm test`、`node tools/dev/i18n-drift.js`、相關既有驗證器。翻譯需要重建時先完成翻譯，再 stamp。
7. 回報實際改動、測試結果與限制。不要把本機通過說成已發布。

## 必須保留

- 十種語言、舊 URL/hash、舊 localStorage keys、產品詢價清單與跨頁市場選擇。
- 計算公式、資料來源日期、紅色上漲/綠色下跌意義、現有聯絡交接。
- Daily AI prompt 字串規則、JSON 欄位 allowlist、來源更新容錯。
- Guide 和詳細手冊可直接開啟；深連結會展開其容器。

不得讀出 token、登入 Cookie 或複製憑證；不碰 Outlook。同一儲存庫 main 的 push 可能直接發布，只有使用者明確要求 push/發布時才能進行。內部 Team 頁的瀏覽器 PIN 不是身份驗證。


## 全站視覺精簡（2026-10-02）

Products 預設 12 款，每次增加 12 款；搜尋與分類仍涵蓋全部 69 款。詳情與詢價清單統一使用可關閉、回復焦點的 dialog，桌面不再常駐重複側欄。製造範圍說明可展開，首頁原圖保留並提前提供產品入口。

補貨預設三項：庫存、每週銷量、包含安全緩衝的總補貨週數。展開進階設定時改用生產＋運輸＋緩衝三項，總時間欄位停用，避免混算。`buyer-tool-models.stock` 的 `mode: total` 支援新模式，舊呼叫仍使用拆分模式。未輸入交期不計算。手機有有效結果時出現摘要與查看明細按鈕；切換任務或清空無效資料時移除提示。

製造頁先看金屬製造、品質控制、OEM 合作，重用原始製程照片與圖解；所有技術章節保留原錨點並可展開。Guide、配置頁移除第二層品牌導覽；手機配置型號選單折疊。Contact 顯示官方對應窗口信箱、複製地址，`partner.html#enquiry` 直接開既有清單。沒有寄信、資料庫、公開商業條件或部署。

驗證包含建置、生成檔一致性、12 頁桌面／手機與十語言、型錄分批與選單焦點、簡易／拆分補貨一致性、手機結果、舊錨點、清單與信箱複製。另對 1440／375px 全頁及主要互動狀態截圖；截圖在 repo 外的 `../shots/review-all`。


2026-10-03：依使用者要求保留三個獨立 App 與藍圖入口，重新命名及統一圖示；Manufacturing 恢復原 Wiki 目錄與章節。最新功能歸屬以 [APP-OWNERSHIP.md](APP-OWNERSHIP.md) 及 `config/routes.json.featureOwnership` 為準。不要再將 Wiki 改為入口卡片，或以採購規劃取代三個 App。
