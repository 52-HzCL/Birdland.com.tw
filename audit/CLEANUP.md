# CLEANUP.md — 死碼/重複邏輯/殘留清理候選清單

> 分級:**A** = 引用分析證明可刪 / **B** = 可能動態引用,需人工複核。
> 本檔只列候選與分級,**實際刪除一律不在這裡執行**——已由 `audit/cleanup.sh` 承載
> (STATE 5 已產出,人在方便時自己跑;稽核迴圈只寫腳本,不執行)。

## ⚠️ 反向清單:看起來像死碼但絕對不能刪(先讀這節,再讀下面的候選清單)

**R1 類(移除會立即引爆一個現在就存在、只是被掩蓋的真實 bug)**

| # | 項目 | 為什麼看起來像死碼 | 為什麼不能刪 |
|---|---|---|---|
| R1 | `daily-journal.css:22-23` 的 `.top{position:relative;top:auto;...}` | 表面上像是覆蓋掉 `executive.html` 頭部內聯 `&lt;style&gt;` 的 `.top{position:sticky;...}`,兩條規則同時存在看起來像忘記清的重複宣告 | 這條規則是防止 `app-bar.js`(延遲載入,動態插入非 sticky 的 `#app-bar`)與 edition-strip 自己的高度量測腳本(假設 `header.top` 還是 sticky 元素)之間產生 race condition 的關鍵——移除它會讓一個目前潛伏、從未真正發作的 bug 變成真實可見的版面錯位(裁決 DECISIONS.md D27) |

**R2 類(優雅降級/防禦性程式碼,目前未被行使,但不是無用——移除只是犧牲未來的韌性,不會立即出事,裁決 D34)**

| # | 項目 | 為什麼看起來像死碼 | 為什麼不能刪 |
|---|---|---|---|
| R2 | `site-shell.js`(`guide.html` 專用,重建 `.shell-nav` 選單) | 效果永遠被稍後執行的 `desk-banner.js` 蓋掉(目前 happy path 下,前者的工作使用者永遠看不到) | 這是 `desk-banner.js` 萬一載入失敗/丟例外時唯一還能運作的導覽——移除等於拿掉一層備援,不會今天就出事,但會讓未來某次 `desk-banner.js` 故障時 guide.html 完全沒有可用導覽 |

## 候選清單(可以刪或需要人工複核的項目,在下面)

## 種子候選——STATE 5 已重新驗證,結果如下

| # | 候選 | 最終結果 | 驗證方式 |
|---|---|---|---|
| C1 | `node_modules/`(2026-06-29 時被 commit,26MB) | **已解決,非候選。** `git ls-files node_modules \| wc -l` = 0,`.gitignore` 已含 `node_modules/`。 | 直接執行驗證 |
| C2 | `origin/codex/pr-validation` 分支 | **維持建議可刪,不由稽核迴圈執行。** 比目前 main 早了 365 個檔案的內容(`DECISIONS.md` D2),確認是廢棄分支非進行中工作。已寫入 `cleanup.sh`,但分支刪除本身留給人親自執行(`git push origin --delete codex/pr-validation`)。 | 見 D2,分支比對已足夠確認 |
| C3 | `birdland-intro.html` 孤兒頁 | **維持現況,不重新提案。** 刪除方案已存在 `i18n/my-market-composed-sentences`(未推送),main 上現況確認仍是孤兒(D35 重新驗證)。等該分支 push+merge 即解決,`cleanup.sh` 明確不重做這件事以免衝突。 | D35 現場重新驗證 |
| C4 | I-7:token 遮蔽(現已知影響 `partner_template.html`/`team_template.html`/`site-shell.css`,非僅原文提到的 partner) | **有新資料點(D28/D43),建議方向已精化——移除遮蔽,收斂回 tokens.css 原值(4 個獨立資料點證明這是正確答案)。** 已寫入 `cleanup.sh` 的手動指引,不自動執行(視覺行為變更,需人複核)。 | D28/D43 累積 4 頁證據 |
| C5 | `.atlas-*`/`.mat-*`/`.dia-*` 舊 CSS class | **已解決,非候選。** 全站 grep 零匹配,`SUMMARY.md` 的移除聲明屬實。 | 直接執行驗證 |

## STATE 2 順手發現的死碼(partner.html/cost-desk.html 稽核,2026-08-09,證據充分先記錄)

| # | 候選 | 分級 | 證據 |
|---|---|---|---|
| C6 | `tools/partner_template.html` 11 個 `bentofy()` 呼叫指向已「retired outright」(模板自己的註解語言)的 section id:`p-brief`(:3370)、`p-material`(:3374)、`p-shipping`(:3378)、`p-freight`(:3382)、`p-war`(:3395)、`p-tariff`(:3399,含讀取死資料 `P.tariffmon` 的 `mdSynth` 回呼)、`p-news`(:3409)、`p-keynews`(:3411)、`p-regcal`(:3412)、`p-report`(:3416)、`p-season`(:3425) | **A**(引用分析證明可刪——`bentofy()` 自己在 `document.getElementById(id)` 為 null 時直接 return,現場 DOM 逐一確認這些 id 全部不存在) | STATE 2 partner.html+cost-desk.html 稽核報告 |
| C7 | `.wl`/`.tm` 表格 class 的完整 CSS 定義(`tools/partner_template.html:76-79,133,172,190,465-468,672-677`,含 up/down/flat 色彩映射)但整個模板只有 1 個 `&lt;table&gt;`,且不用這兩個 class | **A**(live DOM 確認 `document.querySelectorAll('.wl').length===0` 且 `.tm` 同樣為 0,無 JS 動態掛載路徑) | 同上 |
| C11 | `tools/news_template.html:16-72` 約 24 個舊版「OEM control map / signal cards / handoff strip」相關 CSS selector(`.map-label`/`.customer-core`+4 子項/`.node-*`/`.evidence-*`/`.proof-*`/`.handoff-strip`+子項/`.signal-*`/`.cost-svg`/`.asia-map`/`.risk-table`)+ 2 個未使用的 `@keyframes`(`orbit`/`flow`),`SUMMARY.md`「What changed」已記錄這批被 `.ov-walk`/`.ov-mind` 取代 | **A**(原始碼零匹配 + 現場 post-JS DOM 逐一查詢全部 0 + 全站 JS 零動態建構) | STATE 2 guide.html 稽核報告。**清理陷阱**:`@media(max-width:760px)` 這條規則(:71)把死選擇器(`.map-label`/`.customer-core`/`.proof-grid`/`.proof-card`/`.handoff-strip`)跟一個活的選擇器(`.section-intro`,本文用了兩次)混在同一個 media block 裡,不是連續可整段刪除的範圍,需要逐選擇器精修,建議清理前先跑 `cssprune.js` 而非手動抓行號範圍刪除 |
| C10 | `about.html:19-42` 的 `.bd-numbers`/`.bd-boundary`/`.bd-side`/`.bd-side-birdland`/`.bd-rule`/`.bd-firewall` 六組 CSS(舊版「雙欄盾牌」設計殘留,現在的三聯圖版式已不用),在全部 10 語言版本(英文+9 語言,i18n-build.js 整檔複製)零使用,合計約 29KB | **A**(引用分析 + git 歷史雙重確認:body 標記已被移除,CSS 沒跟著清) | STATE 2 about.html 稽核報告。清除時順便解決一個附帶的 token 漂移(`#ece7dc` 與 `--paper-2` 僅差 Δ14,`snap-color.js` 判定同色異寫)。建議加進 `tools/dev/prune-apply.js` 的 `TARGETS` 表(目前該表沒有 about.html 的條目) |
| C9 | `tools/team_template.html:10-11` 引入 `--pos`/`--neg` 語意色彩命名(意圖跟 I-7 一樣遮蔽 token,但用新名字),但同檔案下方複製自 partner_template.html 的 `!important` Kubera-skin 覆蓋層(`:293` 一帶)永遠贏過它,現場計算 computed color 確認最終渲染從未真正採用 `--pos`/`--neg` 的值 | **A**(現場驗證 CSS 層疊順序,`!important` 規則的存在與生效範圍可直接從 computed style 反推,非推測) | STATE 2 team.html 稽核報告。建議:移除這組死碼宣告,或若要保留給未來用,至少改名成不暗示語意方向的中性名字(目前 `--pos` 綁的其實是「漲/壞」,跟名字暗示的方向相反,對未來維護者是陷阱) |
| C8 | 舊手風琴式收合 UI 殘留:`.blk-h .tog,.blk-h .lights{display:none!important}` 的 CSS 覆蓋規則、加上一個永遠打不到的 bubble-phase `.toc a` click handler(`tools/partner_template.html:2609-2612`,單面板 router 的 capture-phase handler 會先 `stopPropagation()`) | **A**(對應的 JS `window.__bo` 邏輯本身正確,只是視覺上被 CSS 藏起來、且有一段 handler 永遠執行不到——可刪的是死路徑本身,不是收合功能) | 同上 |

## 待掃描(STATE 5 尚未執行)

- 版本殘影(`?v=YYYYMMDDx` 查詢字串是否有引用到不存在版本的殘留)
- `package.json`/`package-lock.json` 依賴是否還有其他未使用項(I-5 只處理了 `jsdom` 一項)
- `tools/dev/*.js` 彼此之間是否有功能重疊該合併的(例如 `shot.js` vs `ux-capture.js` vs `gen-guide-shots.js` 三支都碰截圖,是否該收斂)

---

_`audit/cleanup.sh` 已產生(STATE 5)。C1/C5 已解決,腳本裡略過;C6 可直接自動確認候選
仍存在(11/11);C7/C9/C10/C11 因涉及共用選擇器清單,依本專案自己的規則(禁止用 regex/
行號範圍剪 CSS)不自動執行,腳本印出手動指引指向 `tools/dev/prune-apply.js`;C4/D43 的
token 遮蔽移除、C2 的分支刪除、C3 的孤兒頁刪除皆為人工步驟,腳本只給指引不動手。腳本本身
唯讀(執行過,確認零檔案變動),不需要额外的乾跑保護。_
