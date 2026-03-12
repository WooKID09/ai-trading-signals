
import { NextResponse } from "next/server"

export async function POST(req){
  const form=await req.formData()
  const price=form.get("price")||""

  const result={
    finalSignal:"WAIT",
    confidence:50,
    entry:price||"-",
    tp1:"-",
    tp2:"-",
    sl:"-",
    window:"30-60 min",
    reason:"Backend connected. AI analysis placeholder.",
    management:"Replace with AI logic",
    warnings:[],
    engines:{
      chatgpt:{signal:"WAIT",confidence:50},
      deepseek:{signal:"WAIT",confidence:50}
    }
  }

  return NextResponse.json(result)
}
