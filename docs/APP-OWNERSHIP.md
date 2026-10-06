# 功能歸屬與 App 設計

最新狀態：2026-10-03。主導覽 Products 與 Buying tools 分工明確，不再將同一份產品目錄列為第二個 App。功能歸屬由 config/routes.json.featureOwnership 驗證，名稱與語言由 routes/languages registry 管理。

| 入口 | 唯一負責內容 | 邊界 |
|---|---|---|
| Products／產品 | 官方目錄、規格、產地、選品清單及客製入口 | 唯一完整產品瀏覽介面；不屬於 Buying tools 的三個 App |
| Supply Updates／供應更新 | 運輸、供應與政策事件的題目、日期、原始來源及新增標示 | 不放完整成本計算或進口統計圖表 |
| Market Compare／市場比較 | 目的市場及最多兩個比較市場的歷史進口統計 | 顯示實際年份；不將統計當成 SKU 報價或未來預測 |
| Purchase Planning／採購規劃 | 進口成本、補貨時間、原料趨勢及買家成本情境 | 產品選擇器及單一預覽共用 catalog.json，不另建完整目錄 |
| 客製選項 | configurator.html 的材料、製程及包裝選擇 | 從 Products 進入，Wiki 提供解釋與證據 |
| Manufacturing Wiki | 原版目錄、完整技術文章、圖片與閱讀追蹤 | 不作第二套產品配置介面 |
| Contact | 地區窗口及可複製聯絡地址 | 不自動寄信或儲存訂單金額 |

Buying tools 的三格藍圖依序為 Supply Updates、Market Compare、Purchase Planning，保留獨立圖示、箭頭及桌面／手機版型。第三格直接前往 buying-tools.html，沒有另一個重複的採購規劃連結。供應更新、市場比較及採購規劃以小型 App 切換列互通；Products 頁不顯示該切換列。

Supply Updates 保留奶油色報刊、襯線標題、銅色標記與細分隔線。先看三則消息的題目、分類、日期、來源，再展開證據；更多消息、RSS、日曆及來源備註預設摺疊。通用檢查提示留在證據內，不逐卡重複占用首屏。

Market Compare 保留深色分析工作台，桌面三個市場欄，手機精簡比較表。自己的市場突出標示，數據只呈現一次，移除重複數量柱狀圖。統計期間明示 2024 vs 2023，無資料不假設零值；不能從進口統計推斷誰搶走訂單。

Products 以工具分類展示金屬製造能力，塑膠與木頭加工標示合作能力。官方代表 SKU：BT／台灣、BC／中國。既有目錄與選品資料保留，客製入口從製造範圍進入。原 cost-desk 工程深連結暫保留相容性，canonical 客製流程為 configurator.html。

不新增資料庫、帳號或人工維護流程。原網址、安裝 start_url 及 localStorage keys 保留相容性。修改來源模板後執行 npm run build；驗證 npm run check、npm test，並視覺檢查桌面／手機。只能在明確授權後 push 或正式部署。

供應更新首屏標示資料中最新消息日期（不是本次抓取時間），每則消息用短行標示採購關聯：運費預算、進口合規、生產安排或材料成本。這是主題與採購環節的對應，不宣稱新聞已證實特定成本或交期變化。完整標題、檢查提示與原始來源可展開。
