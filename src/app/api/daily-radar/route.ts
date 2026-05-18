import { NextRequest, NextResponse } from 'next/server'
    import { deepseek } from '@/lib/ai'

    export async function POST(req: NextRequest) {
      try {
        const { industry = '餐饮' } = await req.json()
        const now = new Date()
        const today = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
        const month = now.getMonth() + 1
        const day = now.getDate()

        const completion = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是资深内容情报分析师，专注短视频平台内容趋势研究。只返回JSON格式，不要有任何其他文字。' },
            { role: 'user', content: `今天是${today}（${month}月${day}日），请为【${industry}】行业的短视频创作者生成详细内容情报报告。

    严格返回以下JSON格式（所有字段必须填写）：
    {
      "updateTime": "${today}",
      "hotspots": [
        {
          "title": "热点标题（15字以内）",
          "heat": 热度数值,
          "tag": "分类（社会/娱乐/行业/节日/科技/生活）",
          "desc": "热点简介（30字以内）",
          "canBorrow": true或false,
          "borrowTip": "借势建议（20字以内）"
        }
      ],
      "formats": [
        {
          "format": "内容形式名称",
          "heat": 热度,
          "desc": "形式描述（25字以内）",
          "example": "适合${industry}的具体示例（30字以内）",
          "difficulty": "简单/中等/较难"
        }
      ],
      "keywords": [
        {
          "word": "关键词",
          "heat": 热度,
          "trend": "上升/稳定/下降",
          "category": "分类"
        }
      ],
      "insights": ["针对${industry}行业的今日内容创作洞察（每条30字以内）"],
      "bestTopics": [
        {
          "title": "推荐选题标题",
          "reason": "推荐理由（20字以内）",
          "hook": "开头钩子句（20字以内）"
        }
      ]
    }

    要求：hotspots返回8个，formats返回5种，keywords返回12个，insights返回3条，bestTopics返回3个。数据要真实感强，符合当前时间节点。` }
          ],
          temperature: 0.85,
          max_tokens: 2500
        })

        const raw = completion.choices[0].message.content || '{}'
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const result = JSON.parse(cleaned)
        return NextResponse.json({ success: true, ...result })
      } catch (e: any) {
        console.error('daily-radar error:', e)
        return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 })
      }
    }
    