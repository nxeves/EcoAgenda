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
        // Separar texto e imágenes para procesamiento correcto
        const textParts = [];
        const imageParts = [];
        
        m.content.forEach(part => {
          if (part.type === 'text') {
            textParts.push({ type: 'text', text: part.text });
          } else if (part.type === 'image' || part.type === 'image_url') {
            hasImage = true;
            // Extraer base64 de diferentes formatos posibles
            let base64Data = part.source?.data || part.image_url?.url?.split(',')[1] || part.data;
            
            // Asegurar que sea puro base64 sin prefijo
            if (base64Data && base64Data.includes(',')) {
              base64Data = base64Data.split(',')[1];
            }
            
            imageParts.push({
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            });
          }
        });
        
        // Combinar imágenes primero, luego texto (formato recomendado por Groq)
        content = [...imageParts, ...textParts];
      }
      
      chatMessages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: content
      });
    });

    // Seleccionar modelo según si hay imagen
    // Usar llama-2-vision para mejor manejo de imágenes, o el modelo 70b para texto
    const model = hasImage 
      ? 'llava-1.5-7b-4096' 
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
