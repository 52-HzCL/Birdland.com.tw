# Supply Updates 閱讀版型

2026-10-03：使用者確認報刊示意圖，授權將 Supply Updates 實作成該版型。本輪僅調整此 App；Market Compare 與 Product Studio 保留原版外型、圖示及完整內容。

## 呈現順序

奶油紙色、深綠襯線刊頭、銅色標記與細分隔線延續原有設計。桌面先呈現三則有來源日期的重點，再閱讀台灣／中國報導及下一步檢查事項，接四項成本板。手機採兩行刊頭與直向報導，保留原圖示底部 App 切換。

首屏的資料來自現有 buyer-intelligence.json；示意圖中的文字、價格及曲線不當作真實資料。完整原始刊頭內容、路線風險與成本解讀移到 edition-context。運輸、政策、新聞、日曆、訂閱與來源欄目均保留。同一事件的重複報導收進可展開區，原文與連結仍可閱讀。

Email、RSS、列印、版本、大字模式及安裝等原控制移入 Edition actions，保留原節點與事件處理。市場選單沿用原有郵件目的地設定，不宣稱選單已篩選所有新聞。新操作字串支援既有十種語言，來源報導保留原語言。

## 資料邊界

原行情序列未提供觀測日期，畫面明示 Observation date not supplied，並將 Feed checked 時間分開顯示。來源 DELAYED 狀態保留；不可把更新工作執行時間改稱報價日期，也不可據此直接估算客戶訂單。未新增資料庫、帳戶或即時 AI 服務。

## 維護與驗證

來源模板為 tools/restored-executive_template.html，閱讀層為 supply-reading.js / supply-reading.css。每日建置仍經原 outlook-data 來源；npm run build 產生 executive.html。請勿只改輸出 HTML。

瀏覽器測試涵蓋原完整欄目、重點來源、展開重複報導、搬移後的 Email／列印／大字操作及欄目跳轉；全站既有測試持續執行。視覺檢查使用真實本機页面在 1440 與 375 像素截圖。此工作尚未推送或正式部署。
