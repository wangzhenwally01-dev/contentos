import { NextRequest, NextResponse } from 'next/server'
import { deepseek } from '@/lib/ai'

// 文案风格分析 API
export async function POST(req: NextRequest) {
  try {
    const { samples, creatorUrl, templateName } = await req.json()
    if (!samples && !creatorUrl) {
      return NextResponse.json({ error: '请提供文案样本或博主链接' }, { status: 400 })
    }

    const prompt = buildStylePrompt(samples, creatorUrl, templateName)
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是专业的文案风格分析师，擅长提炼短视频口播文案的风格特征。只返回JSON。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 2000
    })

    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return NextResponse.json({
      success: true,
      template: result,
      tokens: completion.usage?.total_tokens
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: '分析失败，请重试' }, { status: 500 })
  }
}

function buildStylePrompt(samples?: string, creatorUrl?: string, templateName?: string) {
  const source = creatorUrl
    ? `博主主页：${creatorUrl}（请根据该博主风格推断）`
    : `文案样本：\n${samples}`

  return `分析以下${creatorUrl ? '博主' : '文案样本'}的写作风格，提炼可复用的风格模板。

${source}

严格JSON返回：
{
  "name": "${templateName || '自定义风格'}",
  "summary": "风格一句话描述（如：犀利直接+数据支撑+强行动号召）",
  "traits": ["风格特征1", "风格特征2", "风格特征3", "风格特征4"],
  "structure": {
    "hook": "开头钩子模式（如：用反问句制造悬念）",
    "body": "正文结构（如：问题→原因→解决方案）",
    "cta": "结尾行动号召模式（如：直接引导私信/评论）"
  },
  "vocabulary": {
    "highFreq": ["常用词1", "常用词2", "常用词3"],
    "avoid": ["避免用词1", "避免用词2"],
    "tone": "语气描述（如：亲切口语化/专业权威/犀利直接）"
  },
  "examples": {
    "hookTemplates": ["钩子模板1（用___填空）", "钩子模板2", "钩子模板3"],
    "ctaTemplates": ["结尾模板1", "结尾模板2"]
  },
  "bestFor": ["适合的选题类型1", "适合的选题类型2"],
  "difficulty": "简单/中等/较难",
  "score": 85
}`
}
