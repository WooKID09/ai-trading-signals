export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const price = String(form.get("price") || "");
    const h1 = form.get("screenshot_H1");
    const m30 = form.get("screenshot_30M");
    const m15 = form.get("screenshot_15M");
    const m5 = form.get("screenshot_5M");

    if (!h1 || !m30 || !m15 || !m5) {
      return Response.json({
        finalSignal: "WAIT",
        confidence: 0,
        entry: price || "-",
        tp1: "-",
        tp2: "-",
        sl: "-",
        window: "30-60 min",
        reason: "Не загружены все 4 скриншота: H1, 30M, 15M, 5M.",
        management: "Загрузи все таймфреймы.",
        warnings: ["Нужны все 4 скриншота"],
        engines: {
          chatgpt: { signal: "WAIT", confidence: 0 }
        }
      });
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return Response.json({
        finalSignal: "WAIT",
        confidence: 0,
        entry: price || "-",
        tp1: "-",
        tp2: "-",
        sl: "-",
        window: "30-60 min",
        reason: "Не найден OPENAI_API_KEY в Environment Variables.",
        management: "Проверь ключ OpenAI в Vercel.",
        warnings: ["OPENAI_API_KEY missing"],
        engines: {
          chatgpt: { signal: "WAIT", confidence: 0 }
        }
      });
    }

    const prompt = `
Ты анализируешь рынок золота по 4 скриншотам TradingView: H1, 30M, 15M, 5M.

Текущая цена: ${price}

Нужно вернуть только JSON в таком формате:
{
  "signal": "BUY или SELL или WAIT",
  "confidence": число от 0 до 100,
  "entry": "уровень входа",
  "tp1": "первый тейк",
  "tp2": "второй тейк",
  "sl": "стоп",
  "window": "время отработки",
  "reason": "краткое объяснение",
  "management": "что делать дальше"
}

Учитывай:
- структуру цены
- направления на H1 / 30M / 15M / 5M
- EMA 50
- Supertrend
- сессии
- общий контекст движения

Если сигнала нет, верни WAIT.
Только JSON. Без markdown. Без пояснений вне JSON.
`;

    const fileToBase64 = async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer).toString("base64");
    };

    const imageFiles = [h1, m30, m15, m5] as File[];
    const base64Images = await Promise.all(imageFiles.map(fileToBase64));

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...base64Images.map((img) => ({
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${img}`
                }
              }))
            ]
          }
        ],
        temperature: 0.2
      })
    });

    const openAiData = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return Response.json({
        finalSignal: "WAIT",
        confidence: 0,
        entry: price || "-",
        tp1: "-",
        tp2: "-",
        sl: "-",
        window: "30-60 min",
        reason: "OpenAI вернул ошибку.",
        management: "Проверь ключ, биллинг и логи Vercel.",
        warnings: [JSON.stringify(openAiData)],
        engines: {
          chatgpt: { signal: "WAIT", confidence: 0 }
        }
      });
    }

    const openAiText = openAiData?.choices?.[0]?.message?.content || "{}";

    let openAiJson: any = {};

    try {
      openAiJson = JSON.parse(openAiText);
    } catch {
      openAiJson = {};
    }

    const openAiSignal = openAiJson.signal || "WAIT";
    const openAiConfidence = Number(openAiJson.confidence || 0);

    return Response.json({
      finalSignal: openAiSignal,
      confidence: openAiConfidence,
      entry: openAiJson.entry || price || "-",
      tp1: openAiJson.tp1 || "-",
      tp2: openAiJson.tp2 || "-",
      sl: openAiJson.sl || "-",
      window: openAiJson.window || "30-60 min",
      reason: openAiJson.reason || "Сигнал получен от ChatGPT.",
      management: openAiJson.management || "Следуй TP/SL.",
      warnings: [],
      engines: {
        chatgpt: {
          signal: openAiSignal,
          confidence: openAiConfidence
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
      reason: "Ошибка на сервере при анализе.",
      management: "Проверь логи Vercel.",
      warnings: [String(error)],
      engines: {
        chatgpt: { signal: "WAIT", confidence: 0 }
      }
    });
  }
}
