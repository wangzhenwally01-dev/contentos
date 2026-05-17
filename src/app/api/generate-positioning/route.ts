import{NextRequest,NextResponse}from'next/server'
    import{deepseek,buildPositioningPrompt}from'@/lib/ai'
    export async function POST(req:NextRequest){
      try{
        const body=await req.json()
        const completion=await deepseek.chat.completions.create({model:'deepseek-chat',messages:[{role:'system',content:'只返回JSON格式数据'},{role:'user',content:buildPositioningPrompt(body)}],temperature:0.8,max_tokens:3000})
        const raw=completion.choices[0].message.content||'{}'
        const result=JSON.parse(raw.replace(/\`\`\`json\n?/g,'').replace(/\`\`\`\n?/g,'').trim())
        return NextResponse.json({success:true,...result})
      }catch(e){console.error(e);return NextResponse.json({error:'生成失败'},{status:500})}
    }