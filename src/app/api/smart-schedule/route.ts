import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const {
      positioning, industry, accountName,
      topics = [],
      videoRecords = [],
      existingSchedule = [],
      days = 7,
      aiModel, aiApiKey, aiApiBase, aiTemperature
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    const client = new OpenAI({ apiKey, baseURL })

    // 分析历史发布数据，找出最佳时间
    const bestTimes = analyzeBestTimes(videoRecords)

    // 生成未来N天的日期
    const today = new Date()
    const futureDates = Array.from({ length: days }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return {
        date: d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
        weekday: d.toLocaleDateString('zh-CN', { weekday: 'short' }),
        fullDate: d.toISOString().split('T')[0],
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      }
    })

    const topicsContext = topics.length > 0
      ? topics.slice(0, 15).map((t: any, i: number) => `${i+1}. ${typeof t === 'string' ? t : t.title} [${t.category || '通用'}]`).join('\n')
      : '（暂无选题，请先生成选题）'

    const historyContext = videoRecords.length > 0
      ? `历史最佳发布时间分析：\n${bestTimes.map((t: any) => `- ${t.time}: 平均播放 ${t.avgPlays}`).join('\n')}`
      : '暂无历史数据，使用行业通用最佳时间'

    const existingContext = existingSchedule.length > 0
      ? `已有排期（避免冲突）：\n${existingSchedule.slice(0, 5).map((s: any) => `- ${s.time}: ${s.title}`).join('\n')}`
      : ''

    const prompt = `你是短视频运营专家，擅长制定内容发布策略。

账号信息：
- 账号名：${accountName}
- 行业：${industry}
- 定位：${positioning}

可用选题列表：
${topicsContext}

${historyContext}

${existingContext}

未来${days}天日期：
${futureDates.map(d => `- ${d.date}(${d.weekday})${d.isWeekend ? '[周末]' : ''}`).join('\n')}

请为这${days}天制定智能发布排期，要求：
1. 每天1-2条内容（周末可适当增加）
2. 根据行业特点选择最佳发布时间（餐饮：11:30/17:30，健身：6:30/19:00，通用：12:00/18:30/21:00）
3. 合理分配内容类型（不要连续发同类型）
4. 周末安排互动性强的内容
5. 从选题列表中选择最合适的内容

严格返回JSON格式：
{
  "schedule": [
    {
      "date": "日期（如：5月20日）",
      "weekday": "星期几",
      "time": "发布时间（如：18:30）",
      "title": "选题标题",
      "platform": "发布平台",
      "type": "内容类型",
      "reason": "选择这个时间和内容的理由（一句话）",
      "priority": "优先级（高/中/低）"
    }
  ],
  "strategy": "整体排期策略说明（2-3句话）",
  "tips": ["运营建议1", "运营建议2", "运营建议3"]
}`

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const raw = completion.choices[0].message.content || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response')
    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      schedule: result.schedule || [],
      strategy: result.strategy || '',
      tips: result.tips || [],
      total: result.schedule?.length || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, schedule: [] }, { status: 500 })
  }
}

function analyzeBestTimes(videoRecords: any[]) {
  if (!videoRecords.length) {
    return [
      { time: '工作日 18:30', avgPlays: '预估高' },
      { time: '工作日 12:00', avgPlays: '预估中' },
      { time: '周末 10:00', avgPlays: '预估高' },
    ]
  }

  const timeMap: Record<string, { total: number; count: number }> = {}
  videoRecords.forEach((v: any) => {
    if (v.publishTime && v.plays) {
      const hour = new Date(v.publishTime).getHours()
      const timeSlot = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上'
      if (!timeMap[timeSlot]) timeMap[timeSlot] = { total: 0, count: 0 }
      timeMap[timeSlot].total += v.plays
      timeMap[timeSlot].count++
    }
  })

  return Object.entries(timeMap)
    .map(([time, data]) => ({ time, avgPlays: Math.round(data.total / data.count).toLocaleString() }))
    .sort((a, b) => parseInt(b.avgPlays.replace(/,/g, '')) - parseInt(a.avgPlays.replace(/,/g, '')))
    .slice(0, 3)
}
