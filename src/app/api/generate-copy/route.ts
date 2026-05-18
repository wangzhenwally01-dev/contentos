import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const {
      topicTitle, accountName = '我的账号', industry = '餐饮',
      positioning = '本地生活', targetAudience = '周边用户',
      style = '犀利观点', userInput,
      modulePrompt = '', aiModel, aiApiKey, aiApiBase, aiTemperature
    } = await req.json()

    if (!topicTitle) return NextResponse.json({ error: '请输入选题' }, { status: 400 })

    // 优先使用用户自定义 API 配置，否则用环境变量
    const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || ''
    const baseURL = aiApiBase || process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
    const model = aiModel || 'deepseek-chat'
    const temperature = aiTemperature || 0.85

    const client = new OpenAI({ apiKey, baseURL })

    const styleMap: Record<string, string> = {
      '犀利观点': '直接抛出犀利观点，语气强硬，引发强烈共鸣，有争议性',
      '温情故事': '用真实故事打动人心，情感细腻，有代入感，结尾升华',
      '干货教程': '干货满满，步骤清晰，实用性强，让人觉得学到了东西',
      '幽默搞笑': '轻松幽默，有梗有笑点，让人忍不住分享',
      '励志正能量': '激励人心，充满力量，让人看完想行动',
      '悬念钩子': '开头制造悬念，让人迫不及待看完，结尾有反转',
    }
    const styleDesc = styleMap[style] || styleMap['犀利观点']

    // 构建系统提示词（融合模块专属提示词）
    const systemPrompt = modulePrompt
      ? `你是专业短视频口播文案专家。\n\n【用户专属要求】\n${modulePrompt}\n\n只返回JSON格式数据，不要有任何其他文字。`
      : '你是专业短视频口播文案专家，只返回JSON格式数据，不要有任何其他文字。'

    const userPrompt = `账号信息：
- 账号名：${accountName}
- 行业：${industry}
- 定位：${positioning}
- 目标受众：${targetAudience}

选题：${topicTitle}
风格要求：${styleDesc}
${userInput ? `补充要求：${userInput}` : ''}

请生成3个不同版本的口播文案，每版150-250字，要求：
1. 开头3秒必须有强钩子（问句/数字/反常识/痛点）
2. 口语化，像真人说话，不要书面语
3. 结尾有明确行动号召（关注/点赞/评论/到店）
4. 每版风格有明显差异

严格返回JSON格式（不要有任何其他文字）：
{"versions":[{"style":"${style}A","hook":"开头钩子句","content":"完整文案内容"},{"style":"${style}B","hook":"开头钩子句","content":"完整文案内容"},{"style":"${style}C","hook":"开头钩子句","content":"完整文案内容"}]}`

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: 2500
    })

    const raw = completion.choices[0].message.content || '{}'
    const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    return NextResponse.json({ success: true, versions: result.versions, tokens: completion.usage?.total_tokens })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 })
  }
}
