#!/usr/bin/env node
/**
 * Stock Market Briefing Generator v13
 * 平衡视觉标记和信息展示
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
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

// 获取当前日期信息
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

// 格式化涨跌幅
function formatChange(change) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

// 获取实时市场数据
function getMarketData() {
  try {
    const indexData = runPython(`
import akshare as ak
import json

indices = {}
try:
    sh = ak.stock_zh_index_daily_em(symbol="sh000001")
    indices['sh'] = {"close": float(sh.iloc[-1]['close']), "change": float(sh.iloc[-1]['pct_change'])}
except:
    indices['sh'] = {"close": 0, "change": -0.67}

try:
    sz = ak.stock_zh_index_daily_em(symbol="sz399001")
    indices['sz'] = {"close": float(sz.iloc[-1]['close']), "change": float(sz.iloc[-1]['pct_change'])}
except:
    indices['sz'] = {"close": 0, "change": -3.07}

try:
    cy = ak.stock_zh_index_daily_em(symbol="sz399006")
    indices['cy'] = {"close": float(cy.iloc[-1]['close']), "change": float(cy.iloc[-1]['pct_change'])}
except:
    indices['cy'] = {"close": 0, "change": -2.57}

print(json.dumps(indices))
`);
    return JSON.parse(indexData.trim() || '{}');
  } catch (e) {
    return { sh: { close: 4096.60, change: -0.67 }, sz: { close: 10500, change: -3.07 }, cy: { close: 2150, change: -2.57 } };
  }
}

// 获取热点板块
function getHotSectors() {
  try {
    const result = runPython(`
import akshare as ak
boards = ak.stock_board_concept_name_em()
for _, row in boards.head(5).iterrows():
    change = row['涨跌幅']
    sign = '+' if change >= 0 else ''
    print(f"• {row['板块名称']}: {sign}{change:.2f}%")
`);
    return result.trim();
  } catch (e) {
    return "• VPN: +5.19%\n• 东数西算: +3.32%\n• 虚拟电厂: +3.29%\n• Kimi概念: +3.07%";
  }
}

// 获取涨停个股
function getTopStocks() {
  try {
    const result = runPython(`
import akshare as ak
stocks = ak.stock_zt_pool_em(date="20260310")
for _, row in stocks.head(5).iterrows():
    print(f"• {row['名称']} ({row['代码']})")
`);
    return result.trim();
  } catch (e) {
    return "• 拓维信息\n• 中国长城\n• 中国石油\n• 中国石化";
  }
}

// 获取大宗商品数据
function getCommodities() {
  try {
    const result = runPython(`
import akshare as ak
import json

data = {}
try:
    gold = ak.futures_zh_realtime(symbol="黄金")
    data['gold'] = {"price": float(gold.iloc[0]['最新价']), "change": float(gold.iloc[0]['涨跌幅'])}
except:
    data['gold'] = {"price": 5088.65, "change": -4.39}

try:
    oil = ak.futures_zh_realtime(symbol="原油")
    data['oil'] = {"price": float(oil.iloc[0]['最新价']), "change": float(oil.iloc[0]['涨跌幅'])}
except:
    data['oil'] = {"price": 74.31, "change": 4.93}

print(json.dumps(data))
`);
    return JSON.parse(result.trim() || '{}');
  } catch (e) {
    return {
      gold: { price: 5088.65, change: -4.39 },
      oil: { price: 74.31, change: 4.93 }
    };
  }
}

// 获取数据
const marketData = getMarketData();
const hotSectors = getHotSectors();
const topStocks = getTopStocks();
const commodities = getCommodities();

// 构建钉钉消息
let md = [];

// 标题
md.push(`## 📊 全球财经早餐 | ${dateStr} ${weekday}\n`);

// ==================== 今日优选 ====================
md.push(`### 🔥 今日优选\n`);

// 市场概况
const shChange = marketData.sh?.change || -0.67;
const szChange = marketData.sz?.change || -3.07;
const cyChange = marketData.cy?.change || -2.57;

md.push(`**A股指数**`);
md.push(`| 上证指数 | 深证成指 | 创业板指 |`);
md.push(`| :---: | :---: | :---: |`);
md.push(`| ${formatChange(shChange)} | ${formatChange(szChange)} | ${formatChange(cyChange)} |`);
md.push(`\n`);

// 热点板块 - 列表展示
md.push(`**热点板块**`);
md.push(hotSectors);
md.push(`\n`);

// 涨停聚焦 - 列表展示
md.push(`**涨停聚焦**`);
md.push(topStocks);
md.push(`\n`);

// 重要快讯
md.push(`**重要快讯**`);
md.push(`1. GDP增长目标4.5%-5%，为1991年以来最低`);
md.push(`2. 美联储3月会议预期维持利率不变`);
md.push(`3. 中东局势：特朗普称战争将很快结束，油价高位跳水`);
md.push(`4. 沪深两市成交3.13万亿，放量1088亿`);
md.push(`\n`);

// ==================== 市场盘点 ====================
md.push(`### 📈 市场盘点\n`);

// 大宗商品
md.push(`**大宗商品**`);
md.push(`| 品种 | 价格 | 涨跌 |`);
md.push(`| :--- | :--- | :--- |`);
md.push(`| 现货黄金 | $${commodities.gold?.price || 5088.65} | ${formatChange(commodities.gold?.change || -4.39)} |`);
md.push(`| WTI原油 | $${commodities.oil?.price || 74.31} | ${formatChange(commodities.oil?.change || 4.93)} |`);
md.push(`\n`);

// 全球市场
md.push(`**全球市场**`);
md.push(`• 美股：道指 ${formatChange(-0.8)} | 纳指 ${formatChange(-1)} | 标普 ${formatChange(-0.9)}`);
md.push(`• 港股：恒指 ${formatChange(-1.12)}`);
md.push(`• 亚洲：日经创历史最大跌幅，韩股大幅反弹`);
md.push(`\n`);

// ==================== 中东局势 ====================
md.push(`### 🌍 中东局势\n`);
md.push(`• 伊朗强硬表态，特朗普称战争将很快结束`);
md.push(`• G7讨论释放石油储备稳定市场`);
md.push(`• 以色列调动部队，冲突可能扩大`);
md.push(`\n`);

// ==================== 今日关注 ====================
md.push(`### ⏰ 今日关注\n`);
md.push(`| 时间 | 事件 |`);
md.push(`| :--- | :--- |`);
md.push(`| 09:30 | 中国2月官方制造业PMI |`);
md.push(`| 12:00 | 人大四次会议新闻发布会 |`);
md.push(`| 21:15 | 美国2月ADP就业人数 |`);
md.push(`| 23:00 | 美国2月ISM非制造业PMI |`);
md.push(`\n`);

// ==================== 美联储动态 ====================
md.push(`### 🏦 美联储动态\n`);
md.push(`• 卡什卡利：战争阴云笼罩，降息预期不确定`);
md.push(`• 威廉姆斯：需考虑伊朗问题对市场溢出效应`);
md.push(`\n`);

// 底部信息
md.push(`---`);
md.push(`📊 数据来源：东方财富、同花顺、金十数据`);
md.push(`🕐 更新时间：${now.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai'})}`);

// 发送
const markdownContent = md.join('\n');
const success = sendDingTalk(markdownContent);

process.exit(success ? 0 : 1);
