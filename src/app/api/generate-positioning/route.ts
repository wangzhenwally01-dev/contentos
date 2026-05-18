import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildPositioningPrompt } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { modulePrompt = '', aiModel, aiApiKey, aiApiBase } = body

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    const client = new OpenAI({ apiKey, baseURL })

    const systemPrompt = modulePrompt
      ? `你是专业短视频账号定位顾问。\n\n【用户专属要求】\n${modulePrompt}\n\n只返回JSON格式数据，不要有任何其他文字。`
      : '你是专业短视频账号定位顾问，只返回JSON格式数据，不要有任何其他文字。'

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildPositioningPrompt(body) }
      ],
      temperature: 0.8,
      max_tokens: 3000
    })

    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
