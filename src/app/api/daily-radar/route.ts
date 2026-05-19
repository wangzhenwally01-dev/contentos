import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// ── 多平台热点抓取 ──────────────────────────────────────────

// 微博热搜
async function fetchWeiboHot(): Promise<{title:string,heat:number,source:string}[]> {
  try {
    const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://weibo.com/',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.data?.realtime || []
    return items.slice(0, 12).map((item: any) => ({
      title: item.word || item.note || '',
      heat: item.num ? Math.min(100, Math.round(item.num / 100000)) : 70,
      source: '微博',
    })).filter((i: any) => i.title)
  } catch { return [] }
}

// 百度热搜
async function fetchBaiduHot(): Promise<{title:string,heat:number,source:string}[]> {
  try {
    const res = await fetch('https://top.baidu.com/api/board?platform=wise&tab=realtime', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://top.baidu.com/',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.data?.cards?.[0]?.content || []
    return items.slice(0, 12).map((item: any) => ({
      title: item.word || item.query || '',
      heat: item.hotScore ? Math.min(100, Math.round(item.hotScore / 100000)) : 65,
      source: '百度',
    })).filter((i: any) => i.title)
  } catch { return [] }
}

// 知乎热榜
async function fetchZhihuHot(): Promise<{title:string,heat:number,source:string}[]> {
  try {
    const res = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=10', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'x-api-version': '3.0.91',
        'Referer': 'https://www.zhihu.com/',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.data || []
    return items.slice(0, 10).map((item: any) => ({
      title: item.target?.title || '',
      heat: item.detail_text ? parseInt(item.detail_text) || 60 : 60,
      source: '知乎',
    })).filter((i: any) => i.title)
  } catch { return [] }
}

// 抖音热榜（通过公开接口）
async function fetchDouyinHot(): Promise<{title:string,heat:number,source:string}[]> {
  try {
    const res = await fetch('https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://www.douyin.com/',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.word_list || []
    return items.slice(0, 10).map((item: any) => ({
      title: item.word || '',
      heat: item.hot_value ? Math.min(100, Math.round(item.hot_value / 100000)) : 75,
      source: '抖音',
    })).filter((i: any) => i.title)
  } catch { return [] }
}

// B站热门（通过公开接口）
async function fetchBilibiliHot(): Promise<{title:string,heat:number,source:string}[]> {
  try {
    const res = await fetch('https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.data?.list || []
    return items.slice(0, 8).map((item: any) => ({
      title: item.title || '',
      heat: item.stat?.view ? Math.min(100, Math.round(item.stat.view / 500000)) : 55,
      source: 'B站',
    })).filter((i: any) => i.title)
  } catch { return [] }
}

// ── 主处理函数 ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      industry = '餐饮',
      modulePrompt = '',
      aiModel, aiApiKey, aiApiBase,
      mode = 'full', // 'full' | 'quick'
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    // 并行抓取所有平台热点
    const [weiboHots, baiduHots, zhihuHots, douyinHots, bilibiliHots] = await Promise.all([
      fetchWeiboHot(),
      fetchBaiduHot(),
      fetchZhihuHot(),
      fetchDouyinHot(),
      fetchBilibiliHot(),
    ])

    const allPlatformData = {
      weibo: weiboHots,
      baidu: baiduHots,
      zhihu: zhihuHots,
      douyin: douyinHots,
      bilibili: bilibiliHots,
    }

    const totalCount = weiboHots.length + baiduHots.length + zhihuHots.length + douyinHots.length + bilibiliHots.length
    const hasRealData = totalCount > 0

    // 构建热点摘要
    const hotSummary = [
      weiboHots.length > 0 ? `微博热搜(${weiboHots.length}条)：${weiboHots.slice(0,6).map(h=>h.title).join('、')}` : '',
      baiduHots.length > 0 ? `百度热搜(${baiduHots.length}条)：${baiduHots.slice(0,6).map(h=>h.title).join('、')}` : '',
      zhihuHots.length > 0 ? `知乎热榜(${zhihuHots.length}条)：${zhihuHots.slice(0,5).map(h=>h.title).join('、')}` : '',
      douyinHots.length > 0 ? `抖音热榜(${douyinHots.length}条)：${douyinHots.slice(0,5).map(h=>h.title).join('、')}` : '',
      bilibiliHots.length > 0 ? `B站热门(${bilibiliHots.length}条)：${bilibiliHots.slice(0,4).map(h=>h.title).join('、')}` : '',
    ].filter(Boolean).join('\n')

    const client = new OpenAI({ apiKey, baseURL })

    const systemPrompt = modulePrompt
      ? `你是内容情报分析专家。\n\n【用户专属要求】\n${modulePrompt}\n\n只返回JSON格式数据，不要有任何其他文字。`
      : '你是内容情报分析专家，专注于短视频内容创作方向。只返回JSON格式数据，不要有任何其他文字。'

    const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    const userPrompt = `今天是${today} ${now}，请为【${industry}】行业生成今日内容情报报告。

${hasRealData ? `【多平台实时热点数据】\n${hotSummary}\n\n请优先基于以上真实热点数据进行分析。` : '【注意】实时数据获取失败，请基于当前时事生成分析。'}

请生成完整的内容情报报告，严格返回以下JSON格式（不要有任何其他文字）：
{
  "date": "${today}",
  "updateTime": "${now}",
  "dataSource": "${hasRealData ? '多平台实时热点' : 'AI生成'}",
  "platformStats": {
    "weibo": ${weiboHots.length},
    "baidu": ${baiduHots.length},
    "zhihu": ${zhihuHots.length},
    "douyin": ${douyinHots.length},
    "bilibili": ${bilibiliHots.length}
  },
  "hotspots": [
    {
      "title": "热点标题（结合真实热点）",
      "tag": "分类（社会/娱乐/科技/财经/生活/行业）",
      "desc": "热点简介（20字内）",
      "heat": 85,
      "heatLevel": "🔥🔥🔥",
      "source": "来源平台（微博/百度/抖音/知乎/B站/综合）",
      "trend": "↑",
      "trendDesc": "持续上升",
      "opportunity": "high",
      "opportunityScore": 88,
      "canBorrow": true,
      "borrowTip": "借势角度：xxx",
      "contentAngle": "内容切入角度",
      "difficulty": "简单"
    }
  ],
  "formats": [
    {
      "format": "内容形式名称",
      "desc": "形式说明",
      "example": "示例标题",
      "trend": "↑热度",
      "difficulty": "简单",
      "avgViews": "平均播放量",
      "bestPlatform": "最适合平台",
      "tips": ["制作要点1", "制作要点2"]
    }
  ],
  "keywords": [
    {
      "word": "关键词",
      "heat": 85,
      "trend": "↑",
      "category": "分类",
      "relatedTopics": ["相关话题1", "相关话题2"]
    }
  ],
  "insights": [
    {
      "icon": "💡",
      "title": "洞察标题",
      "detail": "具体建议（50字内）",
      "priority": "high",
      "actionable": "立即可做的行动"
    }
  ],
  "trendForecast": [
    {
      "topic": "趋势话题",
      "currentHeat": 75,
      "forecastHeat": 90,
      "peakTime": "预计峰值时间",
      "reason": "趋势原因",
      "contentWindow": "最佳创作窗口"
    }
  ],
  "bestTopics": [
    {
      "title": "推荐选题标题",
      "reason": "推荐理由",
      "hook": "开场钩子",
      "platform": "推荐平台",
      "score": 90
    }
  ],
  "industryAlert": {
    "level": "medium",
    "message": "行业预警信息",
    "suggestion": "应对建议"
  }
}

要求：
- hotspots 生成10条，优先使用真实热点数据
- formats 生成5条当前爆款内容形式
- keywords 生成15个关键词，heat值1-100
- insights 生成4条洞察
- trendForecast 生成3条趋势预测
- bestTopics 生成5条推荐选题
- 所有内容必须与【${industry}】行业相关或可借势`

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 4000
    })

    const raw = completion.choices[0].message.content || '{}'
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(jsonStr)

    return NextResponse.json({
      success: true,
      ...result,
      _meta: {
        hasRealData,
        totalHotspots: totalCount,
        platformData: allPlatformData,
        fetchedAt: new Date().toISOString(),
      }
    })
  } catch (e: any) {
    console.error('daily-radar error:', e)
    return NextResponse.json({ error: e.message || '获取失败' }, { status: 500 })
  }
}
