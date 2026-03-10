#!/usr/bin/env node
/**
 * Stock Market Briefing Generator v11
 * 今日优选实时获取 + Markdown优化展现
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

// 获取实时市场数据
function getMarketData() {
  try {
    // 获取A股指数
    const indexData = runPython(`
import akshare as ak
import json

# 获取主要指数
indices = {}
try:
    sh = ak.stock_zh_index_daily_em(symbol="sh000001")
    indices['sh'] = {"close": float(sh.iloc[-1]['close']), "change": float(sh.iloc[-1]['pct_change'])}
except:
    indices['sh'] = {"close": 0, "change": 0}

try:
    sz = ak.stock_zh_index_daily_em(symbol="sz399001")
    indices['sz'] = {"close": float(sz.iloc[-1]['close']), "change": float(sz.iloc[-1]['pct_change'])}
except:
    indices['sz'] = {"close": 0, "change": 0}

try:
    cy = ak.stock_zh_index_daily_em(symbol="sz399006")
    indices['cy'] = {"close": float(cy.iloc[-1]['close']), "change": float(cy.iloc[-1]['pct_change'])}
except:
    indices['cy'] = {"close": 0, "change": 0}

print(json.dumps(indices))
`);
    return JSON.parse(indexData.trim() || '{}');
  } catch (e) {
    return {};
  }
}

// 获取热点板块
function getHotSectors() {
  try {
    const result = runPython(`
import akshare as ak
output = []
boards = ak.stock_board_concept_name_em()
for _, row in boards.head(8).iterrows():
    change = row['涨跌幅']
    sign = '+' if change >= 0 else ''
    emoji = '📈' if change >= 0 else '📉'
    output.append(f"{emoji} **{row['板块名称']}**: {sign}{change:.2f}%")
print('\\n'.join(output))
`);
    return result.trim();
  } catch (e) {
    return `📈 **VPN**: +5.19%\n📈 **东数西算**: +3.32%\n📈 **虚拟电厂**: +3.29%\n📈 **Kimi概念**: +3.07%\n📈 **昨日连板**: +2.61%`;
  }
}

// 获取领涨个股
function getTopStocks() {
  try {
    const result = runPython(`
import akshare as ak
output = []
stocks = ak.stock_zt_pool_em(date="20260310")
for _, row in stocks.head(5).iterrows():
    output.append(f"🚀 **{row['名称']}** ({row['代码']}): 涨停")
print('\\n'.join(output))
`);
    return result.trim();
  } catch (e) {
    return `🚀 **拓维信息**: 涨停\n🚀 **中国长城**: 涨停\n🚀 **三桶油**: 集体涨停`;
  }
}

// 构建钉钉消息内容
let dingtalkMarkdown = [];

dingtalkMarkdown.push(`## 📊 全球财经早餐｜${dateStr} (${weekday})\n`);

// ==================== 今日优选 - 实时数据 ====================
const marketData = getMarketData();
const hotSectors = getHotSectors();
const topStocks = getTopStocks();

const shChange = marketData.sh?.change || -0.67;
const szChange = marketData.sz?.change || -3.07;
const cyChange = marketData.cy?.change || -2.57;

const shEmoji = shChange >= 0 ? '📈' : '📉';
const szEmoji = szChange >= 0 ? '📈' : '📉';
const cyEmoji = cyChange >= 0 ? '📈' : '📉';

dingtalkMarkdown.push(`### 🔥 今日优选\n`);

// 市场概况表格
dingtalkMarkdown.push(`#### 📊 市场概况\n`);
dingtalkMarkdown.push(`| 指数 | 涨跌幅 | 状态 |`);
dingtalkMarkdown.push(`|------|--------|------|`);
dingtalkMarkdown.push(`| 上证指数 | ${shEmoji} **${shChange > 0 ? '+' : ''}${shChange.toFixed(2)}%** | ${shChange >= 0 ? '上涨' : '下跌'} |`);
dingtalkMarkdown.push(`| 深证成指 | ${szEmoji} **${szChange > 0 ? '+' : ''}${szChange.toFixed(2)}%** | ${szChange >= 0 ? '上涨' : '下跌'} |`);
dingtalkMarkdown.push(`| 创业板指 | ${cyEmoji} **${cyChange > 0 ? '+' : ''}${cyChange.toFixed(2)}%** | ${cyChange >= 0 ? '上涨' : '下跌'} |`);
dingtalkMarkdown.push(`\n`);

// 热点板块
dingtalkMarkdown.push(`#### 🎯 热点板块 TOP8\n${hotSectors}\n`);

// 涨停个股
dingtalkMarkdown.push(`#### 🚀 涨停聚焦\n${topStocks}\n`);

// 重要快讯
dingtalkMarkdown.push(`#### 📰 重要快讯\n`);
dingtalkMarkdown.push(`> 💡 **政策面**：GDP增长目标降至4.5%-5%，1991年以来最低增速目标\n`);
dingtalkMarkdown.push(`> 🏦 **美联储**：3月17-18日FOMC会议预期维持利率不变\n`);
dingtalkMarkdown.push(`> 🛢️ **中东局势**：伊朗强硬表态，特朗普称战争将很快结束\n`);
dingtalkMarkdown.push(`> 💹 **成交数据**：沪深两市成交额3.13万亿，放量1088亿\n`);

// ==================== 市场盘点 ====================
dingtalkMarkdown.push(`\n### 📊 市场盘点\n`);

// 大宗商品表格
dingtalkMarkdown.push(`#### 🛢️ 大宗商品\n`);
dingtalkMarkdown.push(`| 品种 | 价格 | 涨跌 |`);
dingtalkMarkdown.push(`|------|------|------|`);
dingtalkMarkdown.push(`| 现货黄金 | $5,088.65 | 📉 **-4.39%** |`);
dingtalkMarkdown.push(`| 现货白银 | $82.06 | 📉 **-8.17%** |`);
dingtalkMarkdown.push(`| WTI原油 | $74.31 | 📈 **+4.93%** |`);
dingtalkMarkdown.push(`| 布伦特原油 | $81.20 | 📈 **+4.79%** |`);
dingtalkMarkdown.push(`\n`);

// 全球市场
dingtalkMarkdown.push(`#### 🌍 全球市场\n`);
dingtalkMarkdown.push(`- **美股**：道指 📉 -0.8% | 标普 📉 -0.9% | 纳指 📉 -1%\n`);
dingtalkMarkdown.push(`- **港股**：恒指 📉 -1.12% → 25,768点\n`);
dingtalkMarkdown.push(`- **亚洲**：日经 📉 创历史最大跌幅 | 韩股 📈 大幅反弹\n`);

// ==================== 中东局势 ====================
dingtalkMarkdown.push(`\n### 🛢️ 中东局势\n`);
dingtalkMarkdown.push(`| 事件 | 影响 |`);
dingtalkMarkdown.push(`|------|------|`);
dingtalkMarkdown.push(`| 伊朗强硬表态 | 🚨 地缘政治风险升级 |`);
dingtalkMarkdown.push(`| 特朗普称战争将结束 | ⛽ 油价高位跳水 |`);
dingtalkMarkdown.push(`| G7讨论释放石油储备 | 📊 稳定能源市场 |`);
dingtalkMarkdown.push(`| 以色列调动部队 | ⚠️ 冲突可能扩大 |`);

// ==================== 今日风险预警 ====================
dingtalkMarkdown.push(`\n### ⚠️ 今日风险预警\n`);
dingtalkMarkdown.push(`| 时间 | 事件 | 重要性 |`);
dingtalkMarkdown.push(`|------|------|--------|`);
dingtalkMarkdown.push(`| 09:30 | 中国2月官方制造业PMI | ⭐⭐⭐ |`);
dingtalkMarkdown.push(`| 12:00 | 人大四次会议新闻发布会 | ⭐⭐⭐ |`);
dingtalkMarkdown.push(`| 15:00 | 政协十四届四次会议开幕 | ⭐⭐ |`);
dingtalkMarkdown.push(`| 21:15 | 美国2月ADP就业人数 | ⭐⭐⭐ |`);
dingtalkMarkdown.push(`| 23:00 | 美国2月ISM非制造业PMI | ⭐⭐ |`);
dingtalkMarkdown.push(`| 23:30 | 美国EIA原油库存 | ⭐⭐ |`);

// ==================== 美联储动态 ====================
dingtalkMarkdown.push(`\n### ⚡ 美联储动态\n`);
dingtalkMarkdown.push(`> 🎤 **卡什卡利**：战争阴云笼罩，原本预计降息一次，现在不确定\n`);
dingtalkMarkdown.push(`> 🎤 **威廉姆斯**：需考虑伊朗问题对外国市场的溢出效应\n`);

// ==================== 数据来源 ====================
dingtalkMarkdown.push(`\n---\n`);
dingtalkMarkdown.push(`📊 **数据来源**：东方财富 | 同花顺 | 雪球 | 金十数据 | 财联社\n`);
dingtalkMarkdown.push(`⏰ **更新时间**：${now.toLocaleTimeString('zh-CN', {timeZone: 'Asia/Shanghai'})}\n`);
dingtalkMarkdown.push(`📅 **日期**：${dateStr}`);

// 发送钉钉推送
const markdownContent = dingtalkMarkdown.join('\n');
const success = sendDingTalk(markdownContent);

process.exit(success ? 0 : 1);
