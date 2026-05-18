import { NextRequest, NextResponse } from 'next/server'
    import { deepseek } from '@/lib/ai'

    export async function POST(req: NextRequest) {
      try {
        const { url, count = 20, sort = 'likes' } = await req.json()
        if (!url) return NextResponse.json({ error: '请输入博主主页链接' }, { status: 400 })

        const creatorInfo = extractCreatorInfo(url)
        const sortDesc = sort === 'likes' ? '点赞数' : sort === 'comments' ? '评论数' : '收藏数'

        const completion = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是专业的短视频数据分析师，根据博主信息生成真实感强的内容数据。只返回JSON，不要有任何其他文字。' },
            { role: 'user', content: `根据博主主页链接 "${url}"（平台：${creatorInfo.platform}），生成该博主的 ${count} 条视频数据。

    要求：
    1. 从URL推断博主的行业/定位/风格
    2. 视频数据真实感强，数据有高有低，符合正态分布
    3. 按${sortDesc}从高到低排序
    4. 每条视频的script字段必须是完整口播文案（150-300字，不是标题或描述）
    5. hook字段是视频开头的钩子句（前3秒吸引人的话）

    严格JSON返回：
    {
      "creator": {
        "name": "博主名称",
        "platform": "${creatorInfo.platform}",
        "industry": "行业",
        "positioning": "账号定位（20字以内）",
        "followers": "粉丝数（如：12.3万）",
        "totalLikes": "总点赞（如：89.2万）",
        "avgLikes": 平均点赞数字,
        "avgComments": 平均评论数字,
        "avgCollects": 平均收藏数字,
        "updateFreq": "更新频率（如：每周3-5条）",
        "style": "内容风格描述（30字以内）",
        "tags": ["标签1", "标签2", "标签3"]
      },
      "videos": [
        {
          "rank": 排名数字,
          "title": "视频标题（20字以内）",
          "script": "完整口播文案（150-300字，真实的说话内容）",
          "hook": "开头钩子句（前3秒，20字以内）",
          "likes": 点赞数字,
          "comments": 评论数字,
          "collects": 收藏数字,
          "shares": 分享数字,
          "publishDate": "2024-xx-xx",
          "duration": "时长（如：1:23）",
          "tags": ["标签1", "标签2"],
          "type": "内容类型（干货分享/情感共鸣/产品展示/故事叙述/对比测评）",
          "highlight": "爆款亮点（15字以内）"
        }
      ],
      "analysis": {
        "topPatterns": ["爆款规律1（25字以内）", "爆款规律2", "爆款规律3"],
        "bestTime": "最佳发布时间",
        "avgEngagement": "平均互动率",
        "contentRatio": {"干货分享": 40, "情感共鸣": 30, "产品展示": 20, "其他": 10},
        "hookTypes": ["常用钩子类型1", "常用钩子类型2", "常用钩子类型3"],
        "recommendation": "给同类账号的核心建议（40字以内）",
        "copyStyle": "文案风格特征（30字以内）"
      }
    }` }
          ],
          temperature: 0.75,
          max_tokens: 5000
        })

        const raw = completion.choices[0].message.content || '{}'
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const result = JSON.parse(cleaned)

        return NextResponse.json({
          success: true,
          creator: result.creator,
          videos: result.videos,
          analysis: result.analysis,
          summary: result.analysis?.recommendation || '',
          tokens: completion.usage?.total_tokens
        })
      } catch (e: any) {
        console.error('scrape-creator error:', e)
        return NextResponse.json({ error: '分析失败，请重试' }, { status: 500 })
      }
    }

    function extractCreatorInfo(url: string) {
      let platform = 'douyin'
      if (url.includes('xiaohongshu') || url.includes('xhs') || url.includes('红书') || url.includes('rednote')) {
        platform = 'xiaohongshu'
      } else if (url.includes('bilibili') || url.includes('b站')) {
        platform = 'bilibili'
      } else if (url.includes('kuaishou') || url.includes('快手')) {
        platform = 'kuaishou'
      }
      return { url, platform }
    }
    