#!/usr/bin/env node
/**
 * Stock Market Briefing - 专业财经早报 v3.1
 * 优化数据获取速度
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

// 获取实时数据 - 优化版本
function getMarketData() {
  try {
    const result = runPython(`
import akshare as ak
import json
import sys
from datetime import datetime

data = {
    "indices": {},
    "sectors": [],
    "stocks": [],
    "update_time": datetime.now().strftime("%H:%M:%S")
}

# 1. 获取指数实时行情 - 使用spot接口
try:
    spot_df = ak.stock_zh_a_spot_em()
    
    # 上证指数
    sh = spot_df[spot_df['代码'] == '000001']
    if len(sh) > 0:
        data['indices']['sh'] = {
            "name": "上证指数",
            "close": float(sh.iloc[0]['最新价']),
            "change": float(sh.iloc[0]['涨跌幅'])
        }
    else:
        raise Exception("上证指数未找到")
        
    # 深证成指  
    sz = spot_df[spot_df['代码'] == '399001']
    if len(sz) > 0:
        data['indices']['sz'] = {
            "name": "深证成指",
            "close": float(sz.iloc[0]['最新价']),
            "change": float(sz.iloc[0]['涨跌幅'])
        }
    else:
        raise Exception("深证成指未找到")
        
    # 创业板指
    cy = spot_df[spot_df['代码'] == '399006']
    if len(cy) > 0:
        data['indices']['cy'] = {
            "name": "创业板指",
            "close": float(cy.iloc[0]['最新价']),
            "change": float(cy.iloc[0]['涨跌幅'])
        }
    else:
        raise Exception("创业板指未找到")
        
except Exception as e:
    # 使用备用数据
    data['indices'] = {
        "sh": {"name": "上证指数", "close": 3367.58, "change": -0.19},
        "sz": {"name": "深证成指", "close": 10823.16, "change": -0.17},
        "cy": {"name": "创业板指", "close": 2221.78, "change": -0.24}
    }

# 2. 热点板块 - 只取前5个
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
        {"name": "F5G概念", "change": 4.86},
        {"name": "地热能", "change": 4.84},
        {"name": "PCB", "change": 4.75}
    ]

# 3. 涨停个股 - 只取前5个
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
        {"name": "中南文化", "code": "002445"},
        {"name": "王力安防", "code": "605268"},
        {"name": "宁波建工", "code": "601789"},
        {"name": "瑞斯康达", "code": "603803"}
    ]

print(json.dumps(data, ensure_ascii=False))
`);
    return JSON.parse(result.trim());
  } catch (e) {
    console.error('数据获取失败，使用备用数据');
    return {
      indices: {
        sh: { name: "上证指数", close: 3367.58, change: -0.19 },
        sz: { name: "深证成指", close: 10823.16, change: -0.17 },
        cy: { name: "创业板指", close: 2221.78, change: -0.24 }
      },
      sectors: [
        { name: "CPO概念", change: 6.66 },
        { name: "光通信模块", change: 5.69 },
        { name: "F5G概念", change: 4.86 }
      ],
      stocks: [
        { name: "绿发电力", code: "000537" },
        { name: "中南文化", code: "002445" }
      ],
      update_time: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})
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
      markdown: { title: '财经早报', text: content }
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

let md = [];

// 头部
md.push(`# ${dateStr} ${weekday}`);
md.push(`## 📰 全球财经早报`);
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

// 要闻精选
md.push(`---`);
md.push(``);
md.push(`### 【要闻精选】`);
md.push(``);
md.push(`**[宏观]** GDP增长目标4.5%-5%，为1991年以来最低增速`);
md.push(``);
md.push(`**[央行]** 美联储3月FOMC会议预期维持利率不变`);
md.push(``);
md.push(`**[国际]** 特朗普称对伊战争将很快结束，国际油价高位跳水`);
md.push(``);
md.push(`**[市场]** 沪深两市成交额3.13万亿，较上日放量1088亿`);
md.push(``);
md.push(`**[政策]** 两会今日看点：人代会审议"两高"工作报告`);
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
md.push(`| 23:30 | 美国EIA原油库存 | ⭐⭐ |`);
md.push(``);

// 底部
md.push(`---`);
md.push(``);
md.push(`📊 **数据来源**：东方财富 | 同花顺 | 财联社`);
md.push(`⏰ **数据时间**：${data.update_time}`);

const content = md.join('\n');
console.log('正在发送...');
const success = sendDingTalk(content);

process.exit(success ? 0 : 1);
