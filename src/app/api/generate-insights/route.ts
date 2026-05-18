import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const {
      views, likes, comments, collects,
      industry = '餐饮', accountName = '我的账号',
      modulePrompt = '', aiModel, aiApiKey, aiApiBase
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    const client = new OpenAI({ apiKey, baseURL })

    const systemPrompt = modulePrompt
      ? `你是短视频运营数据分析专家。\n\n【用户专属要求】\n${modulePrompt}\n\n只返回JSON格式数据。`
      : '你是短视频运营数据分析专家，只返回JSON格式数据，不要有任何其他文字。'

    const userPrompt = `账号：${accountName}，行业：${industry}
数据：曝光${views}，点赞${likes}，评论${comments}，收藏${collects}

请分析数据，给出3条具体可执行的优化建议，每条建议要有具体操作方法。

严格返回JSON格式：
{"insights":[{"icon":"📌","title":"建议标题","detail":"具体操作方法（2-3句话）"}]}`

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    return NextResponse.json({ success: true, insights: result.insights })
  } catch (e) {
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
