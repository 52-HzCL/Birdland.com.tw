# DECISIONS.md — Opus 裁決紀錄

格式:`|議題|裁決|理由|`。Sonnet 之後遇到同類問題直接沿用裁決,不重複詢問或重新調查
——除非要確認的是「這個結論現在還成立嗎」(例如分支是否已被合併/刪除)。

## 種子裁決(啟動迴圈前的 recon 已產生,2026-08-09)

| # | 議題 | 裁決 | 理由 |
|---|---|---|---|
| D1 | `origin/ux-refine` 分支(SUMMARY.md 描述的 24-commit UX 改版)還算不算「進行中/待合併」的工作? | **已合併,非待辦。** `git merge-base main origin/ux-refine` 顯示零落差(main..ux-refine 0 commits),main 領先 77 commits。`SUMMARY.md`/`UX-REVIEW.md` 現在是歷史紀錄,不是 open TODO——只有兩份文件裡明確寫「Still open」的項目才算數(Team Desk PIN、birdland-intro.html、build_terminal.py 未經 CI 實測、Guide 截圖需手動重跑)。 | 直接查 git 歷史比重新讀兩份長文件、猜測現狀可靠。 |
| D2 | `origin/codex/pr-validation` 分支要不要合併或參考,尤其它名字暗示跟本次要查的 CI 檔案有關? | **不合併、不參考、不主動刪除。** `git diff --stat main origin/codex/pr-validation` 顯示 365 檔案變動、net -68668 行——這分支比目前 main 早了絕大部分現有內容(整個 i18n/、images/desk/、tools/dev/ 等都不存在於它的樹上)。合併會等於刪掉九成的站。 | 這是廢棄分支,不是「另一個 agent 正在修 CI 的進行中工作」。只在 CLEANUP.md 提一句建議刪除,由人確認。 |
| D3 | `i18n/my-market-composed-sentences`(本機分支,5 commits,未 push)裡跟 PR #1 撞名的「The Factory learns to talk about quality control and its own scar tissue」commit,是重複工作還是衝突? | **不衝突,是同一份工作的兩個落點。** 兩個 commit 訊息逐字相同、時間差 51 秒、`git diff` 兩邊的 `product-101.html` 完全一致(空 diff)。這是同一次編輯先後 commit 到兩個分支的結果(其中一個後來被清成獨立於 main 的乾淨分支給 PR #1)。PR #1 分支已 push,這個 commit 在該分支上是多餘但無害的重複。 | 空 diff 直接證實,不需猜測。 |
| D4 | `i18n/my-market-composed-sentences` 剩下 4 個獨有 commit(My Market 九語翻譯、terminal builder Node/Python 一致性、I-1/I-2 修復、四桌功能稽核)要不要由這個稽核迴圈主動 push? | **不主動 push。標記為 NEEDS HUMAN,置於報告顯著位置。** `AGENTS.md` 明文「絕不 push 除非老闆這一輪明講 push」;啟動這個稽核迴圈的指示只涵蓋稽核迴圈自己的產出,不涵蓋這批既有工作。但容器是暫時性的,不 push 有真實遺失風險,必須顯著提醒,不能默默略過。 | 尊重 repo 既有的 push 紀律,同時不能讓真實風險被埋沒——兩者不衝突,用「提醒但不代為執行」解決。 |
| D5 | `AGENTS.md`「Pages & build system」一節寫 news.html 是 BUILT ARTIFACT,但 `tools/dev/build.js`(JOBS 陣列)與 `pr-validation.yml`(pairs 陣列 + 註解明講「news.html is now a hand-written redirect stub and is deliberately NOT generated」)都證實現況是 `news_template.html` 建的是 `guide.html`。文件錯了要不要訂正? | **要訂正,且屬於這個稽核迴圈可以直接 commit 的例外(文件基礎設施,非站台程式碼)。** 兩份獨立的原始碼(Node build 腳本 + CI 驗證腳本)互相印證同一個事實,不是單一來源的猜測。放著不管的風險是:未來接手的 agent(不論哪個模型)會照著錯的 AGENTS.md 說明去誤判 news.html 能不能手改。 | 原始碼證據優先於現有文件描述;文件本身是「給未來 agent 的地圖」,地圖錯了比程式碼 bug 更危險,因為它會系統性誤導後續每一次接手。訂正僅在 `audit/zero-touch-review` 分支進行,不動 main 上的 AGENTS.md(那要走正常 PR review)。 |
| D6 | terminal.json 在 Factory PR(#1)新增兩個 section 後沒有跟著重新產生,這類「內容變了、搜尋索引沒跟上」的 bug,要不要在 `pr-validation.yml` 加一道 CI 關卡防止再發生? | **必改,但不由稽核迴圈直接動 CI 設定——寫成正式建議放進 AUDIT_REPORT.md,由人核准後執行。** 技術上很簡單(仿照 calendars/feeds 現有的「build 完 diff」模式,加一步 `node tools/dev/gen-terminal.js && git diff --exit-code -- terminal.json`),但 CI 設定變更影響每一個未來 PR 的合併速度與失敗模式,值得人过目再上線。 | 區分「文件訂正」(低風險,直接做)跟「CI 行為變更」(中風險,只建議)是這個迴圈刻意設的兩檔风险等級,不能混為一談。 |
| D7 | 本次 recon 已經在 PR #1 上做的事(terminal.json 重生成 commit、CI 失敗根因確認並留言說明)算不算這個稽核迴圈的工作? | **不算,那是 PR #1 自己的維運責任(它是我自己開的 PR,依規範本來就要顧到綠燈),跟這個全新的 Zero-Touch 稽核迴圈是兩件事。** 這裡記錄只是避免稽核迴圈在 STATE 2 掃到同一顆 bug 時又重新「發現」一次、浪費一輪。 | 職責分離:稽核迴圈的職權範圍見 ORCHESTRATION.md 第 0 節「已知但不動」清單。 |

## STATE 2 裁決(index.html,2026-08-09)

| # | 議題 | 裁決 | 理由 |
|---|---|---|---|
| D8 | `AGENTS.md`「index.html specifics」整節(foliage-cut、reading-focus 縮放、hamburger 選單)描述的功能全部已在 `6fa66ad`(2026-07-28 全站重建)移除,現況完全是另一套(ink hero + `bl_ink_intro` + 單行可橫向捲動的 `.bl-nav`)。是否套用跟 D5 一樣的訂正待遇? | **要訂正,已直接執行。** 與 D5 同類——原始碼證據(grep 全庫零匹配舊 class/key、git log 追到移除的確切 commit)充分,且風險同樣是零(純文件)。已在 `AGENTS.md` 訂正「index.html specifics」節與第 86 行的 storage namespace 範例。 | 沿用 D5 的判準:文件本身是給未來 agent 的地圖,錯的地圖比錯的程式碼更危險。 |
| D9 | Hero 三個核心賣點文案(`[data-ink-main]`,"MAKE IT RIGHT"/"KEEP SUPPLY MOVING"/"KEEP IT YOURS")在桌面版(>900px)靜止狀態是 `opacity:0`,只有 hover/click/focus 才顯示——這正是 `5de128e`(2026-07-31)修過的舊缺陷的部分重現,但後續 `7d87c09`(2026-08-03)commit message 明講是刻意的美學取捨(恢復「游標遮罩火把」互動),不是失手回歸。要不要判定為必須修復的 bug? | **NEEDS HUMAN(非技術對錯,是設計取捨)——不視為必須修復的 bug,不由稽核迴圈或 Opus 代為決定要不要復原這個設計決策。** 列為 P1 級 UX 發現寫入報告,並附上一個備選方案(`.bl-ink-marker` 已經用過的做法——給 `[data-ink-main]` 一個非零低基礎透明度如 0.32,而非完全 0)供人參考,但不預設哪個選項「贏」。緩解因素:`<h1>` 標語本身在所有寬度都維持可見(不像 `5de128e` 修復前);每個 session 有一次自動輪播閃現;行動版(<900px)完全不受影響(強制永遠可見)。 | `7d87c09` 是後於 `5de128e` 的、有完整理由記錄的刻意決策,不是「沒注意到就退步了」。這類「兩個都是深思熟慮但互相衝突的設計決定該聽誰的」屬於商業/美學判斷,不是可以憑程式碼正確性裁定對錯的技術問題,符合本檔第 2 節 NEEDS HUMAN 例外的精神(雖然它不是 audit-report.md 原本列出的那幾項,但屬於同一類)。**同時**:`SUMMARY.md`「Now: ...propositions that are simply on」這句話對目前 main 已經不準——但 `SUMMARY.md` 依 D1 是歷史紀錄檔,不在這次文件訂正範圍內,只在報告內註明「此處敘述已被後續 commit 推翻,SUMMARY.md 未跟著更新」,不去改 SUMMARY.md 本身。 |
| D10 | index.html 桌面版實測 11 種相異字級,`SUMMARY.md` 原文聲稱是「10」——是真的退步還是量測方法不同? | **不追查,列為 P2/資訊性註記即可,不判定為 bug。** 差距只有 1、且執行代理已誠實說明沒有可比對的原始量測腳本(`snap-type.js` 其實是不同用途的工具)、`7d87c09` 確實改動過 hero 結構,兩種解釋都合理但都無法在合理成本內證實。11 這個絕對值本身遠低於改版前的 80 種,不構成品質疑慮。 | 不是每個不確定的小落差都值得深挖——這次的判斷是「金額/正確性無虞時,承認不確定比硬給一個答案更誠實」。 |

## STATE 2 裁決(partner.html + cost-desk.html,2026-08-09)

| # | 議題 | 裁決 | 理由 |
|---|---|---|---|
| D11 | `AGENTS.md`「PIN gates bypass in dev」提到 `sessionStorage.bd_partner='1'`,但 partner.html/cost-desk.html 的 PIN 閘門已在 `6fd00c1`(2026-07-31)徹底移除(三種方式獨立驗證:grep 零匹配、`tools/dev/verify-desks.js:50` 既有斷言、git log 確認移除意圖)。`AUDIT_STATE.json` 的 `S1-S2` 已知議題也連帶過時(該議題原本問「內容是否真機密」,但 partner/cost-desk 現在根本沒有閘門可以問這個問題)。 | **要訂正,已直接執行。** 與 D5/D8 同類。team.html 的閘門不受影響、`S1-S2` 對 team.html 部分維持原判(NEEDS HUMAN),但拆分出 partner/cost-desk 已無閘門的現況。 | 同 D8 判準:文件描述已移除的防護機制,比沒有文件更危險(會讓人誤以為還有保護)。 |
| D12 | `ISSUES.md` I-7 原文指名 `desk-banner.css`,但該檔已在 `d763499`(2026-08-04)從 partner/cost-desk 移除,同款 4-token 遮蔽現在改發生在 `app-bar.css`(目前 5 個頁面共用載入:partner/cost-desk/team/executive/my-market)。範圍從「兩桌」擴大到「五頁共用元件」,原本「不急著在部署前最後一刻改」的延後理由還成立嗎? | **文件要訂正(補充說明,不刪除原文,沿用 ISSUES.md 自己 I-3 那種「加註記錄」慣例),優先度小幅上調但不到必改。** 訂正內容:改點名 `app-bar.css`,註明現在是 5 頁共用而非 2 頁。優先度上調的理由是共用面擴大,但仍然是視覺一致性問題(邊框顏色),不是功能性 bug,不需要因為這次發現而破例立刻動手改 CSS。 | 尊重 ISSUES.md 自己的「加註不刪除」寫作慣例;技術風險沒有質變(還是同一種 token 遮蔽),只有影響面變大,量變不是質變,不需要升級成緊急。 |
| D13 | `AGENTS.md` 警告「`P.shipping`... it can never be fed to `lineChart`, it would throw」,但全庫 grep `lineChart` 零匹配(不只這個模板,整個 repo 都沒有這個函式),消費 `P.shipping` 的 `p-shipping` 區塊本身也已被模板自己的註解記錄為「retired outright」。 | **要訂正,已直接執行。** 移除這段描述已不存在機制的警告。 | 同 D5/D8/D11:文件講一個已經被拆除的機制,對後續 agent 是誤導而非保護。 |
| D14 | P1-2(分享給同事功能把桌面設定靜態預測曲線的數字,用跟即時指數一樣的句型「is currently X」帶出,只有頁尾一句通用「Indicative planning data」免責聲明,無逐項新鮮度標示)——這樣的免責聲明夠不夠,該不該降為 P2? | **維持 P1,不降級。** `docs/DATA-SCHEMA.md` 自己把「label static data honestly」列為兩條最重要規則之一,且這是**外部寄送**給真實第三人的內容(不是站內顯示),通用免責聲明無法取代逐項標示。建議修法方向(不由稽核迴圈執行):比照 AGENTS.md 已提過的「honest-freshness override array」模式,讓 `clause()` 依資料來源類別（即時指數 vs 桌面設定曲線）產生不同措辭,而非兩者共用同一句型。 | 專案自己的文件已經把這件事列為最高兩條規則之一,稽核不該因為有個通用免責聲明就自動降級——這正是「規則存在但沒被遵守」的典型案例。 |

## STATE 2 裁決(contact.html,2026-08-09)

| # | 議題 | 裁決 | 理由 |
|---|---|---|---|
| D15 | P1-1(`context.js` 每次載入都無條件用 `room` 反推覆寫 `bl_mr_region`,導致訪客在 contact.html 自己選的 region 下次造訪被靜默蓋掉)——修法該選「讓 `context.js` 的初始化期 `persist()` 比照 `.set()` 一樣有變更偵測才寫」,還是「讓 contact.html 也把 region 回饋進 blCtx」? | **前者(修 `context.js` 的無條件 persist)是架構正確的方向;後者已被原設計者的既有註解明確排除,不應該做。** 後者需要「4 個路由 region → 7 個桌面 room」的反向映射,但這個映射本來就沒有唯一解(`contact.html:96-99` 的原註解已經講清楚為什麼故意不做)——勉強做只會用猜的規則引入新的錯誤分類。前者只需要讓 `context.js` 不要在訪客根本沒碰過 `room` 欄位時,還無條件用它覆寫一個屬於別的頁面的欄位。**不由稽核迴圈實作**(改的是共用檔案 `context.js`,牽動所有讀 blCtx 的頁面,屬於站台行為程式碼),寫入報告供人執行。 | 這正是 ORCHESTRATION.md 第 1 節「修復方案有多種路線時的取捨」該由 Opus 裁決的情境——已排除的方案不該又被撿回來做,即使它「看起來」比較局部。 |
| D16 | P1-2(9 個非英語版本因為 i18n 字典非同步載入的競態,首次同步時 `blT()` 回退英文原字,之後翻譯是否「巧合修正」看裸鍵剛好有沒有跟 `desk-phrase:` 鍵同形)——該逐一補缺的字典鍵,還是解決競態本身? | **解決競態本身是根本修法,補字典鍵只是治標。** 建議修法方向(不由稽核迴圈實作):contact.html(與桌面 app 共用的同款 widget)的首次 `sync()`/`fillSelect()` 應該等 `i18n.js` 的字典 fetch 完成後才執行,而不是在 DOMContentLoaded 當下就同步跑、事後才靠 `translateText()` 二次掃描補救。這樣「裸鍵剛好跟命名空間鍵同形」這種巧合式修正就不再是正確性的唯一防線。 | 同 D15 的判準:治本優於治標,即使治本要動的檔案範圍更廣(`i18n.js`/`mail-routing.js`/桌面 app 共用邏輯),因為治標方案(逐一補 7 種語言 x 2 個詞的缺漏)只是把同一顆競態炸彈留在原地,下一個新增的 region/line 選項一樣會中招。 |
| D17 | P2-1(「Europe」下拉選項在全部 9 語言字典缺漏,`d1a81f6` commit message 提過「留給後續 coverage sweep」但找不到追蹤紀錄)——現在該補嗎? | **該補,列入快速勝利清單,但不由稽核迴圈直接編輯 i18n 字典檔。** 這類翻譯內容檔案不算 ORCHESTRATION.md 第 2 節「純文件修正」例外的範圍(那個例外只給 AGENTS.md/README.md 這種給 agent 看的說明文件,不包含直接影響網站顯示文字的 i18n 資料),即使風險很低也一樣照規矩留給人執行或另外明確授權。 | 保持「文件修正例外」範圍的一致性,不因為單一案例風險低就臨時擴大解釋——擴大一次就會有第二次、第三次,例外的邊界就會逐漸失守。 |
| D18 | P1-1 嚴重度:P1 還是該升 P0?(執行代理已自陳不確定) | **維持 P1。** 需要「本頁自選非預設值 + 未當場送出 + 事後才回訪」兩階段情境才會觸發,不是對所有訪客都發生;且誤導的目的地仍是 Birdland 真實監控的歐洲總桌,不是失效地址或黑洞。P0 保留給「功能對所有人都壞掉」或「資料真的遺失/送到站外」等級。 | P0/P1 的分界要保持一致,不能因為「發生在唯一轉換點上」就自動升級——嚴重度看影響範圍與後果,不是看發生的地點有多重要。 |
| D19 | P2-2(`i18n-drift.js` 對整份檔案含 `?v=` 快取版本號做 SHA-1 指紋,導致「只換版本號沒換內容」也判 STALE,且會在未來每次共用資源版本 bump 時重演)——優先度? | **可改,不算緊急,但標記為「值得做」而非「僅供參考」。** 建議修法方向:指紋只對 `i18n-page.js`/`i18n-build.js` 抽出的可翻譯文字內容算,不含 `?v=` 版本號等雜訊。不由稽核迴圈實作(改的是 `tools/dev/i18n-drift.js` 本身,屬工具程式碼)。 | 這是會隨時間持續製造誤報噪音的工具設計問題,跟一次性文件訂正不同類——列為 CLEANUP.md 之外的獨立「工具改善建議」,不跟死碼清理混在一起。 |
| D20(架構觀察,非單一議題裁決) | contact.html 的兩個 P1(D15+D16)雖然表面症狀不同,根因都是**多個獨立載入的 script 之間存在隱性的載入順序依賴**(`context.js` 無 `defer`、`i18n.js` 非同步 fetch、`mail-routing.js` 有 `defer`、頁面自己的 inline script 掛在 DOMContentLoaded),彼此之間沒有明確的「等我準備好」協定,正確性目前靠 script 標籤屬性的巧合排列。這算不算需要新增架構(例如一個共用的 ready/init 事件)的「必改」訊號? | **暫定可改(WATCH,非必改),但設下明確的升級條件:若之後任何一頁的稽核又發現第三個獨立的、同樣可歸因於「script 載入順序沒有顯式協定」的 bug,下一輪裁決就應該把這條升級為必改,並提出集中式初始化協定的具體設計。** 目前只有兩個實例(儘管都在同一頁被找到),影響範圍仍算局部(contact.html + 桌面 app 共用的 widget),還不到需要新增全站基礎設施的門檻。 | 避免「看到兩個問題就急著蓋新框架」的過度工程,但也不要讓真正的模式被輕描淡寫——用一個具體、可檢驗的升級門檻(第三個同類案例)取代憑感覺判斷。 |

## STATE 2 裁決(team.html,2026-08-09)

| # | 議題 | 裁決 | 理由 |
|---|---|---|---|
| D21 | `teamdesk.*`(客戶供應鏈建議、原物料動向等 AI 生成內容)已連續凍結 8-9 天,根因是 `gen_news_gemini.py:223-230` 在 Gemini 當天沒回傳 `teamdesk` 子物件時靜默沿用舊值、走的是「成功」分支,CI/status 完全無法偵測。這是**現在正在發生**的問題,不是理論風險。嚴重度該是 P1 還是 P0? | **升級為 P0——這是本次稽核第一個 P0。** 與先前所有 P1 的關鍵差異:不需要任何特定使用者行為序列觸發(D15 需要「本頁選值+延遲送出+回訪」三步驟才會中招),這個問題**對凍結期間的每一次頁面瀏覽都無條件成立**,而且受影響的是設計上直接「複製給客戶」的內容(`team.html:547` 的 `📋 複製給客戶` 按鈕)——業務人員可能在毫無警覺下把過期一週以上的建議文字送給真實客戶。且已經確認至少發生過兩輪(07-25→07-30 一次、08-01→08-09 現在進行中),不是單一僥倖事件。 | P0 保留給「對所有人都無條件成立」+「有真實外部後果」兩者兼具的案例——D15/D16 只滿足後者,這一條兩者都滿足,且是主動、持續發生中,不是等待特定觸發條件的潛伏風險。 |
| D22 | 執行代理發現既有 `AUDIT_REPORT.md` 寫「四桌都有 `.pd-omni-btn` 替代 Terminal chip」,但全站 grep 加上 team.html 現場查詢皆為零命中。 | **這是 Opus 自己先前彙整時的過度概化錯誤,不是原始執行代理的錯——已訂正。** partner.html/cost-desk.html 稽核代理當時只驗證並確認這兩頁有 `.pd-omni-btn`(`tools/partner_template.html:~4397-4463`,原始報告用詞是「Both pages do have」,只指 partner+cost-desk 兩頁),彙整時錯誤寫成「四桌都有」。team.html 確認零命中;executive.html 待驗證。 | 誠實記錄自己的錯誤,不要為了報告一致性而掩蓋——這正是稽核迴圈存在的意義:連自己先前的裁決都要接受覆核。 |
| D23 | team.html 的單面板路由不支援 reload/上一頁狀態持久化、無 `?q=` 深連結,與 partner.html 的同類路由能力不對等,是否算落差? | **接受為合理簡化,非落差,不列入待修清單。** team.html 是內部營運工具集合(報價試算、貨櫃裝載、單位換算等),partner.html 是對外形象較重的採購儀表板——不同使用情境本來就該有不同的工程投入,這正是 ORCHESTRATION.md 第 1 節「四種頁面建構哲學並存是否該收斂」這類判斷的具體案例:此處判斷「不該」,因為兩者服務對象/使用頻率本質不同。 | 不是所有不一致都是 bug——套用相同的實作深度到用途不同的頁面才是過度工程。 |
| D24 | 執行代理依指示檢查 D20 的「第三個獨立案例」,找到結構相同(script 載入順序無顯式協定)的第三個實例(`text-size.js`/`app-bar.js`/`i18n.js` 在 team.html 的協調鏈),但**目前實測運作正常、無伴隨失效**——這樣算不算觸發 D20 的升級門檻? | **不算,D20 門檻文字明講的是「bug」,不是「結構相似的脆弱模式」。維持 2/3,但新開一個獨立的、優先度較低的追蹤項:「結構脆弱但目前正常」的實例計數,目前 1 個(此案例)。** 若後續稽核發現某個「脆弱但正常」的實例後來真的壞掉(例如改了 script 標籤順序後壞掉),那就晉升為 D20 的第 3 個確認 bug,才觸發升級。 | 區分「風險存在」與「傷害已發生」是必要的紀律——把兩者混為一談會讓「升級門檻」失去意義(任何足夠複雜的站台永遠找得到理論上脆弱的模式)。 |
| D25 | `docs/DATA-SCHEMA.md` 的 `teamdesk.*` 欄位參考缺 `shipping`/`fx_forecast` 兩個實際被大量使用的欄位——是否適用跟 AGENTS.md 同等的訂正待遇? | **不主動訂正,優先度低於其他文件落差。** `docs/DATA-SCHEMA.md` 自己已經免責聲明「teamdesk.\* 是有機成長的,請以實際 JSON 為準」——文件本身已經告訴讀者不要完全信任這份清單,不像 AGENTS.md 那三處是用肯定語氣描述已經不存在的機制、會誤導人。這裡只是文件坦承的不完整,不是文件說謊。 | 訂正的價值來自「文件現在說的是錯的」,不是「文件不夠完整」——已自我揭露侷限性的文件,補完的急迫性遠低於誤導性的錯誤描述。 |

## STATE 2 裁決(executive.html,2026-08-09)

| # | 議題 | 裁決 | 理由 |
|---|---|---|---|
| D26 | `source_tier: "local English media"` 是真實資料裡穩定出現的第四種值,`docs/DATA-SCHEMA.md` 只文件化三種(official/trade/context)——這是文件不完整,還是四桌功能稽核當初修過的「非 schema source_tier」bug 復發? | **判定為文件不完整,非 bug 復發。** 12 筆資料 100% 一致使用此值,且是 executive.html 獨有的台/中在地媒體桌功能(partner/cost-desk 沒有這個功能),渲染完全正確——符合「刻意設計的第四種分類,文件沒跟上」的模式。**不主動訂正 `docs/DATA-SCHEMA.md`**,比照 D25 的判準:該文件已自我聲明是有機成長、以 JSON 為準,不完整不等於誤導。 | 沿用 D25 已建立的判準,保持一致——同一份文件的同類落差不該因為換了個欄位就換一套標準。 |
| D27 | executive.html 找到一個結構上跟 D15/D16 相同(獨立載入 script 無顯式協定)的近似案例(`app-bar.js` 動態插入 masthead vs. edition-strip 自己假設 `header.top` 還是 sticky 元素),但目前不會出事,原因是**另一條無關的 CSS 規則**(`daily-journal.css:22-23` 把 `.top` 蓋成 `position:relative`)讓這個假設從一開始就不成立、race 從未真的發生。這比 team.html 的第三個實例(仰賴瀏覽器 defer 執行順序的規格保證)更脆弱——因為救它的是一條「看起來像多餘覆蓋、很容易被未來清理誤刪」的 CSS 規則,不是規格保證。算不算 D20 的第三個 bug? | **不算(維持 2/3,同 D24 的判準:目前無真實失效)。但比 team.html 那個實例更值得記錄,因為救援機制本身很脆弱**——移到「脆弱但正常」次要計數器,目前計數 2(team.html 那個 + 這個)。**額外裁決:`daily-journal.css:22-23` 這條規則加入 CLEANUP.md 的「反向清單」(明確標記不可移除,即使它看起來像多餘的重複宣告)**,避免未來清理死碼時誤刪,把潛伏的 race 變成真實 bug。 | D20 門檻的字面意思沒有變,維持一致;但這個發現本身太有價值不能只是「不算數就放著」——用一個新的機制(CLEANUP 反向清單)承接它,而不是硬塞進不完全適用的 D20 計數。 |
| D28 | I-7/`app-bar.css` 的 token 遮蔽問題,現在有了三頁的實測資料:executive.html(未遮蔽,渲染出 tokens.css 的原始值,正確)、partner.html 與 cost-desk.html(各自遮蔽成不同值,連兩者互相都對不上)。這個新資訊該不該讓建議修法方向更明確? | **是,修正 D12 的建議方向(不是推翻,是精化):既然 executive.html(以及先前 partner/cost-desk 報告提過的 my-market.html)證明「不遮蔽、直接用 tokens.css 原值」是可行且已經在兩頁上正確運作的做法,建議修法從「挑一個新的共用值」改為「移除 partner_template.html 與 team_template.html 各自的遮蔽區塊,回歸 tokens.css 原值」——不是無中生有選一個新答案,是收斂回已經有兩頁在用、且正確的既有答案。** 仍然不由稽核迴圈執行(CSS 變更屬站台程式碼)。 | 有了三頁的實測資料後,原本「不知道該遮蔽成什麼值」的模糊建議可以變成「不要遮蔽,兩頁已經證明不遮蔽是對的」的具體建議——這正是稽核迴圈逐頁累積證據的價值所在。 |

## 待裁決(STATE 2 執行中若遇到,直接沿用上面同類裁決的精神;新議題才追加列於此)

_(下一頁的稽核若出現新議題,追加於此;裁決 D20 的升級條件由後續每一頁的稽核自行檢查是否觸發——注意 D24/D27 的區分:只有「確認的 bug」算數計入 D20 的 2/3,「結構相似但目前正常」的實例另外累計於次要計數器,目前為 2)_
