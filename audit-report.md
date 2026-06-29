# Birdland.com.tw — 全面稽核報告

> 產出時間：2026-06-29 ｜ 稽核者：Claude Code ｜ 範圍：`52-HzCL/Birdland.com.tw` main（本機沙箱）
> 原則：先檢查、後修改。本報告**尚未對 repo 做任何 push**。

---

## 🟢 好消息：沒有外洩憑證
- 全 repo（排除 node_modules）掃描 `github_pat_ / ghp_ / AIza / sk- / PRIVATE KEY / .env`：**無硬寫憑證**。
- `GEMINI_API_KEY`、`TWELVEDATA_API_KEY` 正確使用 GitHub Actions Secrets（`${{ secrets.* }}`），未落地。
- git 歷史抽查：未發現曾 commit 的明文金鑰。
- 公開頁面未洩漏客戶 email、電話、客戶名單、報價單。

---

## 1. 安全與機密性（最高優先）

| # | 現況 | 問題 | 嚴重度 | 建議 |
|---|------|------|--------|------|
| S1 | `partner.html` / `team.html` 用純前端 JavaScript 做 PIN 閘門，密碼**明文寫死在頁面原始碼**：partner = `estd1974`、team = `ecosteelland` | 任何人 View Source 或直接刪掉遮罩 `<div id="gate">` 即可看到全部「機密」內容。閘門等於**裝飾，毫無實際保護** | **高** | 認清現實：靜態 GitHub Pages 無法做真正的伺服器端驗證。若內容真機密 → 移到需登入的後端／Cloudflare Access；若只是「擋一般訪客」可接受 → 至少改成雜湊比對並承認它非機密 |
| S2 | 閘門後的內容（區域市場展望、FOB/MPF/HMF 報關費試算器）**完整存在於公開靜態 HTML**，且檔案本身可直接 `GET /partner.html` 取得 | 與 S1 同根因：資料是公開的，閘門擋不住 | **高** | 同 S1。先確認這些內容是否真不可公開；報關費試算邏輯本身多為公開知識，風險較低 |
| S3 | `news/partner/team.html` 已有 `<meta name="robots" content="noindex">` ✅ | 但**無 `robots.txt`**，且 noindex 只擋守規矩的爬蟲 | 低 | 新增 `robots.txt` 明確 `Disallow: /partner.html /team.html`（注意：這反而會公開告訴別人這些路徑存在，需權衡） |
| S4 | `birdland-intro.html`（205KB）為**孤兒頁**：無任何頁面連到它、無 `robots` meta、結構是兩份完整 HTML 文件硬接（2× DOCTYPE/html/body）的「Bundled Page」殘骸 | 可被 `GET` 直接存取且**會被搜尋引擎索引**；疑似草稿／打包失誤殘留 | 中 | 確認用途；若無用 → 刪除；若保留 → 至少加 `noindex` 並修正結構 |

---

## 2. Build 系統

| # | 現況 | 問題 | 嚴重度 | 建議 |
|---|------|------|--------|------|
| B1 | `tools/build_news.py`：讀 `outlook-data.json`，把整段 JSON 字串替換模板裡的 `__DATA__`，輸出 news/partner/team.html | 邏輯單純、**可重現**。三個模板都含 `__DATA__`、三個產出頁的 `updated` 一致（`29 Jun 2026, 14:05 UTC`）✅ | — | 無需修改 |
| B2 | `outlook-data.json`：`json.load` 成功、**14 region 齊全**、無 BOM、`updated` 格式正確 ✅ | `order` 陣列與 `regions` keys 排序不同，但**集合相同**（皆 14 個 key），屬顯示順序設計，非錯誤 | — | 無需修改 |
| B3 | CI workflow `news-update.yml`：每日 01:00 UTC 跑 Gemini 產文 + TwelveData 行情 → rebuild → commit/push | `set +e` + `exit 0` 會吞掉產生階段錯誤，可能**靜默產出空/壞資料**仍照 push | 中 | 在 build 後加一個 `json.load` 驗證關卡，失敗則 `exit 1` 不 push |

---

## 3. 逐頁檢查

| # | 現況 | 問題 | 嚴重度 | 建議 |
|---|------|------|--------|------|
| P1 | `index.html`：完整 SEO（title、description、OG 全套、canonical、favicon、`lang="en"`）✅ | 良好 | — | — |
| P2 | `news/partner/team.html`：有 title、viewport、favicon、noindex | 缺 meta description / canonical — 但因 noindex，**屬刻意，可接受** | 低 | 不需處理 |
| P3 | `birdland-intro.html`：title 僅「Bundled Page」、無 `lang`、無 viewport、雙文件結構 | 同 S4，明顯為殘骸 | 中 | 見 S4 |
| P4 | 各頁無重複 `id`、未發現未閉合標籤造成的破版 ✅ | — | — | — |
| P5 | 首頁工廠相片以 CSS background 呈現（無 `<img>`） | 純背景圖無 alt 不算違規，但**裝飾外若含資訊性圖片**建議改 `<img alt>` | 低 | 視覺設計取捨，非必改 |

---

## 4. 連結與資產

| # | 現況 | 問題 | 嚴重度 | 建議 |
|---|------|------|--------|------|
| L1 | 內部連結（partner/team/news 由 index 連出）皆有效，無 404 | birdland-intro.html 無人連入（孤兒） | 低 | 見 S4 |
| L2 | **`node_modules/` 被 commit 進 repo**：1809 檔、26MB；`package.json` 僅依賴 `jsdom` | `jsdom` 在 `tools/`、任何 `.py` 中**完全沒被使用**；整包是死重量，拖慢 clone/部署、無 `.gitignore` | 中 | 刪除 `node_modules/`、`package.json`、`package-lock.json`；新增 `.gitignore` |
| L3 | 大圖：`blade-forming.jpg` 502KB，多張 300KB+（已有 thumbs/.webp 縮圖） | 全尺寸原圖偏大，首屏載入較慢 | 低 | 壓縮或改 WebP；非急迫 |
| L4 | 外部連結 `balticexchange.com/.../dry-services.html` | 第三方頁，需人工確認是否仍有效（標「待查」） | 低 | 手動點開確認 |

---

## 5. 資料新鮮度
- `outlook-data.json` `updated = 29 Jun 2026, 14:05 UTC`，與今日一致 → **新鮮** ✅
- 由每日 CI 自動刷新，schema 穩定，無破壞性變動。
- 未擅自更動任何文案。

## 6. 部署設定
- `CNAME = birdland.com.tw` ✅；GitHub Pages 自訂網域。
- 線上版＝main build 產物（CI commit/push 後即部署）。
- HTTPS / DNS 解析狀態：本機無法完整驗證，標「待查」（建議於 GitHub Settings > Pages 確認 "Enforce HTTPS" 已開）。

---

## ✅ 建議優先處理順序

1. **【高】S1/S2** — 決定 partner/team 內容是否真機密。若是，前端 PIN 必須換成真正的存取控制（Cloudflare Access 等）；若否，承認其為公開內容即可。**這是唯一的高風險項，需你拍板。**
2. **【中】L2** — 移除已 commit 的 `node_modules` + 無用的 `jsdom` 依賴，加 `.gitignore`。（純清理，安全）
3. **【中】S4/P3** — 處理 `birdland-intro.html` 孤兒殘骸（刪除或加 noindex + 修結構）。
4. **【中】B3** — CI 加 JSON 驗證關卡，避免靜默 push 壞資料。
5. **【低】** robots.txt、大圖壓縮、外部連結複查。

---

### 我可以立即安全執行的「優化」（待你同意才 push）
- 新增 `.gitignore`（node_modules、__pycache__ 等）
- `git rm -r --cached node_modules` + 移除 package.json/package-lock.json（jsdom 未使用）
- `birdland-intro.html` 加 `noindex`（保守做法，不刪檔）
- 新增 `robots.txt`
- CI workflow 加 JSON 驗證關卡

> **S1/S2（前端密碼）牽涉商業判斷，我不會擅自改動。**
