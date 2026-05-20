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
      topVideos = [],
      avgPlays = 0,
      bestPlatformFromHistory = '',
      savedContentsCount = 0,
      contentPlan = '',
      preferredTypes = [],
      aiModel, aiApiKey, aiApiBase, aiTemperature
    } = await req.json()

    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'
    const temperature = aiTemperature || 0.85

    const client = new OpenAI({ apiKey, baseURL })

    // 分析历史数据，找出高表现规律
    const highPerformers = videoRecords.filter((v: any) => (v.plays || 0) > avgPlays * 1.5)
    const totalEngagement = videoRecords.reduce((s: number, v: any) =>
      s + (v.likes || 0) + (v.comments || 0) + (v.collects || 0), 0)
    const avgEngagementRate = videoRecords.length > 0 && avgPlays > 0
      ? ((totalEngagement / videoRecords.length / avgPlays) * 100).toFixed(1) + '%'
      : '暂无数据'

    // 分析最佳发布时间
    const timeMap: Record<string, number> = {}
    videoRecords.forEach((v: any) => {
      if (v.publishedAt) {
        const hour = new Date(v.publishedAt).getHours()
        const slot = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上'
        timeMap[slot] = (timeMap[slot] || 0) + (v.plays || 0)
      }
    })
    const bestTimeSlot = Object.entries(timeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '晚上18-21点'

    // 分析高表现内容特征
    const highPerfTitles = highPerformers.slice(0, 3).map((v: any) => v.title || '').filter(Boolean)

    const hotspotContext = hotspots.length > 0
      ? `\n📊 当前热点（优先结合）：\n${hotspots.slice(0, 8).map((h: any) => `- ${h.title || h} (热度:${h.heat || '高'}, 标签:${h.tag || ''})`).join('\n')}`
      : ''

    const knowledgeContext = knowledgeItems.length > 0
      ? `\n🧠 账号知识库（专业内容）：\n${knowledgeItems.slice(0, 8).map((k: any) => `- [${k.category}] ${k.title}: ${k.content?.slice(0, 100)}`).join('\n')}`
      : ''

    const historyContext = topVideos.length > 0
      ? `\n📈 历史高播放量视频（学习规律）：\n${topVideos.map((v: any) => `- "${v.title}" 播放:${v.plays || 0} 点赞:${v.likes || 0} 完播率:${v.completionRate || 0}%`).join('\n')}\n平均播放量：${avgPlays}，高表现视频数：${highPerformers.length}，平均互动率：${avgEngagementRate}`
      : ''

    const savedContext = savedTopics.length > 0
      ? `\n📌 已收藏选题（避免重复）：\n${savedTopics.slice(0, 15).map((t: any) => `- ${typeof t === 'string' ? t : t.title}`).join('\n')}`
      : ''

    const trendingContext = trendingItems.length > 0
      ? `\n💎 全平台爆款素材（可借鉴角度）：\n${trendingItems.slice(0, 8).map((t: any) => `- ${t.title} [${t.category}] 角度:${t.angle || ''} 平台:${t.platform || ''}`).join('\n')}`
      : ''

    const planContext = contentPlan
      ? `\n📋 内容方案参考：\n${contentPlan}`
      : ''

    const preferredContext = preferredTypes.length > 0
      ? `\n偏好内容类型：${preferredTypes.join('、')}`
      : ''

    const prompt = `你是顶级短视频选题策划专家，擅长为特定账号生成高转化率个性化选题。

🎯 账号信息：
- 账号名：${accountName}
- 行业：${industry}
- 定位：${positioning}
- 已发布视频：${videoRecords.length}条，平均播放：${avgPlays}，互动率：${avgEngagementRate}
- 最佳发布时段：${bestTimeSlot}
- 主要平台：${bestPlatformFromHistory || '抖音'}
- 高表现内容：${highPerfTitles.join('、') || '暂无'}
${hotspotContext}
${knowledgeContext}
${historyContext}
${trendingContext}
${savedContext}
${planContext}
${preferredContext}

请基于以上所有信息，生成15个高质量个性化选题推荐，并提供账号数据分析。

核心要求：
1. 每个选题必须与账号定位高度相关，体现专业性
2. 结合当前热点，借势流量
3. 融入知识库专业内容，建立权威感
4. 参考历史高播放量内容的规律（如果有数据）
5. 借鉴爆款素材的创作角度，但要差异化
6. 避免与已收藏选题重复
7. 覆盖多种类型：干货教程/热点借势/情感共鸣/产品种草/故事叙事/对比反差/数据揭秘

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
      "type": "类型（热点/干货/情感/产品/故事/对比/数据）",
      "dataSource": "数据来源（热点/知识库/历史数据/爆款素材）",
      "estimatedPlays": "预估播放量区间（如：5000-20000）",
      "hotspotMatch": "与热点的关联度（高/中/低）"
    }
  ],
  "insight": "本次推荐的核心洞察（一句话总结）",
  "strategy": "内容策略建议（2-3条）",
  "bestType": "当前最适合的内容类型",
  "bestPlatform": "当前最适合的发布平台",
  "analysis": {
    "bestContentType": "最佳内容类型（如：干货教程）",
    "bestPostTime": "最佳发布时间（如：工作日18:30-20:00）",
    "avgEngagement": "${avgEngagementRate}",
    "hotspotMatch": "当前热点与账号的匹配度（如：高度匹配）",
    "keyPattern": "高表现内容的核心规律（一句话）",
    "growthSuggestion": "增长建议（一句话）"
  }
}`

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 4000,
    })

    const raw = completion.choices[0].message.content || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response')
    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      topics: result.topics || [],
      insight: result.insight || '',
      strategy: result.strategy || '',
      bestType: result.bestType || '',
      bestPlatform: result.bestPlatform || '',
      analysis: result.analysis || null,
      total: result.topics?.length || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, topics: [] }, { status: 500 })
  }
}
