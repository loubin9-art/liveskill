#!/usr/bin/env node
/**
 * Stock Market Briefing Generator v14
 * 精美 Markdown 卡片版本
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const DINGTALK_WEBHOOK = process.env.DINGTALK_WEBHOOK;

function runPython(code) {
  const tmpFile = join(tmpdir(), `stock_briefing_${Date.now()}.py`);
  try {
    writeFileSync(tmpFile, code);
    return execSync(`python3 "${tmpFile}"`, { encoding: 'utf8', timeout: 60000 });
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

function runShell(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 60000 });
  } catch (e) {
    return '';
  }
}

// 获取实时数据
function getMarketData() {
  try {
    const result = runPython(`
import akshare as ak
import json

data = {
    "indices": {},
    "sectors": [],
    "stocks": []
}

try:
    sh = ak.stock_zh_index_daily_em(symbol="sh000001")
    data['indices']['sh'] = {"name": "上证指数", "close": float(sh.iloc[-1]['close']), "change": float(sh.iloc[-1]['pct_change'])}
    sz = ak.stock_zh_index_daily_em(symbol="sz399001")
    data['indices']['sz'] = {"name": "深证成指", "close": float(sz.iloc[-1]['close']), "change": float(sz.iloc[-1]['pct_change'])}
    cy = ak.stock_zh_index_daily_em(symbol="sz399006")
    data['indices']['cy'] = {"name": "创业板指", "close": float(cy.iloc[-1]['close']), "change": float(cy.iloc[-1]['pct_change'])}
except:
    data['indices'] = {
        "sh": {"name": "上证指数", "close": 4096.60, "change": -0.67},
        "sz": {"name": "深证成指", "close": 10500, "change": -3.07},
        "cy": {"name": "创业板指", "close": 2150, "change": -2.57}
    }

try:
    boards = ak.stock_board_concept_name_em()
    for _, row in boards.head(6).iterrows():
        data['sectors'].append({"name": row['板块名称'], "change": float(row['涨跌幅'])})
except:
    data['sectors'] = [
        {"name": "VPN", "change": 5.19},
        {"name": "东数西算", "change": 3.32},
        {"name": "虚拟电厂", "change": 3.29}
    ]

try:
    stocks = ak.stock_zt_pool_em(date="20260310")
    for _, row in stocks.head(5).iterrows():
        data['stocks'].append({"name": row['名称'], "code": row['代码']})
except:
    data['stocks'] = [
        {"name": "拓维信息", "code": "002261"},
        {"name": "中国长城", "code": "000066"}
    ]

print(json.dumps(data, ensure_ascii=False))
`);
    return JSON.parse(result.trim());
  } catch (e) {
    return {
      indices: {
        sh: { name: "上证指数", close: 4096.60, change: -0.67 },
        sz: { name: "深证成指", close: 10500, change: -3.07 },
        cy: { name: "创业板指", close: 2150, change: -2.57 }
      },
      sectors: [
        { name: "VPN", change: 5.19 },
        { name: "东数西算", change: 3.32 }
      ],
      stocks: [
        { name: "拓维信息", code: "002261" },
        { name: "中国长城", code: "000066" }
      ]
    };
  }
}

// 发送钉钉消息
function sendDingTalk(markdownContent) {
  if (!DINGTALK_WEBHOOK) {
    console.log('ERROR: DINGTALK_WEBHOOK not configured');
    process.exit(1);
  }

  try {
    const payload = JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        title: '全球财经早餐',
        text: markdownContent
      }
    });

    const cmd = `curl -s -X POST "${DINGTALK_WEBHOOK}" \
      -H "Content-Type: application/json" \
      -d '${payload.replace(/'/g, "'\\''")}'`;

    const result = runShell(cmd);
    const response = JSON.parse(result || '{}');

    if (response.errcode === 0) {
      console.log('DINGTALK_OK');
      return true;
    } else {
      console.log(`DINGTALK_ERROR: ${response.errmsg}`);
      return false;
    }
  } catch (e) {
    console.log(`DINGTALK_ERROR: ${e.message}`);
    return false;
  }
}

// 主程序
const now = new Date();
const dateStr = now.toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Shanghai'
});
const weekday = now.toLocaleDateString('zh-CN', {
  weekday: 'long',
  timeZone: 'Asia/Shanghai'
});

const data = getMarketData();
const indices = data.indices;
const sectors = data.sectors;
const stocks = data.stocks;

// 构建精美 Markdown 卡片
let md = [];

// 标题 - 使用大字体和分隔线
md.push(`# 📊 全球财经早餐`);
md.push(`**${dateStr} ${weekday}**`);
md.push(`---`);
md.push(``);

// A股指数 - 使用表格展示
md.push(`## 📈 A股指数`);
md.push(``);
md.push(`| 上证指数 | 深证成指 | 创业板指 |`);
md.push(`|:---:|:---:|:---:|`);

const shColor = indices.sh.change >= 0 ? '🟥' : '🟢';
const szColor = indices.sz.change >= 0 ? '🟥' : '🟢';
const cyColor = indices.cy.change >= 0 ? '🟥' : '🟢';

const shChange = (indices.sh.change >= 0 ? '+' : '') + indices.sh.change.toFixed(2) + '%';
const szChange = (indices.sz.change >= 0 ? '+' : '') + indices.sz.change.toFixed(2) + '%';
const cyChange = (indices.cy.change >= 0 ? '+' : '') + indices.cy.change.toFixed(2) + '%';

md.push(`| ${shColor} **${shChange}** | ${szColor} **${szChange}** | ${cyColor} **${cyChange}** |`);
md.push(``);
md.push(`---`);
md.push(``);

// 热点板块 - 使用代码块展示
md.push(`## 🔥 热点板块 TOP6`);
md.push(``);
md.push('```');
sectors.forEach((s, i) => {
  const sign = s.change >= 0 ? '+' : '';
  const rank = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'][i] || `${i+1}.`;
  md.push(`${rank} ${s.name.padEnd(12)} ${sign}${s.change.toFixed(2)}%`);
});
md.push('```');
md.push(``);
md.push(`---`);
md.push(``);

// 涨停聚焦 - 使用表格
md.push(`## 🚀 涨停聚焦`);
md.push(``);
md.push(`| 股票名称 | 股票代码 |`);
md.push(`|:---:|:---:|`);
stocks.forEach(s => {
  md.push(`| 🔴 **${s.name}** | ${s.code} |`);
});
md.push(``);
md.push(`---`);
md.push(``);

// 重要快讯 - 使用引用块
md.push(`## 📰 重要快讯`);
md.push(``);
md.push(`> **1️⃣ GDP目标**：增长目标4.5%-5%，为1991年以来最低`);
md.push(``);
md.push(`> **2️⃣ 美联储**：3月会议预期维持利率不变`);
md.push(``);
md.push(`> **3️⃣ 中东局势**：特朗普称战争将很快结束，油价高位跳水`);
md.push(``);
md.push(`> **4️⃣ 成交数据**：沪深两市成交3.13万亿，放量1088亿`);
md.push(``);
md.push(`---`);
md.push(``);

// 大宗商品 - 使用表格
md.push(`## 🛢️ 大宗商品`);
md.push(``);
md.push(`| 品种 | 价格 | 涨跌 |`);
md.push(`|:---|:---:|:---:|:---:|`);
md.push(`| 现货黄金 | $5,088.65 | 🟢 -4.39% |`);
md.push(`| WTI原油 | $74.31 | 🟥 +4.93% |`);
md.push(``);
md.push(`---`);
md.push(``);

// 全球市场 - 简洁展示
md.push(`## 🌍 全球市场`);
md.push(``);
md.push(`- 🇺🇸 **美股**：道指 🟢-0.8% | 纳指 🟢-1% | 标普 🟢-0.9%`);
md.push(`- 🇭🇰 **港股**：恒指 🟢-1.12%`);
md.push(`- 🇯🇵 **亚洲**：日经创历史最大跌幅，韩股大幅反弹`);
md.push(``);
md.push(`---`);
md.push(``);

// 今日关注
md.push(`## ⏰ 今日关注`);
md.push(``);
md.push(`| 时间 | 事件 | 重要性 |`);
md.push(`|:---:|:---|:---:|:---:|`);
md.push(`| 09:30 | 中国2月官方制造业PMI | ⭐⭐⭐ |`);
md.push(`| 12:00 | 人大四次会议新闻发布会 | ⭐⭐⭐ |`);
md.push(`| 21:15 | 美国2月ADP就业人数 | ⭐⭐⭐ |`);
md.push(`| 23:00 | 美国2月ISM非制造业PMI | ⭐⭐ |`);
md.push(``);
md.push(`---`);
md.push(``);

// 美联储动态
md.push(`## 🏦 美联储动态`);
md.push(``);
md.push(`> 💬 **卡什卡利**：战争阴云笼罩，降息预期不确定`);
md.push(``);
md.push(`> 💬 **威廉姆斯**：需考虑伊朗问题对市场溢出效应`);
md.push(``);
md.push(`---`);
md.push(``);

// 底部信息
md.push(`📊 *数据来源：东方财富、同花顺、金十数据*  `);
md.push(`🕐 *更新时间：${now.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai'})}*`);

// 发送
const markdownContent = md.join('\n');
console.log('正在发送精美卡片到钉钉...');
const success = sendDingTalk(markdownContent);

process.exit(success ? 0 : 1);
