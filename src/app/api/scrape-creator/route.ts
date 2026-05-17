import { NextRequest, NextResponse } from 'next/server'
import { deepseek } from '@/lib/ai'

// 博主内容爬取 API
// 由于直接爬取抖音/小红书需要复杂的反爬处理，
// 这里采用 AI 模拟 + 真实数据结构的方案
// 后续可接入真实爬虫服务

export async function POST(req: NextRequest) {
  try {
    const { url, platform, count = 20, sortBy = 'likes' } = await req.json()
    if (!url) return NextResponse.json({ error: '请输入博主主页链接' }, { status: 400 })

    // 从 URL 提取博主信息
    const creatorInfo = extractCreatorInfo(url, platform)

    // 调用 AI 生成模拟数据（真实感强的内容数据）
    const prompt = buildCreatorPrompt(creatorInfo, count, sortBy)
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是专业的短视频数据分析师，根据博主信息生成真实感强的内容数据。只返回JSON。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })

    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return NextResponse.json({
      success: true,
      creator: result.creator,
      videos: result.videos,
      summary: result.summary,
      tokens: completion.usage?.total_tokens
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: '分析失败，请重试' }, { status: 500 })
  }
}

function extractCreatorInfo(url: string, platform?: string) {
  // 识别平台
  let detectedPlatform = platform || 'douyin'
  if (url.includes('xiaohongshu') || url.includes('xhs') || url.includes('红书')) detectedPlatform = 'xiaohongshu'
  else if (url.includes('douyin') || url.includes('抖音')) detectedPlatform = 'douyin'

  // 提取用户名/ID
  const match = url.match(/user\/([^/?]+)/) || url.match(/@([^/?]+)/) || url.match(/\/([^/?]+)\/?$/)
  const userId = match ? match[1] : url

  return { url, platform: detectedPlatform, userId }
}

function buildCreatorPrompt(info: any, count: number, sortBy: string) {
  const sortDesc = sortBy === 'likes' ? '点赞数' : sortBy === 'comments' ? '评论数' : '收藏数'
  return `根据博主主页链接 "${info.url}"（平台：${info.platform}），生成该博主的 ${count} 条视频数据。

要求：
1. 博主信息要符合该账号类型（从URL推断行业/定位）
2. 视频数据要真实感强，数据有高有低，符合正态分布
3. 按${sortDesc}从高到低排序
4. 文案要完整（150-300字的口播文案，不是标题）

严格JSON返回：
{
  "creator": {
    "name": "博主名称",
    "platform": "${info.platform}",
    "industry": "行业",
    "positioning": "账号定位",
    "followers": "粉丝数（如：12.3万）",
    "totalLikes": "总点赞（如：89.2万）",
    "avgLikes": "平均点赞",
    "style": "内容风格描述"
  },
  "videos": [
    {
      "rank": 1,
      "title": "视频标题",
      "script": "完整口播文案（150-300字）",
      "likes": 数字,
      "comments": 数字,
      "collects": 数字,
      "shares": 数字,
      "publishDate": "2024-xx-xx",
      "duration": "时长（如：1:23）",
      "tags": ["标签1", "标签2"],
      "hook": "开头钩子句",
      "type": "内容类型（如：干货分享/情感共鸣/产品展示）"
    }
  ],
  "summary": {
    "topPatterns": ["爆款规律1", "爆款规律2", "爆款规律3"],
    "bestTime": "最佳发布时间",
    "avgEngagement": "平均互动率",
    "recommendation": "给同类账号的建议"
  }
}`
}
