import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 抓取微博热搜
async function fetchWeiboHot(): Promise<string[]> {
  try {
    const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://weibo.com/',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.data?.realtime || []
    return items.slice(0, 10).map((item: any) => item.word || item.note || '').filter(Boolean)
  } catch {
    return []
  }
}

// 抓取百度热搜
async function fetchBaiduHot(): Promise<string[]> {
  try {
    const res = await fetch('https://top.baidu.com/api/board?platform=wise&tab=realtime', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://top.baidu.com/',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.data?.cards?.[0]?.content || []
    return items.slice(0, 10).map((item: any) => item.word || item.query || '').filter(Boolean)
  } catch {
    return []
  }
}

// 抓取知乎热榜
async function fetchZhihuHot(): Promise<string[]> {
  try {
    const res = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=10', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'x-api-version': '3.0.91',
        'Referer': 'https://www.zhihu.com/',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.data || []
    return items.slice(0, 10).map((item: any) => item.target?.title || '').filter(Boolean)
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      industry = '餐饮',
      modulePrompt = '', aiModel, aiApiKey, aiApiBase
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    // 并行抓取热点数据
    const [weiboHots, baiduHots, zhihuHots] = await Promise.all([
      fetchWeiboHot(),
      fetchBaiduHot(),
      fetchZhihuHot(),
    ])

    const hasRealData = weiboHots.length > 0 || baiduHots.length > 0 || zhihuHots.length > 0
    const realHotsSection = hasRealData ? `
【今日真实热点数据】
微博热搜：${weiboHots.length > 0 ? weiboHots.slice(0, 8).join('、') : '获取失败'}
百度热搜：${baiduHots.length > 0 ? baiduHots.slice(0, 8).join('、') : '获取失败'}
知乎热榜：${zhihuHots.length > 0 ? zhihuHots.slice(0, 8).join('、') : '获取失败'}

请优先基于以上真实热点数据，结合【${industry}】行业特点，生成内容情报报告。` : ''

    const client = new OpenAI({ apiKey, baseURL })

    const systemPrompt = modulePrompt
      ? `你是内容情报分析专家。\n\n【用户专属要求】\n${modulePrompt}\n\n只返回JSON格式数据。`
      : '你是内容情报分析专家，只返回JSON格式数据，不要有任何其他文字。'

    const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    const userPrompt = `今天是${today}，请为【${industry}】行业生成今日内容情报报告。
${realHotsSection}

包含：
1. 8个今日热点话题（结合时事和行业，优先使用真实热点数据）
2. 5种当前爆款内容形式
3. 12个行业关键词热度
4. 3条AI洞察建议

严格返回JSON格式：
{
  "date": "${today}",
  "dataSource": "${hasRealData ? '真实热点+AI分析' : 'AI生成'}",
  "hotspots": [{"title":"热点标题","heat":"🔥🔥🔥","tag":"分类","desc":"简介"}],
  "formats": [{"name":"内容形式","desc":"说明","example":"示例标题","trend":"↑热度"}],
  "keywords": [{"word":"关键词","heat":85,"trend":"↑"}],
  "insights": [{"icon":"💡","title":"洞察标题","detail":"具体建议"}]
}`

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 3000
    })

    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    return NextResponse.json({ 
      success: true, 
      ...result,
      _meta: {
        hasRealData,
        weiboCount: weiboHots.length,
        baiduCount: baiduHots.length,
        zhihuCount: zhihuHots.length,
      }
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
