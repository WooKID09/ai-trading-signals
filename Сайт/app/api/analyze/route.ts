export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const price = String(form.get("price") || "")
    const h1 = form.get("screenshot_H1") as File
    const m30 = form.get("screenshot_30M") as File
    const m15 = form.get("screenshot_15M") as File
    const m5 = form.get("screenshot_5M") as File

    const deepseekKey = process.env.DEEPSEEK_API_KEY

    if (!deepseekKey) {
      return Response.json({
        finalSignal: "WAIT",
        confidence: 0,
        reason: "DeepSeek API key missing"
      })
    }

    const fileToBase64 = async (file: File) => {
      const buffer = await file.arrayBuffer()
      return Buffer.from(buffer).toString("base64")
    }

    const images = await Promise.all([
      fileToBase64(h1),
      fileToBase64(m30),
      fileToBase64(m15),
      fileToBase64(m5)
    ])

    const prompt = `
Ты анализируешь рынок золота по скриншотам TradingView.
Цена сейчас: ${price}

Верни строго JSON:

{
"signal":"BUY или SELL или WAIT",
"confidence":0-100,
"entry":"уровень входа",
"tp1":"тейк 1",
"tp2":"тейк 2",
"sl":"стоп",
"window":"время",
"reason":"объяснение",
"management":"что делать"
}
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
            content: [
              { type: "text", text: prompt },
              ...images.map(img => ({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${img}` }
              }))
            ]
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
    } catch {}

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
      reason: "server error",
      warnings: [String(error)]
    })
  }
}
