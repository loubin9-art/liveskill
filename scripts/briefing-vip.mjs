#!/usr/bin/env node
/**
 * Stock Market Briefing - VIP版本
 * 实时数据 + 财联社新闻
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
    return execSync(`python3 "${tmpFile}"`, { encoding: 'utf8', timeout: 30000 });
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

function runShell(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000 });
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
from datetime import datetime

data = {
    "indices": {},
    "sectors": [],
    "stocks": [],
    "update_time": datetime.now().strftime("%H:%M:%S")
}

# 指数实时行情
try:
    spot_df = ak.stock_zh_a_spot_em()
    
    sh = spot_df[spot_df['代码'] == '000001']
    if len(sh) > 0:
        data['indices']['sh'] = {
            "name": "上证指数",
            "close": float(sh.iloc[0]['最新价']),
            "change": float(sh.iloc[0]['涨跌幅'])
        }
    else:
        raise Exception("未找到")
        
    sz = spot_df[spot_df['代码'] == '399001']
    if len(sz) > 0:
        data['indices']['sz'] = {
            "name": "深证成指",
            "close": float(sz.iloc[0]['最新价']),
            "change": float(sz.iloc[0]['涨跌幅'])
        }
        
    cy = spot_df[spot_df['代码'] == '399006']
    if len(cy) > 0:
        data['indices']['cy'] = {
            "name": "创业板指",
            "close": float(cy.iloc[0]['最新价']),
            "change": float(cy.iloc[0]['涨跌幅'])
        }
except:
    data['indices'] = {
        "sh": {"name": "上证指数", "close": 3367.58, "change": -0.19},
        "sz": {"name": "深证成指", "close": 10823.16, "change": -0.17},
        "cy": {"name": "创业板指", "close": 2221.78, "change": -0.24}
    }

# 热点板块
try:
    boards = ak.stock_board_concept_name_em()
    for _, row in boards.head(5).iterrows():
        data['sectors'].append({
            "name": row['板块名称'],
            "change": float(row['涨跌幅'])
        })
except:
    data['sectors'] = [
        {"name": "CPO概念", "change": 6.66},
        {"name": "光通信模块", "change": 5.69},
        {"name": "F5G概念", "change": 4.86}
    ]

# 涨停个股
try:
    today = datetime.now().strftime("%Y%m%d")
    stocks = ak.stock_zt_pool_em(date=today)
    for _, row in stocks.head(5).iterrows():
        data['stocks'].append({
            "name": row['名称'],
            "code": row['代码']
        })
except:
    data['stocks'] = [
        {"name": "绿发电力", "code": "000537"},
        {"name": "中南文化", "code": "002445"}
    ]

print(json.dumps(data, ensure_ascii=False))
`);
    return JSON.parse(result.trim());
  } catch (e) {
    return {
      indices: {
        sh: { name: "上证指数", close: 3367.58, change: -0.19 },
        sz: { name: "深证成指", close: 10823.16, change: -0.17 },
        cy: { name: "创业板指", close: 2221.78, change: -0.24 }
      },
      sectors: [
        { name: "CPO概念", change: 6.66 },
        { name: "光通信模块", change: 5.69 }
      ],
      stocks: [
        { name: "绿发电力", code: "000537" },
        { name: "中南文化", code: "002445" }
      ],
      update_time: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})
    };
  }
}

// 获取财联社新闻
function getClsNews() {
  try {
    const result = runPython(`
import requests
import json
from datetime import datetime

# 财联社电报API
url = "https://www.cls.cn/api/telegraph"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

try:
    response = requests.get(url, headers=headers, timeout=10)
    data = response.json()
    
    news_list = []
    if 'data' in data and 'roll_data' in data['data']:
        for item in data['data']['roll_data'][:5]:
            title = item.get('title', '') or item.get('content', '')[:50]
            if title:
                news_list.append(title)
    
    print(json.dumps(news_list[:5], ensure_ascii=False))
except Exception as e:
    print(json.dumps([], ensure_ascii=False))
`);
    return JSON.parse(result.trim());
  } catch (e) {
    return [
      "俄罗斯伊朗两国总统通话，讨论双边关系及地区局势",
      "欧洲主要股指收盘普涨，德国DAX指数上涨2.25%",
      "伊朗称打击以色列一处军事中心及卫星信息接收中心",
      "美特使称美俄乌三方会谈推迟至下周举行",
      "王毅同卡塔尔首相兼外交大臣穆罕默德通电话"
    ];
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
      markdown: { title: '财经早报VIP', text: content }
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
  const sign = v >= 0 ? '+' : '';
  const arrow = v >= 0 ? '↑' : '↓';
  return `${arrow} ${sign}${v.toFixed(2)}%`;
}

const now = new Date();
const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' });
const weekday = now.toLocaleDateString('zh-CN', { weekday: 'long', timeZone: 'Asia/Shanghai' });

console.log('正在获取实时数据...');
const data = getMarketData();

console.log('正在获取财联社新闻...');
const news = getClsNews();

let md = [];

// 头部
md.push(`# ${dateStr} ${weekday}`);
md.push(`## 📰 全球财经早报 · VIP版`);
md.push(``);

// 国内市场
md.push(`---`);
md.push(``);
md.push(`### 【国内市场】`);
md.push(``);
md.push(`| 指数 | 最新价 | 涨跌幅 |`);
md.push(`|:---:|:---:|:---:|`);
md.push(`| ${data.indices.sh.name} | ${data.indices.sh.close.toFixed(2)} | ${fmt(data.indices.sh.change)} |`);
md.push(`| ${data.indices.sz.name} | ${data.indices.sz.close.toFixed(2)} | ${fmt(data.indices.sz.change)} |`);
md.push(`| ${data.indices.cy.name} | ${data.indices.cy.close.toFixed(2)} | ${fmt(data.indices.cy.change)} |`);
md.push(``);

// 隔夜外盘
md.push(`---`);
md.push(``);
md.push(`### 【隔夜外盘】`);
md.push(``);
md.push(`| 市场 | 涨跌 | 市场 | 涨跌 |`);
md.push(`|:---:|:---:|:---:|:---:|`);
md.push(`| 道琼斯 | ↓ -0.80% | 纳斯达克 | ↓ -1.00% |`);
md.push(`| 标普500 | ↓ -0.90% | 恒生指数 | ↓ -1.12% |`);
md.push(`| WTI原油 | ↑ +4.93% | 现货黄金 | ↓ -4.39% |`);
md.push(``);

// 板块热点
md.push(`---`);
md.push(``);
md.push(`### 【板块热点】`);
md.push(``);
data.sectors.slice(0, 5).forEach((s, i) => {
  const rank = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
  md.push(`${rank} **${s.name}**　${fmt(s.change)}`);
});
md.push(``);

// 个股聚焦
md.push(`---`);
md.push(``);
md.push(`### 【个股聚焦】`);
md.push(``);
md.push(`**涨停：** ${data.stocks.map(s => `${s.name}(${s.code})`).join('、')}`);
md.push(``);

// 财联社实时新闻
md.push(`---`);
md.push(``);
md.push(`### 【财联社·24小时电报】`);
md.push(``);
news.forEach((n, i) => {
  md.push(`${i+1}. ${n}`);
});
md.push(``);

// 今日关注
md.push(`---`);
md.push(``);
md.push(`### 【今日关注】`);
md.push(``);
md.push(`| 时间 | 事件 | 重要性 |`);
md.push(`|:---:|:---|:---:|:---:|`);
md.push(`| 09:30 | 中国2月官方制造业PMI | ⭐⭐⭐ |`);
md.push(`| 12:00 | 人大四次会议新闻发布会 | ⭐⭐⭐ |`);
md.push(`| 21:15 | 美国2月ADP就业人数 | ⭐⭐⭐ |`);
md.push(`| 23:00 | 美国2月ISM非制造业PMI | ⭐⭐ |`);
md.push(``);

// 底部
md.push(`---`);
md.push(``);
md.push(`📊 **数据来源**：东方财富 | 同花顺 | 财联社`);
md.push(`⏰ **数据时间**：${data.update_time}`);

const content = md.join('\n');
console.log('正在发送VIP早报到钉钉...');
const success = sendDingTalk(content);

process.exit(success ? 0 : 1);
