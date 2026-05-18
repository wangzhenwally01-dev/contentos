import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const {
      industry = '餐饮',
      modulePrompt = '', aiModel, aiApiKey, aiApiBase
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    const client = new OpenAI({ apiKey, baseURL })

    const systemPrompt = modulePrompt
      ? `你是内容情报分析专家。\n\n【用户专属要求】\n${modulePrompt}\n\n只返回JSON格式数据。`
      : '你是内容情报分析专家，只返回JSON格式数据，不要有任何其他文字。'

    const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    const userPrompt = `今天是${today}，请为【${industry}】行业生成今日内容情报报告。

包含：
1. 8个今日热点话题（结合时事和行业）
2. 5种当前爆款内容形式
3. 12个行业关键词热度
4. 3条AI洞察建议

严格返回JSON格式：
{
  "date": "${today}",
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
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
