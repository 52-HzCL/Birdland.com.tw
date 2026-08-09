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
| 新發現 P1 | 2(1 個 NEEDS HUMAN 設計取捨、1 個已修復的文件訂正,見 index.html 逐項發現) |
| 新發現 P2 | 2(SEO-2 robots.txt/noindex 不一致;index.html 字級數量差 1,不追查) |
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

- **`index.html`:已完成(A-F 全部跑完)。** 詳見下方 P1 清單與「已修復」項目。
- 其餘 14 頁尚未開始,`product-101.html`/`contact.html` 已派工給 Sonnet 執行代理(見
  `AUDIT_STATE.json`)。

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
| 「commit message 講清楚了,但對應說明文件沒跟著更新」模式,這次稽核已抓到三次(`AGENTS.md` 建置系統節、`AGENTS.md` index specifics 節、`SUMMARY.md` hero 文案宣稱) | 正常的文件熵,不建議新增流程負擔(如 doc-currency CI 檢查),稽核迴圈定期抓漏已是足夠機制 | 可改(非必改) |

## 本迴圈已完成的文件訂正

1. `AGENTS.md`「Pages & build system」節(D5):訂正 news.html 現況為手寫 redirect
   stub、補上遺漏的 `cost-desk.html`(與 partner.html 共用 `partner_template.html`)、
   把已跟不上現況的手刻 rebuild 指令改為指向 `tools/dev/build.js`。
2. `AGENTS.md`「index.html specifics」節 + storage namespace 範例(D8):訂正為 ink
   hero/`bl_ink_intro`/單行可橫向捲動導覽列的現況,移除已不存在的 foliage-cut/
   reading-focus 縮放/hamburger 選單描述。

## P0 清單

_(STATE 2 尚未開始,尚無新發現)_

## 快速勝利清單

- terminal.json 重新產生(已完成,見上,屬 PR #1 範疇)
- `AGENTS.md` 兩節文件訂正(已完成,見上「本迴圈已完成的文件訂正」)
- Hero `[data-ink-main]` 若要恢復可見:改一個 CSS 數值(0→0.32 類似 `.bl-ink-marker` 的
  做法),成本極低,但這是 NEEDS HUMAN 的設計取捨,不在稽核迴圈的快速勝利範圍內執行,
  只在此標註「如果人決定要改,這是最小改法」

## 建議修復順序

1. 共用建置工具鏈(`tools/build_news.py`/`tools/dev/build.js`/`gen-terminal.js`/
   `build_calendars.js`/`build_feeds.py`)的同步性問題——影響面最廣,一次修好惠及所有頁面。
2. 文件訂正(`AGENTS.md` 等)——零風險,高價值,優先做。
3. 個別頁面的 A-F 類發現——依 STATE 2 掃描順序(高優先頁面優先)處理。
4. `CLEANUP.md` 的清理項——最後執行,且只產出 `cleanup.sh` 供人決定。

---

_本報告由 `/loop` 驅動的 Zero-Touch 稽核迴圈自動維護,人類可隨時中途查看,不需要等
STATE 6 才有內容。_
