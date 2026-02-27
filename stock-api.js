// stock-api.js - 台股即時股價 API 伺服器
// 使用 Yahoo Finance API 獲取即時報價

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3456;
const DATABASE_PATH = path.join(__dirname, 'database.json');

// 快取資料
let stockCache = {
    data: null,
    timestamp: null
};

const CACHE_TTL = 60000; // 1分鐘快取

// 讀取資料庫
function loadDatabase() {
    try {
        const data = fs.readFileSync(DATABASE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { stocks: [], lastUpdate: null };
    }
}

// 儲存資料庫
function saveDatabase(data) {
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(data, null, 2));
}

// Yahoo Finance API 抓取股價
async function fetchYahooPrice(code) {
    try {
        // 使用 Yahoo Finance v8 API
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}.TW?interval=1d&range=1d`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const result = response.data.chart.result[0];
        if (!result) return null;

        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];

        return {
            price: meta.regularMarketPrice || meta.previousClose,
            change: meta.regularMarketPrice - meta.chartPreviousClose || 0,
            changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100) || 0,
            volume: meta.regularMarketVolume,
            previousClose: meta.chartPreviousClose || meta.previousClose
        };
    } catch (error) {
        console.log(`[Yahoo] ${code} 抓取失敗: ${error.message}`);
        return null;
    }
}

// 備用方案：直接爬 Yahoo 首頁
async function fetchYahooStatic(code) {
    try {
        const url = `https://tw.stock.yahoo.com/quote/${code}.TW`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        
        // 解析股價
        const priceMatch = html.match(/"price":{"regularMarketPrice":([0-9.]+)/);
        const changeMatch = html.match(/"regularMarketChange":{"raw":([0-9.-]+)/);
        const percentMatch = html.match(/"regularMarketChangePercent":{"raw":([0-9.-]+)/);
        
        if (priceMatch) {
            return {
                price: parseFloat(priceMatch[1]),
                change: changeMatch ? parseFloat(changeMatch[1]) : 0,
                changePercent: percentMatch ? parseFloat(percentMatch[1]) : 0
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 更新單一股票
async function updateStock(code) {
    let priceData = await fetchYahooPrice(code);
    
    if (!priceData) {
        priceData = await fetchYahooStatic(code);
    }
    
    return priceData;
}

// 更新所有股票
async function updateAllStocks() {
    console.log(`[${new Date().toLocaleString()}] 開始更新股價...`);
    
    const db = loadDatabase();
    let updatedCount = 0;
    
    for (const stock of db.stocks) {
        const priceData = await updateStock(stock.code);
        
        if (priceData) {
            stock.price = priceData.price;
            stock.change = priceData.change;
            stock.changePercent = priceData.changePercent;
            if (priceData.volume) stock.volume = priceData.volume;
            updatedCount++;
            console.log(`✓ ${stock.code} ${stock.name}: ${priceData.price} (${priceData.changePercent.toFixed(2)}%)`);
        } else {
            console.log(`✗ ${stock.code} ${stock.name}: 更新失敗`);
        }
        
        await new Promise(r => setTimeout(r, 500)); // 避免請求過快
    }
    
    db.lastUpdate = new Date().toISOString();
    saveDatabase(db);
    
    // 更新快取
    stockCache = { data: db, timestamp: Date.now() };
    
    console.log(`✓ 完成！更新 ${updatedCount}/${db.stocks.length} 檔股票`);
    return db;
}

// 搜尋股票
function searchStocks(query) {
    const db = loadDatabase();
    query = query.toLowerCase();
    
    return db.stocks.filter(stock => 
        stock.code === query || 
        stock.name.toLowerCase().includes(query)
    );
}

// 格式化股票資料
function formatStock(stock) {
    const sign = stock.change >= 0 ? '+' : '';
    const emoji = stock.change >= 0 ? '📈' : '📉';
    
    return `${emoji} ${stock.code} ${stock.name}
💰 現價：${stock.price} 元
📊 漲跌：${sign}${stock.change.toFixed(2)} (${sign}${stock.changePercent.toFixed(2)}%)
🎯 合理價：${stock.fairPrice?.per20 || 'N/A'} ~ ${stock.fairPrice?.per25 || 'N/A'} 元
📝 動態：${stock.status || '無'}`;
}

// 靜態檔案服務
app.use(express.static(__dirname));

// 首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API 路由
app.get('/api/stocks', (req, res) => {
    const db = loadDatabase();
    res.json({ success: true, data: db });
});

app.get('/api/stock/:code', (req, res) => {
    const { code } = req.params;
    const db = loadDatabase();
    const stock = db.stocks.find(s => s.code === code);
    
    if (stock) {
        res.json({ success: true, data: stock });
    } else {
        res.json({ success: false, error: '股票代碼不存在' });
    }
});

app.get('/api/search/:query', (req, res) => {
    const { query } = req.params;
    const results = searchStocks(query);
    res.json({ success: true, data: results });
});

app.get('/api/update', async (req, res) => {
    try {
        const db = await updateAllStocks();
        res.json({ success: true, message: '更新完成', count: db.stocks.length });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║     📊 台股即時報價 API 伺服器         ║
║     http://localhost:${PORT}            ║
╠═══════════════════════════════════════╣
║  API 端點：                            ║
║  GET /api/stocks      - 全部股票       ║
║  GET /api/stock/:code - 單一股票       ║
║  GET /api/search/:query - 搜尋股票     ║
║  GET /api/update     - 更新股價        ║
╚═══════════════════════════════════════╝
    `);
    
    // 啟動後立即更新
    updateAllStocks();
});

// 定時更新（每5分鐘）
setInterval(updateAllStocks, 5 * 60 * 1000);

module.exports = { app, updateAllStocks, searchStocks, formatStock };
