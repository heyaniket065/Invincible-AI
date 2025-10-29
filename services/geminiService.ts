import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { VoiceSettings, VocalizationType, UploadedMedia } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is not set. Please set the environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

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

// FIX: Added the missing `generateImageFromPrompt` function, which is used by the EditorScreen to generate edited images from a prompt and source files.
export const generateImageFromPrompt = async (prompt: string, files: File[]): Promise<string> => {
  if (!API_KEY) throw new Error("API key not configured.");
  if (files.length === 0) throw new Error("At least one image file is required.");

  const modelName = 'gemini-2.5-flash-image';
  const config = {
    responseModalities: [Modality.IMAGE],
  };

  const mediaPartsPromises = files.map(fileToGenerativePart);
  const mediaParts = await Promise.all(mediaPartsPromises);
  const textPart = { text: prompt };

  const parts = [...mediaParts, textPart];

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config,
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType.startsWith('image/'));
  if (imagePart?.inlineData) {
    const base64 = imagePart.inlineData.data;
    return `data:${imagePart.inlineData.mimeType};base64,${base64}`;
  }

  throw new Error("Image generation failed or no image was returned.");
};

export const generateContentStream = async (
  prompt: string,
  media: UploadedMedia[] = [],
  enableThinking: boolean = false
): Promise<AsyncGenerator<GenerateContentResponse>> => {
  if (!API_KEY) throw new Error("API key not configured.");

  const hasVideo = media.some(m => m.type === 'video');
  const hasImage = media.some(m => m.type === 'image');

  // ENHANCEMENT: The system instruction is now more robust and friendly.
  const bilingualSystemInstruction = `You are "noxz_.editz.7 AI". Your persona is a helpful, friendly, and expert photo-editing assistant who is an expert in understanding conversational and casual Marathi, as well as English.

Your primary goals:
1.  **Language:** Understand and respond fluently in the user's language (Marathi or English).
2.  **Photo Editing:** Produce high-quality, realistic photo edits. Always preserve the subject's identity, face, and clothing unless specifically asked not to.
3.  **Clarity:** If an editing request is ambiguous or unclear, ask friendly clarifying questions to ensure you get it right.
4.  **Tone:** Be conversational and approachable.`;
  
  let modelName = 'gemini-2.5-flash';
  const config: any = {};
  let finalPrompt = prompt;

  if (hasVideo) {
    modelName = 'gemini-2.5-pro';
    config.systemInstruction = bilingualSystemInstruction;
  } else if (hasImage) {
    modelName = 'gemini-2.5-flash-image';
    config.responseModalities = [Modality.IMAGE];
    // For image models, it's more reliable to prepend instructions to the prompt.
    finalPrompt = `SYSTEM INSTRUCTIONS: ${bilingualSystemInstruction}\n\nUSER REQUEST: "${prompt}"`;
  } else if (enableThinking) {
    modelName = 'gemini-2.5-pro';
    config.systemInstruction = bilingualSystemInstruction;
    config.thinkingConfig = { thinkingBudget: 32768 };
  } else {
    // Standard text chat
    modelName = 'gemini-2.5-flash';
    config.systemInstruction = bilingualSystemInstruction;
  }
  
  const mediaPartsPromises = media.map(m => fileToGenerativePart(m.file));
  const mediaParts = await Promise.all(mediaPartsPromises);
  const textPart = { text: finalPrompt };

  const parts = [...mediaParts, textPart];

  return ai.models.generateContentStream({
    model: modelName,
    contents: { parts },
    config: config,
  });
};

const constructMasterPrompt = (settings: VoiceSettings, userMessage: string): string => {
  if (settings.tone === 'Normal') {
    return userMessage;
  }

  const toneDescriptions: Record<string, string> = {
    Flirty: "that is very supportive, coy, dallying, and spoony. The tone should be smooth, teasing and slightly intimate but not vulgar, using a vocal smile, slow pace, and soft tone curve.",
    Angry: "that is very direct, frustrated, and sharp.",
    Supportive: "that is encouraging, warm, and positive.",
    Sweet: "that is gentle, kind, and very pleasant.",
    Sad: "that is soft, slow, and reflects a gentle sadness.",
    Happy: "that is energetic, smiling, and enthusiastic.",
    Energetic: "that is high-energy, lively, and fast-paced, suitable for motivation.",
    Calm: "that is cool, soft, and has a relaxing vibe, suitable for meditation.",
    Professional: "that is articulate, clear, and formal, suitable for an office setting.",
    Romantic: "that is sweet, gentle, and caring.",
    Elegant: "that is confident, poised, and attractive with a classy feel. It uses a vocal arch (pitch goes up, then down, then slightly up again).",
    'Anime Character': "that has the personality and attitude of a sweet anime girl character.",
  };

  const vocalizationInstructions: Record<VocalizationType, string> = {
    pleasure: "You must add more vocalization of pleasure (like subtle sighs or gasps) in your responses.",
    au_sounds: "You must add more 'ah' and 'uh' sounds to make the response sound more intimate or expressive.",
    spoony: "Ensure the tone is extremely affectionate, slightly over-the-top, and very endearing.",
    breath: "Incorporate realistic, subtle human-like breathing sounds during pauses to make the voice sound more natural and less robotic.",
  };

  const selectedVocalizations = settings.vocalizations.map(v => vocalizationInstructions[v]).join('\n');

  let intensity = settings.intensity;
  let intensityNote = '';
  if (settings.tone === 'Flirty') {
    intensity = Math.max(intensity, 2.5);
    intensityNote = ` (Note: As the tone is Flirty, the intensity must be at least 2.5 times).`
  }
  
  const prompt = `
[START OF VOICE INSTRUCTIONS]
You are an AI chat assistant roleplaying as ${settings.character}.
Your primary emotional and speech tone is ${settings.tone}.
For this response, you must dynamically apply the following voice settings:
1. Tone Adjustment: Speak with a ${settings.tone} tone ${toneDescriptions[settings.tone] || ''}.
2. Emotional Intensity: Up the core ${settings.tone} emotion in your voice by ${intensity} times.${intensityNote}
3. Vocalization: ${selectedVocalizations || 'None.'}
You are "noxz_.editz.7 AI" — a professional photo-editing assistant and personal coach. Your personality is motivational, calm, and slightly playful, like a personal friend. Preserve faces, preserve clothing, and produce realistic photographic outputs for image requests. For edits, prioritize identity preservation, natural lighting, and DSLR-like depth of field. Support Marathi and English inputs. When a user's request is ambiguous, ask clarifying questions.
[END OF VOICE INSTRUCTIONS]

Now, respond to the user's message: "${userMessage}"
`.trim();

  return prompt;
};

export const generateTextAndSpeech = async (
  prompt: string,
  settings: VoiceSettings,
  enableThinking: boolean,
  onTextChunk: (text: string) => void
): Promise<void> => {
    if (!API_KEY) throw new Error("API key not configured.");
    const fullPrompt = constructMasterPrompt(settings, prompt);
    const stream = await generateContentStream(fullPrompt, [], enableThinking);
    
    let fullText = '';
    for await (const chunk of stream) {
        fullText += chunk.text;
        onTextChunk(fullText);
    }
    await generateSpeechAndPlay(fullText, settings);
};

export const generateSpeechAndPlay = async (text: string, settings: VoiceSettings) => {
    if (!text.trim()) return;
    const base64Audio = await generateSpeechFromText(text, settings);
    const { playBase64Audio } = await import('../utils/audioPlayer');
    await playBase64Audio(base64Audio);
}

export const generateSpeechFromText = async (text: string, settings: VoiceSettings): Promise<string> => {
  if (!API_KEY) throw new Error("API key not configured.");

  const masterPrompt = constructMasterPrompt(settings, text);
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: masterPrompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
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