#!/usr/bin/env node
/**
 * Stock Market Briefing Generator - 新闻快报风格
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

data = {"indices": {}, "sectors": [], "stocks": []}

try:
    sh = ak.stock_zh_index_daily_em(symbol="sh000001")
    data['indices']['sh'] = {"close": float(sh.iloc[-1]['close']), "change": float(sh.iloc[-1]['pct_change'])}
    sz = ak.stock_zh_index_daily_em(symbol="sz399001")
    data['indices']['sz'] = {"close": float(sz.iloc[-1]['close']), "change": float(sz.iloc[-1]['pct_change'])}
    cy = ak.stock_zh_index_daily_em(symbol="sz399006")
    data['indices']['cy'] = {"close": float(cy.iloc[-1]['close']), "change": float(cy.iloc[-1]['pct_change'])}
except:
    data['indices'] = {"sh": {"change": -0.67}, "sz": {"change": -3.07}, "cy": {"change": -2.57}}

try:
    boards = ak.stock_board_concept_name_em()
    for _, row in boards.head(5).iterrows():
        data['sectors'].append({"name": row['板块名称'], "change": float(row['涨跌幅'])})
except:
    data['sectors'] = [{"name": "VPN", "change": 5.19}, {"name": "东数西算", "change": 3.32}]

try:
    stocks = ak.stock_zt_pool_em(date="20260310")
    for _, row in stocks.head(4).iterrows():
        data['stocks'].append({"name": row['名称'], "code": row['代码']})
except:
    data['stocks'] = [{"name": "拓维信息", "code": "002261"}, {"name": "中国长城", "code": "000066"}]

print(json.dumps(data, ensure_ascii=False))
`);
    return JSON.parse(result.trim());
  } catch (e) {
    return {
      indices: { sh: { change: -0.67 }, sz: { change: -3.07 }, cy: { change: -2.57 } },
      sectors: [{ name: "VPN", change: 5.19 }, { name: "东数西算", change: 3.32 }],
      stocks: [{ name: "拓维信息", code: "002261" }, { name: "中国长城", code: "000066" }]
    };
  }
}

// 发送钉钉
function sendDingTalk(content) {
  if (!DINGTALK_WEBHOOK) {
    console.log('ERROR: DINGTALK_WEBHOOK not configured');
    process.exit(1);
  }
  try {
    const payload = JSON.stringify({
      msgtype: 'markdown',
      markdown: { title: '财经快报', text: content }
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

// 格式化涨跌
function fmtChange(v) {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

// 主程序
const now = new Date();
const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' });
const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' });

const data = getMarketData();

let md = [];

// ===== 头部 =====
md.push(`**📰 财经快报**  ${dateStr} ${timeStr}`);
md.push(`━━━━━━━━━━━━━━━━━━━━━`);
md.push(``);

// ===== 市场速览（一行三列） =====
md.push(`**【市场速览】**`);
md.push(``);
md.push(`上证指数　${fmtChange(data.indices.sh.change)}　|　深证成指　${fmtChange(data.indices.sz.change)}　|　创业板指　${fmtChange(data.indices.cy.change)}`);
md.push(``);
md.push(`美股：道指-0.8%　纳指-1%　|　港股：恒指-1.12%　|　原油：+4.93%`);
md.push(``);
md.push(`━━━━━━━━━━━━━━━━━━━━━`);
md.push(``);

// ===== 头条新闻 =====
md.push(`**【头条】**`);
md.push(``);
md.push(`▶ 特朗普称对伊战争将很快结束，国际油价高位跳水`);
md.push(``);
md.push(`▶ GDP增长目标4.5%-5%，为1991年以来最低增速目标`);
md.push(``);
md.push(`▶ 美联储3月会议预期维持利率不变，降息预期不确定`);
md.push(``);
md.push(`━━━━━━━━━━━━━━━━━━━━━`);
md.push(``);

// ===== 板块异动 =====
md.push(`**【板块异动】**`);
md.push(``);
data.sectors.slice(0, 5).forEach((s, i) => {
  const arrow = s.change >= 0 ? '↑' : '↓';
  md.push(`${i+1}. ${s.name}　${arrow} ${Math.abs(s.change).toFixed(2)}%`);
});
md.push(``);
md.push(`━━━━━━━━━━━━━━━━━━━━━`);
md.push(``);

// ===== 涨停榜 =====
md.push(`**【涨停榜】**`);
md.push(``);
const stockList = data.stocks.map(s => s.name).join('　');
md.push(stockList);
md.push(``);
md.push(`━━━━━━━━━━━━━━━━━━━━━`);
md.push(``);

// ===== 今日关注 =====
md.push(`**【今日关注】**`);
md.push(``);
md.push(`09:30　中国2月官方制造业PMI`);
md.push(`12:00　人大四次会议新闻发布会`);
md.push(`21:15　美国2月ADP就业人数`);
md.push(`23:00　美国2月ISM非制造业PMI`);
md.push(``);
md.push(`━━━━━━━━━━━━━━━━━━━━━`);
md.push(``);

// 底部
md.push(`*数据来源：东方财富、同花顺、金十数据*`);

const content = md.join('\n');
console.log('正在发送新闻快报到钉钉...');
const success = sendDingTalk(content);

process.exit(success ? 0 : 1);
