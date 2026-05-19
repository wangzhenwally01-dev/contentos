import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const { videoRecords = [], accountInfo = {}, period = '近30天', aiModel, aiApiKey, aiApiBase } = await req.json()
    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'
    if (!apiKey) return NextResponse.json({ error: 'AI API 未配置' }, { status: 503 })
    const client = new OpenAI({ apiKey, baseURL })
    const videoSummary = videoRecords.slice(0, 20).map((v: any, i: number) =>
      `视频${i+1}：《${v.title||'无标题'}》 平台:${v.platform||'未知'} 播放:${v.plays||0} 点赞:${v.likes||0} 评论:${v.comments||0} 收藏:${v.collects||0} 完播率:${v.completionRate||0}% 发布:${v.publishedAt||'未知'}`
    ).join('\n')
    const totalPlays = videoRecords.reduce((s: number, v: any) => s + (v.plays||0), 0)
    const totalLikes = videoRecords.reduce((s: number, v: any) => s + (v.likes||0), 0)
    const avgCompletion = videoRecords.length > 0 ? Math.round(videoRecords.reduce((s: number, v: any) => s + (v.completionRate||0), 0) / videoRecords.length) : 0
    const prompt = `你是专业的短视频运营数据分析师。请对以下账号的视频数据进行深度复盘分析。
【账号信息】账号名：${accountInfo.name||'未知'} 行业：${accountInfo.industry||'未知'} 定位：${accountInfo.positioning||'未知'} 分析周期：${period}
【数据概览】视频总数：${videoRecords.length}条 总播放量：${totalPlays.toLocaleString()} 总点赞数：${totalLikes.toLocaleString()} 平均完播率：${avgCompletion}%
【视频明细】\n${videoSummary||'暂无视频数据'}
请严格返回JSON格式：{"summary":{"score":75,"grade":"B+","highlight":"本期最大亮点","weakness":"最需改进问题"},"topVideos":[{"rank":1,"title":"视频标题","reason":"爆款原因","metric":"播放量最高"}],"contentAnalysis":{"bestTime":"最佳发布时间","bestPlatform":"最好平台","bestStyle":"最受欢迎风格","avgEngagement":"平均互动率"},"improvements":[{"priority":"高","icon":"🎯","title":"改进方向","detail":"具体建议","action":"立即行动"}],"nextWeekPlan":[{"day":"周一","topic":"建议选题","platform":"平台","time":"18:30","reason":"推荐理由"}],"insights":[{"type":"success","icon":"✅","title":"洞察标题","content":"详细内容"}]}`
    const completion = await client.chat.completions.create({
      model, messages: [{ role: 'system', content: '你是专业的短视频运营数据分析师，只返回JSON格式数据。' }, { role: 'user', content: prompt }],
      temperature: 0.7, max_tokens: 3000
    })
    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    return NextResponse.json({ success: true, ...result, period, videoCount: videoRecords.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
