# 買家旅程：完整方案本機實作

日期：2026-10-03。依使用者本輪完整方案授權實作；只在 `refactor/buyer-journey` 的本機工作區修改，未 push、部署或實際寄信。先前未提交工作保留。

## 唯一來源與動線

- Products：仍是唯一完整官方目錄。搜尋比對、產品尺寸與產地沿用 `catalog.json`，資料來自既有 catalogue builder；不補猜材質、握柄、公差或認證。
- 首頁客製入口：Product Studio `#studio-needs`，Wiki 保留。產品詳情可帶已知 SKU 進 Studio；換 SKU 清除舊材料、製程和部件參考。
- Studio：用途、優先需求、請工程師建議與原工程工作區都保留；來源照片／概念圖不變。
- 配置器：通用工程參考，不是 BT/BC 正式 BOM。1000 是可改示例；只有快選或手填才是買家數量。希望月份屬買家要求，非工廠承諾。
- Supply Updates／Market Compare／Product Studio：原 App 識別與原內容保留。Market Compare／Planning 的起始市場需使用者選擇；缺資料仍與 0 區分。Planning 不向需求摘要讀入任何成本、毛利或研究預設。

## 摘要與接手

`buyer-brief.js`：共用 schema、清理、formatter、預覽、文字下載、暫時交接、Contact 與清除操作。`buyer-brief.css`：桌面優先版面、長摘要上方操作、次要文字預覽、基本手機及焦點樣式。

來源 adapter 在 `catalog.js`、`studio-needs.js`、`tools/configurator_template.html`，輸出 `id/source/title/selected/unknown/examples/inputs`。SKU＋尺寸作為產品專案 ID，數量不跨專案；配置器使用 canonical product／option ID。共用清理只接收白名單欄位，不接收 Contact 身分或成本欄位。

買家明選、未知／請建議、示例／參考分開。來源語言與買家文字保持原意，不自行機器翻譯；欄位與操作有十語字典。數量／備註可回來源頁修改；Contact 可移除或清空。

Contact 只有手動開啟郵件草稿：使用現有 regional mail routing。網站不建立 inbox、不上傳、不寄送、不證明送達。若編碼後摘要超過內部 6000 字元上限，只把提醒帶進草稿；全文始終可預覽、複製、下載。這個上限不是郵件程式相容性保證。

## 狀態與隱私

- 目錄公共選品與工程公共選項沿用 localStorage；搜尋自由文字不再存入 `bl-cat.q`。
- 來源頁的數量、日期與備註原則上在頁面記憶體；配置器舊 localStorage 數量／日期在載入後移除，不把示例當已確認數量。
- 明確按「帶到 Contact」才將白名單摘要寫到目前分頁的 `sessionStorage.bl_enquiry_handoff`，30 分鐘到期。這是使用者授權交接所需的暫時資料，不是長期草稿庫；複製分頁的瀏覽器可能複製分頁狀態，不能承諾跨分頁絕對隔離。
- 配置器按語言連結時用一次性 `bl_cfg_tab` 保留選項、數量與希望月份；同樣 30 分鐘，下一頁讀取後移除。不是默默儲存未交接的所有頁面輸入。
- 聯絡人身分、電話、Email、公司名稱和成本試算不由新摘要系統收集／儲存。
- 清除網站偏好使用固定 key 白名單，不呼叫 `localStorage.clear()`、不清 internal gate 或其他工作的資料；也會重設目前採購試算與來源輸入。不能刪除已下載檔、剪貼簿或郵件。
- 過期／損壞／儲存被拒有安全狀態；拒絕交接時留在預覽，提供全文備援。

## 建置與驗收

共用標籤來自 `tools/build/brief-labels.js`；canonical registry builder 組合現有字典。公司頁使用原 `i18n-build`，配置器使用專用 builder。修改來源，不手改各語言成品。

```
npm run build
node tools/dev/build-p101.js
node tools/dev/i18n-page.js build product-101.html
node tools/dev/i18n-build.js
node tools/dev/i18n-drift.js --stamp
npm run check
npm test
node tools/dev/buyer-journey-check.js
node tools/dev/buyer-repairs-check.js
node tools/dev/configurator-i18n-check.js
npm run preview:package
```

依有無改公司／Wiki來源執行對應專用 builder。若 test 失敗要停止交付，不以後續指令的成功代替前面失敗。

新增瀏覽器驗收：1440／375px 共16組，涵蓋新客／老客／客製、同 SKU 兩尺寸與不同型號、來源修改／移除／換語／reload、未知規格與示例、郵件呼叫攔截、長全文、剪貼簿／Storage 拒絕、30 分鐘逾時與損壞、其他工作 key 保留、十語、焦點迴圈和文字安全。測試文字明標 SYNTHETIC TEST，未實寄。

其餘證據在 repo 外 `../site-audit/three-role-review/`：結果 JSON、代表截圖、同 Chrome／1440px／各頁兩次量測的 before／after JSON。實際毫秒受本機波動，不能推算轉換、黏著或營收。新摘要有素材成本，沒有虛稱網站速度提升。

## 邊界與回滾

仍待公司提供：自製／合作／裝配細項、批准規格與認證、Hunting 品類及對外數字依據、接手責任與回覆時限。本輪不新增相關正式主張或商業承諾。

未驗證：真實郵件客戶端／送達、母語審校、真人買家研究、Safari／Firefox、正式環境與 PWA 離線更新。Chrome 功能與來源完整性測試不等於這些專案。

施工前完整本機來源副本在 `../site-audit/three-role-review/before-implementation.zip`，不含 `.git` 或 node_modules。它包含施工開始時既有未提交內容。只按本輪變更清單恢復需要的檔案；不要整包覆蓋後來的新工作，不使用 git reset 清掉累積修改。12頁提案保留在 Library 版本1；本機 `expanded-proposal.html` 與相應版本副本保留。
