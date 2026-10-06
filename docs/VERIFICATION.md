# 本機驗收紀錄

最新施工狀態（2026-10-02）：三個平行入口、共用產品／市場條件、精簡消息與市場比較，請以 [BUYER-INTELLIGENCE-REDESIGN.md](BUYER-INTELLIGENCE-REDESIGN.md) 為準。市場統計明示 2024 對 2023 年；即時運費及商業條件不預填。

採購工具最新施工結果（2026-10-02）：主操作已合併為成本、補貨、趨勢三個任務。舊採購網址遷移至新入口，工程深連結保留。請以 [BUYING-TOOLS-REDESIGN.md](BUYING-TOOLS-REDESIGN.md) 的流程、公式、相容邊界及驗證紀錄為準。

最新型錄整合（2026-10-02）：Products 已改用獨立模板，展示 69 個經核對的正式型號與照片。金屬製造定位、舊選款相容、世界銀行月資料及詢價／試算邊界，請以 [CATALOGUE-INTEGRATION.md](CATALOGUE-INTEGRATION.md) 為準。

2026-10-02；基準 main `be20e6a571be5083ec321dbd34c328ca06fa12df`；施工分支 `refactor/buyer-journey`。Node 24.18.0、ThinkPad 上既有 Chrome；Python 3.12.10 官方可攜版在暫存目錄。

## 通過

- `npm run build`：共用 builder、六個模板頁、瀏覽器設定與搜尋索引。
- `npm run check`：路由、十語言短文、工程選項、14 區資料合約、生成檔精確比對、UTF-8/BOM/control 檢查。
- `npm test`：12 個公開頁 × 375/1280px；無水平溢出、無頁面 JavaScript 錯誤、無缺失本機資產；遮罩移除、產品目錄可見、十語言、搜尋/ESC、深連結展開、詢價清單重載保存、原頁成本計算輸入反應。
- `i18n-build.js`：九套既有 facade 每套 122 keys，九套 app 每套 1093 keys，兩個 runtime 語言選擇器使用 registry。
- Factory 經 `i18n-page.js build product-101.html` 重新生成九套語言頁；`i18n-drift.js`：45 個頁面全部同步。
- `verify-app-list.js`：四個公開工具從設定產生；搜尋無 Team 頁。
- `verify-material-vocab.js`：119 種既有材料名稱原樣保留，新增名稱 0。
- `verify-config-data.js`、`verify-drawings.js`：17 個產品、3 個 tiers、17 份繪圖與既有評分選項。
- `costnow-harness.js --selftest`：既有會計等式、稅費基礎、MPF 邊界等檢查。
- `verify-configurator-i18n.js`：九語言、23 介面 keys、58 選項。
- Python `compileall`；news/promo generator 自測；`build_news.py` 與 `build_terminal.py` 相容入口。
- PR workflow 內 schema/生成比對與大小預算的 Node 區塊在本機執行通過。
- `build_calendars.js` 與既有 calendar 產出一致；保留原 `@birdland.com.tw` UID，避免訂閱端重複事件。原程式使用另一個 UID 後綴但已提交 feed 仍使用舊 UID，本次同步生成規則，未改事件內容。
- Python RSS 生成 18 則新聞，feeds 無差異；完整預覽打包完成；`git diff --check` 通過。

## 量測

| 檔案 | 原始 bytes | 重構後 bytes |
|---|---:|---:|
| 工具頁來源模板 | 452059 | 105037 |
| 產品頁 HTML | 574167 | 408108 |
| 成本頁 HTML | 574155 | 253760 |

模板內容移至六份共用 CSS 與24份功能 JS；HTML 變小不等於首次載入總傳輸量同比下降。共用資產可在產品與成本頁間重用快取，产品頁增加實際 catalog 資料；本次未捏造速度分數。

## 檢查範圍

本機預覽與可攜版快照已完成；GitHub 遠端 CI、正式網域發布與實際外部資料 API 更新沒有執行。市場資料品質與所有工具計算情境並未逐一人工驗算。內部 Team 頁仍需真正的伺服器存取控制才能保護敏感資料；本次只整理公開入口。

本機 Git 未設定作者姓名與 email，commit 因此未建立；成果保存在施工分支的工作樹及暫存區。未修改使用者 Git 身分設定，未推送或部署。


## 全站視覺精簡（2026-10-02）

Products 預設 12 款，每次增加 12 款；搜尋與分類仍涵蓋全部 69 款。詳情與詢價清單統一使用可關閉、回復焦點的 dialog，桌面不再常駐重複側欄。製造範圍說明可展開，首頁原圖保留並提前提供產品入口。

補貨預設三項：庫存、每週銷量、包含安全緩衝的總補貨週數。展開進階設定時改用生產＋運輸＋緩衝三項，總時間欄位停用，避免混算。`buyer-tool-models.stock` 的 `mode: total` 支援新模式，舊呼叫仍使用拆分模式。未輸入交期不計算。手機有有效結果時出現摘要與查看明細按鈕；切換任務或清空無效資料時移除提示。

製造頁先看金屬製造、品質控制、OEM 合作，重用原始製程照片與圖解；所有技術章節保留原錨點並可展開。Guide、配置頁移除第二層品牌導覽；手機配置型號選單折疊。Contact 顯示官方對應窗口信箱、複製地址，`partner.html#enquiry` 直接開既有清單。沒有寄信、資料庫、公開商業條件或部署。

驗證包含建置、生成檔一致性、12 頁桌面／手機與十語言、型錄分批與選單焦點、簡易／拆分補貨一致性、手機結果、舊錨點、清單與信箱複製。另對 1440／375px 全頁及主要互動狀態截圖；截圖在 repo 外的 `../shots/review-all`。
