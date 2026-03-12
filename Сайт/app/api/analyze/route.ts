export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      price,
      trendH1,
      trend30,
      trend15,
      trend5,
      ema50,
      rsi,
      orderBlock,
      liquiditySweep,
      fiboZone
    } = body;

    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    if (!deepseekKey) {
      return Response.json({
        finalSignal: "WAIT",
        confidence: 0,
        entry: "-",
        tp1: "-",
        tp2: "-",
        sl: "-",
        window: "30-60 min",
        reason: "DEEPSEEK_API_KEY missing",
        management: "Check Vercel environment variables"
      });
    }

    const prompt = `
Ты торговый AI-аналитик по золоту XAUUSD.

Данные:
- Current price: ${price}
- H1 trend: ${trendH1}
- 30M trend: ${trend30}
- 15M trend: ${trend15}
- 5M trend: ${trend5}
- Price vs EMA50: ${ema50}
- RSI: ${rsi}
- Order Block: ${orderBlock}
- Liquidity Sweep: ${liquiditySweep}
- Fibonacci Zone: ${fiboZone}

Правила:
- Верни BUY, если есть сильное подтверждение вверх
- Верни SELL, если есть сильное подтверждение вниз
- Верни WAIT, если структура слабая или смешанная
- Не выдумывай уверенность 100 без причины
- Верни только JSON

Формат:
{
  "signal":"BUY or SELL or WAIT",
  "confidence": 0-100,
  "entry":"...",
  "tp1":"...",
  "tp2":"...",
  "sl":"...",
  "window":"...",
  "reason":"...",
  "management":"..."
}
`;

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
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({
        finalSignal: "WAIT",
        confidence: 0,
        entry: price || "-",
        tp1: "-",
        tp2: "-",
        sl: "-",
        window: "30-60 min",
        reason: "DeepSeek API error",
        management: "Check DeepSeek key or billing",
        warnings: [JSON.stringify(data)]
      });
    }

    const content = data?.choices?.[0]?.message?.content || "";

    let result: any = {};

    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      }
    } catch {
      result = {};
    }

    return Response.json({
      finalSignal: result.signal || "WAIT",
      confidence: result.confidence || 0,
      entry: result.entry || price || "-",
      tp1: result.tp1 || "-",
      tp2: result.tp2 || "-",
      sl: result.sl || "-",
      window: result.window || "30-60 min",
      reason: result.reason || "No clear reason returned",
      management: result.management || "Wait for stronger confirmation",
      engines: {
        deepseek: {
          signal: result.signal || "WAIT",
          confidence: result.confidence || 0
        }
      }
    });
  } catch (error) {
    return Response.json({
      finalSignal: "WAIT",
      confidence: 0,
      entry: "-",
      tp1: "-",
      tp2: "-",
      sl: "-",
      window: "30-60 min",
      reason: "Server error",
      management: "Check Vercel logs",
      warnings: [String(error)]
    });
  }
}
