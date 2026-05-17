import { NextRequest, NextResponse } from 'next/server'
import { deepseek, buildInsightPrompt } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { views = '12.3万', likes = '2341', comments = '186', collects = '892', industry = '餐饮', accountName = '我的账号' } = await req.json()
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是短视频运营数据分析专家。只返回JSON格式数据，不要有任何其他文字。' },
        { role: 'user', content: buildInsightPrompt({ views, likes, comments, collects, industry, accountName }) }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
    const raw = completion.choices[0].message.content || '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)
    return NextResponse.json({ success: true, insights: result.insights })
  } catch (e: any) {
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
