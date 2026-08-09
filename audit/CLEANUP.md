# CLEANUP.md — 死碼/重複邏輯/殘留清理候選清單

> 分級:**A** = 引用分析證明可刪 / **B** = 可能動態引用,需人工複核。
> 本檔只列候選與分級,**實際刪除一律不在這裡執行**——完稿後由 `cleanup.sh` 承載,人在方便
> 時自己跑。目前 STATE 5 尚未開跑,以下是承接前四輪稽核紀錄的候選種子,需要重新驗證現況
> 才能定案,不能直接照抄舊結論當新結論。

## 種子候選(需 STATE 5 重新驗證現況)

| # | 候選 | 分級(暫定) | 現況需求 | 來源 |
|---|---|---|---|---|
| C1 | `node_modules/`(2026-06-29 時被 commit,26MB,含未使用的 `jsdom`) | 待驗證 | `ISSUES.md` I-5 顯示 `jsdom` 已移到 `devDependencies`、`playwright-core`/`sharp` 已宣告——但沒說 `node_modules/` 本身是否已加進 `.gitignore` 並從 git 移除。STATE 5 要直接查 `git ls-files node_modules \| wc -l` 確認,不能假設已處理。 | `audit-report.md` L2 |
| C2 | `origin/codex/pr-validation` 分支 | B(不是死碼,是廢棄分支) | 比目前 main 早了 365 個檔案的內容(見 `DECISIONS.md` D2),不是進行中工作。建議標記可刪,但分支刪除是明顯不可逆動作,**只在這裡記錄建議,絕不由稽核迴圈執行**,需人親自確認後刪除。 | 本次 recon |
| C3 | `birdland-intro.html` 孤兒頁 | A(刪除方案已驗證存在) | 刪除已經寫在 `i18n/my-market-composed-sentences` 分支(未推送)。這個稽核迴圈不重新提案刪除,只需在 STATE 5 確認 main 上現況是否仍是孤兒(是的話,等那個分支被 push+merge 就會解決,不需要稽核迴圈另外做一次)。 | `ISSUES.md` I-2 |
| C4 | I-7:`partner_template.html` 的 `body.theme-light` 遮蔽 `--down/--up/--flat/--line` 四個 palette token | B(刻意保留至今,非死碼) | `ISSUES.md` 原文明講「renaming the desks' four variables is a change worth making deliberately rather than in the last minutes before a deploy」——即這是被延後的技術債,不是沒人發現的死碼。STATE 5 只需確認有沒有*新的*共用元件踩到同一個陷阱,不是重新提案解決 I-7 本身。 | `ISSUES.md` I-7 |
| C5 | `.atlas-*`/`.mat-*`/`.dia-*` 舊 CSS class(SUMMARY.md 記錄為已於 UX 改版中移除) | 待驗證 | `SUMMARY.md`「What was removed」表列為已刪除(15,055 bytes,PIN gate/rake routes 一併清除)。既然 `ux-refine` 已合併進 main(`DECISIONS.md` D1),理論上這些已經不存在——STATE 5 用 `tools/dev/cssprune.js` 實際跑一次確認,不要假設文件說刪了就真的乾淨。 | `SUMMARY.md` |

## 待掃描(STATE 5 尚未執行)

- 版本殘影(`?v=YYYYMMDDx` 查詢字串是否有引用到不存在版本的殘留)
- `package.json`/`package-lock.json` 依賴是否還有其他未使用項(I-5 只處理了 `jsdom` 一項)
- `tools/dev/*.js` 彼此之間是否有功能重疊該合併的(例如 `shot.js` vs `ux-capture.js` vs `gen-guide-shots.js` 三支都碰截圖,是否該收斂)

---

_`cleanup.sh` 尚未產生——待 STATE 5 完整跑完候選清單與分級後才生成,不會在候選還沒驗證
現況前就先寫執行腳本。_
