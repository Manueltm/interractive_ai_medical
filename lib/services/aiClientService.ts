// lib/services/aiClientService.ts
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = 'google' | 'openai' | 'deepseek';

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
}

export class AIClientService {
  private static instance: AIClientService;
  
  private googleAI: GoogleGenerativeAI | null = null;
  private googleModel: string = 'gemini-2.5-flash-lite'; // Updated to available model
  
  private openAI: OpenAI | null = null;
  private openAIModel: string = 'gpt-4';
  
  private deepSeek: OpenAI | null = null;
  private deepSeekModel: string = 'deepseek-chat';

  private constructor() {
    // Initialize Google Gemini
    if (process.env.GOOGLE_API_KEY) {
      this.googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      // Use one of the available models from your API response
      this.googleModel = process.env.GOOGLE_MODEL || 'gemini-2.5-flash-lite';
      console.log('✅ Google Gemini initialized with model:', this.googleModel);
    } else {
      console.log('⚠️ GOOGLE_API_KEY not found, Google Gemini disabled');
    }
    
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.openAIModel = process.env.OPENAI_MODEL || 'gpt-4';
      console.log('✅ OpenAI initialized with model:', this.openAIModel);
    } else {
      console.log('⚠️ OPENAI_API_KEY not found, OpenAI disabled');
    }
    
    // Initialize DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      this.deepSeek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com/v1",
      });
      this.deepSeekModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
      console.log('✅ DeepSeek initialized with model:', this.deepSeekModel);
    } else {
      console.log('⚠️ DEEPSEEK_API_KEY not found, DeepSeek disabled');
    }
  }

  public static getInstance(): AIClientService {
    if (!AIClientService.instance) {
      AIClientService.instance = new AIClientService();
    }
    return AIClientService.instance;
  }

  private async tryGoogleWithFallbackModels(
    systemPrompt: string | undefined,
    messages: Array<{ role: string; content: string }>,
    temperature: number,
    maxTokens: number,
    retries: number
  ): Promise<AIResponse | null> {
    // List of available models from your API response in priority order
    const modelsToTry = [
      this.googleModel,
      'gemini-2.0-flash',
      'gemini-2.0-flash-001',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-lite-001',
      'gemini-2.5-flash-lite'
    ];
    
    const uniqueModels = [...new Set(modelsToTry)];
    
    for (const modelName of uniqueModels) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`📤 Trying Google Gemini with model: ${modelName} (attempt ${attempt})...`);
          
          const model = this.googleAI!.getGenerativeModel({ model: modelName });
          
          let prompt = "";
          if (systemPrompt) {
            prompt += systemPrompt + "\n\n";
          }
          
          for (const msg of messages) {
            const role = msg.role === 'assistant' ? 'Assistant' : msg.role === 'user' ? 'User' : 'System';
            prompt += `${role}: ${msg.content}\n`;
          }
          
          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          });
          
          const response = result.response;
          const content = response.text();
          
          if (content) {
            console.log(`✅ Google Gemini response received with model ${modelName} (${content.length} chars)`);
            // Update the default model to this working one for future calls
            this.googleModel = modelName;
            return {
              content,
              provider: 'google',
              model: modelName
            };
          }
        } catch (error: any) {
          const errorMsg = `Google Gemini with model ${modelName} attempt ${attempt} failed: ${error.message}`;
          console.warn(errorMsg);
          
          // If it's a 404 model not found, try the next model
          if (error.message?.includes('not found') || error.message?.includes('404')) {
            console.log(`⚠️ Model ${modelName} not available, trying next model...`);
            break; // Break out of retry loop for this model, try next model
          }
          
          // Handle quota/rate limit errors
          if (error.message?.includes('quota') || error.status === 429 || error.message?.includes('429')) {
            console.log('⚠️ Google quota exceeded or rate limited, switching to next provider...');
            return null; // Stop trying Google altogether
          }
          
          // Handle other errors (like API key issues)
          if (error.message?.includes('API key') || error.message?.includes('permission')) {
            console.log('⚠️ Google API key issue, switching to next provider...');
            return null;
          }
          
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }
    }
    
    return null;
  }

  async callWithFallback(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      retries?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<AIResponse> {
    const {
      temperature = 0.3,
      maxTokens = 4000,
      retries = 2,
      systemPrompt
    } = options;

    const errors: string[] = [];

    // TIER 1: Google Gemini
    if (this.googleAI) {
      const googleResponse = await this.tryGoogleWithFallbackModels(
        systemPrompt,
        messages,
        temperature,
        maxTokens,
        retries
      );
      
      if (googleResponse) {
        return googleResponse;
      }
      errors.push('Google Gemini failed with all available models');
    } else {
      console.log('⚠️ Google Gemini not configured, skipping to OpenAI...');
    }

    // TIER 2: OpenAI
    if (this.openAI) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`📤 Tier 2 - Attempt ${attempt}: Trying OpenAI (${this.openAIModel})...`);
          
          const openAIMessages: any = [];
          if (systemPrompt) {
            openAIMessages.push({ role: "system", content: systemPrompt });
          }
          openAIMessages.push(...messages);
          
          const response = await this.openAI.chat.completions.create({
            model: this.openAIModel,
            messages: openAIMessages,
            temperature,
            max_tokens: maxTokens,
          });
          
          const content = response.choices[0].message.content;
          if (content) {
            console.log(`✅ OpenAI response received (${content.length} chars)`);
            return {
              content,
              provider: 'openai',
              model: this.openAIModel
            };
          }
        } catch (error: any) {
          const errorMsg = `OpenAI attempt ${attempt} failed: ${error.message}`;
          console.warn(errorMsg);
          errors.push(errorMsg);
          
          if (error.message?.includes('quota') || error.status === 429) {
            console.log('⚠️ OpenAI quota exceeded, switching to DeepSeek...');
            break;
          }
          
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }
    } else {
      console.log('⚠️ OpenAI not configured, skipping to DeepSeek...');
    }

    // TIER 3: DeepSeek
    if (this.deepSeek) {
      try {
        console.log(`📤 Tier 3: Trying DeepSeek (${this.deepSeekModel})...`);
        
        const deepSeekMessages: any = [];
        if (systemPrompt) {
          deepSeekMessages.push({ role: "system", content: systemPrompt });
        }
        deepSeekMessages.push(...messages);
        
        const response = await this.deepSeek.chat.completions.create({
          model: this.deepSeekModel,
          messages: deepSeekMessages,
          temperature,
          max_tokens: maxTokens,
        });
        
        const content = response.choices[0].message.content;
        if (content) {
          console.log(`✅ DeepSeek response received (${content.length} chars)`);
          return {
            content,
            provider: 'deepseek',
            model: this.deepSeekModel
          };
        }
      } catch (error: any) {
        const errorMsg = `DeepSeek failed: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    } else {
      console.log('⚠️ DeepSeek not configured');
    }

    throw new Error(`All AI providers failed: ${errors.join('; ')}`);
  }

  async complete(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<AIResponse> {
    return this.callWithFallback(
      [{ role: "user", content: prompt }],
      options
    );
  }

  async completeJSON<T>(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<{ data: T; provider: AIProvider; model: string }> {
    const jsonPrompt = `${prompt}\n\nReturn ONLY valid JSON. No markdown, no explanations, no additional text.`;
    
    const response = await this.complete(jsonPrompt, options);
    
    let cleanedContent = response.content;
    cleanedContent = cleanedContent.replace(/```json\s*/g, '');
    cleanedContent = cleanedContent.replace(/```\s*$/g, '');
    cleanedContent = cleanedContent.trim();
    
    try {
      const data = JSON.parse(cleanedContent) as T;
      return {
        data,
        provider: response.provider,
        model: response.model
      };
    } catch (error) {
      console.error('JSON parse error:', error);
      console.error('Raw content:', cleanedContent.substring(0, 500));
      throw new Error(`Failed to parse JSON response from ${response.provider}`);
    }
  }

  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    if (this.googleAI) providers.push('google');
    if (this.openAI) providers.push('openai');
    if (this.deepSeek) providers.push('deepseek');
    return providers;
  }

  isAvailable(): boolean {
    return !!(this.googleAI || this.openAI || this.deepSeek);
  }

  getStatus(): { configured: boolean; providers: AIProvider[]; primaryProvider: AIProvider | null } {
    const providers = this.getAvailableProviders();
    return {
      configured: providers.length > 0,
      providers,
      primaryProvider: providers[0] || null
    };
  }
}

// Export singleton instance
export const aiClient = AIClientService.getInstance();