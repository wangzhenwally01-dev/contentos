import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const {
      planInput,
      accountName,
      industry,
      positioning,
      hotspots = [],
      knowledgeItems = [],
      videoRecords = [],
      aiModel, aiApiKey, aiApiBase, aiTemperature
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'
    const temperature = aiTemperature || 0.85

    const client = new OpenAI({ apiKey, baseURL })

    const hotspotCtx = hotspots.length > 0
      ? `\n当前热点：\n${hotspots.slice(0, 5).map((h: any) => `- ${h.title || h}`).join('\n')}`
      : ''

    const knowledgeCtx = knowledgeItems.length > 0
      ? `\n知识库：\n${knowledgeItems.slice(0, 5).map((k: any) => `- ${k.title}: ${k.content?.slice(0, 60)}`).join('\n')}`
      : ''

    const historyCtx = videoRecords.length > 0
      ? `\n历史爆款（参考）：\n${videoRecords.slice(0, 3).map((v: any) => `- ${v.title}（播放${v.plays || 0}）`).join('\n')}`
      : ''

    const prompt = `你是顶级短视频内容策划专家。用户提供了一个内容方案，请深度分析并生成完整的选题矩阵和爆款文案。

账号信息：
- 账号名：${accountName || '未设置'}
- 行业：${industry || '通用'}
- 定位：${positioning || '未设置'}
${hotspotCtx}
${knowledgeCtx}
${historyCtx}

用户内容方案：
${planInput}

请基于以上信息，生成：
1. 方案解读（核心价值点分析）
2. 选题矩阵（8-12个选题，覆盖不同角度）
3. 每个选题配套爆款文案（完整口播稿，200-400字）
4. 发布策略建议

严格返回JSON格式：
{
  "planSummary": "方案核心价值点（2-3句话）",
  "contentPillars": ["内容支柱1", "内容支柱2", "内容支柱3"],
  "topics": [
    {
      "title": "选题标题（15字以内）",
      "category": "分类",
      "angle": "创作角度",
      "hook": "开头钩子（前3秒）",
      "copy": "完整口播文案（200-400字，包含开头钩子、核心内容、结尾引导）",
      "platform": "最适合平台",
      "bestTime": "最佳发布时间",
      "score": 推荐分数,
      "tags": ["标签1", "标签2"]
    }
  ],
  "publishStrategy": "发布策略建议（3-5条）",
  "insight": "整体洞察（一句话）"
}`

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 5000,
    })

    const raw = completion.choices[0].message.content || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response')
    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      planSummary: result.planSummary || '',
      contentPillars: result.contentPillars || [],
      topics: result.topics || [],
      publishStrategy: result.publishStrategy || '',
      insight: result.insight || '',
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
