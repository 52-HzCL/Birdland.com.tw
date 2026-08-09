# Birdland.com.tw — Zero-Touch 全站稽核報告

> 狀態:**進行中**(STATE 2 逐頁稽核中,5/15 頁完成)。本檔會隨 `/loop` 每輪執行
> 持續更新,不是一次性產出。啟動分支:`audit/zero-touch-review`,基準 commit `fbe1d0e`。

---

## 🔴 P0(置頂,鐵律 5:P0 發現即置頂)

**`teamdesk.*`(team.html 的 AI 生成客戶供應鏈建議、原物料動向等內容)已連續靜默凍結
8-9 天,現在正在發生,任何監控/CI 都偵測不到。**

- **根因**:`tools/gen_news_gemini.py:223-230` 合併 Gemini 每日回應時,若當天回應沒有
  (或回傳空的)`teamdesk` 子物件,五個欄位(`usdtwd_view`/`materials`/`regnews`/
  `advice`/`updated`)全部靜默沿用前一天舊值——且這條路徑印出的是「成功」訊息,不是例外
  分支,`status.sources` 也沒有 `teamdesk` 專屬的健康狀態可以暴露。
- **證據**:逐一比對 `outlook-data.json` 過去 12 個每日 commit,`teamdesk.updated` 卡在
  `01 Aug 2026` 整整 8 天(而頂層 `updated` 與確定性欄位 `teamdesk.materials2.updated`
  都正常每日前進);往前追查還發現過一次 4 天的凍結(07-25→07-30)——不是單一僥倖事件。
- **為什麼是 P0,不是 P1**(裁決 D21):與這次稽核找到的其他 P1 不同,這個問題**不需要
  任何特定使用者行為觸發**,凍結期間的每一次頁面瀏覽都無條件受影響,而且受影響內容是
  設計上直接「複製給客戶」的文字(`team.html:547` 的「📋 複製給客戶」按鈕)——業務人員
  可能在毫無警覺下把過期一週以上的建議送給真實客戶。渲染層本身誠實顯示了舊時間戳,問題
  完全在上游資料管線,不由稽核迴圈修改(`tools/gen_news_gemini.py` 是站台程式碼)。
- **建議修法方向**:比照頂層 `status.sources` 的模式,給 `teamdesk` 合併結果也記錄一個
  新鮮度狀態(`current`/`delayed`),`new_td` 缺漏或空白時明確標記,而非靜默視為成功。

---

## 🟠 站台級發現(P1,但影響面跨頁,置於顯著位置):Facade 頁的「Factory」導覽在全部 9 語言靜默跳出當前語言

**這不是某一頁的獨立 bug,是 i18n 建置管線本身的問題,影響 `index/about/contact/privacy`
四個 facade 頁 × 9 個語言 = 36 個檔案,加上 `product-101.html` 自己 10 個語言版本反方向
也受影響。** 在稽核 about.html 時發現,已用 Playwright 即時點擊多個語言版本驗證,非只讀碼。

**兩個必須一起修的耦合 bug(裁決 D30,合併呈現)**:

1. **正向**:`tools/dev/i18n-build.js:88` 的路徑升級 regex,把 `product-101.html`(現在
   確實有逐語言版本,`BUILT_PAGES` 陣列自己都承認)誤歸類成跟 `guide.html`/
   `executive.html`(真正只有英文版)同一類「一律升級到根目錄」的頁面。結果:任何非英語
   訪客在 `de/about.html`、`de/index.html`、`de/contact.html`、`es/about.html` 等任何
   facade 頁點擊「Factory」,都會被靜默導到英文版 `product-101.html`,不是 `de/
   product-101.html`。已對 4 個語言/頁面組合逐一即時點擊驗證,100% 重現。
2. **反向**:`tools/dev/i18n-page.js:131` 的對應 regex 有同一種問題,方向相反——
   `product-101.html` 自己 10 個語言版本裡的 About/Contact/Home 連結(甚至標了
   `aria-current="page"` 的 Factory 自我連結)全部也被拉回英文根目錄。一個訪客只要點過
   一次「Fabrik」或反向從 Factory 點「Wir」,就會被靜默、永久留在英文,直到自己重新點
   語言選單。**這部分屬於 `product-101.html` 自己的 STATE 2 分派範圍(目前因 PR #1 延後
   完整稽核),但證據已經到手,依裁決 D31 先記錄,待該頁完整稽核時確認範圍。**
3. **潛伏的耦合地雷**:`about.html` 的 `#pure-play` 錨點在英文版已於 `e2c87a8`(2026-08-07)
   修正為正確 id,但這個 rename 從未傳播到 9 個翻譯版本(仍是舊的 `id="brand"`)——因為
   i18n-build.js 的翻譯機制是「英文子字串→譯文子字串」的字串取代,`id=` 屬性不是自然語言
   文字,沒有對應的取代規則。**今天這個問題「碰巧」沒有症狀,正是因為上面的正向 bug 把
   所有指向 `#pure-play` 的連結都拉去了英文版(剛好是修好的那個)**——這意味著單獨修正向
   bug、不同時把 `id="brand"→id="pure-play"` 的 rename 補進 9 份翻譯檔案,會讓 e2c87a8
   原本修的舊症狀在全部非英語版本重新出現。

**為什麼是 P1 不是 P0(裁決 D29,已用於修正本檔的 P0 判準敘述)**:這個 bug 比 D15/D16
更「無條件」(不需要任何特殊使用者行為序列,任何非英語訪客點一次 Factory 就 100% 中招),
但訪客看到的仍是**完全正確、完整**的內容,只是語言退化成英文——不是像 D21 那樣客觀錯誤的
資訊觸及真實第三方。P0 的判準現在明確寫成「無條件成立」**且**「後果涉及客觀錯誤資訊或
資料遺失/外流」兩者兼具,單有前者不夠格。

**與既有已完成記錄的關係(裁決 D30 附帶說明,非推翻)**:`index.html`/`contact.html` 已完成
的稽核結論「導覽全部正確」測的是英文版本身與語言切換器本身,沒有測「切換到某語言後再點
Factory」這條路徑——這正是這個 bug 發生的地方。兩頁的結論本身仍然成立(測過的東西是對的),
只是**範圍不包含這條路徑**,見下方 index.html/contact.html 段落已補的交叉參照。

**建議修法方向(不由稽核迴圈執行,`tools/dev/i18n-build.js`/`i18n-page.js` 是 build 腳本,
屬站台程式碼)**:`i18n-build.js:88` 移除 `product-101\.html`;`i18n-page.js:131` 需要知道
`index/about/contact/privacy` 已經是逐語言檔案不該一律升級;兩者修的同時,必須把 9 份
`i18n/facade.<lang>.json` 補上 `id="brand"→id="pure-play"` 的 rename,三處一起處理,不要
分開排期。

---

## ⚠️ 風險提醒(置頂,勿移到文末)

**本機分支 `i18n/my-market-composed-sentences` 有 4 個獨有 commit 從未 push 到 origin**,
內容是真實完成的工作:
- My Market 九語翻譯(composed sentences 可翻譯化)
- `gen-terminal.js`(Node)與 `tools/build_terminal.py` 的邏輯一致性修復
- `ISSUES.md` I-1(Team gate 文件化)/ I-2(`birdland-intro.html` 孤兒頁刪除)的修復
- 四個桌面 app 的功能稽核修復(重複新聞去重、非 schema 的 source_tier、政策動作不匹配、
  duty 模型分歧、運價比對、FOB 下限負值、My Market classify() 分類桶、土耳其佔位字元
  外洩、unpin 功能、翻譯缺漏 6 處)

這批工作目前只存在於這個執行環境的本機 clone。依 `AGENTS.md`「絕不 push 除非老闆這一輪
明講 push」的鐵律,**這個稽核迴圈不會主動 push 它**——但執行環境的容器是暫時性的,
存在真實遺失風險。若你想保留這批工作,請明確說「把 `i18n/my-market-composed-sentences`
也 push」。

---

## 總覽

| 類別 | 數量 |
|---|---|
| 新發現 P0 | 1(`teamdesk.*` 資料管線靜默凍結,見報告最上方) |
| 新發現 P1 | 7(1 個已修復的文件訂正、1 個 NEEDS HUMAN 設計取捨、1 組跨頁 facade i18n 導覽 bug(2 個耦合子項合併計 1)、4 個真實功能/內容 bug——依鐵律 2 全部只留建議,不由稽核迴圈修改站台程式碼) |
| 新發現 P2 | 18(SEO-2、index.html 字級差異、contact.html×2、partner/cost-desk×6、team.html×2、about.html×2、guide.html×4,其中 6 項已收錄 CLEANUP.md C6-C11) |
| 已知議題(承接自前 4 輪稽核) | 12 項,詳見 `AUDIT_STATE.json` 的 `knownIssues`(7 開放/待覆核、5 已關閉) |
| 本次啟動前 recon 已直接處理 | 2 項(見下) |

**P1 快速索引**(全部細節見下方逐頁段落):
1. Hero `[data-ink-main]` opacity 設計取捨(index.html,NEEDS HUMAN,D9)
2. AGENTS.md 三處文件訂正(index.html + partner/cost-desk,**已修復**,D5/D8/D11/D13)
3. contact.html region 選擇靜默被覆寫(D15,真實 bug,建議修法已記錄)
4. contact.html 9 語言 desk 名稱競態(D16,真實 bug,建議修法已記錄)
5. cost-desk.html 品牌重命名漏三處(建議修法已記錄)
6. partner.html 分享功能靜態資料誠實標示不足(D14,真實內容問題,建議修法已記錄)

## 本次啟動前 recon 已直接處理的項目

這兩項是在建立這個稽核迴圈之前的準備階段發現並處理的,不計入「新發現」,列在這裡是為了
交代來龍去脈:

1. **terminal.json 索引落後於 product-101.html 新增的兩個 section**(`s-qc`「Quality
   control and testing」、`s-fix`「Where a specification usually goes wrong」)。
   `gen-terminal.js` 是靠掃描 `product-101.html` 的 `.wk-toc` 現場建索引,PR #1
   (`factory/qc-and-troubleshooting`)新增這兩個 section 後沒有跟著重新產生。已重新產生
   並 push 到該 PR 分支(commit `35657ff`),通過 `verify-material-vocab.js`(0 個未經
   造字的新材料名)與 `verify-desks.js`(29/29)驗證。**這屬於 PR #1 自己的維運責任**,
   不是這個稽核迴圈的產出,只是提前修了以免 STATE 2 重複發現。
2. **`calendars/*.ics`(全部 7 個檔案)與 `tools/build_calendars.js` 現行輸出漂移**——
   UID 尾碼格式(`@birdland.com.tw` → `.birdland-public-calendar`)與換行符
   (LF → CRLF)都變了,但已 commit 的 7 個行事曆檔案沒有跟著重新產生。已確認在
   `main@fbe1d0e` 上直接重現,與 PR #1 或任何在途工作無關,已在 PR #1 留言說明一次
   (依「pre-existing failure 只講一次」protocol)。**STATE 2/C 必須檢查 `feeds/*.xml`
   是否有同類漂移**——兩者用完全相同的 CI 關卡模式(build 完 `git diff --exit-code`),
   目前尚未驗證 feeds 是否也中招。

## STATE 2 進度

- **已完成(A-F 全部跑完):`index.html`、`contact.html`、`partner.html`、`cost-desk.html`、
  `team.html`**。
- `executive.html` 進行中(已派工)。其餘 9 頁尚未開始。`product-101.html` 刻意延後
  (PR #1 正在改動中)。

## contact.html 逐項發現(全站真正的轉換點)

**P1-1(D15,真實功能性 bug,非文件問題)**:訪客在 contact.html 本頁自己選了非預設 region
(如 UK、Americas),若沒有當場送出、之後才回訪,選擇會被**靜默蓋回 Global**——根因是
`context.js:82,86` 每次頁面載入都無條件用一個 contact.html 從未寫入的欄位(`room`)反推
覆寫 `bl_mr_region`,不是只有「.set() 被呼叫時」才觸發。已用 5 組情境 + 完整 mailto 攔截
實測驗證,唯一「看起來沒事」的情況(從桌面 app 帶 context 進入)只是巧合——覆寫的值剛好
等於訪客要的值。**裁決(D15)**:根本修法是讓 `context.js` 的初始化期 `persist()` 也比照
`.set()` 一樣有變更偵測,不是讓 contact.html 反向回饋(該方案已被原設計者的既有註解明確
排除,因為 4 個路由 region 對 7 個桌面 room 沒有唯一反向映射)。**裁決(D18)**:維持 P1
不升 P0——需要兩階段情境才觸發,且誤送目的地仍是 Birdland 真實監控的歐洲總桌,不是黑洞。
不由稽核迴圈修改 `context.js`(共用檔案,影響所有讀 blCtx 的頁面)。

**P1-2(D16,真實功能性 bug)**:9 個非英語版本在「回訪且已記住非預設偏好」情境下,desk
名稱可能顯示錯誤——`hunting` 產線在全部 9 語言永久卡英文(裸鍵字典裡不存在);
`Americas`/`UK &amp; Commonwealth` region 在 7 個語言顯示文法錯誤的詞形(如德文用名詞
「Amerika」而非形容詞「amerikanischen」)。根因是 `i18n.js` 的字典 fetch 是非同步的,
但 contact.html 在 DOMContentLoaded 當下就同步呼叫 `deskName()`,字典未就緒時回退英文
裸字,能不能事後被 `translateText()` 二次掃描修正,純屬「裸鍵剛好跟命名空間鍵同形」的巧合
(對照組 `European` 兩者相同,因此不會露餡)。這個檔案曾為同一類問題修過兩輪
(`6223819`/`d1a81f6`),但兩次都是手動載入頁面驗證,系統性漏掉「回訪者」這個時序組合。
**裁決(D16)**:根本修法是讓首次 `sync()` 等字典載入完成才執行,不是逐一補缺字典鍵
(補鍵治標,新增選項還是會中招同一顆競態)。不由稽核迴圈修改。

**P2**:「Europe」下拉選項在全部 9 語言字典缺漏,恆常顯示英文(裁決 D17:該補,但 i18n
字典檔不算 ORCHESTRATION.md 的文件修正例外範圍,留給人執行,列入快速勝利清單)。
`i18n-drift.js` 的 SHA-1 指紋含 `?v=` 快取版本號,導致「只換版本號沒換內容」也判 9 個
語言版本 STALE,且會在未來每次共用資源版本 bump 時重演(裁決 D19:可改,建議指紋只算
可翻譯文字內容,不由稽核迴圈修改工具本身)。

> **範圍補註(about.html 稽核後追加,非推翻)**:下方「導覽/語言選單/麵包屑全部正確」測的
> 是英文版與語言切換器本身,沒有測「切換語言後點 Factory」——該路徑有站台級 bug,見報告上方
> 「🟠 站台級發現」段落。

**通過(A-E,14 項)**:郵件路由核心映射邏輯(6 組 region×line 組合,含歷史 bug 類別
「政策動作不匹配」的回歸測試)完全正確,含 hunting 產線的路由覆寫規則;反爬蟲設計(揭露前
零網址字串洩漏);reveal 後即時更新;導覽/語言選單/麵包屑全部正確;Terminal chip 與
index.html 行為一致;不消費 `outlook-data.json`;無情境與有情境(桌面 app 帶入)兩種進入
路徑皆正確;`product-101.html` 確認是中性中繼站(不傳遞也不清空 context);line 欄位不受
P1-1 影響;導覽殼與設計 token 與 index.html 一致;GLOSSARY 鎖定詞「OEM」正確保留。
**Console:僅同一個沙盒 Chromium 憑證問題,零其他錯誤,375px 零橫向溢出。**

**F(架構,Opus,見 DECISIONS.md D20)**:此頁兩個 P1 雖症狀不同,根因都可歸因於「多個
獨立載入的 script(`context.js` 無 defer、`i18n.js` 非同步 fetch、`mail-routing.js` 有
defer)之間沒有顯式的『準備好了』協定,正確性目前靠 script 標籤屬性的巧合排列」。**暫定
可改(WATCH),設下明確升級門檻:若下一頁稽核又發現第三個同根因的獨立案例,就要升級為
必改並提出集中式初始化協定的具體設計。** 目前計數:2/3。

## partner.html + cost-desk.html 逐項發現(共用 partner_template.html,合併稽核)

**P1(cost-desk.html 專屬)**:CostNow 品牌重命名沒做完整——`partner_template.html:2198`
(`aria-label="AsiaSource sections"`)、`:2933`(`aria-label="AsiaSource navigation"`)、
`:2955-2956`(選單收合鈕文字硬寫死 `"Open AsiaSource menu"`,預設就會顯示)三處共用外殼
文字仍寫死「AsiaSource」,即使同檔案幾百行外的 `isCost` 重命名區塊(:2751-2764)已經正確
處理了標題/麵包屑/徽章/主題色四項。等於一個真實付費客戶工具在自己的導覽列自稱錯了名字。
**建議修法方向(F,不由稽核迴圈執行)**:重命名邏輯目前散落在個別字串字面值,建議集中成一個
以 `BL_DESK`/`isCost` 為 key 的桌面顯示名稱查找表,避免未來第三種桌面模式重複同一種
「漏改幾處」的失誤。

**P1(partner.html 專屬,D14)**:「分享給同事」功能把桌面設定的靜態預測曲線
(`P.material.series`)用跟即時指數相同的句型帶出(「Steel HRC (blades) is currently
index 101.2 (-0.6%).」),只有頁尾一句通用免責聲明,無逐項新鮮度標示。這是寄給站外真實
第三人的內容。**裁決:維持 P1(見上方裁決表 D14),`docs/DATA-SCHEMA.md` 自己把「誠實標示
靜態資料」列為兩條最重要規則之一,通用免責聲明不能取代逐項標示。**

**已修復(文件訂正)**:`AGENTS.md`「PIN gates bypass in dev」提到的 `bd_partner`
已失效——partner.html/cost-desk.html 的 PIN 閘門已在 `6fd00c1` 徹底移除(三種方式獨立
驗證),已訂正文件並同步更新 `AUDIT_STATE.json` 的 `S1-S2` 已知議題(team.html 部分不受
影響,原判維持)。`AGENTS.md` 描述「`P.shipping` 不能餵進 `lineChart`」的警告已訂正——
全庫 grep `lineChart` 零匹配,消費該資料的區塊本身已被標記「retired outright」。`ISSUES.md`
I-7 已加註(沿用該檔自己的「加註不刪除」慣例):遮蔽的元件從 `desk-banner.css`(已不在這
兩頁載入)變成 `app-bar.css`(現為 5 頁共用),影響面擴大但仍非緊急。

**P2(6 項)**:三項已收錄 `CLEANUP.md`(C6-C8,tier A 死碼:11 個指向已「retired outright」
區塊的 `bentofy()` 呼叫、完全沒被使用的 `.wl`/`.tm` 表格樣式、視覺上已被 CSS 藏起來且有
一段永遠打不到的舊手風琴 click handler)。其餘三項:cost-desk.html 沒有安裝提示 UI(低
嚴重度,webmanifest 本身仍正確連結);`?q=` deep-link 只有 partner.html 支援,cost-desk.html
by design 沒有(搜尋面板已正確處理跨桌導向,不是遺漏);Terminal chip 在四個閘門桌面全部
不存在(`desk-banner.js` 提供,但四個桌面模板都不載入 `desk-banner.css`/`.js`)——確認
`SUMMARY.md`「Still open」提到的 Team Desk 沒有 Terminal 面板其實不是 Team 專屬,四桌皆然。
partner.html/cost-desk.html 這兩頁確認有替代的指令面板搜尋(`.pd-omni-btn`)。**訂正
(D22)**:先前這裡誤寫成「四桌都有」——team.html 稽核後確認全站 grep `.pd-omni-btn`
零命中,team.html **沒有**任何 Terminal 替代品;executive.html 待驗證,不應假設對稱。

**通過(A-E,13 項)**:單面板 router 不變式(任一時刻恰好一個面板可見)在全部導覽項目、
兩種寬度、reload、上一頁下皆正確;`?q=420J2...#pd-builder` 深連結正確;重複 spark 尾端點
的 `chg` 修正在三處獨立實作皆一致套用;色彩語意(漲=紅=壞、buyer-cost 語意)兩頁一致;
375px 零橫向溢出;`P.shipping`→`lineChart` 崩潰風險經確認不可重現(機制已不存在)。
**Console:僅同一個沙盒憑證問題,零其他錯誤,兩頁、兩種寬度、約 25 次導覽測試全部確認。**

## guide.html 逐項發現(0 P0/P1,第二個乾淨的頁面)

**P2(4 項,全新)**:`site-shell.css:5` 也獨立遮蔽 `--line`(又一個與 tokens.css 原值不同
的第三種寫法),已併入 D28 的 I-7 追蹤證據,不算獨立議題。`tools/news_template.html:16-72`
約 24 個舊版「OEM control map」相關死 CSS + 2 個未用的 `@keyframes`(已收錄 CLEANUP.md
C11,含清理陷阱提醒)。**guide.html 內嵌了整份 94KB 的 `outlook-data.json`(頁面總重
121KB 的 78%),但頁面完全不消費它**——這是套用桌面 app 共用建置管線(`tools/dev/
build.js` 對所有 `__DATA__` 樣板一律替換)的副作用,`news_template.html` 其實不需要。
低風險、易修、效益明確,列入快速勝利清單(仍不由稽核迴圈執行,build 腳本屬站台程式碼)。
`site-shell.js` 的效果永遠被稍後執行的 `desk-banner.js` 蓋掉,已收錄 CLEANUP.md 反向清單
R2(與 R1 不同性質,見下方 CLEANUP 段落——刪除不會馬上出事,只是拿掉一層備援)。

**已修復(裁決 D32)**:`ORCHESTRATION.md` 自己 STATE 1 的頁面分類表誤把 `guide.html` 列在
「手寫靜態」,實際是 `tools/news_template.html` 建置產出——已訂正(這是稽核迴圈自己的
文件,訂正風險比 AGENTS.md 更低)。

**通過(A-E,含 Guide 截圖新鮮度這個本頁專屬的重點檢查)**:重新執行 `gen-guide-shots.js`
的確切截圖流程,拿當前站台的即時畫面跟已 commit 的截圖逐一比對結構/內容(非像素差異——
沙盒缺字型會製造大量無意義的像素差),**7 張截圖目前都還沒過時**,即使部分被截圖的頁面
(尤其 partner.html、My Market)截圖日期之後有大量改動——原因是截圖只拍冷啟動預設畫面,
新功能都在截圖從未涵蓋的分頁/面板上,所以還沒有「該過時卻沒過時」的情況,但 `SUMMARY.md`
記錄的這個風險本身依然成立,只是尚未發作,值得持續留意。build 逐位元組核對零落差;
Terminal/About 選單/語言切換(含動態注入內容的即時翻譯)/文字放大全部正確;D17「Europe」
缺字典鍵確認不適用此頁(無 region 選單)。**Console:僅沙盒憑證問題,零其他錯誤,375px
零溢出。**

**D20/D33 追蹤**:確認 bug 計數維持 2/3。發現 `text-size.js` 錨點偵測邏輯的第二個受影響
頁面(搭配 `desk-banner.js`,team.html 那次搭配的是 `app-bar.js`)——**裁決(D33):不算
次要計數器的第二次獨立累加,合併成 `text-size.js` 自己的獨立追蹤項**(根因單一、修法
明確:讓它用 `MutationObserver` 或重試機制等錨點出現,而非一次性雙重嘗試),因為這是
單一元件的防禦性寫法不夠周全,不是 D20 想追蹤的「完全沒協定、純靠巧合」那種架構級脆弱。

## about.html 逐項發現(P1 見上方「🟠 站台級發現」,此處只記本頁專屬項目)

**P2-1**:`why-birdland.html`(與 `manufacturing.html`,旁證)缺 `&lt;link rel="icon"&gt;`,
造成每次載入一個瀏覽器預設 `/favicon.ico` 404——這是已關閉議題 I-3 修復時漏掉的兩個檔案
(該次修復清單有 about/birdland-intro/contact/cost-desk/executive/news,沒有這兩個),
不算 I-3 重開,是同一輪修復的獨立遺漏。純 console 雜訊,不影響 redirect 正確性。

**P2-2/P2-3(已收錄 CLEANUP.md C10)**:`about.html:19-42` 的 `.bd-numbers`/`.bd-boundary`
等六組 CSS(舊版「雙欄盾牌」設計殘留,現在的三聯圖版式已不用)在全部 10 語言版本零使用,
合計約 29KB 死碼;其中一個顏色(`#ece7dc`)与 `--paper-2` 僅差 Δ14,`snap-color.js` 判定
為同色異寫,此項為 C10 死碼區塊的子項,一併清除即解決。

**通過(A-E,含即時驗證)**:語言選單與 index.html 結構逐字元 diff 完全相同;`#pure-play`
錨點(英文版)即時驗證正確落地於「Your brand, protected.」真實內容;
`why-birdland.html→about.html#pure-play` 端到端 redirect 正確;純靜態內容,不消費
`outlook-data.json`/`terminal.json`;hreflang 11 標籤 9 語言逐一即時查詢確認;GLOSSARY
鎖定詞「OEM」在英文版與 9 翻譯版本各出現精確 6 次未被誤譯;`snap-space.js`/`snap-type.js`
0 筆偏移;375px 零溢出。**Console:僅沙盒憑證問題 + 上述 P2-1 的 favicon 404,零其他錯誤。**

**D20 追蹤**:結構性排除(this page 的 header/nav/語言選單全是靜態 HTML,不像桌面 app 由
`app-bar.js` 動態插入,不存在「A 腳本插入 DOM、B 腳本假設已存在」的競態類別)。維持
2/3,反向清單無新候選。

## executive.html 逐項發現(ABrief 桌,本頁乾淨,零 P0/P1)

**這是目前唯一一頁零 P0、零 P1 的稽核結果**——四桌功能稽核當初修過的三個相關 bug 類別
(重複新聞去重、政策動作不匹配、非 schema source_tier)在此頁都重新驗證為「仍然修復」或
「不適用」(duty 模型分歧是 cost-desk.html 專屬,此頁沒有相關程式碼)。`D.partner.*` 誤讀
陷阱在此頁**結構上不可能發生**(全檔案零 `D.partner`/`P.` 相關字串,不只是行為上沒犯,
是根本沒有機會犯)。重複 spark 尾端 `chg` 修正兩處獨立實作皆正確套用且逐筆核對數字正確。

**P2(3 項)**:D17「Europe」缺字典鍵確認也影響此頁(同一套 `mail-routing.js` 機制,裁決
不變,列為既有議題擴大範圍,非新議題)。`mail-routing.js:62` 的 `TAGS.brief` 註解只提到
AsiaSource,沒提到 executive.html 也用同一個 tag(純註解落差,不影響功能)。**新發現一種
先前沒遇過的類型(裁決 D27)**:`daily-journal.css:22-23` 的 `.top{position:relative}`
規則表面上看像多餘的重複宣告,實際上是防止 D20 那類 race 真的發作的關鍵——已加入
`CLEANUP.md` 的「反向清單」明確標記不可移除。

**F(架構,重要新資訊,裁決 D28)**:I-7/`app-bar.css` 的 token 遮蔽問題現在有三頁實測
數據:executive.html 未遮蔽、正確渲染 tokens.css 原值;partner.html 與 cost-desk.html
各自遮蔽成不同值,連兩者互相都對不上。**建議修法方向精化**:不是「挑一個新共用值」,是
「移除 partner/team 模板各自的遮蔽,回歸已經在 executive.html/my-market.html 上驗證正確
的 tokens.css 原值」。

**D20/D24/D27 追蹤**:確認 bug 計數維持 2/3(執行代理特別用執行順序埋點 + 人工延遲兩種
方式主動尋找第三個案例,兩個最像的候選都沒有產生真實失效)。「脆弱但正常」次要計數器
新增一項(此頁的 edstrip/app-bar 近似案例),目前計數 2。

## team.html 逐項發現

**P0**:見報告最上方,不重複。

**已知議題現況更新**:I-1(PIN 明文比對、View Source 可破解)現場重新驗證仍然為真,
且更精確——連 PIN **比對邏輯本身**也是明文可讀,不只是內容外洩(依 ISSUES.md 慣例不
重複寫出實際 PIN 字串)。四種閘門情境(繞過/reload/上一頁/全新 session)全部行為正確。
`docs/DATA-SCHEMA.md` 的 `teamdesk.*` 欄位參考缺 `shipping`/`fx_forecast` 兩個實際大量
使用的欄位(裁決 D25:不主動訂正——該文件已自我免責聲明「有機成長,請以 JSON 為準」,
不是誤導性錯誤,優先度低於其他文件落差)。

**P2(2 項,新發現)**:`team_template.html:10-11` 引入的 `--pos`/`--neg` 語意色彩命名
(比照 I-7 的 token 遮蔽模式,但用新名字而非沿用既有名字)**從未真正生效**——同檔案下方
複製自 partner_template.html 的 `!important` Kubera-skin 覆蓋層永遠贏過它,最終渲染色
其實正確符合全站 BUYER-COST 語意(漲=紅=壞)。問題在於：未來工程師只看
`:10-53` 這段命名會誤判方向相反,已收錄 CLEANUP.md(見下)。另一項:報價試算機
`#qo_fx` 的正負號顏色提示(`fe.style.color=...`)被 `.kv b{color:...!important}`
規則靜默蓋掉,數字本身正確,只是輔助色彩失效。

**通過(A-E,含四種 PIN 閘門情境、build 逐位元組核對零落差、色彩語意最終渲染正確、375px
零溢出)**。**Console:僅同一沙盒憑證問題(這次打在 Google Fonts 與 open.er-api.com 兩個
端點,同一根因),零其他錯誤。**

**F(架構)**:team.html 的單面板路由不支援 reload/上一頁狀態持久化、無深連結,與
partner.html 的同類路由能力不對等——**裁決(D23):接受為合理簡化,不列入待修清單**,
內部營運工具與對外形象儀表板本來就該有不同工程投入。另發現一個結構上與 D20 相同(script
載入順序無顯式協定)的第三個實例(`text-size.js`/`app-bar.js`/`i18n.js` 的協調鏈),但
**目前實測運作正常、無伴隨失效**——**裁決(D24):不觸發 D20 升級門檻**(門檻文字明講
「bug」,不是「結構相似的脆弱模式」),另開「脆弱但正常」的獨立追蹤,目前計數 1。

### index.html 逐項發現

**P1-1(NEEDS HUMAN,設計取捨非技術 bug)**:桌面版(>900px)首頁英雄區三句核心賣點文案
(`[data-ink-main]`,"MAKE IT RIGHT"/"KEEP SUPPLY MOVING"/"KEEP IT YOURS")靜止時
`opacity:0`,只有滑鼠 hover/click/focus 對應區塊才顯示——`birdland-visual.css:984`
(基礎規則)vs `:998`(`.is-near`/`.is-intro`才變 1)。這是 `5de128e`(2026-07-31,修復
「三個賣點在有人 hover 進 260px 內之前都是 opacity:0」的舊缺陷)後,`7d87c09`
(2026-08-03)明確且刻意的美學取捨(commit message 自述是為了恢復「游標遮罩火把」互動),
不是失手回歸。緩解因素:`<h1>` 標語所有寬度恆常可見(不像修復前);每 session 一次自動
輪播閃現;行動版(<900px,`birdland-visual.css:1139`)強制永遠可見,完全不受影響。
**裁決(DECISIONS.md D9)**:不視為必須修復的 bug,不代為決定要不要復原這個設計選擇——
列在這裡供人參考,備選方案是仿照 `.bl-ink-marker` 已經用過的做法(給非零低基礎透明度如
0.32,而非完全 0),但不預設答案。`SUMMARY.md`「the three propositions...are simply on」
一句現在對 main 已經不準,但依 D1 該檔是歷史紀錄不訂正,此處註記即可。

**P1-2(已修復,文件訂正)**:`AGENTS.md`「index.html specifics」整節(foliage-cut 功能、
reading-focus 捲動縮放、hamburger 選單)描述的功能已在 `6fa66ad`(2026-07-28 全站重建)
全部移除,全庫 grep 零匹配舊 class/key。連帶第 86 行 storage namespace 範例
(`bl_intro_seen`/`bl_fol_cut`)也是錯的,實際 key 是 `bl_ink_intro`。**已於本分支訂正**
(裁決見 DECISIONS.md D8),同時也把 STATE 1 已裁決但尚未執行的 D5(news.html/guide.html
建置描述、`cost-desk.html` 遺漏、範例指令本身跟不上 `__DESKMODE__` 替換邏輯)一併落實。

**P2**:桌面 1440×900 實測 11 種相異字級,`SUMMARY.md` 聲稱「10」——裁決(DECISIONS.md
D10)不追查,差距小且無可比對量測腳本,11 本身遠低於改版前的 80 種,不構成疑慮。

**已知議題確認(非新發現)**:`birdland-visual.css:1` 的 Google Fonts `@import` 是
render-blocking(I-4 的同一根因,首頁只觸發 1 個請求/3 字族,比 partner/cost-desk 輕,
`display=optional` 如 SUMMARY.md 決策 #2 所記)。

> **範圍補註(about.html 稽核後追加,非推翻)**:下方「通過」項目測的是英文版本身的導覽,
> 沒有測「切換語言後點 Factory」這條路徑——這條路徑有一個站台級 bug,見報告上方「🟠 站台級
> 發現」段落。

**通過(A-E,共 12 項)**:全站 7 個導覽連結皆可達且行為正確;語言選單 10 語言 + hreflang
11 標籤與 `_langs.js` 逐一對應;`tm-chip` 是純觸發鈕不是篩選器,Terminal 開關與
`aria-expanded` 正確;搜尋「420J2」實測(非字串比對)確認 `partner.html?q=...` 正確預選
材料/家族/部位;ink hero 點擊推進與 `bl_ink_intro` session 持久化正確;`tools/dev/
verify-textsize.js` 通過(文字放大 1.45×,reload 後保留);CLS 桌面 0.00434、行動
0.02603,遠低於 0.1 門檻;`esc()` 掛名零洩漏;index.html 本身不消費
`outlook-data.json`/`terminal.json`(唯一相關請求是共用 `terminal.js` 元件的搜尋索引,
不影響顯示內容);contact.html 從無情境入口進入時正確 fallback 到 global/歐洲桌;
reload/上一頁行為正常。**Console:僅 1 個因這個沙盒環境 Chromium 不信任 proxy CA 造成的
`ERR_CERT_AUTHORITY_INVALID`(已根因排除,非站台缺陷),其餘零 console error、零
`pageerror`、零其他請求失敗。**

**F(架構,Opus)**:index.html 不消費動態資料、純手寫,架構上合理(行銷門面頁本來就不
需要即時資料)。觀察到一個跨頁模式:這是本次稽核第三次抓到「commit message 說明得很清楚,
但後續沒有回頭更新對應的說明文件/記錄檔」的例子(`AGENTS.md` 建置系統節、`AGENTS.md`
index specifics 節、`SUMMARY.md` 的 hero 文案宣稱)。裁決:**可改,非必改**——這是正常的
文件熵,不建議為此新增流程負擔(如強制 doc-currency CI 檢查),稽核迴圈本身定期抓漏
已經是足夠的糾正機制。

## SEO 檢查(提前完成 2 項,原排在 STATE 3,因為順手已查到就先記)

| # | 檢查項 | 結果 | 嚴重度 |
|---|---|---|---|
| SEO-1 | `sitemap.xml`(51 個 `<url>`)是否需要內嵌 hreflang alternate | **非問題,已確認正確。** 真正的 hreflang 機制是 `tools/dev/_langs.js` 的 `cluster()` 產生的每頁 `<head>` `<link rel="alternate" hreflang="...">` 標籤,不是 sitemap 層級。實測 `index.html`:11 個 hreflang 標籤(en + 9 語言 + x-default),與 9 個語言資料夾完全對應。 | — |
| SEO-2 | `robots.txt`(`Disallow: /partner.html /team.html /news.html /birdland-intro.html`)與各頁 `<meta name="robots">` 的一致性 | **新發現。** `cost-desk.html`/`executive.html` 都有 `noindex` meta,但**沒有**列在 `robots.txt` 的 Disallow 裡;`partner.html`/`team.html` 則是兩者都有(`robots.txt` Disallow **加上** `noindex` meta)。這是已知的 SEO 反模式:同一頁面若被 `robots.txt` Disallow,爬蟲根本不會抓取該頁,因此永遠看不到頁面裡的 `noindex` 指示——反而可能讓純網址(無摘要)被索引。`cost-desk.html`/`executive.html`(只有 noindex meta,無 Disallow)才是比較安全的做法;`partner.html`/`team.html` 的雙重設定才是值得重新考慮的一方。 | **P2**(不緊急,SEO 邊際風險,非功能性 bug,列入 STATE 3 彙整不遺漏即可) |

## 架構問題清單(Opus 裁決版,持續更新)

| 議題 | 裁決 | 標註 |
|---|---|---|
| terminal.json 全站無 CI 新鮮度守門(`build.js` 明講失敗是 non-fatal) | 建議在 `pr-validation.yml` 仿照 calendars/feeds 模式加一道 `build+diff` 關卡 | **必改**(建議,待人核准後執行,不由稽核迴圈直接改 CI) |
| `AGENTS.md`「Pages & build system」節與原始碼事實不符(news.html 現況是 redirect stub,非 BUILT ARTIFACT) | 訂正,見下方「本迴圈已完成的文件訂正」 | 已在稽核分支處理 |
| 四種頁面建構哲學並存(樣板替換/結構化陣列/執行期 i18n/純手寫) | 初步判斷:各自服務的頁面性質不同(合理),STATE 3 彙整時重新確認 | 可改(初步) |
| GLOSSARY.md「Fixed translations」表僅 de/zh-Hant 兩欄,服務 10 語言 | 待 Opus 於 STATE 2/E 正式裁決是否補齊 | 待裁決 |
| 「commit message 講清楚了,但對應說明文件沒跟著更新」模式,累計已抓到 5 次(`AGENTS.md` 三節、`ISSUES.md` I-7、`SUMMARY.md` hero 文案宣稱) | 正常的文件熵,不建議新增流程負擔(如 doc-currency CI 檢查),稽核迴圈定期抓漏已是足夠機制——但累計次數持續在報告,供人自行判斷是否某個時間點該重新考慮 | 可改(非必改) |
| contact.html 兩個真實 P1(D15+D16)根因都可歸因於「多個獨立載入的 script 之間無顯式初始化協定」(DECISIONS.md D20) | WATCH,非必改——設下明確升級門檻:下一頁若又發現第三個同根因獨立案例,升級為必改並提出集中式初始化協定設計。目前計數 2/3 | 可改(WATCH,有具體升級條件) |
| cost-desk.html 品牌重命名散落在個別字串字面值,導致漏改 3 處(AsiaSource 殘留) | 建議集中成以 `BL_DESK`/`isCost` 為 key 的桌面顯示名稱查找表,避免未來新增桌面模式重蹈覆轍 | 可改,中價值,不緊急 |
| `tools/partner_template.html` 累積大量迭代淘汰後的死碼(11 個死 `bentofy()` 呼叫、未使用的 `.wl`/`.tm` 樣式、死手風琴 handler)——已收錄 CLEANUP.md C6-C8 | 正常的迭代殘留,STATE 5 統一處理,不是架構級警訊 | 可改(STATE 5 例行清理) |

## 本迴圈已完成的文件訂正

1. `AGENTS.md`「Pages & build system」節(D5):訂正 news.html 現況為手寫 redirect
   stub、補上遺漏的 `cost-desk.html`(與 partner.html 共用 `partner_template.html`)、
   把已跟不上現況的手刻 rebuild 指令改為指向 `tools/dev/build.js`。
2. `AGENTS.md`「index.html specifics」節 + storage namespace 範例(D8):訂正為 ink
   hero/`bl_ink_intro`/單行可橫向捲動導覽列的現況,移除已不存在的 foliage-cut/
   reading-focus 縮放/hamburger 選單描述。
3. `AGENTS.md`「PIN gates bypass in dev」(D11):訂正為只有 team.html 還有真實閘門,
   partner.html/cost-desk.html 的閘門已在 `6fd00c1` 移除;`executive.html` 從來就沒有
   `bd_executive` 閘門可以繞過(獨立 grep 驗證)。連帶更新 `AUDIT_STATE.json` 的 `S1-S2`。
4. `AGENTS.md`「`P.shipping`... `lineChart`」警告(D13):移除已不存在的機制描述
   (全庫零匹配 `lineChart`,消費該資料的區塊已被標記「retired outright」)。
5. `ISSUES.md` I-7(D12):加註(沿用該檔自己的慣例,不刪原文)遮蔽元件已從
   `desk-banner.css` 變成 `app-bar.css`,影響面從 2 頁擴大到 5 頁,仍非緊急。

## P0 清單

**1 項,見報告最上方「🔴 P0」區塊**(`teamdesk.*` 資料管線靜默凍結,team.html)。

## 快速勝利清單

- terminal.json 重新產生(已完成,見上,屬 PR #1 範疇)
- `AGENTS.md`/`ISSUES.md` 五處文件訂正(已完成,見上「本迴圈已完成的文件訂正」)
- Hero `[data-ink-main]` 若要恢復可見:改一個 CSS 數值(0→0.32 類似 `.bl-ink-marker` 的
  做法),成本極低,但這是 NEEDS HUMAN 的設計取捨,不在稽核迴圈的快速勝利範圍內執行,
  只在此標註「如果人決定要改,這是最小改法」
- contact.html「Europe」下拉選項缺 9 語言字典鍵(D17):純內容補譯,零邏輯風險,但 i18n
  內容檔不算 ORCHESTRATION.md 的文件修正例外,留給人執行
- cost-desk.html 品牌重命名補三處字串(nav/rail aria-label、選單收合鈕文字):同樣是低
  風險的字串修正,但仍是站台程式碼(HTML/JS 字面值),不由稽核迴圈執行
- guide.html 內嵌了完全用不到的 94KB `outlook-data.json`(頁面總重 78%):`tools/dev/
  build.js` 針對 `news_template.html` 這個 job 跳過 `__DATA__` 替換即可,效益明確、風險低,
  但仍是 build 腳本(站台程式碼),不由稽核迴圈執行

## 建議修復順序

1. 共用建置工具鏈(`tools/build_news.py`/`tools/dev/build.js`/`gen-terminal.js`/
   `build_calendars.js`/`build_feeds.py`)的同步性問題——影響面最廣,一次修好惠及所有頁面。
2. 文件訂正(`AGENTS.md` 等)——零風險,高價值,優先做。
3. 個別頁面的 A-F 類發現——依 STATE 2 掃描順序(高優先頁面優先)處理。
4. `CLEANUP.md` 的清理項——最後執行,且只產出 `cleanup.sh` 供人決定。

---

_本報告由 `/loop` 驅動的 Zero-Touch 稽核迴圈自動維護,人類可隨時中途查看,不需要等
STATE 6 才有內容。_
