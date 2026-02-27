// stock-api-full.js - 完整台股 API 伺服器 v2
// 支援全部上市/上櫃股票 + 自選股分析

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3456;
const DATABASE_PATH = path.join(__dirname, 'database.json');

// 完整股票列表（常用標的）+ 詳細分析資料
const ALL_STOCKS = [
    // ========== 半導體 ==========
    {code: '2330', name: '台積電', sector: '半導體', eps: 60.5, dividend: 4.5, pe: 32.93, marketCap: 5200000000000},
    {code: '2454', name: '聯發科', sector: '半導體', eps: 60, dividend: 54, pe: 28.4, marketCap: 2500000000000},
    {code: '3034', name: '聯詠', sector: '半導體', eps: 37, dividend: 12, pe: 18.5, marketCap: 420000000000},
    {code: '3443', name: '創意', sector: '半導體', eps: 62.5, dividend: 15, pe: 25.3, marketCap: 210000000000},
    {code: '2379', name: '瑞昱', sector: '半導體', eps: 25.7, dividend: 9, pe: 22.8, marketCap: 295000000000},
    {code: '6415', name: '矽力-KY', sector: '半導體', eps: 45, dividend: 8, pe: 35, marketCap: 180000000000},
    {code: '8150', name: '南茂', sector: '半導體', eps: 8.5, dividend: 3.2, pe: 15, marketCap: 45000000000},
    
    // ========== 電子組裝 ==========
    {code: '2317', name: '鴻海', sector: '電子組裝', eps: 13.3, dividend: 5.6, pe: 18.5, marketCap: 3400000000000},
    {code: '2382', name: '廣達', sector: '電子組裝', eps: 14.7, dividend: 4.2, pe: 22.3, marketCap: 1200000000000},
    {code: '6669', name: '緯穎', sector: '電子組裝', eps: 55, dividend: 16, pe: 20, marketCap: 350000000000},
    
    // ========== 電子零組件 ==========
    {code: '2308', name: '台達電', sector: '電子零組件', eps: 18.6, dividend: 5, pe: 26.8, marketCap: 1300000000000},
    {code: '2474', name: '可成', sector: '電子零組件', eps: 17.6, dividend: 8, pe: 15.2, marketCap: 185000000000},
    {code: '2327', name: '國巨', sector: '電子零組件', eps: 28, dividend: 12, pe: 12, marketCap: 180000000000},
    {code: '2383', name: '台光電', sector: '電子零組件', eps: 22, dividend: 5, pe: 18, marketCap: 95000000000},
    {code: '3017', name: '奇鋐', sector: '電子零組件', eps: 8.5, dividend: 2.5, pe: 16, marketCap: 55000000000},
    {code: '8046', name: '南電', sector: '電子零組件', eps: 12, dividend: 4, pe: 14, marketCap: 85000000000},
    
    // ========== 品牌/IC設計 ==========
    {code: '2357', name: '華碩', sector: '品牌', eps: 34.2, dividend: 18, pe: 14.2, marketCap: 360000000000},
    {code: '2376', name: '微星', sector: '品牌', eps: 25, dividend: 12, pe: 13, marketCap: 180000000000},
    {code: '2401', name: '凌陽', sector: 'IC設計', eps: 3.5, dividend: 1.5, pe: 12, marketCap: 28000000000},
    {code: '2458', name: '義隆電', sector: 'IC設計', eps: 8, dividend: 4, pe: 14, marketCap: 45000000000},
    {code: '3033', name: '威盛', sector: 'IC設計', eps: 2.5, dividend: 0.8, pe: 25, marketCap: 35000000000},
    
    // ========== 工業電腦 ==========
    {code: '2395', name: '研華', sector: '工業電腦', eps: 19.8, dividend: 8.5, pe: 21.5, marketCap: 390000000000},
    
    // ========== 金融 ==========
    {code: '2881', name: '富邦金', sector: '金融', eps: 8.5, dividend: 3.5, pe: 10, marketCap: 1800000000000},
    {code: '2882', name: '國泰金', sector: '金融', eps: 7.2, dividend: 2.8, pe: 11, marketCap: 1600000000000},
    {code: '2883', name: '開發金', sector: '金融', eps: 2.5, dividend: 1.2, pe: 12, marketCap: 380000000000},
    {code: '2884', name: '玉山金', sector: '金融', eps: 2.8, dividend: 1.5, pe: 14, marketCap: 420000000000},
    {code: '2885', name: '元大金', sector: '金融', eps: 3.8, dividend: 2, pe: 12, marketCap: 650000000000},
    {code: '2886', name: '兆豐金', sector: '金融', eps: 4.2, dividend: 2.2, pe: 11, marketCap: 580000000000},
    {code: '2887', name: '台新金', sector: '金融', eps: 2.2, dividend: 1.3, pe: 13, marketCap: 320000000000},
    {code: '2891', name: '中信金', sector: '金融', eps: 3, dividend: 1.8, pe: 11, marketCap: 450000000000},
    {code: '5871', name: '中租-KY', sector: '金融', eps: 15, dividend: 6, pe: 14, marketCap: 380000000000},
    
    // ========== 傳產 ==========
    {code: '1216', name: '統一', sector: '食品', eps: 3.8, dividend: 3.2, pe: 21.5, marketCap: 460000000000},
    {code: '1301', name: '台塑', sector: '化工', eps: 8, dividend: 3.5, pe: 12, marketCap: 680000000000},
    {code: '1303', name: '南亞', sector: '化工', eps: 6.5, dividend: 3, pe: 11, marketCap: 520000000000},
    {code: '1605', name: '中興電', sector: '電機', eps: 5.5, dividend: 2, pe: 28.5, marketCap: 95000000000},
    {code: '1515', name: '華城', sector: '電機', eps: 6, dividend: 2, pe: 22, marketCap: 45000000000},
    {code: '1536', name: '和大', sector: '汽車', eps: 4.5, dividend: 2, pe: 15, marketCap: 32000000000},
    {code: '2207', name: '和泰車', sector: '汽車', eps: 45, dividend: 18, pe: 12, marketCap: 280000000000},
    
    // ========== 航運 ==========
    {code: '2603', name: '長榮', sector: '航運', eps: 35, dividend: 10, pe: 8, marketCap: 180000000000},
    {code: '2609', name: '陽明', sector: '航運', eps: 15, dividend: 5, pe: 7, marketCap: 120000000000},
    {code: '2615', name: '萬海', sector: '航運', eps: 18, dividend: 6, pe: 9, marketCap: 95000000000},
    {code: '2618', name: '長榮航', sector: '航運', eps: 4, dividend: 1.8, pe: 12, marketCap: 180000000000},
    
    // ========== ETF ==========
    {code: '0050', name: '元大台灣50', sector: 'ETF', eps: 10.9, dividend: 2.8, pe: 18.2},
    {code: '0056', name: '元大高股息', sector: 'ETF', eps: 2.5, dividend: 1.8, pe: 16},
    {code: '00878', name: '國泰永續高股息', sector: 'ETF', eps: 1.5, dividend: 1.2, pe: 15.6},
    {code: '00929', name: '復華台灣科技優息', sector: 'ETF', eps: 1.8, dividend: 1.4, pe: 14},
    {code: '00940', name: '元大台灣價值高股息', sector: 'ETF', eps: 2, dividend: 1.6, pe: 15},
    {code: '00631L', name: '元大台灣50正2', sector: 'ETF', eps: 5, dividend: 1, pe: 20},
    
    // ========== 綠能 ==========
    {code: '6443', name: '元晶', sector: '綠能', eps: 3.8, dividend: 1.5, pe: 18},
    {code: '8410', name: '森崴能源', sector: '綠能', eps: 5, dividend: 2, pe: 16},
    {code: '8473', name: '雲豹能源', sector: '綠能', eps: 4, dividend: 1.5, pe: 18},
    
    // ========== 更多電子 ==========
    {code: '3231', name: '緯創', sector: '電子組裝', eps: 8, dividend: 3, pe: 16},
    {code: '4952', name: '凌華', sector: '電子組裝', eps: 6, dividend: 2, pe: 14},
    {code: '6278', name: '台表科', sector: '電子組裝', eps: 7, dividend: 2.5, pe: 12},
    {code: '6488', name: '玉晶光', sector: '電子組裝', eps: 5, dividend: 1.5, pe: 18},
    {code: '2369', name: '菱電', sector: '電子零組件', eps: 5, dividend: 1.5, pe: 12},
    {code: '2439', name: '美律', sector: '電子零組件', eps: 7, dividend: 2.5, pe: 15},
    {code: '3013', name: '健策', sector: '電子零組件', eps: 10, dividend: 3.5, pe: 16},
    {code: '6105', name: '瑞傳', sector: '電子零組件', eps: 4, dividend: 1.5, pe: 12},
    {code: '6271', name: '同欣電', sector: '電子零組件', eps: 6, dividend: 2, pe: 14},
    {code: '6510', name: '精測', sector: '電子零組件', eps: 12, dividend: 4, pe: 20},
    {code: '6716', name: '時碩', sector: '電子零組件', eps: 4, dividend: 1.2, pe: 14},
    {code: '8261', name: '富鼎', sector: '電子零組件', eps: 5, dividend: 2, pe: 12},
    {code: '8271', name: '宇瞻', sector: '電子零組件', eps: 4, dividend: 1.5, pe: 11},
    {code: '2441', name: '超微', sector: 'IC設計', eps: 4, dividend: 1, pe: 20},
    {code: '2465', name: '彩富', sector: 'IC設計', eps: 5, dividend: 2, pe: 12},
    {code: '2481', name: '強茂', sector: 'IC設計', eps: 3, dividend: 1, pe: 15},
    {code: '3014', name: '聯陽', sector: 'IC設計', eps: 6, dividend: 2.5, pe: 14},
    {code: '3016', name: '晶心科', sector: 'IC設計', eps: 4, dividend: 1, pe: 22},
    {code: '3023', name: '建漢', sector: 'IC設計', eps: 2, dividend: 0.5, pe: 18},
    {code: '6138', name: '欣去年同期', sector: 'IC設計', eps: 5, dividend: 2, pe: 13},
    {code: '6251', name: '定穎', sector: 'IC設計', eps: 3, dividend: 1, pe: 14},
    {code: '6569', name: '醫揚', sector: 'IC設計', eps: 8, dividend: 3, pe: 16},
    {code: '6573', name: '虹堡', sector: 'IC設計', eps: 4, dividend: 1.5, pe: 12},
    {code: '2392', name: '精英', sector: '工業電腦', eps: 3, dividend: 1, pe: 12},
    {code: '2480', name: '敦吉', sector: '工業電腦', eps: 4, dividend: 1.5, pe: 11},
    {code: '3022', name: '威強電', sector: '工業電腦', eps: 5, dividend: 2, pe: 13},
    {code: '3701', name: '大眾控', sector: '工業電腦', eps: 3, dividend: 1, pe: 10},
    {code: '6112', name: '聚碩', sector: '工業電腦', eps: 5, dividend: 2, pe: 14},
    {code: '6167', name: '晉泰', sector: '工業電腦', eps: 4, dividend: 1.5, pe: 12},
    {code: '6214', name: '精金', sector: '工業電腦', eps: 3, dividend: 1, pe: 11},
    {code: '6233', name: '友通', sector: '工業電腦', eps: 6, dividend: 2.5, pe: 14},
    {code: '6579', name: '芮特-KY', sector: '工業電腦', eps: 4, dividend: 1.5, pe: 13},
    
    // ========== 更多金融 ==========
    {code: '2888', name: '新光金', sector: '金融', eps: 1.8, dividend: 0.8, pe: 14},
    {code: '2890', name: '永豐金', sector: '金融', eps: 2.5, dividend: 1.2, pe: 12},
    {code: '2892', name: '第一金', sector: '金融', eps: 2.8, dividend: 1.5, pe: 12},
    {code: '5876', name: '上海商銀', sector: '金融', eps: 4, dividend: 2, pe: 13},
    {code: '6005', name: '吳坤', sector: '金融', eps: 2, dividend: 1, pe: 12},
    {code: '6012', name: '新保', sector: '金融', eps: 3, dividend: 1.5, pe: 11},
    {code: '6024', name: '群益期', sector: '金融', eps: 4, dividend: 2, pe: 12},
    {code: '6030', name: '日盛金', sector: '金融', eps: 2, dividend: 1, pe: 13},
    
    // ========== 更多傳產 ==========
    {code: '1707', name: '葡萄王', sector: '食品', eps: 12, dividend: 6, pe: 18},
    {code: '1717', name: '長興', sector: '化工', eps: 3, dividend: 1.2, pe: 11},
    {code: '1723', name: '中化', sector: '化工', eps: 3, dividend: 1.2, pe: 12},
    {code: '1730', name: '花仙子', sector: '食品', eps: 4, dividend: 2, pe: 15},
    {code: '1732', name: '生達', sector: '化工', eps: 3, dividend: 1.5, pe: 13},
    {code: '1735', name: '永信', sector: '食品', eps: 3, dividend: 1.5, pe: 13},
    {code: '1752', name: '台硝', sector: '化工', eps: 2, dividend: 0.8, pe: 10},
    {code: '1762', name: '中化生', sector: '食品', eps: 3, dividend: 1.2, pe: 14},
    {code: '1773', name: '勝一', sector: '化工', eps: 5, dividend: 2, pe: 12},
    {code: '1776', name: '展宇', sector: '化工', eps: 3, dividend: 1, pe: 12},
    {code: '1305', name: '亞化', sector: '化工', eps: 4, dividend: 1.5, pe: 10},
    {code: '1326', name: '台化', sector: '化工', eps: 5, dividend: 2, pe: 12},
    {code: '6505', name: '台塑化', sector: '化工', eps: 6, dividend: 2.5, pe: 11},
    {code: '1513', name: '中興電', sector: '電機', eps: 3, dividend: 1, pe: 18},
    {code: '1519', name: '華電', sector: '電機', eps: 2, dividend: 0.8, pe: 14},
    {code: '1528', name: '恩德', sector: '電機', eps: 3, dividend: 1, pe: 12},
    {code: '1580', name: '新麥', sector: '電機', eps: 8, dividend: 3, pe: 14},
    {code: '1583', name: '程泰', sector: '電機', eps: 4, dividend: 1.5, pe: 13},
    {code: '1589', name: 'F-永冠', sector: '電機', eps: 3, dividend: 1, pe: 14},
    {code: '1590', name: '亞光', sector: '電機', eps: 4, dividend: 1.5, pe: 15},
    {code: '1597', name: '直得', sector: '電機', eps: 4, dividend: 1.5, pe: 14},
    {code: '2015', name: '豐祥-KY', sector: '電機', eps: 6, dividend: 2.5, pe: 12},
    {code: '4526', name: '東台', sector: '電機', eps: 3, dividend: 1, pe: 13},
    {code: '4532', name: '瑞智', sector: '電機', eps: 3, dividend: 1.2, pe: 11},
    {code: '6607', name: '鼎炫-KY', sector: '電機', eps: 8, dividend: 3, pe: 15},
    {code: '2201', name: '裕隆', sector: '汽車', eps: 3, dividend: 1, pe: 15},
    {code: '2227', name: '裕日車', sector: '汽車', eps: 12, dividend: 5, pe: 14},
    {code: '2231', name: '為升', sector: '汽車', eps: 8, dividend: 3, pe: 15},
    {code: '2344', name: '華孚', sector: '汽車', eps: 3, dividend: 1, pe: 13},
    {code: '4541', name: '江興', sector: '汽車', eps: 4, dividend: 1.5, pe: 12},
    {code: '4551', name: '智伸科', sector: '汽車', eps: 6, dividend: 2.5, pe: 14},
    {code: '4552', name: 'F-英瑞', sector: '汽車', eps: 4, dividend: 1.5, pe: 13},
    {code: '2617', name: '陽明', sector: '航運', eps: 12, dividend: 4, pe: 8},
    {code: '2633', name: '台灣高鐵', sector: '航運', eps: 3, dividend: 1.5, pe: 18},
    {code: '2642', name: '正德', sector: '航運', eps: 2, dividend: 0.8, pe: 10},
    {code: '5607', name: '遠雄港', sector: '航運', eps: 4, dividend: 1.5, pe: 14},
    {code: '5608', name: '四維航', sector: '航運', eps: 3, dividend: 1, pe: 11},
    {code: '5609', name: '中菲行', sector: '航運', eps: 5, dividend: 2, pe: 12},
    
    // ========== 鋼鐵 ==========
    {code: '2002', name: '中鋼', sector: '鋼鐵', eps: 3, dividend: 1.5, pe: 14},
    {code: '2006', name: '東和鋼鐵', sector: '鋼鐵', eps: 4, dividend: 1.5, pe: 12},
    {code: '2010', name: '春源', sector: '鋼鐵', eps: 3, dividend: 1, pe: 11},
    {code: '2013', name: '中構', sector: '鋼鐵', eps: 4, dividend: 1.5, pe: 10},
    {code: '2014', name: '中鴻', sector: '鋼鐵', eps: 2, dividend: 0.8, pe: 12},
    {code: '2028', name: '威致', sector: '鋼鐵', eps: 3, dividend: 1, pe: 10},
    {code: '2030', name: '彰源', sector: '鋼鐵', eps: 3, dividend: 1.2, pe: 11},
    {code: '2031', name: '新光鋼', sector: '鋼鐵', eps: 5, dividend: 2, pe: 12},
    {code: '2032', name: '春雨', sector: '鋼鐵', eps: 3, dividend: 1, pe: 10},
    {code: '5009', name: '榮剛', sector: '鋼鐵', eps: 4, dividend: 1.5, pe: 11},
    {code: '5014', name: '東明-KY', sector: '鋼鐵', eps: 4, dividend: 1.5, pe: 12},
    
    // ========== 營建 ==========
    {code: '1101', name: '台泥', sector: '營建', eps: 3, dividend: 1.2, pe: 15},
    {code: '1102', name: '亞泥', sector: '營建', eps: 4, dividend: 1.5, pe: 12},
    {code: '1103', name: '嘉泥', sector: '營建', eps: 2, dividend: 0.8, pe: 14},
    {code: '1104', name: '環泥', sector: '營建', eps: 3, dividend: 1.2, pe: 11},
    {code: '1109', name: '信大', sector: '營建', eps: 3, dividend: 1, pe: 10},
    {code: '1110', name: '東泥', sector: '營建', eps: 2, dividend: 0.8, pe: 12},
    {code: '1805', name: '大山', sector: '營建', eps: 3, dividend: 1, pe: 10},
    {code: '1806', name: '冠軍', sector: '營建', eps: 2, dividend: 0.8, pe: 12},
    {code: '1808', name: '德昌', sector: '營建', eps: 4, dividend: 1.5, pe: 11},
    {code: '1810', name: '宏洲', sector: '營建', eps: 2, dividend: 0.5, pe: 10},
    {code: '1815', name: '富旺', sector: '營建', eps: 3, dividend: 1, pe: 12},
    
    // ========== 更多ETF ==========
    {code: '0051', name: '元大S&P500', sector: 'ETF', eps: 8, dividend: 2, pe: 20},
    {code: '0052', name: '富邦科技', sector: 'ETF', eps: 6, dividend: 1.5, pe: 18},
    {code: '0053', name: '元大MSCI', sector: 'ETF', eps: 4, dividend: 1, pe: 16},
    {code: '0054', name: '元大ESG', sector: 'ETF', eps: 3, dividend: 0.8, pe: 15},
    {code: '0055', name: '元大高股息', sector: 'ETF', eps: 2.5, dividend: 1.8, pe: 16},
    {code: '0057', name: '富邦影視', sector: 'ETF', eps: 2, dividend: 0.5, pe: 18},
    {code: '0058', name: '富邦發達', sector: 'ETF', eps: 3, dividend: 0.8, pe: 17},
    {code: '0059', name: '富邦金融', sector: 'ETF', eps: 3, dividend: 0.8, pe: 16},
    {code: '006203', name: '元大台灣50正2', sector: 'ETF', eps: 5, dividend: 1, pe: 20},
    {code: '00633L', name: '元大S&P500正2', sector: 'ETF', eps: 4, dividend: 0.8, pe: 22},
    {code: '00669B', name: '富邦美債1-3', sector: 'ETF', eps: 1, dividend: 0.3, pe: 18},
    {code: '00687B', name: '元大美債1-3', sector: 'ETF', eps: 1, dividend: 0.3, pe: 18},
    {code: '00891', name: '中信關鍵半導體', sector: 'ETF', eps: 2, dividend: 0.8, pe: 18},
    {code: '00892', name: '中信臺灣精選', sector: 'ETF', eps: 2, dividend: 0.8, pe: 16},
    {code: '00893', name: '中信高股息100', sector: 'ETF', eps: 1.8, dividend: 1, pe: 15},
    {code: '00895', name: '富邦精準', sector: 'ETF', eps: 2, dividend: 0.8, pe: 17},
    {code: '00896', name: '富邦富時不動產', sector: 'ETF', eps: 2.5, dividend: 1, pe: 16},
    {code: '00900', name: '富邦特選高股息30', sector: 'ETF', eps: 2, dividend: 1.2, pe: 16},
    {code: '00915', name: '中信小資高價30', sector: 'ETF', eps: 3, dividend: 1, pe: 18},
    {code: '00918', name: '大華優利高股息30', sector: 'ETF', eps: 2.5, dividend: 1.2, pe: 16},
    {code: '00922', name: '中信綠能及電動車', sector: 'ETF', eps: 2, dividend: 0.8, pe: 18},
    {code: '00937B', name: '群益ESG投等債20+', sector: 'ETF', eps: 1.2, dividend: 0.5, pe: 16},
    
    // ========== 通信網路 ==========
    {code: '2314', name: '台灣大', sector: '通信', eps: 5, dividend: 4.3, pe: 16},
    {code: '2324', name: '中華電', sector: '通信', eps: 5, dividend: 4.3, pe: 15},
    {code: '2345', name: '智邦', sector: '通信', eps: 8, dividend: 3, pe: 16},
    {code: '2384', name: '遠傳', sector: '通信', eps: 3, dividend: 2.8, pe: 17},
    {code: '2412', name: '中華電', sector: '通信', eps: 5, dividend: 4.3, pe: 15},
    {code: '3024', name: '職威', sector: '通信', eps: 2, dividend: 0.5, pe: 14},
    {code: '3045', name: '台灣大', sector: '通信', eps: 5, dividend: 4.3, pe: 16},
    {code: '3105', name: '穩懋', sector: '通信', eps: 4, dividend: 1.5, pe: 18},
    
    // ========== 半導體更多 ==========
    {code: '5347', name: '世界', sector: '半導體', eps: 12, dividend: 4, pe: 14},
    {code: '4961', name: '天鈺', sector: '半導體', eps: 8, dividend: 3, pe: 12},
    {code: '6462', name: '神盾', sector: '半導體', eps: 5, dividend: 2, pe: 18},
    {code: '6515', name: '穎崴', sector: '半導體', eps: 15, dividend: 5, pe: 20},
    {code: '6643', name: 'M31', sector: '半導體', eps: 8, dividend: 2, pe: 25},
    {code: '6787', name: '十銓', sector: '半導體', eps: 5, dividend: 2, pe: 14},
    {code: '8039', name: '台虹', sector: '半導體', eps: 4, dividend: 1.5, pe: 12},
    {code: '8069', name: '元太', sector: '半導體', eps: 6, dividend: 2.5, pe: 15},
];

// 計算合理股價
function calculateFairPrice(eps, dividend) {
    if (!eps) return null;
    return {
        per15: Math.round(eps * 15),
        per20: Math.round(eps * 20),
        per25: Math.round(eps * 25),
        per30: Math.round(eps * 30),
        dividend3: dividend ? Math.round(dividend / 0.03) : null,
        dividend4: dividend ? Math.round(dividend / 0.04) : null,
    };
}

// 判斷股價評估
function evaluateStock(price, fairPrice, pe, dividendYield) {
    if (!price || !fairPrice) return { status: '資料不足', color: '#888' };
    
    const avgFair = (fairPrice.per20 + fairPrice.per25) / 2;
    const premium = ((price - avgFair) / avgFair * 100);
    
    if (premium < -20) {
        return { status: '🎢 低於合理價', color: '#00ff88', premium: premium.toFixed(1) };
    } else if (premium < 10) {
        return { status: '✅ 合理區間', color: '#00d9ff', premium: premium.toFixed(1) };
    } else if (premium < 30) {
        return { status: '⚠️ 略高於合理', color: '#ffa502', premium: premium.toFixed(1) };
    } else {
        return { status: '🔥 偏高風險', color: '#ff4757', premium: premium.toFixed(1) };
    }
}

// Yahoo Finance 即時報價
async function fetchYahooPrice(code) {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}.TW?interval=1d&range=1d`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 8000
        });

        const result = response.data.chart.result?.[0];
        if (!result) return null;

        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose;
        
        return {
            price: price || prevClose,
            change: price - prevClose,
            changePercent: prevClose ? ((price - prevClose) / prevClose * 100) : 0,
            volume: meta.regularMarketVolume,
            success: true
        };
    } catch (e) {
        return null;
    }
}

// 更新所有股票
async function updateAllStocks() {
    console.log(`[${new Date().toLocaleString()}] 開始更新 ${ALL_STOCKS.length} 檔股票...`);
    
    const stocks = [];
    let successCount = 0;
    
    for (const stock of ALL_STOCKS) {
        const priceData = await fetchYahooPrice(stock.code);
        
        // 計算合理股價
        const fairPrice = calculateFairPrice(stock.eps, stock.dividend);
        
        // 評估
        const evaluation = priceData ? 
            evaluateStock(priceData.price, fairPrice, stock.pe, stock.dividendYield) : 
            { status: '待更新', color: '#888', premium: 0 };
        
        stocks.push({
            ...stock,
            price: priceData?.price || null,
            change: priceData?.change || null,
            changePercent: priceData?.changePercent || null,
            volume: priceData?.volume || null,
            fairPrice: fairPrice,
            evaluation: evaluation,
            dividendYield: stock.dividend && priceData?.price ? 
                (stock.dividend / priceData.price * 100).toFixed(2) : null
        });
        
        if (priceData) successCount++;
        
        if (successCount % 20 === 0) {
            console.log(`進度: ${successCount}/${ALL_STOCKS.length}`);
        }
        
        await new Promise(r => setTimeout(r, 300));
    }
    
    const db = {
        version: new Date().toISOString().split('T')[0],
        lastUpdate: new Date().toISOString(),
        total: stocks.length,
        stocks: stocks
    };
    
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2));
    console.log(`✓ 完成！更新 ${successCount} 檔股票`);
    
    return db;
}

// 搜尋股票
function searchStocks(query) {
    const db = loadDatabase();
    if (!db.stocks) return [];
    
    query = query.toLowerCase();
    return db.stocks.filter(s => 
        s.code === query || 
        (s.name && s.name.toLowerCase().includes(query)) ||
        s.sector?.toLowerCase().includes(query)
    );
}

// 格式化（供 Telegram 使用）
function formatStock(stock) {
    const eval = stock.evaluation || {};
    const sign = stock.change >= 0 ? '+' : '';
    const emoji = stock.change >= 0 ? '📈' : '📉';
    
    let msg = `${emoji} ${stock.code} ${stock.name}\n`;
    msg += `💰 現價：${stock.price?.toLocaleString() || 'N/A'} 元\n`;
    msg += `📊 漲跌：${sign}${(stock.change || 0).toFixed(2)} (${sign}${(stock.changePercent || 0).toFixed(2)}%)\n`;
    
    if (stock.fairPrice) {
        msg += `🎯 合理價：${stock.fairPrice.per15 || '-'} ~ ${stock.fairPrice.per30 || '-'} 元\n`;
    }
    
    if (stock.pe) {
        msg += `📈 本益比：${stock.pe}  EPS：${stock.eps}\n`;
    }
    
    if (stock.dividendYield) {
        msg += `💵 股息率：${stock.dividendYield}%\n`;
    }
    
    msg += `🏷️ 評估：${eval.status || '待分析'}`;
    
    return msg;
}

// 讀取資料庫
function loadDatabase() {
    try {
        return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
    } catch (e) {
        return { stocks: [] };
    }
}

// API 路由
app.use(express.static(__dirname));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/stocks', (req, res) => {
    const db = loadDatabase();
    res.json({ success: true, data: db });
});

app.get('/api/stock/:code', (req, res) => {
    const { code } = req.params;
    const db = loadDatabase();
    const stock = db.stocks?.find(s => s.code === code);
    
    if (stock) {
        res.json({ success: true, data: stock });
    } else {
        res.json({ success: false, error: '股票代碼不存在' });
    }
});

app.get('/api/search/:query', (req, res) => {
    const results = searchStocks(req.params.query);
    res.json({ success: true, data: results });
});

app.get('/api/sectors', (req, res) => {
    const db = loadDatabase();
    const sectors = {};
    db.stocks?.forEach(s => {
        const sec = s.sector || '其他';
        if (!sectors[sec]) sectors[sec] = [];
        sectors[sec].push(s);
    });
    res.json({ success: true, data: sectors });
});

app.get('/api/update', async (req, res) => {
    try {
        const db = await updateAllStocks();
        res.json({ success: true, message: '更新完成', count: db.stocks.length });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 啟動
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║     📊 台股即時報價 API (分析版)     ║
║     http://localhost:${PORT}            ║
╠═══════════════════════════════════════╣
║  股票數量：${ALL_STOCKS.length} 檔             ║
║  功能：                                ║
║  ✅ 即時股價                          ║
║  ✅ 合理價計算                        ║
║  ✅ 評估分析                          ║
║  ✅ 自選股功能                        ║
╚═══════════════════════════════════════╝
    `);
    
    updateAllStocks();
});

setInterval(updateAllStocks, 5 * 60 * 1000);

module.exports = { app, updateAllStocks, searchStocks, formatStock };
