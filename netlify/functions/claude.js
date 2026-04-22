exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const API_KEY = process.env.GROQ_API_KEY;
    
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API Key not configured in Netlify environment variables (GROQ_API_KEY)." })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const messages = body.messages || [];
    
    // Convertir el historial de mensajes al formato de Groq (OpenAI-like)
    let chatMessages = [];
    
    // Agregar instrucción del sistema si existe
    if (body.system) {
      chatMessages.push({ role: "system", content: body.system });
    }

    // Mapear mensajes previos
    messages.forEach(m => {
      let content = "";
      if (typeof m.content === 'string') {
        content = m.content;
      } else if (Array.isArray(m.content)) {
        // Groq llama-3.1-8b-instant es principalmente texto, extraemos el texto
        const textPart = m.content.find(p => p.type === 'text');
        content = textPart ? textPart.text : "Analiza esto";
      }
      
      chatMessages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: content
      });
    });

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    console.log("Llamando a Groq con modelo: llama-3.1-8b-instant");

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ 
        model: 'llama-3.1-8b-instant',
        messages: chatMessages,
        max_tokens: body.max_tokens || 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || data.error || "Error desconocido en la API de Groq";
      console.error("Error de Groq API:", errorMsg);
      throw new Error(errorMsg);
    }

    const text = data.choices?.[0]?.message?.content || "Lo siento, no pude generar una respuesta.";

    // Mantener el formato de respuesta original para que ecobot.html no falle
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: [{ type: 'text', text: text }]
      })
    };

  } catch(e) {
    console.error("Error en función EcoBot (Groq):", e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
