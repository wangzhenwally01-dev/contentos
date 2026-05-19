import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const {
      positioning, industry, accountName,
      hotspots = [],
      knowledgeItems = [],
      savedTopics = [],
      videoRecords = [],
      trendingItems = [],
      aiModel, aiApiKey, aiApiBase, aiTemperature
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'
    const temperature = aiTemperature || 0.85

    const client = new OpenAI({ apiKey, baseURL })

    // 构建上下文
    const hotspotContext = hotspots.length > 0
      ? `\n当前热点（优先结合）：\n${hotspots.slice(0, 5).map((h: any) => `- ${h.title || h} (热度:${h.heat || '高'})`).join('\n')}`
      : ''

    const knowledgeContext = knowledgeItems.length > 0
      ? `\n账号知识库（专业内容）：\n${knowledgeItems.slice(0, 5).map((k: any) => `- [${k.category}] ${k.title}: ${k.content?.slice(0, 80)}...`).join('\n')}`
      : ''

    const historyContext = videoRecords.length > 0
      ? `\n历史视频数据（参考高播放量内容）：\n${videoRecords.slice(0, 5).map((v: any) => `- ${v.title} (播放:${v.plays || 0}, 点赞:${v.likes || 0})`).join('\n')}`
      : ''

    const savedContext = savedTopics.length > 0
      ? `\n已收藏选题（避免重复）：\n${savedTopics.slice(0, 10).map((t: any) => `- ${typeof t === 'string' ? t : t.title}`).join('\n')}`
      : ''

    const trendingContext = trendingItems.length > 0
      ? `\n全平台爆款素材（可借鉴角度）：\n${trendingItems.slice(0, 5).map((t: any) => `- ${t.title} [${t.category}] 角度:${t.angle || ''}`).join('\n')}`
      : ''

    const prompt = `你是顶级短视频选题策划专家，擅长为特定账号生成高转化率选题。

账号信息：
- 账号名：${accountName}
- 行业：${industry}
- 定位：${positioning}
${hotspotContext}
${knowledgeContext}
${historyContext}
${trendingContext}
${savedContext}

请基于以上所有信息，生成12个高质量个性化选题推荐。

要求：
1. 每个选题必须与账号定位高度相关
2. 结合当前热点和爆款素材的创作角度
3. 融入知识库中的专业内容（体现专业性）
4. 参考历史高播放量内容的规律
5. 避免与已收藏选题重复
6. 包含多种类型：干货教程/热点借势/情感共鸣/产品种草/故事叙事

严格返回JSON格式：
{
  "topics": [
    {
      "title": "选题标题（吸引人，15字以内）",
      "category": "分类",
      "reason": "推荐理由（结合了哪些数据，一句话）",
      "hook": "建议开头钩子（前3秒抓住注意力）",
      "bestTime": "最佳发布时间（如：工作日18:30）",
      "platform": "最适合平台（抖音/小红书/B站/视频号）",
      "score": 推荐分数(0-100),
      "tags": ["标签1", "标签2"],
      "type": "类型（热点/干货/情感/产品/故事）"
    }
  ],
  "insight": "本次推荐的核心洞察（一句话总结）"
}`

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 3000,
    })

    const raw = completion.choices[0].message.content || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response')
    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      topics: result.topics || [],
      insight: result.insight || '',
      total: result.topics?.length || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, topics: [] }, { status: 500 })
  }
}
