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

## 待裁決(STATE 2 執行中若遇到,直接沿用上面同類裁決的精神;新議題才追加列於此)

_(下一頁的稽核若出現新議題,追加於此)_
