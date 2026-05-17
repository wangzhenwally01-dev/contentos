import { NextRequest, NextResponse } from 'next/server'
import { deepseek, buildStyleAnalysisPrompt } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是文案风格分析专家。只返回JSON格式数据，不要有任何其他文字。' },
        { role: 'user', content: buildStyleAnalysisPrompt(body) }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })
    const raw = completion.choices[0].message.content || '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    console.error('analyze-style error:', e)
    return NextResponse.json({ error: '分析失败，请重试' }, { status: 500 })
  }
}
