# CLEANUP.md — 死碼/重複邏輯/殘留清理候選清單

> 分級:**A** = 引用分析證明可刪 / **B** = 可能動態引用,需人工複核。
> 本檔只列候選與分級,**實際刪除一律不在這裡執行**——完稿後由 `cleanup.sh` 承載,人在方便
> 時自己跑。目前 STATE 5 尚未開跑,以下是承接前四輪稽核紀錄的候選種子,需要重新驗證現況
> 才能定案,不能直接照抄舊結論當新結論。

## ⚠️ 反向清單:看起來像死碼但絕對不能刪(先讀這節,再讀下面的候選清單)

| # | 項目 | 為什麼看起來像死碼 | 為什麼不能刪 |
|---|---|---|---|
| R1 | `daily-journal.css:22-23` 的 `.top{position:relative;top:auto;...}` | 表面上像是覆蓋掉 `executive.html` 頭部內聯 `&lt;style&gt;` 的 `.top{position:sticky;...}`,兩條規則同時存在看起來像忘記清的重複宣告 | 這條規則是防止 `app-bar.js`(延遲載入,動態插入非 sticky 的 `#app-bar`)與 edition-strip 自己的高度量測腳本(假設 `header.top` 還是 sticky 元素)之間產生 race condition 的關鍵——移除它會讓一個目前潛伏、從未真正發作的 bug 變成真實可見的版面錯位(裁決 DECISIONS.md D27) |

## 候選清單(可以刪或需要人工複核的項目,在下面)

## 種子候選(需 STATE 5 重新驗證現況)

| # | 候選 | 分級(暫定) | 現況需求 | 來源 |
|---|---|---|---|---|
| C1 | `node_modules/`(2026-06-29 時被 commit,26MB,含未使用的 `jsdom`) | 待驗證 | `ISSUES.md` I-5 顯示 `jsdom` 已移到 `devDependencies`、`playwright-core`/`sharp` 已宣告——但沒說 `node_modules/` 本身是否已加進 `.gitignore` 並從 git 移除。STATE 5 要直接查 `git ls-files node_modules \| wc -l` 確認,不能假設已處理。 | `audit-report.md` L2 |
| C2 | `origin/codex/pr-validation` 分支 | B(不是死碼,是廢棄分支) | 比目前 main 早了 365 個檔案的內容(見 `DECISIONS.md` D2),不是進行中工作。建議標記可刪,但分支刪除是明顯不可逆動作,**只在這裡記錄建議,絕不由稽核迴圈執行**,需人親自確認後刪除。 | 本次 recon |
| C3 | `birdland-intro.html` 孤兒頁 | A(刪除方案已驗證存在) | 刪除已經寫在 `i18n/my-market-composed-sentences` 分支(未推送)。這個稽核迴圈不重新提案刪除,只需在 STATE 5 確認 main 上現況是否仍是孤兒(是的話,等那個分支被 push+merge 就會解決,不需要稽核迴圈另外做一次)。 | `ISSUES.md` I-2 |
| C4 | I-7:`partner_template.html` 的 `body.theme-light` 遮蔽 `--down/--up/--flat/--line` 四個 palette token | B(刻意保留至今,非死碼) | `ISSUES.md` 原文明講「renaming the desks' four variables is a change worth making deliberately rather than in the last minutes before a deploy」——即這是被延後的技術債,不是沒人發現的死碼。STATE 5 只需確認有沒有*新的*共用元件踩到同一個陷阱,不是重新提案解決 I-7 本身。 | `ISSUES.md` I-7 |
| C5 | `.atlas-*`/`.mat-*`/`.dia-*` 舊 CSS class(SUMMARY.md 記錄為已於 UX 改版中移除) | 待驗證 | `SUMMARY.md`「What was removed」表列為已刪除(15,055 bytes,PIN gate/rake routes 一併清除)。既然 `ux-refine` 已合併進 main(`DECISIONS.md` D1),理論上這些已經不存在——STATE 5 用 `tools/dev/cssprune.js` 實際跑一次確認,不要假設文件說刪了就真的乾淨。 | `SUMMARY.md` |

## STATE 2 順手發現的死碼(partner.html/cost-desk.html 稽核,2026-08-09,證據充分先記錄)

| # | 候選 | 分級 | 證據 |
|---|---|---|---|
| C6 | `tools/partner_template.html` 11 個 `bentofy()` 呼叫指向已「retired outright」(模板自己的註解語言)的 section id:`p-brief`(:3370)、`p-material`(:3374)、`p-shipping`(:3378)、`p-freight`(:3382)、`p-war`(:3395)、`p-tariff`(:3399,含讀取死資料 `P.tariffmon` 的 `mdSynth` 回呼)、`p-news`(:3409)、`p-keynews`(:3411)、`p-regcal`(:3412)、`p-report`(:3416)、`p-season`(:3425) | **A**(引用分析證明可刪——`bentofy()` 自己在 `document.getElementById(id)` 為 null 時直接 return,現場 DOM 逐一確認這些 id 全部不存在) | STATE 2 partner.html+cost-desk.html 稽核報告 |
| C7 | `.wl`/`.tm` 表格 class 的完整 CSS 定義(`tools/partner_template.html:76-79,133,172,190,465-468,672-677`,含 up/down/flat 色彩映射)但整個模板只有 1 個 `&lt;table&gt;`,且不用這兩個 class | **A**(live DOM 確認 `document.querySelectorAll('.wl').length===0` 且 `.tm` 同樣為 0,無 JS 動態掛載路徑) | 同上 |
| C9 | `tools/team_template.html:10-11` 引入 `--pos`/`--neg` 語意色彩命名(意圖跟 I-7 一樣遮蔽 token,但用新名字),但同檔案下方複製自 partner_template.html 的 `!important` Kubera-skin 覆蓋層(`:293` 一帶)永遠贏過它,現場計算 computed color 確認最終渲染從未真正採用 `--pos`/`--neg` 的值 | **A**(現場驗證 CSS 層疊順序,`!important` 規則的存在與生效範圍可直接從 computed style 反推,非推測) | STATE 2 team.html 稽核報告。建議:移除這組死碼宣告,或若要保留給未來用,至少改名成不暗示語意方向的中性名字(目前 `--pos` 綁的其實是「漲/壞」,跟名字暗示的方向相反,對未來維護者是陷阱) |
| C8 | 舊手風琴式收合 UI 殘留:`.blk-h .tog,.blk-h .lights{display:none!important}` 的 CSS 覆蓋規則、加上一個永遠打不到的 bubble-phase `.toc a` click handler(`tools/partner_template.html:2609-2612`,單面板 router 的 capture-phase handler 會先 `stopPropagation()`) | **A**(對應的 JS `window.__bo` 邏輯本身正確,只是視覺上被 CSS 藏起來、且有一段 handler 永遠執行不到——可刪的是死路徑本身,不是收合功能) | 同上 |

## 待掃描(STATE 5 尚未執行)

- 版本殘影(`?v=YYYYMMDDx` 查詢字串是否有引用到不存在版本的殘留)
- `package.json`/`package-lock.json` 依賴是否還有其他未使用項(I-5 只處理了 `jsdom` 一項)
- `tools/dev/*.js` 彼此之間是否有功能重疊該合併的(例如 `shot.js` vs `ux-capture.js` vs `gen-guide-shots.js` 三支都碰截圖,是否該收斂)

---

_`cleanup.sh` 尚未產生——待 STATE 5 完整跑完候選清單與分級後才生成,不會在候選還沒驗證
現況前就先寫執行腳本。_
