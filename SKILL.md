# Stock Market Briefing Skill

A comprehensive daily stock market briefing skill that aggregates data from multiple sources including 金十数据 (Jin10), East Money, Tonghuashun, Xueqiu, and more.

## Features

### Data Sources
- **A-Shares**: 东方财富 (East Money), 新浪财经 (Sina Finance), 腾讯财经 (Tencent Finance), 同花顺 (Tonghuashun - 375 concepts + 90 industries), 雪球 (Xueqiu - 100 hot stocks)
- **HK Stocks**: 东方财富港股, 同花顺港股 (4619 stocks)
- **US Stocks**: Tavily Search
- **News**: 金十数据 (Jin10), 东方财富, 财联社 (Cailianshe), 华尔街见闻 (Wall Street News), 雪球讨论
- **Commodities**: Real-time data from Jin10 (Gold, Silver, Crude Oil)

### Briefing Sections
1. **今日优选 (Today's Top News)** - 8 key market-moving news items
2. **市场盘点 (Market Overview)** - Commodities, US/HK/CN stocks
3. **中东局势 (Middle East Situation)** - Geopolitical updates
4. **A股表现 (A-Share Performance)** - Market highlights
5. **今日风险预警 (Risk Alerts)** - Economic calendar
6. **美联储动态 (Fed Updates)** - Federal Reserve news
7. **热点板块 (Hot Sectors)** - Top performing sectors

## Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- Akshare: `pip install akshare`
- Tavily API Key (for US market data and news)

### Install via ClawHub
```bash
clawhub install stock-briefing
```

### Manual Installation
1. Clone this repository
2. Copy to OpenClaw skills directory:
   ```bash
   cp -r stock-briefing ~/.openclaw/workspace/skills/
   ```
3. Set environment variables:
   ```bash
   export TAVILY_API_KEY="your-api-key"
   ```

## Usage

### Run manually
```bash
node ~/.openclaw/workspace/skills/stock-briefing/scripts/briefing.mjs
```

### Schedule with Cron
The skill includes automatic cron jobs for:
- **Morning briefing**: 10:00 AM (Mon-Fri)
- **Afternoon briefing**: 17:00 PM (Mon-Fri)

## Configuration

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `TAVILY_API_KEY` | Yes | For US market data and news search |

### Customize Output
Edit `scripts/briefing.mjs` to:
- Add/remove data sources
- Change briefing sections
- Adjust news count
- Modify formatting

## Data Source Details

### 金十数据 (Jin10) - Primary Source
- Real-time commodity prices (Gold, Silver, Oil)
- Fast market news and alerts
- Economic calendar

### 东方财富 (East Money)
- A-share market data
- HK stock data
- Financial news

### 同花顺 (Tonghuashun)
- 375 concept sectors
- 90 industry sectors
- 4619 HK stocks via HK Connect

### 雪球 (Xueqiu)
- Hot stock rankings (100 stocks)
- Discussion sentiment
- Market heat indicators

## Version History

### v1.0.0 (2026-03-10)
- Initial release
- Multi-source data integration
- 8-section briefing format
- Jin10 fast news support
- Automatic cron scheduling

## License
MIT

## Author
Created by 叶小助 for 楼老板
