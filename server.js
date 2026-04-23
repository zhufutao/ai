const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname)));

// A股指数 - 新浪财经
app.get('/api/ashares', async (req, res) => {
    try {
        const codes = 'sh000001,sz399001,sz399006';
        const { data } = await axios.get(`https://hq.sinajs.cn/list=${codes}`, {
            headers: { Referer: 'https://finance.sina.com.cn' }
        });
        const names = { sh000001: '上证指数', sz399001: '深证成指', sz399006: '创业板指' };
        const result = [];
        const lines = data.split('\n').filter(l => l.trim());
        for (const line of lines) {
            const match = line.match(/var hq_str_(s[hz]\d+)="(.+)"/);
            if (!match) continue;
            const [, code, raw] = match;
            const parts = raw.split(',');
            if (parts.length < 4) continue;
            const price = parseFloat(parts[3]);
            const prevClose = parseFloat(parts[2]);
            const change = price - prevClose;
            const changePercent = prevClose ? (change / prevClose) * 100 : 0;
            result.push({
                name: names[code] || code,
                code,
                price,
                change: parseFloat(change.toFixed(2)),
                changePercent: parseFloat(changePercent.toFixed(2))
            });
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'A股数据获取失败', detail: e.message });
    }
});

// 美股指数 - 新浪财经
app.get('/api/usstocks', async (req, res) => {
    try {
        const codes = 'gb_dji,gb_ixic,gb_inx';
        const names = { gb_dji: '道琼斯', gb_ixic: '纳斯达克', gb_inx: '标普500' };
        const result = [];
        const promises = Object.entries(codes.split(',').reduce((acc, c) => {
            acc[c] = names[c];
            return acc;
        }, {})).map(async ([code, name]) => {
            const { data } = await axios.get(`https://hq.sinajs.cn/list=${code}`, {
                headers: { Referer: 'https://finance.sina.com.cn' }
            });
            const match = data.match(/var hq_str_\w+="(.+)"/);
            if (!match) return null;
            const parts = match[1].split(',');
            if (parts.length < 5) return null;
            const price = parseFloat(parts[1]);
            const changePercent = parseFloat(parts[2]);
            const change = parseFloat(parts[4]);
            return { name, code, price, change: parseFloat(change.toFixed(2)), changePercent: parseFloat(changePercent.toFixed(2)) };
        });
        const items = (await Promise.all(promises)).filter(Boolean);
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: '美股数据获取失败', detail: e.message });
    }
});

// 黄金 - 新浪财经期货接口
app.get('/api/gold', async (req, res) => {
    try {
        const codes = 'hf_XAU,hf_XAG';
        const names = { hf_XAU: '现货黄金', hf_XAG: '现货白银' };
        const result = [];
        const promises = Object.entries(names).map(async ([code, name]) => {
            const { data } = await axios.get(`https://hq.sinajs.cn/list=${code}`, {
                headers: { Referer: 'https://finance.sina.com.cn' }
            });
            const match = data.match(/var hq_str_\w+="(.+)"/);
            if (!match) return null;
            const parts = match[1].split(',');
            if (parts.length < 2) return null;
            const price = parseFloat(parts[0]);
            const prevClose = parseFloat(parts[7]);
            const change = price - prevClose;
            const changePercent = prevClose ? (change / prevClose) * 100 : 0;
            return { name, code, price, change: parseFloat(change.toFixed(2)), changePercent: parseFloat(changePercent.toFixed(2)) };
        });
        const items = (await Promise.all(promises)).filter(Boolean);
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: '黄金数据获取失败', detail: e.message });
    }
});


app.listen(PORT, () => {
    console.log(`行情看板运行在 http://localhost:${PORT}`);
});
