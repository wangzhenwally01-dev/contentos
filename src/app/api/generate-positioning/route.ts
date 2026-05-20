import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildPositioningPrompt } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode = 'default', modulePrompt = '', aiModel, aiApiKey, aiApiBase } = body

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'

    const client = new OpenAI({ apiKey, baseURL })

    // ── 竞品分析模式 ──
    if (mode === 'competitor') {
      const { industry, product, competitors, myPositioning } = body
      const prompt = `你是短视频账号竞争分析专家。

我的账号信息：
- 行业：${industry}
- 产品/服务：${product}
- 当前定位：${myPositioning || '未定位'}

竞品账号：${competitors}

请分析竞争格局，找出差异化机会。

严格返回JSON格式（不要有任何其他文字）：
{"competitorAnalysis":{"landscape":"竞争格局描述（2-3句话，分析竞品的共同特点和市场现状）","blueOcean":"蓝海机会（2-3句话，指出竞品未覆盖的空白市场）","strategy":"差异化策略（2-3句话，具体建议如何与竞品形成差异）","avoidPoints":"避坑建议（1-2句话，指出竞品常见失误）"}}`

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: '你是专业短视频账号竞争分析专家，只返回JSON格式数据，不要有任何其他文字。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })

      const raw = completion.choices[0].message.content || '{}'
      const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      return NextResponse.json({ success: true, ...result })
    }

    // ── 定位优化模式 ──
    if (mode === 'optimize') {
      const { industry, product, currentPositioning, targetAudience, videoCount, avgPlays } = body
      const prompt = `你是短视频账号定位优化专家。

账号现状：
- 行业：${industry}
- 产品/服务：${product}
- 当前定位：${currentPositioning}
- 目标受众：${targetAudience || '未设定'}
- 已发布视频：${videoCount || 0}条
- 平均播放量：${avgPlays || 0}

请分析当前定位的问题，给出优化建议。

严格返回JSON格式（不要有任何其他文字）：
{"optimizeResult":{"newPositioning":"优化后的定位一句话（10字以内，比原来更精准有力）","currentAnalysis":"现状分析（2-3句话，指出当前定位的问题和不足）","suggestions":["优化建议1（具体可执行）","优化建议2","优化建议3","优化建议4"],"contentAdjustments":"内容调整方向（2-3句话，说明应该如何调整内容策略）"}}`

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: '你是专业短视频账号定位优化专家，只返回JSON格式数据，不要有任何其他文字。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })

      const raw = completion.choices[0].message.content || '{}'
      const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      return NextResponse.json({ success: true, ...result })
    }

    // ── 默认：生成定位报告 ──
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
