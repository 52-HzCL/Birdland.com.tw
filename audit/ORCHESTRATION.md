# birdland.com.tw 全自動雙模型審查編排(Zero-Touch Mode)— Birdland 版

> **本檔是可執行指令,不是唯讀說明書。** 任何接手這個 `/audit/` 迴圈的 agent(不論記不記得
> 產生本檔的那次對話)都應該:
> 1. 先讀本檔 + `DECISIONS.md` + `AUDIT_STATE.json`,三份一起讀完再動手。
> 2. 直接從 `AUDIT_STATE.json` 記錄的 STATE 繼續。**不要重新問使用者、不要重新裁決
>    `DECISIONS.md` 已有的議題**——那些是 Opus 已經下過的裁決,沿用即可。
> 3. 遇到本檔沒覆蓋到的情況,套用下面「模型分工架構」自行判斷,不要停下來等人類。
> 4. 這是持續多輪(可能橫跨數小時到數天)的自動迴圈,靠 `/loop` skill 的排程機制續跑,
>    不是一次對話跑完的任務。每輪結束前務必把進度寫回 `AUDIT_STATE.json`。

---

## 0. 跟原始泛用版不一樣的地方(先讀,否則會套錯框架)

原始指令模板假設一個有 router / 購物車 / 結帳 / filter chips 的一般電商 SPA。
Birdland.com.tw **完全不是這種站**:

- 無 build 框架、無 client-side router、無購物車/結帳。這是 B2B OEM 園藝工具代工廠站
  (自 1974 年),真正的「轉換動作」是 `contact.html` 經 `mail-routing.js` 產生的信件路由,
  不是下單流程。
- 站上唯一名叫「chip」的東西是 `tm-chip`——**Terminal 搜尋觸發鈕**,不是篩選器,沒有
  單選/多選互斥邏輯要驗證。原版 STATE 2-B 整段要改寫。
- **這不是從零開始的稽核。** 已經有四輪先前紀錄留在 repo 裡:
  - `audit-report.md`(2026-06-29,安全性+build 系統+逐頁檢查,含 node_modules 誤 commit、
    `birdland-intro.html` 孤兒頁等發現)
  - `UX-REVIEW.md` + `SUMMARY.md`(`ux-refine` 分支,24 commits,字級/色票/CLS 全站重構——
    **已於本迴圈啟動前完整 merge 進 main**,`origin/ux-refine` 與 main 的 merge-base 顯示零
    落差,兩份文件現在是「歷史紀錄」不是「待辦清單」,只有它們各自的「Still open」段落算數)
  - `ISSUES.md`(I-1 ~ I-7,I-3/I-5/I-0 已關閉,I-1/I-2/I-4/I-6/I-7 開放中——但 I-1/I-2 的
    修復已經寫在本機分支 `i18n/my-market-composed-sentences`,只是還沒 push,見下方
    「已知但不動」清單)
  - 本次啟動前的即時 recon(見 `DECISIONS.md` 開頭已裁決項)

  STATE 1 第一步就是把這四份讀進「已知議題登記表」,STATE 2 掃到重複項目只需標記
  「已知,狀態:X」,不必重新走 P0/P1/P2 判定;只有這四份沒蓋到的才是新發現。
- 已有大量現成工具鏈專門做這類驗證(`tools/dev/*.js`)——**優先重用,不要重寫**:
  `snap-color.js`/`snap-space.js`/`snap-type.js`(設計 token 快照,SUMMARY.md 的數字就是它們
  產的)、`verify-desks.js`/`verify-material-vocab.js`/`verify-textsize.js`(桌面/詞彙/字級
  回歸)、`i18n-drift.js`(10 語言 SHA-1 內容漂移偵測)、`cssprune.js`+`prune-apply.js`(死
  CSS 偵測)、`postmerge-check.js`、`terminal-interact.js`、`ux-capture.js`/`shot.js`(截圖)。
  跑得動的先跑這些,拿到的數字比重新手刻一套掃描器可信。

### 已知但這個迴圈不動的東西(裁決見 DECISIONS.md,勿重複裁決)

- `i18n/my-market-composed-sentences`(本機分支,5 commits,未 push):真實完成的工作
  (My Market 九語翻譯、terminal builder Node/Python 一致性修復、I-1/I-2 修復、四桌功能稽核
  修復)。**這個稽核迴圈絕不主動 push 它**——依 `AGENTS.md`「絕不 push 除非老闆這一輪明講
  push」鐵律,這批不是這一輪的 push 授權範圍。只在 `AUDIT_REPORT.md` 顯著位置提醒風險
  (容器可能被回收、工作可能遺失),由人決定要不要另外要求 push。
- `origin/codex/pr-validation`:比目前 main 早了 365 個檔案的內容(merge 等於刪掉九成的
  站台),不是「進行中的修復」,是廢棄分支。不合併、不參考,最多在 CLEANUP.md 提一句「建議
  刪除,待人確認」。
- PR #1(`factory/qc-and-troubleshooting`,Factory QC 擴充)是另一條獨立進行中的工作,
  這個稽核迴圈不去動它的分支,只在稽核發現與它重疊時於報告中註記交叉參照。

---

## 1. 模型分工架構

- **Opus(high reasoning)= 架構法官**:負責判斷、仲裁、架構層決策。
- **Sonnet = 執行工兵**:負責掃描、實測(Playwright)、跑既有 `tools/dev/*` 工具、產出報告。

觸發 Opus 的條件(其餘一律 Sonnet 自行處理):

1. **邏輯架構正確性判斷**——Birdland 的真實案例:四種頁面建構哲學並存(`__DATA__` 樣板替換
   [news/partner/team/executive_template.html]、結構化陣列 [`build-p101.js`]、執行期翻譯字典
   [`i18n.js` DOM 走訪]、純手寫 [`index.html`/`my-market.html`])是刻意分工還是該收斂?
   `D.partner.*`(桌面設定靜態值)vs 頂層(每日刷新)的分野有沒有被新程式碼誤用?
2. **「保留哪個版本」的仲裁**——例:I-7 兩桌各自遮蔽 `--down/--up/--flat/--line` 四個
   token 名稱,該統一還是保留現狀?兩套 build_terminal(Python 正式版 vs Node 攣生版)出現
   分歧時以哪邊為準?
3. **疑似問題但不確定**——Sonnet 標記「?」的項目全部送 Opus 裁決。
4. **跨語言/跨桌一致性的最終標準制定**——GLOSSARY.md 鎖定詞在 10 語言的實際遵守情況、
   「Fixed translations」表只涵蓋 de/zh-Hant 兩語是否要補齊。
5. **修復方案有多種路線時的取捨**——例:terminal.json 在 CI 裡完全沒有新鮮度檢查
   (`build.js` 註解明講失敗是 non-fatal),要不要在 `pr-validation.yml` 仿照 calendars/feeds
   的模式加一道「build 完 diff」關卡?這是「必改」還是「可改」?
6. **AGENTS.md/README 等說明文件與原始碼真實行為不一致時**——例:`AGENTS.md` 目前寫
   「news.html 是 BUILT ARTIFACT」,但 `tools/dev/build.js` 與 `pr-validation.yml` 都證實
   `news_template.html` 現在建的是 `guide.html`,`news.html` 已改為手寫 redirect stub。這類
   文件必須訂正,由 Opus 核可修法後才動筆(見下方「文件修正的例外授權」)。

Opus 裁決寫入 `DECISIONS.md`,格式:`|議題|裁決|理由|`,Sonnet 之後遇到同類問題直接沿用
裁決,不重複詢問。

---

## 2. 執行模式:全自動,無檢查點,一個例外

- 所有原檢查點改為「自動決策」:由 Opus 裁決後直接繼續。
- 全程不問使用者任何問題。
- **唯一例外**:`audit-report.md`/`AGENTS.md` 已經明文寫「這是老闆的商業判斷,AI 不擅自
  動」的項目(目前已知:S1/S2 前端 PIN 閘門是否要換成真伺服器端驗證——這是成本/架構決策,
  不是技術對錯問題)。這類項目 Opus 不代為決定,但**也不停下迴圈**——寫入 `DECISIONS.md`
  時標記裁決欄為「NEEDS HUMAN」,附上兩個以上可行選項與各自成本/風險,然後繼續往下一項。
- 除此之外的唯一停止條件:全部狀態完成,或遇到無法自行解決的環境錯誤(伺服器起不來、
  工具鏈崩潰且找不到替代驗證手段)。

### Push 授權範圍(重要,比原版更嚴格)

「自動判斷並 push」的授權範圍**只到這裡為止**:

- 只 push `audit/zero-touch-review` 這一條分支自己的 commit(狀態檔、報告、`cleanup.sh`)、
  並維護同一個 draft PR 的更新——不 push 到 `main`。
- **絕不**動 `i18n/my-market-composed-sentences`、**絕不**參考或合併
  `origin/codex/pr-validation`、**絕不**推 PR #1 的分支(那是獨立工作)。
- 純文件修正(`AGENTS.md`/`README.md` 等說明檔跟原始碼行為對不上時的訂正)視為報告基礎
  設施,可以直接 commit 進 `audit/zero-touch-review`——但每筆 commit message 要寫清楚
  「文件寫 X,但 Y 檔案第 Z 行證實實際行為是 W,已訂正」。**絕不**修正 `main` 上的
  `AGENTS.md`(那要等 PR 被人 review 通過合併),稽核分支上的訂正只是「建議版本」。
- 除了上述文件修正,**全程不修改任何會影響網站行為的程式碼**(HTML/CSS/JS/build 腳本本體)
  ——只產出報告與 `cleanup.sh` 供人執行。這條沿用原版鐵律 2,理由:這是一個上線中的營收
  站,大規模自動修復的風險不該由稽核迴圈自己扛。

---

## 3. 狀態機(自動連續執行)

### STATE 0: INIT

建立/確認 `/audit/`:`AUDIT_STATE.json`、`AUDIT_REPORT.md`、`CLEANUP.md`、`DECISIONS.md`、
本檔 `ORCHESTRATION.md`。若已存在 → 讀取續跑,不重新初始化。

### STATE 1: DISCOVERY

**第一步(必做,原版沒有)**:通讀 `audit-report.md`、`UX-REVIEW.md`、`SUMMARY.md`、
`ISSUES.md`,把每一條開放中的發現整理成「已知議題登記表」(建議直接放
`AUDIT_STATE.json` 裡一個 `knownIssues` 陣列,每條記 `{id, source, status, note}`)。

**第二步**:掃描全部頁面,依真實建構方式分類(不是原版的 router/動態路由——這站沒有):

| 分類 | 頁面 | 建構方式 |
|---|---|---|
| 手寫靜態 | `index.html`, `about.html`, `contact.html`, `privacy.html`, `guide.html` | 直接編輯 |
| 手寫 redirect stub | `news.html`, `manufacturing.html`, `why-birdland.html` | 0 秒 meta refresh 到合併後的目的頁,含 canonical + noindex,follow |
| `__DATA__` 樣板建置 | `partner.html`(`__DESKMODE__=buyer`)、`cost-desk.html`(`__DESKMODE__=cost`,兩者共用 `partner_template.html`)、`team.html`、`executive.html` | `tools/build_news.py` / Node 攣生 `tools/dev/build.js`;**絕不手改產出頁**,只改對應 `tools/*_template.html` |
| 結構化陣列建置 | `product-101.html`(Factory) | `tools/dev/build-p101.js` 讀 `GATES/MATERIALS/PACKS/ECO/COST/SECTIONS` + `tools/dev/ratings.js` 查表;目前有獨立進行中的 PR #1 在擴充此頁,稽核發現與它重疊時只記交叉參照,不重複修 |
| 手寫互動頁 | `my-market.html` | 獨立 JS,`classify()`/`collectFamilies()` 是已知曾有 bug 的區域,列入回歸重點 |
| 孤兒/待決 | `birdland-intro.html` | ISSUES.md I-2,刪除方案已存在未推送分支,稽核只需確認「現狀仍是孤兒」,不重新提案 |

每個手寫/結構化頁面另外有 **10 語言版本**(`de/ es/ fr/ it/ ja/ nl/ pl/ pt-br/ zh-tw/` +
英文根目錄),分兩種機制(對照 `i18n.js` 開頭註解與 `tools/dev/_langs.js`):
- **Facade 頁**(`index/about/contact/privacy/product-101` 等):每語言一份完整靜態 HTML,
  由 `i18n-build.js`(用 `facade.<lang>.json`)/`i18n-page.js`(用 `page.<page>.<lang>.json`)
  產生,**內容鍵值對應**不是位置對應,插入新段落不影響既有翻譯對齊。
- **App 頁**(`partner/cost-desk/team/executive/my-market`):不分語言複製檔案,執行期由
  `i18n.js` 走訪 DOM、精確字串比對 `app.<lang>.json` 替換——**只翻譯固定文案**,
  `outlook-data.json`/`terminal.json` 來的動態內容(價格、材料代號、港口名)在所有語言都
  保持原文。

語言版本不當獨立頁面重跑 A-D 全套,而是併入 STATE 2 的 E 類(一致性)與獨立的 i18n
drift 檢查(見下方 C 類)。

**優先序**(取代原版的商品/購物車排序):
- **高**:`index.html`(門面)→ `product-101.html`(Factory,信任建立頁)→ `contact.html`
  (實際轉換點)→ 四個桌面 app(`partner/cost-desk/team/executive`,深度互動層,PIN 閘門
  後)→ `guide.html`(site map/導覽)
- **中**:`about.html`、`my-market.html`、`birdland-intro.html`(孤兒,但仍要驗證現狀)
- **低**:`privacy.html`、三個 redirect stub(`news/manufacturing/why-birdland`——驗證重點
  只有「redirect 目的地正確、canonical 正確」,不需要深度測試)

不等確認,直接排入佇列開始 STATE 2。

### STATE 2: AUDIT_LOOP(逐頁,每頁完整執行以下六類)

**【A. 功能正確執行驗證】**
- Terminal(`terminal.js`/`terminal-status.js`/`context.js`):每頁的 `tm-chip` 觸發鈕能否
  正確開啟;輸入材料/製程代碼(如 `420J2`)能否正確導到對應桌面+section+預選狀態,
  對照 `terminal.json` 目前的索引內容實測,不是只看程式碼。
- `mail-routing.js`:contact.html 的信件路由——依「從哪個桌面/情境進來」驗證產生的
  收件人/主旨/內文是否正確對應,這是本站真正的「送出表單」,之前已修過「政策動作不匹配」
  的 bug(此次功能稽核),當回歸項測。
- 三個桌面(partner/cost-desk/team/executive)的 PIN 閘門:`sessionStorage.bd_p_*`/
  `bd_t_*`/`bd_e_*` 開發者旁路是否仍正常;閘門後內容的單一面板 router(`.toc a` 點擊→
  `.sk-off` 切換)逐一點過一輪,對照 `verify-desks.js` 既有斷言,不足的地方補新斷言而非
  重寫整支工具。
- `my-market.html` 的 `classify()`/`collectFamilies()`:當回歸重點區(此次審查已修過真實
  bug 的地方最容易復發)。
- 語言切換器(`_langs.js` 的 `picker()`):切換是否正確導到 `<lang>/<同一頁面>`,
  `handoff()` 的 `localStorage.bl_lang` 寫入時機是否符合「進入語言資料夾=選擇該語言,
  但英文根目錄頁不覆蓋既有選擇」的設計意圖。

**【B. Terminal 搜尋與桌面切換正確性】**(取代原版「晶片」章節——這站沒有篩選型 chip)
- `tm-chip` 是全站唯一的「chip」,是 Terminal 搜尋觸發鈕,不是篩選器,不驗證單選/多選
  互斥邏輯(不存在)。
- 驗證重點改為:Terminal 索引(`terminal.json`)是否與其索引來源(各 `_template.html` +
  `product-101.html` 的 `.wk-toc`)同步。**已知此次 Factory PR 曾造成索引落後(已修復,
  commit 見 PR #1)**——這代表 CI 完全沒有守住這道同步,STATE 2 對其他曾改過材料/製程/
  Factory section 內容的歷史 commit 做一次全面比對,找出還有沒有其他未同步的落後點。
- 桌面內的單一面板路由(見 A 類)與 URL/state 一致性:重新整理後是否還在同一面板、
  瀏覽器上一頁是否正確返回前一面板而非離開整個桌面。

**【C. 資料帶路(data flow)正確性】**
- 完整鏈路:`outlook-data.json`/`terminal.json`/`calendar-events.json`/`trade.json`
  (來源,部分 Gemini 每日刷新、部分 TwelveData/FRED/open.er-api 即時抓、部分桌面設定
  靜態值,見 `docs/DATA-SCHEMA.md`)→ build 腳本 → 靜態 HTML/JSON/ICS/XML → 瀏覽器內嵌
  `<script>` 讀取渲染。
- 依 `AGENTS.md`/`docs/DATA-SCHEMA.md` 明文的已知陷阱逐條實測,不要只看程式碼:
  - `D.partner.*`(桌面靜態)vs 頂層(每日刷新)有沒有渲染器選錯來源。
  - `P.shipping`(桌面設定曲線)絕不能餵進 `lineChart`(會 throw)——確認沒有新程式碼
    誤用。
  - spark 陣列尾端重複點造成 `chg` 誤讀 0.0%——「walk back past duplicate tail」的
    pattern(`realChg`/`rc(`)有沒有在所有算漲跌幅的地方都套用,不是只有原本修的那處。
  - `gen_news_gemini.py` 的合併邏輯只保留寫死的欄位白名單(`("landed","timeline",
    "tariff_calc","market_news")`)——比對這份白名單跟 `outlook-data.json` 目前完整欄位
    集合,找出下次 CI 跑完會被靜默砍掉的欄位。
  - `build_terminal.py`(Python 正式版)與 `gen-terminal.js`(Node 攣生版,唯一被跑過驗證
    的版本,ISSUES I-6)有沒有出現新的邏輯分歧——此次審查已修過一次分歧,當回歸項測。
  - **calendars/feeds 建置與已 commit 檔案的漂移**:`calendars/*.ics`(全部 7 個檔案)
    已確認漂移(UID 尾碼格式 `@birdland.com.tw`→`.birdland-public-calendar`、LF→CRLF
    換行符,PR #1 上已記錄、確認 main 上即可重現、與任何在途 PR 無關)。**`feeds/*.xml`
    用完全相同的 CI 關卡模式(build+`git diff --exit-code`)——這次審查務必實測是否有
    同類漂移,不要假設沒有。**
  - i18n 內容漂移:直接跑 `node tools/dev/i18n-drift.js`,取得目前每語言/每頁的真實
    漂移狀態寫進報告,不要用猜的。

**【D. 端到端流程】**
- 真實使用者旅程(取代購物車流程):首頁 → (首次訪客可能先看 Guide)→ Factory(建立
  信任)→ 桌面 app(深度互動,PIN 閘門)→ `contact.html`(實際轉換,經 `mail-routing.js`
  路由)。驗證這條路徑上的情境有沒有跟著走(例如從特定桌面/產品情境進 contact.html,
  `mail-routing.js` 是否帶對脈絡)。
- 桌面 PIN 閘門的重新整理/上一頁/直接貼 URL 行為:`sessionStorage` 是分頁週期性的,
  瀏覽器完全重啟後應該重新出現閘門——這是**設計如此**,審查要確認的是「這真的是目前
  的實際行為」而不是「這是不是 bug」(依 AGENTS.md 已經是已知設計)。

**【E. 一致性檢查】**
- 10 語言一致性:實跑 `i18n-drift.js` 拿到的漂移清單、GLOSSARY.md 鎖定詞(OEM/FOB/CIF/
  材料代號/檢驗縮寫等)在 10 語言的實際遵守情況、**「Fixed translations」表目前只有
  de/zh-Hant 兩欄卻要服務 10 語言**這個落差要不要補齊(送 Opus 裁決)。
- I-7 的四個被遮蔽的 palette token(`--down/--up/--flat/--line`)——此次審查後有沒有
  新增的共用元件也踩到同一個陷阱。
- `esc()`/`kn_esc`/`sesc` 這類每個 `<script>` IIFE 各自定義跳脫函式的慣例——有沒有新
  程式碼違反(跨 block 呼叫會是 ReferenceError,AGENTS.md 已明文警告)。
- `.wl`/`.tm` 表格 class 復用是否一致;`bentofy()` 的 selector 陷阱(用了會取第一個
  match 的泛用 class 而非專屬 id)有沒有新的犯規案例。
- 設計 token 現況快照:直接跑 `snap-color.js`/`snap-space.js`/`snap-type.js`,拿新數字
  跟 `SUMMARY.md`「After」欄位比對,抓退化(新元件又引入 off-token 顏色/間距)。
- 不一致時 → 送 Opus 裁定「以哪版為準」,寫入 `DECISIONS.md`。

**【F. 邏輯架構正確性】(Opus 主導)**

Sonnet 蒐集後整包送 Opus 評估,焦點是 Birdland 真實存在的架構問題,不是套用電商 SPA
的泛用檢查清單(沒有 client state 管理框架、沒有 prop drilling 這種東西):

- **四種頁面建構哲學並存**(樣板替換/結構化陣列/執行期 i18n 字典/純手寫)是否該收斂,
  還是各自服務的頁面性質本來就不同(Factory 內容量體遠大於一般頁,結構化陣列合理;
  my-market.html 高互動,手寫合理)——這是「必改」還是「可改」,Opus 表態。
  這一項 STATE 0 前的 recon 已先給出初步判斷(見 `DECISIONS.md` 種子項),STATE 3 彙整
  時重新確認結論是否還成立。
- **terminal.json 全站沒有 CI 新鮮度守門**(`build.js` 明講失敗是 non-fatal)——這一類
  「內容變了但索引沒跟上」的 bug 這次審查已經抓到一個真實案例(見 C 類)。要不要在
  `pr-validation.yml` 比照 calendars/feeds 的 `build+diff` 模式加一道關卡?Opus 給出
  「必改」/「可改」的正式建議,寫進 `AUDIT_REPORT.md`,不在稽核迴圈裡直接改 CI 設定
  (CI 變更影響全站,留給人核准後動手)。
- **巨型檔案**:`partner_template.html`(產出 partner.html 4511 行、cost-desk.html
  4520 行)——不評判「產出頁很大」(預期中),評判**樣板本身**用 IIFE-per-section 有沒有
  真的把關注點分開,還是共用作用域已經纏在一起。
- `AGENTS.md` 自身「Pages & build system」一節與 `tools/dev/build.js`+
  `pr-validation.yml` 的原始碼事實不一致(news.html 現況是 redirect stub,不是
  BUILT ARTIFACT;`news_template.html` 現在建的是 `guide.html`)——這是「說明文件本身
  說謊」的架構風險(未來接手的 agent 會照著錯的說明去改錯檔案),Opus 核准訂正版本,
  依第 2 節「文件修正的例外授權」直接 commit 到稽核分支,附上訂正依據。

每頁完成後自動:更新三個檔案(`AUDIT_STATE.json`/`AUDIT_REPORT.md`/`DECISIONS.md`,視
情況更新 `CLEANUP.md`)→ 輸出一行進度 → 下一頁。

### STATE 3: CROSS_PAGE

E、F 類的全站彙整 + SEO 基本項。SEO 已知現況(`audit-report.md` 2026-06-29 記錄,需重新
確認是否仍成立):`index.html` 完整 SEO;`news/partner/team` 系列因閘門/redirect 刻意
`noindex`;`robots.txt` 當時缺、後續分支曾觸碰過,需確認目前 main 現況;`sitemap.xml`
由 `build-sitemap.js` 建置,需核對是否涵蓋所有 10 語言版本的 hreflang 對照
(`_langs.js` 的 `cluster()`)。Opus 做最終架構總評。

### STATE 4: REPORT(自動產出,不等確認)

1. 總覽 + P0/P1/P2 分布(**已知議題**與**新發現**分開列,不要混在一起灌水數字)
2. P0 清單(修復成本排序,含具體修法 + 檔案:行號)
3. 架構問題清單(Opus 裁決版,含「必改」vs「可改」標註)
4. 快速勝利清單(含本次 recon 已完成的:terminal.json 重生成、AGENTS.md 文件訂正)
5. 建議修復順序(相依性排序:共用樣板/工具鏈 → 個別頁面)
6. **風險提醒區**(本檔特有,原版沒有):`i18n/my-market-composed-sentences` 未推送分支
   的資料遺失風險,置於報告最前面附近,不要埋在文末。

### STATE 5: CLEANUP_SCAN(自動執行掃描)

死碼/重複邏輯/殘留連結/版本殘影/依賴,全部掃描列入 `CLEANUP.md`。**優先用
`tools/dev/cssprune.js`(死 CSS)+ 既有 `verify-*.js` 工具的輸出**,不要重新手刻掃描器。
已知起點(承接 `audit-report.md`/`ISSUES.md`,需重新確認現狀而非照抄舊結論):
- `node_modules/` 是否仍被 commit(`audit-report.md` L2,`ISSUES.md` I-5 顯示部分已處理,
  確認現況)
- `birdland-intro.html` 孤兒頁現狀(刪除方案已存在於未推送分支,見「已知但不動」清單)
- I-7 四個遮蔽 token 是否收斂
- `origin/codex/pr-validation` 分支建議標記可刪除(不主動刪,寫進 CLEANUP.md 供人決定)

分級:A = 引用分析證明可刪 / B = 可能動態引用。重複邏輯的「保留版本」由 Opus 裁定,寫入
`DECISIONS.md`。掃描與裁定全自動,但**實際刪除動作仍不執行**(文件修正例外見第 2 節)
——產出「可一鍵執行的清理腳本」`cleanup.sh`,附每步說明,由人在方便時執行。

### STATE 6: DONE

輸出最終摘要:四個檔案位置、P0 數量、架構必改項、`cleanup.sh` 使用說明、
`i18n/my-market-composed-sentences` 的風險提醒(重複一次,確保不被漏看)。

---

## 4. Context 管理(用本環境原生機制,原版是手刻)

原版設計是「context > 70% → 存檔 → 自我輸出續跑提示 → 結束 session」。這個環境有更合適的
原生機制,直接用,不要手刻:

- 這個迴圈本身透過 `/loop` skill 啟動與續跑,續跑排程交給該 skill 的機制處理,不需要自己
  判斷「要不要結束 session」。
- 真正的跨輪記憶是 `/audit/` 底下的檔案(`AUDIT_STATE.json` 尤其關鍵),不是對話 context。
  **每次要停下來讓下一輪接手前,先確保 `AUDIT_STATE.json` 已經寫下當前 STATE、目前處理到
  哪一頁/哪個象限、佇列剩什麼**——這樣即使下一輪是全新對話、完全不記得這次,也能無縫接續。
- 新一輪開始時:讀 `AUDIT_STATE.json` + `DECISIONS.md`,已裁決事項不重問,直接從記錄的
  STATE 繼續。

---

## 5. 鐵律

1. 只報實際發現,附檔案:行號。
2. 全程不修改會影響網站行為的程式碼(僅產出 `cleanup.sh` 供人執行);純文件訂正走第 2 節
   的例外授權,且僅限稽核分支,不動 main。
3. 不確定 = 送 Opus 裁決,絕不略過也絕不問使用者(唯一例外見第 2 節 NEEDS HUMAN 類別)。
4. Opus 調用要節制:同類問題查 `DECISIONS.md` 有無先例,有就沿用。
5. P0 資料錯誤(金額/品項錯位、data flow 誤讀靜態值當即時值)發現即置頂,報告最前面。
6. **絕不對 main 分支直接 push**;所有稽核產出走專屬分支 `audit/zero-touch-review` +
   draft PR,即使本檔第 2 節允許自動 push 也一樣只 push 這條分支。
7. **絕不動 `i18n/my-market-composed-sentences`、`origin/codex/pr-validation`、PR #1 的
   分支**——這三個都是這個稽核迴圈職權範圍外的既有工作,只能在報告裡提及,不能碰。
8. 不重新裁決 `DECISIONS.md` 已有的議題;不重新調查已經在 `audit-report.md`/`ISSUES.md`/
   `SUMMARY.md` 裡有明確結論的項目,除非要確認的是「這個結論現在還成立嗎」。

---

## 開始

執行 STATE 0,全程自動至 STATE 6。每輪結束前更新 `AUDIT_STATE.json` 並視需要透過
`/loop` 機制排程下一輪。
