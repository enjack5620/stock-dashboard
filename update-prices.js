const { getRealtimePrice } = require('./stock-query.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

async function updateStocks() {
    const results = [];
    let bigGainers = [];
    let bigLosers = [];
    
    console.log('Updating ' + db.stocks.length + ' stocks...');
    
    for (let i = 0; i < db.stocks.length; i++) {
        const stock = db.stocks[i];
        if (!stock.code) continue;
        
        try {
            const data = await getRealtimePrice(stock.code);
            if (data.success) {
                const oldPrice = stock.price;
                stock.price = data.price;
                stock.change = data.change;
                stock.changePercent = data.changePercent;
                stock.volume = data.volume;
                
                // 記錄漲跌幅較大的股票 (±3% 以上)
                if (Math.abs(data.changePercent) >= 3) {
                    if (data.changePercent > 0) {
                        bigGainers.push({ code: stock.code, name: stock.name, change: data.changePercent, price: data.price });
                    } else {
                        bigLosers.push({ code: stock.code, name: stock.name, change: data.changePercent, price: data.price });
                    }
                }
                
                results.push(stock.code + ': ' + data.price + ' (' + (data.changePercent >= 0 ? '+' : '') + data.changePercent.toFixed(2) + '%)');
            } else {
                results.push(stock.code + ': FAILED - ' + data.error);
            }
        } catch (e) {
            results.push(stock.code + ': ERROR - ' + e.message);
        }
        
        // 避免太頻繁請求
        await new Promise(r => setTimeout(r, 200));
        
        if ((i + 1) % 20 === 0) {
            console.log('Progress: ' + (i + 1) + '/' + db.stocks.length);
        }
    }
    
    // 更新資料庫
    db.lastUpdate = new Date().toISOString();
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    console.log('\n=== Update Complete ===');
    console.log('Total: ' + results.length);
    console.log('\n--- Big Gainers (>=+3%) ---');
    bigGainers.sort((a, b) => b.change - a.change).forEach(s => console.log(s.code + ' ' + s.name + ': +' + s.change.toFixed(2) + '% (' + s.price + ')'));
    
    console.log('\n--- Big Losers (<=-3%) ---');
    bigLosers.sort((a, b) => a.change - b.change).forEach(s => console.log(s.code + ' ' + s.name + ': ' + s.change.toFixed(2) + '% (' + s.price + ')'));
    
    // 回傳結果給 cron job
    const summary = {
        total: results.length,
        bigGainers: bigGainers.sort((a, b) => b.change - a.change),
        bigLosers: bigLosers.sort((a, b) => a.change - b.change)
    };
    console.log('\n=== SUMMARY JSON ===');
    console.log(JSON.stringify(summary));
}

updateStocks().catch(console.error);
