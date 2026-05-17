import { NextRequest, NextResponse } from 'next/server'
import { deepseek } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { industry = '餐饮' } = await req.json()
    const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是内容情报分析专家。只返回JSON格式数据，不要有任何其他文字。' },
        { role: 'user', content: `今天是${today}，请为${industry}行业的短视频创作者生成内容情报报告，包括：
1. 今日热点话题（6个，与${industry}行业相关或可借势的）
2. 当前爆款内容形式（4种）
3. 热门关键词（8个）

严格返回JSON格式：
{"hotspots":[{"title":"热点标题","heat":95,"tag":"热点类型"}],"formats":[{"format":"内容形式","desc":"简短描述"}],"keywords":[{"word":"关键词","heat":90}]}` }
      ],
      temperature: 0.8,
      max_tokens: 1500
    })
    
    const raw = completion.choices[0].message.content || '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    console.error('daily-radar error:', e)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
