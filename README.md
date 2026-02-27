# 📊 台股個股分析儀表板

![Vercel](https://vercel.com/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🌟 功能特色

- 📈 100檔熱門股票資料
- 💰 合理股價自動計算
- 🎯 進場建議分析
- 🔗 族群/大盤連動分析
- ⚡ 即時股價更新（手動）
- 📱 響應式設計

## 🚀 部署方式

### 1. Vercel 部署（推薦）

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 進入專案目錄
cd stock

# 部署
vercel
```

或直接在 Vercel 網站：
1. 註冊 [vercel.com](https://vercel.com)
2. Import GitHub Repository
3. 自動部署完成

### 2. GitHub Pages

```bash
# 建立 GitHub Pages
# Settings → Pages → Source: main branch
```

## 📁 檔案結構

```
stock/
├── index.html      # 主網頁
├── database.json  # 股票資料庫
├── vercel.json    # Vercel 設定
└── README.md      # 說明檔
```

## 📝 更新資料

手動更新 `database.json` 內的股票資料。

## 📜  License

MIT License
