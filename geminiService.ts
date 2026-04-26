
import { GoogleGenAI, Type } from "@google/genai";
import { Memory, MemoryType } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A concise, descriptive title" },
    summary: { type: Type.STRING, description: "A punchy 1-sentence summary" },
    extractedText: { type: Type.STRING, description: "Full text content extracted" },
    dates: { type: Type.ARRAY, items: { type: Type.STRING }, description: "ISO 8601 dates" },
    locations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific places" },
    tasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Action items" },
    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Up to 5 relevant tags for organization and search" },
    keyPeople: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of people mentioned" },
    tone: { type: Type.STRING, description: "Professional, casual, urgent, informational, etc" }
  },
  required: ["title", "summary", "tags", "extractedText"]
};

export const generateCollections = async (memories: Memory[]): Promise<string[]> => {
  if (memories.length < 3) return ["General", "Recents"];
  
  const model = "gemini-3-flash-preview";
  const context = memories.slice(0, 20).map(m => ({ title: m.title, tags: m.metadata.tags }));
  
  const prompt = `Based on these memory titles and tags, suggest 4-6 broad "Spaces" or "Collections" to organize them (e.g. "Work", "Academics", "Travel", "Inspiration").
  Context: ${JSON.stringify(context)}
  Return ONLY a JSON array of strings.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || '["General"]');
  } catch {
    return ["General", "Recents"];
  }
};

export const extractMemoryDetails = async (content: string, type: MemoryType): Promise<Partial<Memory>> => {
  const model = "gemini-3-flash-preview";
  
  let parts: any[] = [{ text: `Extract all details from this ${type} memory. Content: ${content.substring(0, 2000)}` }];
  
  if ((type === MemoryType.SCREENSHOT || type === MemoryType.IMAGE) && content.startsWith('data:')) {
    const [mimePart, base64Data] = content.split(',');
    const mimeType = mimePart.match(/:(.*?);/)?.[1] || 'image/png';
    parts = [
      { text: `Act as an OCR and information extraction specialist. Extract ALL visible text from this ${type}. Identify any dates, schedules, tasks, or important names. Create a summary that reflects the actual information content (e.g., "Exam schedule for Semester 1").` },
      { inlineData: { data: base64Data, mimeType } }
    ];
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return {
      title: data.title,
      metadata: {
        extractedText: data.extractedText || (type === MemoryType.NOTE ? content : undefined),
        summary: data.summary,
        dates: data.dates,
        locations: data.locations,
        tasks: data.tasks,
        tags: data.tags,
        keyPeople: data.keyPeople,
        tone: data.tone,
        suggestedCalendarEvents: data.suggestedCalendarEvents
      }
    };
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { title: "Untitled Memory", metadata: {} };
  }
};

export const generateAudioPodcast = async (memories: Memory[]): Promise<string | null> => {
  const model = "gemini-3.1-flash-tts-preview";
  
  const sourcesText = memories.map(m => `Title: ${m.title}\nContent: ${m.metadata.extractedText || m.metadata.summary}\n`).join('\n\n');
  
  const prompt = `You are hosting a short, engaging podcast segment discussing the core themes, ideas, and facts found in the provided sources. 
  The podcast is hosted by Joe and Jane. They should converse naturally, share insights, act surprised by interesting facts, and summarize the information effectively. Keep it under 2 minutes.
  
  Sources:
  ${sourcesText}
  
  Write the script/dialog in the format:
  Joe: [text]
  Jane: [text]`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Joe',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
              },
              {
                speaker: 'Jane',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
              }
            ]
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Failed to generate podcast", error);
    return null;
  }
};

export const generateBriefingDoc = async (memories: Memory[]): Promise<string> => {
  const model = "gemini-3.1-pro-preview";
  
  const sourcesText = memories.map(m => `Title: ${m.title}\nContent: ${m.metadata.extractedText || m.metadata.summary}\n`).join('\n\n---\n\n');
  
  const prompt = `You are an expert analyst. Create a comprehensive Briefing Document or Study Guide synthesizing the key themes from the provided sources. 
  Include:
  - An Executive Summary
  - Key Concepts & Themes
  - Important Details & Nuances
  - Actionable Takeaways (if relevant)
  
  Sources:
  ${sourcesText}
  
  Format the output in clean, readable Markdown.`;

  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "Failed to generate briefing document.";
  } catch (e) {
    console.error("Failed to generate briefing", e);
    return "Error communicating with the AI. Please try again.";
  }
};

export const generateFAQ = async (memories: Memory[]): Promise<string> => {
  const model = "gemini-3.1-pro-preview";
  
  const sourcesText = memories.map(m => `Title: ${m.title}\nContent: ${m.metadata.extractedText || m.metadata.summary}\n`).join('\n\n---\n\n');
  
  const prompt = `You are an expert analyst. Generate a set of Frequently Asked Questions (FAQ) based entirely on the provided sources. 
  Anticipate the most important questions someone would ask about these materials and answer them concisely.
  
  Sources:
  ${sourcesText}
  
  Format the output in clean, readable Markdown with Q: and A: or headings.`;

  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "Failed to generate FAQ.";
  } catch (e) {
    console.error("Failed to generate FAQ", e);
    return "Error communicating with the AI. Please try again.";
  }
};

export const summarizeMemory = async (memory: Memory): Promise<string> => {
  const model = "gemini-3.1-pro-preview";
  
  const contentToSummarize = memory.metadata.extractedText || memory.content || memory.metadata.summary;

  const prompt = `You are a helpful AI assistant. Please provide a detailed, easy-to-read summary of the following content.

Title: ${memory.title || 'Untitled'}
Type: ${memory.type}

Content:
${contentToSummarize}

Format the summary with markdown, highlighting the main points, key takeaways, and any interesting details.`;

  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "Failed to generate a deep dive summary.";
  } catch (e) {
    console.error("Failed to summarize memory", e);
    return "Error communicating with the AI. Please try again.";
  }
};

export const chatWithMemories = async (query: string, memories: Memory[]): Promise<string> => {
  const model = "gemini-3.1-pro-preview";
  
  const memoryContext = memories.map(m => `[Source ID: ${m.id}]\nTitle: ${m.title}\nContent: ${m.metadata.extractedText || m.metadata.summary || ''}\nTags: ${(m.metadata.tags || []).join(', ')}`).join('\n\n---\n\n');

  const prompt = `You are an intelligent knowledge assistant (like NotebookLM) answering a question based ONLY on the user's provided memories as your source material.
  
  Question: "${query}"
  
  Sources Context:
  ${memoryContext}
  
  Instructions:
  - Answer the question comprehensively using the provided sources.
  - Cite your sources by referring to the Title of the memory or the insights directly.
  - If the answer cannot be found in the sources, politely inform the user that you don't have that information in their memories.
  - Use markdown formatting for readability.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "I'm sorry, I couldn't generate an answer.";
  } catch (e) {
    console.error("Chat generation failed:", e);
    return "Error communicating with the AI. Please try again.";
  }
};

export const searchMemoriesAI = async (query: string, memories: Memory[]): Promise<string[]> => {
  const model = "gemini-3-flash-preview";
  
  // Provide full content context for deep searching
  const memoryContext = memories.map(m => ({
    id: m.id,
    title: m.title,
    summary: m.metadata.summary,
    fullText: m.metadata.extractedText,
    type: m.type,
    tags: m.metadata.tags,
    tasks: m.metadata.tasks
  }));

  const prompt = `You are a Personal Memory Assistant. The user is asking: "${query}".
  Search through the following memories (which include text extracted from screenshots and notes) to find relevant entries.
  Look for specific matches in the "fullText", "title", or "summary".
  
  Memories context: ${JSON.stringify(memoryContext)}
  
  Return a JSON array of memory IDs that satisfy the user's request. If none match, return an empty array [].`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};
