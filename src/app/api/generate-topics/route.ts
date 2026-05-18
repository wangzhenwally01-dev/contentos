import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const {
      positioning = '本地生活', industry = '餐饮',
      accountName = '我的账号', hotspot, count = 8,
      modulePrompt = '', aiModel, aiApiKey, aiApiBase, aiTemperature
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'
    const temperature = aiTemperature || 0.9

    const client = new OpenAI({ apiKey, baseURL })

    const systemPrompt = modulePrompt
      ? `你是短视频选题策划专家。\n\n【用户专属要求】\n${modulePrompt}\n\n只返回JSON格式数据，不要有任何其他文字。`
      : '你是短视频选题策划专家，只返回JSON格式数据，不要有任何其他文字。'

    const userPrompt = `账号信息：
- 账号名：${accountName}
- 定位：${positioning}
- 行业：${industry}
${hotspot ? `当前热点：${hotspot}` : ''}

请生成${count}个高完播率选题，要求：
1. 结合账号定位和当前热点
2. 标题有吸引力，让人想点击
3. 包含不同类型（干货/故事/热点/互动）

严格返回JSON格式（不要有任何其他文字）：
{"topics":[{"title":"选题标题","category":"分类","reason":"推荐理由（一句话）","hook":"建议开头钩子","tags":["标签1","标签2"]}]}`

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: 2000
    })

    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    return NextResponse.json({ success: true, topics: result.topics })
  } catch (e) {
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
