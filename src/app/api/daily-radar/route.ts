import { NextRequest, NextResponse } from 'next/server'
import { deepseek } from '@/lib/ai'

// 内容情报雷达 API - 每日热点汇总
export async function POST(req: NextRequest) {
  try {
    const { industry, positioning, date } = await req.json()
    const today = date || new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })

    const prompt = `今天是${today}，你是专业的短视频内容情报分析师。
针对行业：${industry || '餐饮'}，账号定位：${positioning || '本地生活'}，生成今日内容情报雷达报告。

严格JSON返回：
{
  "date": "${today}",
  "mediaHotspots": [
    {"rank": 1, "title": "热点标题", "heat": "热度描述（如：2.3M讨论）", "relevance": "强相关/相关/一般", "angle": "可借势的内容角度", "urgency": "今天/本周/本月"}
  ],
  "industryTrends": [
    {"title": "行业趋势", "desc": "简短描述", "opportunity": "内容机会点"}
  ],
  "viralFormats": [
    {"format": "爆款内容形式", "example": "示例标题", "reason": "为什么火", "difficulty": "简单/中等/较难"}
  ],
  "keywords": [
    {"word": "关键词", "heat": "热度指数（0-100）", "trend": "上升/稳定/下降", "suggestion": "使用建议"}
  ],
  "todayAction": {
    "priority1": {"title": "今日首选选题", "reason": "原因", "hook": "建议开头"},
    "priority2": {"title": "备选选题", "reason": "原因", "hook": "建议开头"},
    "bestPostTime": "最佳发布时间",
    "tip": "今日运营小贴士"
  }
}`

    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是专业的短视频内容情报分析师，熟悉抖音、小红书平台趋势。只返回JSON。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 3000
    })

    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return NextResponse.json({
      success: true,
      ...result,
      tokens: completion.usage?.total_tokens
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 })
  }
}
