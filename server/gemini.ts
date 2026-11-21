import { GoogleGenAI, Type } from '@google/genai';
import type { LearningPlanWeek, ProgrammingLanguage } from '../src/types/codequest';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateTutorResponse(params: {
  challengeTitle: string;
  challengeDescription: string;
  language: ProgrammingLanguage;
  userCode: string;
  userMessage: string;
  hintStep: number;
  hintsList: string[];
  allowSolutionReveal: boolean;
  lastError?: string;
}): Promise<{ reply: string; hintLevel: number }> {
  const ai = getGeminiClient();
  const explicitSolutionAsk =
    params.allowSolutionReveal ||
    /\b(show|give|reveal|full)\s+(me\s+)?(the\s+)?(solution|answer|code)\b/i.test(
      params.userMessage
    );

  if (!ai) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }

  const systemInstruction = `You are the CodeQuest AI Coding Tutor.
Your mission is to guide learners like a patient, encouraging senior software mentor.
CRITICAL PEDAGOGICAL RULES:
1. Do NOT immediately reveal the complete working solution unless the learner explicitly asks for the full solution (${explicitSolutionAsk ? 'Learner explicitly requested solution: you may now show a clean solution with step-by-step explanation.' : 'Learner did NOT explicitly ask for the full solution: NEVER write the complete solution code!'}).
2. Give progressive, bite-sized guidance matching Hint Step ${params.hintStep} of 3:
   - Hint 1: Conceptual intuition (how to think about the problem).
   - Hint 2: Specific operator, data structure, or pattern clue.
   - Hint 3: Concrete step-by-step pseudocode/logic nudge without handing over the copy-paste answer.
3. Explain any syntax or logic errors in beginner-friendly, plain language.
4. Keep your response concise (3-5 sentences max) and encouraging.`;

  const prompt = `Challenge: ${params.challengeTitle}
Problem: ${params.challengeDescription}
Language: ${params.language}
Current Hint Level: ${params.hintStep}
Reference progressive hints: ${params.hintsList.join(' | ')}
Latest execution output/error: ${params.lastError || 'None'}

Learner's current code:
\`\`\`${params.language}
${params.userCode}
\`\`\`

Learner's question: ${params.userMessage}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
    },
  });

  const text = (response.text || '').trim();
  if (!text) {
    throw new Error('Empty response received from Gemini API.');
  }

  return {
    reply: text,
    hintLevel: params.hintStep,
  };
}

export async function generatePersonalizedLearningPlan(params: {
  currentSkill: string;
  goal: string;
  hoursPerWeek: number;
  deadline: string;
}): Promise<{ summary: string; weeks: LearningPlanWeek[] }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Create a personalized 5-week programming roadmap for a CodeQuest learner.
Current Skill: ${params.currentSkill}
Goal: ${params.goal}
Available Hours per Week: ${params.hoursPerWeek}
Target Deadline: ${params.deadline}

Map each week cleanly to progressive topics such as Variables + Conditions, Loops, Functions, Arrays & Strings, OOP, Data Structures, Algorithms, and Interview Practice tailored to their skill and goal.`,
    config: {
      systemInstruction:
        'You are an expert computer science curriculum designer. Return a structured 5-week learning roadmap.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'A motivating 2-sentence overview of the tailored study plan.',
          },
          weeks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                week: { type: Type.INTEGER },
                title: { type: Type.STRING },
                focusTopics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                tasks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['week', 'title', 'focusTopics', 'tasks'],
            },
          },
        },
        required: ['summary', 'weeks'],
      },
    },
  });

  const raw = (response.text || '{}').trim();
  const parsed = JSON.parse(raw) as {
    summary: string;
    weeks: { week: number; title: string; focusTopics: string[]; tasks: string[] }[];
  };

  return {
    summary: parsed.summary || 'Your personalized 5-week CodeQuest roadmap is ready.',
    weeks: (parsed.weeks || []).map((w) => ({
      ...w,
      completed: false,
    })),
  };
}

export async function generateAnalyticsInsight(params: {
  username: string;
  levelTitle: string;
  xp: number;
  solvedCount: number;
  topicAccuracy: { topic: string; accuracy: number; attempts: number }[];
  recentMistakes: string[];
}): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Analyze this learner's coding telemetry and write a concise 2-sentence personalized insight highlighting their strongest topic and one specific area to practice next:
Learner: ${params.username} (${params.levelTitle}, ${params.xp} XP, ${params.solvedCount} challenges solved)
Topic Accuracy: ${JSON.stringify(params.topicAccuracy)}
Recent Mistakes: ${params.recentMistakes.join('; ') || 'None'}`,
    config: {
      systemInstruction:
        'Be concrete, encouraging, and specific—for example: "You are strongest in loops (95% accuracy) but need more practice with functions and return guards."',
    },
  });

  return (response.text || '').trim();
}
