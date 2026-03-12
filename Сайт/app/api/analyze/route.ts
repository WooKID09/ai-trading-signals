export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const price = String(form.get("price") || "")

    const deepseekKey = process.env.DEEPSEEK_API_KEY

    const prompt = `
Ты анализируешь рынок золота.

Текущая цена: ${price}

Верни строго JSON:

{
"signal":"BUY или SELL или WAIT",
"confidence": число 0-100,
"entry":"уровень входа",
"tp1":"тейк 1",
"tp2":"тейк 2",
"sl":"стоп",
"window":"время",
"reason":"краткое объяснение",
"management":"что делать"
}

Без текста вне JSON.
`

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      })
    })

    const data = await response.json()

    const content = data?.choices?.[0]?.message?.content || "{}"

    let result: any = {}

    try {
      result = JSON.parse(content)
    } catch {
      result = {}
    }

    return Response.json({
      finalSignal: result.signal || "WAIT",
      confidence: result.confidence || 0,
      entry: result.entry || price,
      tp1: result.tp1 || "-",
      tp2: result.tp2 || "-",
      sl: result.sl || "-",
      window: result.window || "30-60 min",
      reason: result.reason || "",
      management: result.management || "",
      engines: {
        deepseek: {
          signal: result.signal || "WAIT",
          confidence: result.confidence || 0
        }
      }
    })

  } catch (error) {

    return Response.json({
      finalSignal: "WAIT",
      confidence: 0,
      entry: "-",
      tp1: "-",
      tp2: "-",
      sl: "-",
      window: "30-60 min",
      reason: "server error",
      management: "check logs",
      warnings: [String(error)]
    })

  }
}
