# 安装指南

## 方式一：通过 Git 克隆安装（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/loubin9-art/liveskill.git

# 2. 进入 skill 目录
cd liveskill/stock-briefing

# 3. 复制到 OpenClaw skills 目录
cp -r . ~/.openclaw/workspace/skills/stock-briefing

# 4. 安装 Python 依赖
pip install akshare

# 5. 配置 Tavily API Key
export TAVILY_API_KEY="your-api-key"
```

## 方式二：手动下载安装

1. 下载 `stock-briefing-skill-v1.0.0.tar.gz`
2. 解压到 `~/.openclaw/workspace/skills/stock-briefing/`
3. 安装依赖：`pip install akshare`
4. 配置环境变量：`export TAVILY_API_KEY="your-api-key"`

## 方式三：通过 ClawHub 安装（未来支持）

```bash
clawhub install stock-briefing
```

## 验证安装

```bash
node ~/.openclaw/workspace/skills/stock-briefing/scripts/briefing.mjs
```

## 配置定时任务

```bash
# 早上 10:00
openclaw cron add --name "stock-briefing-morning" --schedule "0 10 * * 1-5" --command "node ~/.openclaw/workspace/skills/stock-briefing/scripts/briefing.mjs"

# 下午 17:00
openclaw cron add --name "stock-briefing-afternoon" --schedule "0 17 * * 1-5" --command "node ~/.openclaw/workspace/skills/stock-briefing/scripts/briefing.mjs"
```

## 更新 Skill

```bash
cd ~/.openclaw/workspace/skills/stock-briefing
git pull origin main
```

## 卸载

```bash
rm -rf ~/.openclaw/workspace/skills/stock-briefing
```
