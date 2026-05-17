import{NextRequest,NextResponse}from'next/server'
    import{deepseek,buildCopyPrompt}from'@/lib/ai'
    export async function POST(req:NextRequest){
      try{
        const{topicTitle,accountName='我的账号',industry='餐饮',positioning='本地生活',targetAudience='周边用户',style='犀利观点',userInput}=await req.json()
        if(!topicTitle)return NextResponse.json({error:'请输入选题'},{status:400})
        const completion=await deepseek.chat.completions.create({model:'deepseek-chat',messages:[{role:'system',content:'只返回JSON格式数据'},{role:'user',content:buildCopyPrompt({topicTitle,accountName,industry,positioning,targetAudience,style,userInput})}],temperature:0.85,max_tokens:2500})
        const raw=completion.choices[0].message.content||'{}'
        const result=JSON.parse(raw.replace(/\`\`\`json\n?/g,'').replace(/\`\`\`\n?/g,'').trim())
        return NextResponse.json({success:true,versions:result.versions,tokens:completion.usage?.total_tokens})
      }catch(e){console.error(e);return NextResponse.json({error:'生成失败，请重试'},{status:500})}
    }