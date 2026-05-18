import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1',
})

export async function POST(req: NextRequest) {
  try {
    const { platform = '抖音', industry = '餐饮', positioning = '', currentFans = 2000 } = await req.json()

    const prompt = `你是一个短视频数据分析专家。请为以下账号生成一组真实感的近7天运营数据（JSON格式）：

账号信息：
- 平台：${platform}
- 行业：${industry}
- 定位：${positioning || '本地生活类账号'}
- 当前粉丝数：${currentFans}

请生成以下数据（数组长度均为7，代表周一到周日）：
- fans: 粉丝数趋势（从当前粉丝数往前推7天，每天小幅增长）
- plays: 每天播放量（根据粉丝数和行业特点，有高有低，体现真实波动）
- likes: 每天点赞数（约为播放量的5-15%）
- comments: 每天评论数（约为点赞数的20-30%）
- collects: 每天收藏数（约为点赞数的40-60%）
- totalFans: 当前总粉丝数（整数）
- totalPlays: 近30天总播放量（整数）
- avgEngagement: 平均互动率（百分比，小数，如8.4）
- weeklyPosts: 本周发布数量（1-5之间）

只返回JSON，不要任何解释。格式：{"fans":[...],"plays":[...],"likes":[...],"comments":[...],"collects":[...],"totalFans":...,"totalPlays":...,"avgEngagement":...,"weeklyPosts":...}`

    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    })

    const raw = completion.choices[0]?.message?.content || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: '数据解析失败' }, { status: 500 })
    }

    const stats = JSON.parse(jsonMatch[0])
    return NextResponse.json({ stats, platform })
  } catch (e: any) {
    console.error('platform-stats error:', e)
    // 返回默认数据
    const base = 2000
    return NextResponse.json({
      stats: {
        fans: [base-400, base-320, base-240, base-160, base-80, base-20, base],
        plays: [3200, 5800, 4100, 8900, 6200, 11000, 7800],
        likes: [180, 320, 240, 560, 380, 720, 450],
        comments: [45, 88, 62, 145, 98, 210, 120],
        collects: [92, 165, 118, 280, 195, 380, 240],
        totalFans: base,
        totalPlays: 47000,
        avgEngagement: 8.4,
        weeklyPosts: 3,
      }
    })
  }
}
