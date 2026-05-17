import OpenAI from 'openai'

export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'
})

export function buildCopyPrompt(p: any) {
  const styleMap: any = {
    '犀利观点': '直接抛出犀利观点，语气强硬，引发强烈共鸣，有争议性',
    '温情故事': '用真实故事打动人心，情感细腻，有代入感，结尾升华',
    '干货教程': '干货满满，步骤清晰，实用性强，让人觉得学到了东西',
    '幽默搞笑': '轻松幽默，有梗有笑点，让人忍不住分享',
    '励志正能量': '激励人心，充满力量，让人看完想行动',
    '悬念钩子': '开头制造悬念，让人迫不及待看完，结尾有反转',
  }
  const styleDesc = styleMap[p.style] || styleMap['犀利观点']
  return `你是专业短视频口播文案专家，擅长为本地商家和个人IP创作高完播率文案。

账号信息：
- 账号名：${p.accountName}
- 行业：${p.industry}
- 定位：${p.positioning}
- 目标受众：${p.targetAudience}

选题：${p.topicTitle}
风格要求：${styleDesc}
${p.userInput ? `补充要求：${p.userInput}` : ''}

请生成3个不同版本的口播文案，每版150-250字，要求：
1. 开头3秒必须有强钩子（问句/数字/反常识/痛点）
2. 口语化，像真人说话，不要书面语
3. 结尾有明确行动号召（关注/点赞/评论/到店）
4. 每版风格有明显差异

严格返回JSON格式（不要有任何其他文字）：
{"versions":[{"style":"${p.style}A","hook":"开头钩子句","content":"完整文案内容"},{"style":"${p.style}B","hook":"开头钩子句","content":"完整文案内容"},{"style":"${p.style}C","hook":"开头钩子句","content":"完整文案内容"}]}`
}

export function buildTopicPrompt(p: any) {
  return `你是短视频选题策划专家，专注于帮助本地商家和个人IP打造爆款内容。

账号信息：
- 账号名：${p.accountName}
- 定位：${p.positioning}
- 行业：${p.industry}
${p.hotspot ? `当前热点：${p.hotspot}` : ''}

请生成${p.count || 8}个高完播率选题，要求：
1. 结合账号定位和当前热点
2. 标题有吸引力，让人想点击
3. 包含不同类型（干货/故事/热点/互动）

严格返回JSON格式（不要有任何其他文字）：
{"topics":[{"title":"选题标题","category":"分类","reason":"推荐理由（一句话）","hook":"建议开头钩子","tags":["标签1","标签2"]}]}`
}

export function buildInsightPrompt(s: any) {
  return `你是短视频运营数据分析专家。

账号：${s.accountName || '未知'}，行业：${s.industry || '未知'}
数据：曝光${s.views}，点赞${s.likes}，评论${s.comments}，收藏${s.collects}

请分析数据，给出3条具体可执行的优化建议，每条建议要有具体操作方法。

严格返回JSON格式（不要有任何其他文字）：
{"insights":[{"icon":"📌","title":"建议标题","detail":"具体操作方法（2-3句话）"}]}`
}

export function buildPositioningPrompt(p: any) {
  return `你是专业短视频账号定位顾问，帮助商家找准账号方向，打造差异化竞争优势。

客户信息：
- 行业：${p.industry}
- 产品/服务：${p.product}
- 目标客户：${p.targetCustomer}
- 城市：${p.city || '不限'}
- 优势：${p.advantage || '未填写'}

请生成完整的账号定位方案，包括：
1. 账号定位一句话（简洁有力，10字以内）
2. 3个内容方向
3. 目标人群画像描述
4. 差异化优势
5. 3个账号名称建议
6. 4周内容计划（每周3个选题）

严格返回JSON格式（不要有任何其他文字）：
{"positioning":"账号定位一句话","directions":["方向1","方向2","方向3"],"audience":"目标人群描述","advantage":"差异化优势描述","names":["账号名1","账号名2","账号名3"],"plan":[{"week":1,"theme":"主题","topics":["选题1","选题2","选题3"]},{"week":2,"theme":"主题","topics":["选题1","选题2","选题3"]},{"week":3,"theme":"主题","topics":["选题1","选题2","选题3"]},{"week":4,"theme":"主题","topics":["选题1","选题2","选题3"]}]}`
}

export function buildStyleAnalysisPrompt(p: any) {
  return `你是文案风格分析专家。

${p.name ? `博主名称：${p.name}` : ''}
${p.url ? `博主链接：${p.url}` : ''}
${p.sampleText ? `文案样本：\n${p.sampleText}` : ''}
行业：${p.industry || '未知'}

请分析文案风格特征，生成可复用的风格模板。

严格返回JSON格式（不要有任何其他文字）：
{"template":{"id":"${Date.now()}","name":"${p.name || '自定义'}风格","description":"风格描述（2-3句话）","features":["特征1","特征2","特征3"],"tone":"语气特点","structure":"文案结构","hooks":["常用钩子1","常用钩子2"]}}`
}
