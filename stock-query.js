// stock-query.js - 股票查詢模組 (供 Telegram Bot 使用)
// 直接整合 Yahoo Finance API 即時查詢

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, 'database.json');

// 載入資料庫
function loadDatabase() {
    try {
        return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
    } catch (e) {
        return { stocks: [] };
    }
}

// Yahoo Finance 即時報價
async function getRealtimePrice(code) {
    try {
        // 方法1: Yahoo Finance v8 API
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}.TW?interval=1d&range=1d`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 8000
        });

        const result = response.data.chart.result?.[0];
        if (!result) throw new Error('No data');

        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose;
        const change = price - prevClose;
        const changePercent = (change / prevClose) * 100;

        return {
            price,
            change,
            changePercent,
            volume: meta.regularMarketVolume,
            success: true
        };
    } catch (e) {
        // 方法2: 爬蟲備用
        return await getStaticPrice(code);
    }
}

// 備用：爬 Yahoo 首頁
async function getStaticPrice(code) {
    try {
        const url = `https://tw.stock.yahoo.com/quote/${code}.TW`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 8000
        });

        const html = response.data;
        
        const priceMatch = html.match(/"price":{"regularMarketPrice":([0-9.]+)/);
        const changeMatch = html.match(/"regularMarketChange":{"raw":([0-9.-]+)/);
        const percentMatch = html.match(/"regularMarketChangePercent":{"raw":([0-9.-]+)/);

        if (priceMatch) {
            return {
                price: parseFloat(priceMatch[1]),
                change: changeMatch ? parseFloat(changeMatch[1]) : 0,
                changePercent: percentMatch ? parseFloat(percentMatch[1]) : 0,
                success: true
            };
        }
        return { success: false, error: 'Price not found' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// 查詢股票
async function queryStock(codeOrName) {
    const db = loadDatabase();
    const query = codeOrName.toString().toLowerCase();
    
    // 先找本地資料庫
    let stock = db.stocks.find(s => 
        s.code === query || 
        s.name.toLowerCase() === query ||
        s.name.toLowerCase().includes(query)
    );

    // 如果找不到，嘗試直接查詢
    if (!stock) {
        // 嘗試當作代碼查詢
        const testCode = query.toUpperCase();
        stock = db.stocks.find(s => s.code === testCode);
    }

    // 嘗試获取即時報價
    let realtimeData = null;
    const searchCode = stock ? stock.code : query.toUpperCase();
    
    if (/^\d{4,6}$/.test(searchCode)) {
        realtimeData = await getRealtimePrice(searchCode);
    }

    if (stock) {
        // 合併即時資料
        if (realtimeData?.success) {
            stock.price = realtimeData.price;
            stock.change = realtimeData.change;
            stock.changePercent = realtimeData.changePercent;
            if (realtimeData.volume) stock.volume = realtimeData.volume;
        }
        
        return {
            success: true,
            data: stock,
            realtime: realtimeData?.success || false
        };
    }

    return { success: false, error: '找不到股票' };
}

// 格式化輸出
function formatStock(stock, realtime = false) {
    const sign = stock.change >= 0 ? '+' : '';
    const emoji = stock.change >= 0 ? '📈' : '📉';
    const rtBadge = realtime ? ' ⚡即時' : '';
    
    const lines = [
        `${emoji} ${stock.code} ${stock.name}${rtBadge}`,
        `💰 現價：${stock.price?.toLocaleString() || 'N/A'} 元`,
        `📊 漲跌：${sign}${(stock.change || 0).toFixed(2)} (${sign}${(stock.changePercent || 0).toFixed(2)}%)`
    ];

    if (stock.fairPrice) {
        lines.push(`🎯 合理價：${stock.fairPrice.per20 || '-'} ~ ${stock.fairPrice.per25 || '-'} 元`);
    }

    if (stock.status) {
        lines.push(`📝 動態：${stock.status}`);
    }

    if (stock.pe) {
        lines.push(`📊 本益比：${stock.pe}  EPS：${stock.eps}`);
    }

    return lines.join('\n');
}

// 查詢多檔股票
async function queryMultiple(codes) {
    const results = [];
    for (const code of codes) {
        const result = await queryStock(code);
        if (result.success) {
            results.push(formatStock(result.data, result.realtime));
        }
        await new Promise(r => setTimeout(r, 300));
    }
    return results;
}

// 測試
if (require.main === module) {
    queryStock('2330').then(r => {
        if (r.success) {
            console.log(formatStock(r.data, r.realtime));
        } else {
            console.log(r.error);
        }
    });
}

module.exports = { queryStock, formatStock, queryMultiple, getRealtimePrice };
