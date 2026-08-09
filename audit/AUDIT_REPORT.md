# Birdland.com.tw — Zero-Touch 全站稽核報告

> 狀態:**進行中**(STATE 1 完成,STATE 2 尚未開始逐頁掃描)。本檔會隨 `/loop` 每輪執行
> 持續更新,不是一次性產出。啟動分支:`audit/zero-touch-review`,基準 commit `fbe1d0e`。

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
| 新發現 P0 | 0 |
| 新發現 P1 | 0 |
| 新發現 P2 | 1(SEO-2,robots.txt/noindex meta 不一致,見下) |
| 已知議題(承接自前 4 輪稽核) | 12 項,詳見 `AUDIT_STATE.json` 的 `knownIssues`(7 開放/待覆核、5 已關閉) |
| 本次啟動前 recon 已直接處理 | 2 項(見下) |

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

- **`index.html`**:A-E 五個象限已派工給 Sonnet 執行代理(背景執行,結果尚未返回,見
  `AUDIT_STATE.json` 的 `state2Queue.inProgress`)。F 象限(架構,Opus 主責)待 A-E 結果
  回來後才做,因為 F 的判斷需要 A-E 的具體觀察當輸入,不是憑空判斷。
- 其餘 14 頁尚未開始。

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

## 本迴圈已完成的文件訂正

_(尚無——`AGENTS.md` 的 news.html/guide.html 訂正待 STATE 2 執行時依 `DECISIONS.md` D5
的裁決落實,此處會記錄實際 commit hash)_

## P0 清單

_(STATE 2 尚未開始,尚無新發現)_

## 快速勝利清單

- terminal.json 重新產生(已完成,見上)
- `AGENTS.md` news.html/guide.html 描述訂正(待執行,裁決已就緒:`DECISIONS.md` D5)

## 建議修復順序

1. 共用建置工具鏈(`tools/build_news.py`/`tools/dev/build.js`/`gen-terminal.js`/
   `build_calendars.js`/`build_feeds.py`)的同步性問題——影響面最廣,一次修好惠及所有頁面。
2. 文件訂正(`AGENTS.md` 等)——零風險,高價值,優先做。
3. 個別頁面的 A-F 類發現——依 STATE 2 掃描順序(高優先頁面優先)處理。
4. `CLEANUP.md` 的清理項——最後執行,且只產出 `cleanup.sh` 供人決定。

---

_本報告由 `/loop` 驅動的 Zero-Touch 稽核迴圈自動維護,人類可隨時中途查看,不需要等
STATE 6 才有內容。_
