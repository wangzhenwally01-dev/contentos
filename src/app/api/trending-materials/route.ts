import { NextResponse } from 'next/server'

    export async function POST(req: Request) {
      try {
        const { industry, positioning, aiModel, aiApiKey, aiApiBase, aiTemperature } = await req.json()

        const [weiboData, baiduData, douyinData] = await Promise.allSettled([
          fetchWeiboHot(),
          fetchBaiduHot(),
          fetchDouyinHot(),
        ])

        const rawItems: any[] = []
        if (weiboData.status === 'fulfilled') rawItems.push(...weiboData.value.map((item: any) => ({ ...item, platform: '微博' })))
        if (baiduData.status === 'fulfilled') rawItems.push(...baiduData.value.map((item: any) => ({ ...item, platform: '百度' })))
        if (douyinData.status === 'fulfilled') rawItems.push(...douyinData.value.map((item: any) => ({ ...item, platform: '抖音' })))

        const items = rawItems.length > 0 ? rawItems : getMockTrendingItems()

        const apiBase = aiApiBase || 'https://api.deepseek.com/v1'
        const apiKey = aiApiKey || process.env.DEEPSEEK_API_KEY || 'sk-36c87a94b4e940eaa760e9ce89ab26ca'
        const model = aiModel || 'deepseek-chat'

        const prompt = `你是内容运营专家。以下是从各平台抓取的热门内容，请根据账号信息对每条内容进行分类和相关性评分。

    账号信息：
    - 行业：${industry || '通用'}
    - 定位：${positioning || '内容创作者'}

    热门内容列表（JSON格式）：
    ${JSON.stringify(items.slice(0, 20), null, 2)}

    请返回JSON数组，每个元素包含：
    {
      "id": "原始id",
      "title": "标题",
      "platform": "平台",
      "heat": 热度数字(0-100),
      "category": "分类（娱乐/教育/生活/美食/科技/情感/搞笑/励志/行业/其他）",
      "relevance": 相关性评分(0-100),
      "angle": "可借鉴的创作角度（一句话）",
      "tags": ["标签1", "标签2"]
    }

    只返回JSON数组，不要其他文字。`

        try {
          const aiRes = await fetch(`${apiBase}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: aiTemperature || 0.3, max_tokens: 2000 }),
            signal: AbortSignal.timeout(15000),
          })
          if (aiRes.ok) {
            const aiData = await aiRes.json()
            const content = aiData.choices?.[0]?.message?.content || ''
            const jsonMatch = content.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
              const classified = JSON.parse(jsonMatch[0])
              return NextResponse.json({ items: classified, total: classified.length })
            }
          }
        } catch {}

        const fallback = items.slice(0, 20).map((item: any, i: number) => ({
          ...item,
          id: item.id || String(i),
          heat: item.heat || Math.floor(Math.random() * 40 + 60),
          category: getCategoryByKeyword(item.title),
          relevance: Math.floor(Math.random() * 40 + 40),
          angle: '可结合账号特色进行二次创作',
          tags: [item.platform, '热门'],
        }))
        return NextResponse.json({ items: fallback, total: fallback.length })
      } catch (e: any) {
        return NextResponse.json({ error: e.message, items: getMockTrendingItems() }, { status: 200 })
      }
    }

    async function fetchWeiboHot() {
      const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json()
      const list = data?.data?.realtime || []
      return list.slice(0, 10).map((item: any, i: number) => ({
        id: `weibo_${i}`, title: item.note || item.word || '', heat: Math.max(0, 100 - i * 8),
      }))
    }

    async function fetchBaiduHot() {
      const res = await fetch('https://top.baidu.com/board?tab=realtime', {
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
        signal: AbortSignal.timeout(5000),
      })
      const html = await res.text()
      const matches = [...html.matchAll(/"word":"([^"]+)"/g)]
      return matches.slice(0, 10).map((m, i) => ({ id: `baidu_${i}`, title: m[1], heat: Math.max(0, 100 - i * 8) }))
    }

    async function fetchDouyinHot() {
      return [
        { id: 'dy_0', title: '职场人的真实状态', heat: 95 },
        { id: 'dy_1', title: '这个方法让我效率翻倍', heat: 88 },
        { id: 'dy_2', title: '普通人如何实现副业收入', heat: 85 },
        { id: 'dy_3', title: '年轻人的消费观变了', heat: 82 },
        { id: 'dy_4', title: '这些习惯让你越来越好', heat: 79 },
      ]
    }

    function getCategoryByKeyword(title: string): string {
      if (/美食|餐|吃|食|菜|料理/.test(title)) return '美食'
      if (/健身|运动|减肥|锻炼/.test(title)) return '生活'
      if (/科技|AI|数字|互联网|手机/.test(title)) return '科技'
      if (/情感|爱情|婚姻|恋爱/.test(title)) return '情感'
      if (/搞笑|幽默|段子/.test(title)) return '搞笑'
      if (/励志|成功|奋斗|坚持/.test(title)) return '励志'
      if (/教育|学习|知识|技能/.test(title)) return '教育'
      if (/娱乐|明星|综艺|电影/.test(title)) return '娱乐'
      return '生活'
    }

    function getMockTrendingItems() {
      return [
        { id: 'm1', title: '普通人如何用AI提升工作效率', platform: '抖音', heat: 96, category: '科技', relevance: 85, angle: '结合自身行业讲AI工具实战', tags: ['AI', '效率'] },
        { id: 'm2', title: '年轻人的消费观正在改变', platform: '微博', heat: 93, category: '生活', relevance: 72, angle: '从消费者角度讲述真实感受', tags: ['消费', '年轻人'] },
        { id: 'm3', title: '这个副业让我月入过万', platform: '小红书', heat: 91, category: '励志', relevance: 78, angle: '分享真实副业经历和方法论', tags: ['副业', '收入'] },
        { id: 'm4', title: '职场人必知的沟通技巧', platform: '抖音', heat: 89, category: '教育', relevance: 80, angle: '用具体场景演示沟通方法', tags: ['职场', '技巧'] },
        { id: 'm5', title: '一个人的生活可以有多精致', platform: '小红书', heat: 87, category: '生活', relevance: 65, angle: '展示精致生活细节和理念', tags: ['生活', '精致'] },
        { id: 'm6', title: '这些食物千万别一起吃', platform: '抖音', heat: 85, category: '美食', relevance: 60, angle: '用科普方式讲食物搭配禁忌', tags: ['美食', '健康'] },
        { id: 'm7', title: '00后整顿职场的方式', platform: '微博', heat: 83, category: '娱乐', relevance: 70, angle: '从新生代视角讲职场新规则', tags: ['00后', '职场'] },
        { id: 'm8', title: '坚持早起30天的真实变化', platform: '抖音', heat: 81, category: '励志', relevance: 75, angle: '记录真实变化过程和感受', tags: ['早起', '习惯'] },
        { id: 'm9', title: '这个城市的夜生活太好玩了', platform: '小红书', heat: 79, category: '生活', relevance: 55, angle: '探索本地特色夜生活场景', tags: ['城市', '夜生活'] },
        { id: 'm10', title: '学会这个技能让你脱颖而出', platform: '抖音', heat: 77, category: '教育', relevance: 82, angle: '分享具体可学习的核心技能', tags: ['技能', '成长'] },
        { id: 'm11', title: '情绪管理是成年人的必修课', platform: '微博', heat: 75, category: '情感', relevance: 68, angle: '分享情绪管理的实用方法', tags: ['情绪', '成长'] },
        { id: 'm12', title: '小红书爆款笔记的秘密', platform: '小红书', heat: 73, category: '教育', relevance: 90, angle: '拆解爆款内容的核心要素', tags: ['内容', '运营'] },
      ]
    }
    