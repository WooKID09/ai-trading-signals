
'use client'
import { useState } from 'react'

export default function Page() {
  const [price,setPrice]=useState("")
  const [result,setResult]=useState(null)
  const [files,setFiles]=useState({})

  async function analyze(){
    const form=new FormData()
    form.append("price",price)
    Object.entries(files).forEach(([k,v])=>{
      if(v) form.append("screenshot_"+k,v)
    })
    const r=await fetch("/api/analyze",{method:"POST",body:form})
    const j=await r.json()
    setResult(j)
  }

  return (
    <div style={{padding:40,fontFamily:"Arial"}}>
      <h1>AI Trading Signal</h1>
      <p>Upload H1,30M,15M,5M screenshots</p>

      {["H1","30M","15M","5M"].map(tf=>(
        <div key={tf}>
          {tf}: <input type="file" onChange={e=>setFiles({...files,[tf]:e.target.files[0]})}/>
        </div>
      ))}

      <br/>
      Price: <input value={price} onChange={e=>setPrice(e.target.value)} />
      <br/><br/>
      <button onClick={analyze}>Analyze</button>

      {result && (
        <pre style={{marginTop:20,background:"#111",color:"#0f0",padding:20}}>
{JSON.stringify(result,null,2)}
        </pre>
      )}
    </div>
  )
}
