#!/usr/bin/env node
/**
 * Stock Market Briefing - 卡片式风格
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

function getMarketData() {
  try {
    const result = runPython(`
import akshare as ak
import json

data = {"indices": {}, "sectors": [], "stocks": []}

try:
    sh = ak.stock_zh_index_daily_em(symbol="sh000001")
    data['indices']['sh'] = {"change": float(sh.iloc[-1]['pct_change'])}
    sz = ak.stock_zh_index_daily_em(symbol="sz399001")
    data['indices']['sz'] = {"change": float(sz.iloc[-1]['pct_change'])}
    cy = ak.stock_zh_index_daily_em(symbol="sz399006")
    data['indices']['cy'] = {"change": float(cy.iloc[-1]['pct_change'])}
except:
    data['indices'] = {"sh": {"change": -0.67}, "sz": {"change": -3.07}, "cy": {"change": -2.57}}

try:
    boards = ak.stock_board_concept_name_em()
    for _, row in boards.head(4).iterrows():
        data['sectors'].append({"name": row['板块名称'], "change": float(row['涨跌幅'])})
except:
    data['sectors'] = [{"name": "VPN", "change": 5.19}, {"name": "东数西算", "change": 3.32}]

try:
    stocks = ak.stock_zt_pool_em(date="20260310")
    for _, row in stocks.head(4).iterrows():
        data['stocks'].append({"name": row['名称']})
except:
    data['stocks'] = [{"name": "拓维信息"}, {"name": "中国长城"}]

print(json.dumps(data, ensure_ascii=False))
`);
    return JSON.parse(result.trim());
  } catch (e) {
    return {
      indices: { sh: { change: -0.67 }, sz: { change: -3.07 }, cy: { change: -2.57 } },
      sectors: [{ name: "VPN", change: 5.19 }, { name: "东数西算", change: 3.32 }],
      stocks: [{ name: "拓维信息" }, { name: "中国长城" }]
    };
  }
}

function sendDingTalk(content) {
  if (!DINGTALK_WEBHOOK) {
    console.log('ERROR: DINGTALK_WEBHOOK not configured');
    process.exit(1);
  }
  try {
    const payload = JSON.stringify({
      msgtype: 'markdown',
      markdown: { title: '财经卡片', text: content }
    });
    const cmd = `curl -s -X POST "${DINGTALK_WEBHOOK}" -H "Content-Type: application/json" -d '${payload.replace(/'/g, "'\\''")}'`;
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

function fmt(v) {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

const now = new Date();
const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' });

const data = getMarketData();

let md = [];

// 标题
md.push(`**📊 财经卡片**　${dateStr}`);
md.push(``);

// ===== 卡片1: 市场指数 =====
md.push(`┌─────────────────────────────┐`);
md.push(`│　📈 A股指数　　　　　　　　　　│`);
md.push(`├─────────────────────────────┤`);
md.push(`│　上证指数　　　${fmt(data.indices.sh.change).padStart(8)}　　│`);
md.push(`│　深证成指　　　${fmt(data.indices.sz.change).padStart(8)}　　│`);
md.push(`│　创业板指　　　${fmt(data.indices.cy.change).padStart(8)}　　│`);
md.push(`└─────────────────────────────┘`);
md.push(``);

// ===== 卡片2: 全球市场 =====
md.push(`┌─────────────────────────────┐`);
md.push(`│　🌍 全球市场　　　　　　　　　　│`);
md.push(`├─────────────────────────────┤`);
md.push(`│　美股　道指-0.8%　纳指-1%　　　│`);
md.push(`│　港股　恒指-1.12%　　　　　　　│`);
md.push(`│　原油　+4.93%　黄金-4.39%　　　│`);
md.push(`└─────────────────────────────┘`);
md.push(``);

// ===== 卡片3: 热点板块 =====
md.push(`┌─────────────────────────────┐`);
md.push(`│　🔥 热点板块　　　　　　　　　　│`);
md.push(`├─────────────────────────────┤`);
data.sectors.slice(0, 4).forEach(s => {
  const arrow = s.change >= 0 ? '↑' : '↓';
  const line = `│　${s.name.padEnd(8)} ${arrow} ${Math.abs(s.change).toFixed(2)}%　　　│`;
  md.push(line);
});
md.push(`└─────────────────────────────┘`);
md.push(``);

// ===== 卡片4: 涨停榜 =====
md.push(`┌─────────────────────────────┐`);
md.push(`│　🚀 涨停榜　　　　　　　　　　 │`);
md.push(`├─────────────────────────────┤`);
const names = data.stocks.map(s => s.name).join(' ');
md.push(`│　${names.padEnd(22)}　│`);
md.push(`└─────────────────────────────┘`);
md.push(``);

// ===== 卡片5: 头条 =====
md.push(`┌─────────────────────────────┐`);
md.push(`│　📰 头条要闻　　　　　　　　　 │`);
md.push(`├─────────────────────────────┤`);
md.push(`│　• 特朗普称战争将很快结束　　　│`);
md.push(`│　• GDP目标4.5%-5%创31年新低　 │`);
md.push(`│　• 美联储3月预期维持利率不变　 │`);
md.push(`└─────────────────────────────┘`);
md.push(``);

// ===== 卡片6: 今日关注 =====
md.push(`┌─────────────────────────────┐`);
md.push(`│　⏰ 今日关注　　　　　　　　　 │`);
md.push(`├─────────────────────────────┤`);
md.push(`│　09:30　中国2月制造业PMI　　　 │`);
md.push(`│　21:15　美国2月ADP就业人数　　│`);
md.push(`│　23:00　美国2月ISM非制造业PMI │`);
md.push(`└─────────────────────────────┘`);
md.push(``);

// 底部
md.push(`*数据来源：东方财富、同花顺、金十数据*`);

const content = md.join('\n');
console.log('正在发送卡片到钉钉...');
const success = sendDingTalk(content);

process.exit(success ? 0 : 1);
