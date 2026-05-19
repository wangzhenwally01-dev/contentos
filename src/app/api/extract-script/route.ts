import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: '请提供视频链接' }, { status: 400 })

    // 路径A：抖音字幕直接提取
    if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('v.douyin.com')) {
      try {
        const result = await extractDouyinScript(url)
        if (result) return NextResponse.json({ success: true, script: result, source: 'douyin_subtitle' })
      } catch (e) {
        console.log('抖音字幕提取失败，尝试其他方式')
      }
    }

    // 路径B：小红书文案提取
    if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
      try {
        const result = await extractXhsScript(url)
        if (result) return NextResponse.json({ success: true, script: result, source: 'xhs_content' })
      } catch (e) {
        console.log('小红书提取失败')
      }
    }

    // 路径C：ASR 转录（需要 API Key）
    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (openrouterKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'ASR转录功能开发中，请先配置 OPENROUTER_API_KEY',
        hint: '当前支持：抖音视频字幕直提、小红书图文内容提取'
      })
    }

    return NextResponse.json({ 
      success: false, 
      error: '暂时无法提取该链接的口播文案',
      hint: '支持格式：抖音视频链接、小红书笔记链接。ASR语音转文字功能即将上线。'
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '提取失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function extractDouyinScript(url: string): Promise<string | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.douyin.com/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }

  // 先解析短链
  let realUrl = url
  if (url.includes('v.douyin.com') || url.length < 60) {
    try {
      const resp = await fetch(url, { method: 'HEAD', redirect: 'follow', headers })
      realUrl = resp.url || url
    } catch {}
  }

  const resp = await fetch(realUrl, { headers })
  const html = await resp.text()

  // 尝试从 __NEXT_DATA__ 提取字幕
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1])
      const videoDetail = findDeep(data, 'video')
      if (videoDetail && videoDetail.subtitleInfos) {
        const subtitleInfo = videoDetail.subtitleInfos.find((s: Record<string, string>) => 
          s.languageCodeName === 'zho-Hans' || s.languageCodeName === 'chi'
        )
        if (subtitleInfo && subtitleInfo.url) {
          const srtResp = await fetch(subtitleInfo.url)
          const srtText = await srtResp.text()
          return parseSRT(srtText)
        }
      }
    } catch {}
  }

  // 尝试从页面 JSON 数据提取（使用 exec 替代 matchAll）
  const jsonRegex = /\{"aweme_detail":\{([\s\S]*?)\}\}/g
  let match
  while ((match = jsonRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(`{"aweme_detail":{${match[1]}}}`)
      const subtitles = data?.aweme_detail?.video?.subtitleInfos
      if (subtitles && subtitles.length > 0) {
        const sub = subtitles.find((s: Record<string, string>) => 
          s.languageCodeName?.includes('zho') || s.languageCodeName?.includes('chi')
        )
        if (sub && sub.url) {
          const srtResp = await fetch(sub.url)
          const srtText = await srtResp.text()
          return parseSRT(srtText)
        }
      }
    } catch {}
  }

  // 提取视频描述作为备选
  const descMatch = html.match(/"desc":"([^"]{20,})"/)
  if (descMatch) return `【视频描述】${descMatch[1]}`

  return null
}

async function extractXhsScript(url: string): Promise<string | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://www.xiaohongshu.com/',
  }

  let realUrl = url
  if (url.includes('xhslink.com')) {
    try {
      const resp = await fetch(url, { method: 'HEAD', redirect: 'follow', headers })
      realUrl = resp.url || url
    } catch {}
  }

  const resp = await fetch(realUrl, { headers })
  const html = await resp.text()

  // 提取小红书笔记内容
  const initStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/)
  if (initStateMatch) {
    try {
      const data = JSON.parse(initStateMatch[1])
      const noteDetail = findDeep(data, 'noteDetailMap')
      if (noteDetail) {
        const notes = Object.values(noteDetail as Record<string, unknown>)
        if (notes.length > 0) {
          const note = notes[0] as Record<string, unknown>
          const noteData = note?.note as Record<string, string> | undefined
          const content = noteData?.desc || noteData?.title
          if (content) return content
        }
      }
    } catch {}
  }

  // 备选：提取 meta description
  const metaMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]{20,})"/)
  if (metaMatch) return metaMatch[1]

  return null
}

function findDeep(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== 'object') return null
  const record = obj as Record<string, unknown>
  if (record[key] !== undefined) return record[key]
  for (const v of Object.values(record)) {
    const result = findDeep(v, key)
    if (result !== null) return result
  }
  return null
}

function parseSRT(srt: string): string {
  const lines = srt.split('\n')
  const texts: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || /^\d+$/.test(trimmed) || trimmed.includes('-->')) continue
    const clean = trimmed.replace(/<[^>]+>/g, '').trim()
    if (clean) texts.push(clean)
  }
  return texts.join('，')
}
