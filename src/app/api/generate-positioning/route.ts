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

    // ── v18.0: 行业报告模式 ──
    if (mode === 'industry_report') {
      const { industry, product, targetCustomer, city, advantage, accountGoal } = body
      const prompt = `你是短视频内容行业分析专家。

用户信息：
- 行业：${industry}
- 产品/服务：${product}
- 目标客户：${targetCustomer}
- 城市：${city || '全国'}
- 核心优势：${advantage || '未填写'}
- 账号目标：${accountGoal || '涨粉变现'}

请生成一份全面的行业内容报告，帮助用户了解市场机会和内容方向。

严格返回JSON格式（不要有任何其他文字）：
{"industryReport":{"title":"${industry}行业短视频内容全面报告","summary":"行业概述（2-3句话，描述该行业在短视频平台的整体现状和机会）","opportunities":["市场机会1（具体描述，50字以内）","市场机会2","市场机会3","市场机会4"],"contentTrends":["内容趋势1（当前流行的内容形式或话题，50字以内）","内容趋势2","内容趋势3","内容趋势4"],"competition":"竞争格局（2-3句话，描述该行业账号的竞争现状，头部账号特点，以及差异化空间）","monetization":"商业化路径（2-3句话，描述该行业账号主要的变现方式和商业化建议）"}}`

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: '你是专业短视频行业分析专家，只返回JSON格式数据，不要有任何其他文字。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })

      const raw = completion.choices[0].message.content || '{}'
      const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      return NextResponse.json({ success: true, ...result })
    }

    // ── v18.0: 账号方案模式 ──
    if (mode === 'account_plans') {
      const { industry, product, targetCustomer, city, advantage, industryReport } = body
      const reportContext = industryReport ? `\n\n行业报告摘要：${industryReport.summary}\n主要机会：${industryReport.opportunities?.slice(0,2).join('；')}` : ''
      const prompt = `你是短视频账号策划专家。

用户信息：
- 行业：${industry}
- 产品/服务：${product}
- 目标客户：${targetCustomer}
- 城市：${city || '全国'}
- 核心优势：${advantage || '未填写'}${reportContext}

请为用户生成4个差异化的账号内容方案，每个方案有明显不同的定位和风格。

严格返回JSON格式（不要有任何其他文字）：
{"plans":[{"id":"plan1","name":"方案名称（4-6字，有记忆点）","emoji":"一个相关emoji","color":"#f0f4ff","style":"风格标签（如：专业干货型/故事情感型/娱乐搞笑型/实用教程型）","positioning":"账号定位一句话（15字以内，精准有力）","tags":["标签1","标签2","标签3"],"persona":"人设描述（2-3句话，描述账号主人的形象和特点）","homepage":"主页设置建议（2-3句话，包括头像/简介/背景图建议）","monetization":"商业化路径（2-3句话，具体的变现方式）","contentModules":["内容模块1（具体内容方向）","内容模块2","内容模块3","内容模块4"],"operationStrategy":"运营策略（2-3句话，发布频率/互动策略/涨粉方法）"},{"id":"plan2",...},{"id":"plan3",...},{"id":"plan4",...}]}`

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: '你是专业短视频账号策划专家，只返回JSON格式数据，不要有任何其他文字。生成4个差异化方案，每个方案风格明显不同。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 3000
      })

      const raw = completion.choices[0].message.content || '{}'
      const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      return NextResponse.json({ success: true, ...result })
    }

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
