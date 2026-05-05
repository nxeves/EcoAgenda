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
    
    // Detectar si hay alguna imagen en los mensajes
    let hasImage = false;
    
    // Convertir el historial de mensajes al formato de Groq (OpenAI-compatible)
    let chatMessages = [];
    
    // Agregar instrucción del sistema si existe
    if (body.system) {
      chatMessages.push({ role: "system", content: body.system });
    }

    // Mapear mensajes previos y detectar imágenes
    messages.forEach(m => {
      let content;
      
      if (typeof m.content === 'string') {
        content = m.content;
      } else if (Array.isArray(m.content)) {
        content = m.content.map(part => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          } else if (part.type === 'image' || part.type === 'image_url') {
            hasImage = true;
            const base64Data = part.source?.data || part.image_url?.url?.split(',')[1] || part.data;
            return {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            };
          }
          return part;
        });
      }
      
      chatMessages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: content
      });
    });

    // Seleccionar modelo según si hay imagen
    const model = hasImage 
      ? 'meta-llama/llama-4-scout-17b-16e-instruct' 
      : 'llama-3.3-70b-versatile';

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    console.log(`Llamando a Groq con modelo: ${model} (hasImage: ${hasImage})`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ 
        model: model,
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
