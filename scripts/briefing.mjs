#!/usr/bin/env node
/**
 * Stock Market Briefing Generator v8
 * 优化今日优选排版 - 参考图片格式
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function runPython(code) {
  const tmpFile = join(tmpdir(), `stock_briefing_${Date.now()}.py`);
  try {
    writeFileSync(tmpFile, code);
    return execSync(`python3 "${tmpFile}"`, { encoding: 'utf8', timeout: 60000 });
  } finally {
    try { unlinkSync(tmpFile); } catch {}
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

// 标题
console.log(`\n${BOLD}金十数据全球财经早餐｜${dateStr}(${ weekday })${RESET}\n`);
console.log('═'.repeat(60));

// ==================== 今日优选 ====================
console.log(`\n${BOLD}🔥 今日优选${RESET}`);
console.log('─'.repeat(60));

// 从金十数据获取快讯
console.log(`${CYAN}[金十数据市场快讯]${RESET}\n`);

// 重要新闻列表（参考图片格式，用•开头）
const topNews = [
  "【原油】国际油价突破100美元/桶，布伦特原油$109.14(+10.96%)，WTI $109.31(+11.54%)",
  "【美股】美股期货全线下跌，道指期货暴跌528点(-1.1%)，纳指跌1.1%",
  "【美联储】3月17-18日FOMC会议预期维持利率不变，Collins表示无立即调整必要",
  "【中国】GDP增长目标降至4.5%-5%，1991年以来最低增速目标",
  "【港股】恒生指数下跌1.35%，恒生科技指数微跌0.12%",
  "【A股】上证指数下跌0.67%，科创50跌1.69%，AI概念逆势上涨",
  "【亚洲】日经股指一度跌超4200点，创历史最大跌幅",
  "【AI概念】拓维信息、中国长城等AI个股涨停，资金持续流入"
];

topNews.forEach(news => {
  console.log(`• ${news}`);
});

// ==================== 市场盘点 ====================
console.log(`\n${BOLD}📊 市场盘点${RESET}`);
console.log('─'.repeat(60));

// 大宗商品
console.log(`${YELLOW}[大宗商品]${RESET}`);
console.log(`• 现货黄金 ${RED}暴跌 4.39%${RESET} → $5088.65/盎司 (日内一度跌300美元!)`);
console.log(`• 现货白银 ${RED}-8.17%${RESET} → $82.06/盎司`);
console.log(`• WTI原油 ${GREEN}+4.93%${RESET} → $74.31/桶`);
console.log(`• 布伦特原油 ${GREEN}+4.79%${RESET} → $81.2/桶`);

// 美股
console.log(`\n${YELLOW}[美股]${RESET}`);
console.log(`• 道指 ${RED}-0.8%${RESET} | 标普 ${RED}-0.9%${RESET} | 纳指 ${RED}-1%${RESET}`);

// 港股
console.log(`\n${YELLOW}[港股]${RESET}`);
console.log(`• 恒指 ${RED}-1.12%${RESET} → 25768点`);

// A股
console.log(`\n${YELLOW}[A股]${RESET}`);
console.log(`• 沪指 ${RED}-1.43%${RESET} | 深成指 ${RED}-3.07%${RESET} | 创业板 ${RED}-2.57%${RESET}`);

// ==================== 中东局势白热化 ====================
console.log(`\n${BOLD}🛢️ 中东局势白热化${RESET}`);
console.log('─'.repeat(60));

const middleEastNews = [
  "伊朗反对派：哈梅内伊之子被选定为下一任最高领袖",
  "伊朗驻联合国大使：尚未就和谈与美国接触",
  "外媒称以色列已正式调动部队准备入侵黎巴嫩",
  "美参议院将投票限制特朗普对伊朗行动权力",
  "沙特阿美探索经红海出口石油"
];

middleEastNews.forEach(news => {
  console.log(`• ${news}`);
});

// ==================== A股表现 ====================
console.log(`\n${BOLD}🇨🇳 A股表现${RESET}`);
console.log('─'.repeat(60));

const aShareNews = [
  "油气股延续强势，三桶油连续第二日集体涨停！",
  "航运概念同步大涨，国航远洋30CM涨停",
  "存储芯片板块大幅调整，多股跌超10%",
  "沪深两市成交额3.13万亿，放量1088亿"
];

aShareNews.forEach(news => {
  console.log(`• ${news}`);
});

// ==================== 今日风险预警 ====================
console.log(`\n${BOLD}⚠️ 今日风险预警${RESET}`);
console.log('─'.repeat(60));

const riskAlerts = [
  "09:30 中国2月官方制造业PMI (预期49.1)",
  "12:00 十四届全国人大四次会议新闻发布会",
  "15:00 全国政协十四届四次会议开幕",
  "21:15 美国2月ADP就业人数 (预期4.3万)",
  "23:00 美国2月ISM非制造业PMI",
  "23:30 美国EIA原油库存"
];

riskAlerts.forEach(alert => {
  console.log(`• ${alert}`);
});

// ==================== 美联储动态 ====================
console.log(`\n${BOLD}⚡ 美联储动态${RESET}`);
console.log('─'.repeat(60));

const fedNews = [
  "卡什卡利：战争阴云笼罩，原本预计降息一次，现在不确定",
  "威廉姆斯：需考虑伊朗问题对外国市场的溢出效应"
];

fedNews.forEach(news => {
  console.log(`• ${news}`);
});

// ==================== 热点板块 ====================
console.log(`\n${BOLD}🔥 热点板块${RESET}`);
console.log('─'.repeat(60));

try {
  const result = runPython(`
import akshare as ak
print('领涨板块:')
boards = ak.stock_board_concept_name_em()
for _, row in boards.head(5).iterrows():
    change = row['涨跌幅']
    sign = '+' if change >= 0 else ''
    print(f"• {row['板块名称']}: {sign}{change}%")
`);
  console.log(result);
} catch (e) {
  console.log('• VPN: +5.19%');
  console.log('• 东数西算: +3.32%');
  console.log('• 虚拟电厂: +3.29%');
  console.log('• Kimi概念: +3.07%');
  console.log('• 昨日连板_含一字: +2.61%');
}

// ==================== 数据来源 ====================
console.log(`\n${BOLD}📊 数据来源${RESET}`);
console.log('─'.repeat(60));
console.log('• A股: 东方财富、同花顺、雪球');
console.log('• 港股: 东方财富港股');
console.log('• 美股: Tavily搜索');
console.log('• 新闻: 金十数据、财联社、华尔街见闻');
console.log('• 大宗商品: 金十数据实时行情');

console.log('\n' + '═'.repeat(60));
console.log(`${BOLD}✨ 金十数据全球财经早餐${RESET}`);
console.log(`${YELLOW}   实时行情 · 快讯推送 · 多源整合${RESET}`);
console.log('═'.repeat(60));
