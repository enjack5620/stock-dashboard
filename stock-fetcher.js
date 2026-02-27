// stock-fetcher.js - 台股即時股價抓取工具
// 需要安裝：npm install axios

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, 'database.json');

// 台股代碼列表
const STOCK_CODES = ['2330', '2317', '2454', '2382', '2308', '1216', '0050', '00878'];

// 延遲函數
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 抓取單一股票股價
async function fetchStockPrice(code) {
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
        const priceMatch = html.match(/"price":{"regularMarketPrice":([\d.]+)/);
        const changeMatch = html.match(/"regularMarketChange":{"raw":([-\d.]+)/);
        const changePercentMatch = html.match(/"regularMarketChangePercent":{"raw":([-\d.]+)/);
        
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;
        const change = changeMatch ? parseFloat(changeMatch[1]) : null;
        const changePercent = changePercentMatch ? parseFloat(changePercentMatch[1]) : null;
        
        if (price) {
            return { code, price, change, changePercent, success: true };
        }
        
        return { code, success: false, error: 'Price not found' };
    } catch (error) {
        return { code, success: false, error: error.message };
    }
}

// 計算合理股價
function calculateFairPrice(eps, dividend, peBase = 20, dividendRate = 0.03) {
    return {
        per: Math.round(eps * peBase),
        dividend: Math.round(dividend / dividendRate),
        growth: Math.round(eps * peBase * 1.2)
    };
}

// 更新資料庫
async function updateDatabase() {
    console.log(`[${new Date().toLocaleString()}] 開始抓取股價...`);
    
    let database = JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
    let updated = false;
    
    for (const code of STOCK_CODES) {
        console.log(`正在抓取 ${code}...`);
        const result = await fetchStockPrice(code);
        
        if (result.success) {
            const stock = database.stocks.find(s => s.code === code);
            if (stock) {
                stock.price = result.price;
                stock.change = result.change;
                stock.changePercent = result.changePercent;
                
                // 重新計算合理股價
                const fairPrice = calculateFairPrice(stock.eps, stock.dividend);
                stock.fairPrice = {
                    per20: fairPrice.per,
                    per25: Math.round(stock.eps * 25),
                    dividend3: fairPrice.dividend,
                    dividend4: Math.round(stock.dividend / 0.04),
                    growth: fairPrice.growth
                };
                
                console.log(`✓ ${code}: ${result.price} (${result.changePercent}%)`);
                updated = true;
            }
        } else {
            console.log(`✗ ${code}: ${result.error}`);
        }
        
        await delay(1000); // 避免請求過快
    }
    
    if (updated) {
        // 更新時間戳
        database.lastUpdate = new Date().toISOString();
        fs.writeFileSync(DATABASE_PATH, JSON.stringify(database, null, 2));
        console.log('✓ 資料庫已更新');
    } else {
        console.log('✗ 無法更新資料庫');
    }
    
    return updated;
}

// 主動執行
if (require.main === module) {
    updateDatabase()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('錯誤:', error);
            process.exit(1);
        });
}

module.exports = { fetchStockPrice, updateDatabase, calculateFairPrice };
