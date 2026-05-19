import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const {
      hotspots = [],
      industry = '餐饮',
      accountPositioning = '',
      aiModel, aiApiKey, aiApiBase,
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    const client = new OpenAI({ apiKey, baseURL })

    const hotspotList = hotspots.slice(0, 8).map((h: any, i: number) =>
      `${i+1}. ${h.title}（热度${h.heat || 70}，来源：${h.source || '综合'}）`
    ).join('\n')

    const prompt = `你是短视频内容趋势分析专家。

当前热点列表：
${hotspotList || '暂无热点数据'}

账号定位：${accountPositioning || industry + '行业内容创作者'}
行业：${industry}

请对以上热点进行深度趋势分析，严格返回JSON格式：
{
  "opportunityMatrix": [
    {
      "topic": "热点话题",
      "heatScore": 85,
      "competitionScore": 60,
      "relevanceScore": 90,
      "opportunityScore": 88,
      "contentWindow": "未来24小时",
      "difficulty": "简单",
      "estimatedViews": "5万-20万",
      "angle": "最佳切入角度",
      "hook": "推荐开场钩子",
      "risk": "潜在风险"
    }
  ],
  "trendCurve": [
    {
      "topic": "话题",
      "timeline": [
        {"time": "6小时前", "heat": 40},
        {"time": "3小时前", "heat": 65},
        {"time": "现在", "heat": 85},
        {"time": "3小时后", "heat": 90},
        {"time": "明天", "heat": 70}
      ],
      "peakPrediction": "今晚20:00",
      "lifecycle": "上升期"
    }
  ],
  "contentStrategy": {
    "urgentTopics": ["立即创作的话题1", "立即创作的话题2"],
    "planTopics": ["计划创作的话题1", "计划创作的话题2"],
    "avoidTopics": ["避免的话题"],
    "bestPostTime": "今天18:30-20:00",
    "weeklyFocus": "本周重点方向"
  },
  "competitorInsight": {
    "hotFormats": ["当前竞争者常用形式1", "形式2"],
    "gaps": ["内容空白点1", "空白点2"],
    "differentiation": "差异化建议"
  },
  "actionPlan": [
    {
      "priority": 1,
      "action": "立即行动",
      "topic": "具体选题",
      "format": "内容形式",
      "deadline": "今天18:00前",
      "expectedResult": "预期效果"
    }
  ]
}

要求：
- opportunityMatrix 分析5个热点
- trendCurve 预测3个热点的趋势曲线
- actionPlan 给出3个优先行动
- 所有分析必须结合【${industry}】行业特点`

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '你是短视频内容趋势分析专家，只返回JSON格式数据，不要有任何其他文字。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
    })

    const raw = completion.choices[0].message.content || '{}'
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(jsonStr)

    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    console.error('trend-analysis error:', e)
    return NextResponse.json({ error: e.message || '分析失败' }, { status: 500 })
  }
}
