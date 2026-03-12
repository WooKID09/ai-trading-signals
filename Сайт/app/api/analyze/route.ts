export async function POST(req: Request) {
  try {

    const form = await req.formData()

    const price = String(form.get("price") || "")

    const prompt = `
Ты анализируешь рынок золота.

Текущая цена: ${price}

Верни JSON:

{
 "signal":"BUY или SELL или WAIT",
 "confidence":0-100,
 "entry":"уровень входа",
 "tp1":"тейк",
 "tp2":"тейк",
 "sl":"стоп",
 "window":"время",
 "reason":"кратко",
 "management":"что делать"
}
`

    const deepseekKey = process.env.DEEPSEEK_API_KEY

    const response = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2
        })
      }
    )

    const data = await response.json()

    const text = data?.choices?.[0]?.message?.content || "{}"

    let json:any = {}

    try {
      json = JSON.parse(text)
    } catch {
      json = {}
    }

    return Response.json({
      finalSignal: json.signal || "WAIT",
      confidence: json.confidence || 0,
      entry: json.entry || price,
      tp1: json.tp1 || "-",
      tp2: json.tp2 || "-",
      sl: json.sl || "-",
      window: json.window || "30-60 min",
      reason: json.reason || "",
      management: json.management || "",
      engines:{
        deepseek:{
          signal: json.signal || "WAIT",
          confidence: json.confidence || 0
        }
      }
    })

  } catch (error) {

    return Response.json({
      finalSignal:"WAIT",
      confidence:0,
      entry:"-",
      tp1:"-",
      tp2:"-",
      sl:"-",
      window:"30-60 min",
      reason:"server error",
      management:"check logs",
      warnings:[String(error)]
    })

  }
}
