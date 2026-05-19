import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const {
      hotspot,
      industry = '餐饮',
      positioning = '',
      style = '干货',
      aiModel, aiApiKey, aiApiBase,
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    const client = new OpenAI({ apiKey, baseURL })

    const prompt = `你是短视频文案专家，擅长借势热点创作高播放量内容。

热点话题：${hotspot}
账号定位：${positioning || industry + '行业内容创作者'}
内容风格：${style}

请生成3套借势文案方案，严格返回JSON格式：
{
  "scripts": [
    {
      "angle": "借势角度（如：行业关联/反差对比/情感共鸣）",
      "title": "视频标题（15字内，含热点关键词）",
      "hook": "开场钩子（前3秒，吸引停留）",
      "script": "完整口播文案（200-300字）",
      "tags": ["话题标签1", "话题标签2", "话题标签3"],
      "platform": "最适合平台",
      "estimatedViews": "预计播放量",
      "difficulty": "制作难度"
    }
  ],
  "tips": [
    "借势注意事项1",
    "借势注意事项2"
  ],
  "bestTime": "最佳发布时间",
  "riskLevel": "low"
}

要求：
- 3套方案角度各不相同
- 文案必须自然融入热点，不生硬
- 结合【${industry}】行业特点
- 口播文案要有节奏感，适合真人出镜`

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '你是短视频文案专家，只返回JSON格式数据，不要有任何其他文字。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 2500
    })

    const raw = completion.choices[0].message.content || '{}'
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(jsonStr)

    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    console.error('borrow-hotspot error:', e)
    return NextResponse.json({ error: e.message || '生成失败' }, { status: 500 })
  }
}
