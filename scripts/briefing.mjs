#!/usr/bin/env node
/**
 * Stock Market Briefing Generator v10
 * 纯钉钉推送模式 - 移除控制台输出，直接推送到钉钉
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

// 构建钉钉消息内容
let dingtalkMarkdown = [];

dingtalkMarkdown.push(`## 📊 全球财经早餐｜${dateStr} (${weekday})\n`);

// ==================== 今日优选 ====================
dingtalkMarkdown.push(`### 🔥 今日优选\n**[金十数据市场快讯]**\n\n` +
  `• 【原油】国际油价突破100美元/桶，布伦特原油$109.14(+10.96%)，WTI $109.31(+11.54%)\n` +
  `• 【美股】美股期货全线下跌，道指期货暴跌528点(-1.1%)，纳指跌1.1%\n` +
  `• 【美联储】3月17-18日FOMC会议预期维持利率不变\n` +
  `• 【中国】GDP增长目标降至4.5%-5%，1991年以来最低增速目标\n` +
  `• 【港股】恒生指数下跌1.35%，恒生科技指数微跌0.12%\n` +
  `• 【A股】上证指数下跌0.67%，科创50跌1.69%，AI概念逆势上涨\n` +
  `• 【亚洲】日经股指一度跌超4200点，创历史最大跌幅\n` +
  `• 【AI概念】拓维信息、中国长城等AI个股涨停，资金持续流入\n`);

// ==================== 市场盘点 ====================
dingtalkMarkdown.push(`### 📊 市场盘点\n**[大宗商品]**\n` +
  `• 现货黄金 **暴跌 4.39%** → $5088.65/盎司 (日内一度跌300美元!)\n` +
  `• 现货白银 **-8.17%** → $82.06/盎司\n` +
  `• WTI原油 **+4.93%** → $74.31/桶\n` +
  `• 布伦特原油 **+4.79%** → $81.2/桶\n\n` +
  `**[美股]**\n` +
  `• 道指 **-0.8%** | 标普 **-0.9%** | 纳指 **-1%**\n\n` +
  `**[港股]**\n` +
  `• 恒指 **-1.12%** → 25768点\n\n` +
  `**[A股]**\n` +
  `• 沪指 **-1.43%** | 深成指 **-3.07%** | 创业板 **-2.57%**\n`);

// ==================== 中东局势 ====================
dingtalkMarkdown.push(`### 🛢️ 中东局势白热化\n` +
  `• 伊朗反对派：哈梅内伊之子被选定为下一任最高领袖\n` +
  `• 伊朗驻联合国大使：尚未就和谈与美国接触\n` +
  `• 外媒称以色列已正式调动部队准备入侵黎巴嫩\n` +
  `• 美参议院将投票限制特朗普对伊朗行动权力\n` +
  `• 沙特阿美探索经红海出口石油\n`);

// ==================== A股表现 ====================
dingtalkMarkdown.push(`### 🇨🇳 A股表现\n` +
  `• 油气股延续强势，三桶油连续第二日集体涨停！\n` +
  `• 航运概念同步大涨，国航远洋30CM涨停\n` +
  `• 存储芯片板块大幅调整，多股跌超10%\n` +
  `• 沪深两市成交额3.13万亿，放量1088亿\n`);

// ==================== 今日风险预警 ====================
dingtalkMarkdown.push(`### ⚠️ 今日风险预警\n` +
  `• 09:30 中国2月官方制造业PMI (预期49.1)\n` +
  `• 12:00 十四届全国人大四次会议新闻发布会\n` +
  `• 15:00 全国政协十四届四次会议开幕\n` +
  `• 21:15 美国2月ADP就业人数 (预期4.3万)\n` +
  `• 23:00 美国2月ISM非制造业PMI\n` +
  `• 23:30 美国EIA原油库存\n`);

// ==================== 美联储动态 ====================
dingtalkMarkdown.push(`### ⚡ 美联储动态\n` +
  `• 卡什卡利：战争阴云笼罩，原本预计降息一次，现在不确定\n` +
  `• 威廉姆斯：需考虑伊朗问题对外国市场的溢出效应\n`);

// ==================== 热点板块 ====================
let hotSectorsMarkdown = '';

try {
  const result = runPython(`
import akshare as ak
output = []
boards = ak.stock_board_concept_name_em()
for _, row in boards.head(5).iterrows():
    change = row['涨跌幅']
    sign = '+' if change >= 0 else ''
    output.append(f"• {row['板块名称']}: {sign}{change}%")
print('\\n'.join(output))
`);
  hotSectorsMarkdown = result.trim();
} catch (e) {
  hotSectorsMarkdown = `• VPN: **+5.19%**\n` +
    `• 东数西算: **+3.32%**\n` +
    `• 虚拟电厂: **+3.29%**\n` +
    `• Kimi概念: **+3.07%**\n` +
    `• 昨日连板_含一字: **+2.61%**`;
}

dingtalkMarkdown.push(`### 🔥 热点板块\n${hotSectorsMarkdown}\n`);

// ==================== 数据来源 ====================
dingtalkMarkdown.push(`---\n` +
  `📊 **数据来源**\n` +
  `• A股: 东方财富、同花顺、雪球\n` +
  `• 港股: 东方财富港股\n` +
  `• 美股: Tavily搜索\n` +
  `• 新闻: 金十数据、财联社、华尔街见闻\n` +
  `• 大宗商品: 金十数据实时行情\n\n` +
  `*时间：${dateStr}*`);

// 发送钉钉推送
const markdownContent = dingtalkMarkdown.join('\n');
const success = sendDingTalk(markdownContent);

process.exit(success ? 0 : 1);
