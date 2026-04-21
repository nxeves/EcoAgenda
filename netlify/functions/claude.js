exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Rely ONLY on the environment variable for security
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API Key not configured in Netlify environment variables." })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) throw new Error("No hay mensajes en la solicitud");

    // Preparar contenido para la API REST de Gemini
    let contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : (m.content.find(p => p.type === 'text')?.text || "Analiza esto") }]
    }));

    // Si hay imagen (formato multimodal), Gemini requiere un formato especial
    if (Array.isArray(lastMessage.content)) {
      const imgPart = lastMessage.content.find(p => p.type === 'image');
      const textPart = lastMessage.content.find(p => p.type === 'text');
      
      if (imgPart && imgPart.source && imgPart.source.data) {
        contents[contents.length - 1].parts = [
          { text: textPart ? textPart.text : "Analiza esta imagen" },
          { inline_data: { mime_type: "image/jpeg", data: imgPart.source.data } }
        ];
      }
    }

    // Usar v1beta para mayor compatibilidad con systemInstruction y modelos nuevos
    const modelName = 'gemini-2.0-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    
    console.log("Llamando a Gemini v1beta con modelo:", modelName);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents,
        systemInstruction: { parts: [{ text: body.system || "Eres EcoBot, un asistente experto en ecología." }] },
        generationConfig: {
          maxOutputTokens: body.max_tokens || 1000,
          temperature: 0.7
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || data.error || "Error desconocido en la API de Gemini";
      console.error("Error de Gemini API:", errorMsg);
      throw new Error(errorMsg);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no pude generar una respuesta.";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: [{ type: 'text', text: text }]
      })
    };

  } catch(e) {
    console.error("Error en función EcoBot:", e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
