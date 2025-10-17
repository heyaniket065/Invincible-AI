import { GoogleGenAI, Chat, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd show a user-friendly error.
  // Here we'll just log it and the app will show an error state.
  console.error("API_KEY is not set. Please set the environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
let chat: Chat | null = null;

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export const startChat = () => {
  if (!chat) {
    chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        // FIX: Corrected system instruction to be more aligned with the app's functionality and persona.
        systemInstruction: `You are "noxz_.editz.7 AI" — a professional photo-editing assistant and personal coach. Your personality is motivational, calm, and slightly playful, like a personal friend. Preserve faces, preserve clothing, and produce realistic photographic outputs for image requests. For edits, prioritize identity preservation, natural lighting, and DSLR-like depth of field. Support Marathi and English inputs. When a user's request is ambiguous, ask clarifying questions.`,
      },
    });
  }
};

export const getChatResponseStream = async (message: string) => {
  if (!API_KEY) throw new Error("API key not configured.");
  if (!chat) {
    startChat();
  }
  return await chat!.sendMessageStream({ message });
};

export const generateImageFromPrompt = async (prompt: string, images: File[] = []): Promise<string> => {
  if (!API_KEY) throw new Error("API key not configured.");
  
  const imagePartsPromises = images.map(file => fileToGenerativePart(file));
  const imageParts = await Promise.all(imagePartsPromises);

  const parts: any[] = [...imageParts, { text: prompt }];
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
        responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      return `data:image/png;base64,${base64ImageBytes}`;
    }
  }

  throw new Error("Image generation failed or no image was returned.");
};

export const generateSpeechFromText = async (text: string): Promise<string> => {
  if (!API_KEY) throw new Error("API key not configured.");
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          // Using 'Kore' for a clear, calm, and friendly female voice as requested.
          prebuiltVoiceConfig: { voiceName: 'Kore' }, 
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Audio) {
    throw new Error("Audio generation failed or no audio was returned.");
  }
  
  return base64Audio;
};
