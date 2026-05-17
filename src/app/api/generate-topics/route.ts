import{NextRequest,NextResponse}from'next/server'
    import{deepseek,buildTopicPrompt}from'@/lib/ai'
    export async function POST(req:NextRequest){
      try{
        const{positioning='本地生活',industry='餐饮',accountName='我的账号',hotspot,count=6}=await req.json()
        const completion=await deepseek.chat.completions.create({model:'deepseek-chat',messages:[{role:'system',content:'只返回JSON格式数据'},{role:'user',content:buildTopicPrompt({positioning,industry,accountName,hotspot,count})}],temperature:0.9,max_tokens:2000})
        const raw=completion.choices[0].message.content||'{}'
        const result=JSON.parse(raw.replace(/\`\`\`json\n?/g,'').replace(/\`\`\`\n?/g,'').trim())
        return NextResponse.json({success:true,topics:result.topics})
      }catch(e){return NextResponse.json({error:'生成失败'},{status:500})}
    }