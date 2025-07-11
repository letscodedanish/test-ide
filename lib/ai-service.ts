import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from './error-handler';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export interface AIRequest {
  type: 'completion' | 'explanation' | 'refactor' | 'debug' | 'chat';
  code?: string;
  language: string;
  prompt: string;
  context?: {
    fileName?: string;
    projectType?: string;
    selectedText?: string;
    cursorPosition?: number;
  };
}

export interface AIResponse {
  content: string;
  type: 'code' | 'explanation' | 'suggestion';
  confidence?: number;
  alternatives?: string[];
}

export class AIService {
  private static instance: AIService;
  
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateCodeCompletion(request: AIRequest): Promise<AIResponse> {
    try {
      if (!genAI) {
        throw new AppError('AI service not configured', 503, 'AI_SERVICE_NOT_CONFIGURED');
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const systemPrompt = this.getSystemPrompt(request.type, request.language);
      const userPrompt = this.buildUserPrompt(request);
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const content = response.text() || '';
      
      return {
        content: this.cleanCodeResponse(content),
        type: request.type === 'explanation' ? 'explanation' : 'code',
        confidence: 0.8, // Default confidence for Gemini
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new AppError('AI service temporarily unavailable', 503, 'AI_SERVICE_ERROR');
    }
  }

  async generateInlineSuggestion(
    code: string, 
    language: string, 
    cursorPosition: number
  ): Promise<string> {
    try {
      if (!genAI) {
        return '';
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const context = this.extractContext(code, cursorPosition);
      
      const prompt = `You are an AI code completion assistant. Provide only the next few characters or tokens that would logically complete the code. Return ONLY the completion text, no explanations or markdown.

Language: ${language}
Code context:
${context.before}
<CURSOR>
Complete the code at the cursor position.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text()?.trim() || '';
    } catch (error) {
      console.error('Inline suggestion error:', error);
      return '';
    }
  }

  async explainCode(code: string, language: string): Promise<AIResponse> {
    return this.generateCodeCompletion({
      type: 'explanation',
      code,
      language,
      prompt: 'Explain what this code does',
    });
  }

  async refactorCode(code: string, language: string, instructions: string): Promise<AIResponse> {
    return this.generateCodeCompletion({
      type: 'refactor',
      code,
      language,
      prompt: `Refactor this code: ${instructions}`,
    });
  }

  async debugCode(code: string, language: string): Promise<AIResponse> {
    return this.generateCodeCompletion({
      type: 'debug',
      code,
      language,
      prompt: 'Find potential bugs and suggest fixes',
    });
  }

  private getSystemPrompt(type: string, language: string): string {
    const basePrompt = `You are an expert ${language} developer assistant.`;
    
    switch (type) {
      case 'completion':
        return `${basePrompt} Provide code completions that are contextually appropriate, follow best practices, and are production-ready. Return only the code without explanations.`;
      
      case 'explanation':
        return `${basePrompt} Explain code clearly and concisely, focusing on what it does, how it works, and any important patterns or concepts.`;
      
      case 'refactor':
        return `${basePrompt} Refactor code to improve readability, performance, and maintainability while preserving functionality. Provide the improved code with brief explanations of changes.`;
      
      case 'debug':
        return `${basePrompt} Analyze code for potential bugs, security issues, and improvements. Provide specific suggestions with corrected code examples.`;
      
      case 'chat':
        return `${basePrompt} You are a helpful coding assistant. Answer questions about code, provide examples, and help solve programming problems.`;
      
      default:
        return basePrompt;
    }
  }

  private buildUserPrompt(request: AIRequest): string {
    let prompt = `Language: ${request.language}\n`;
    
    if (request.context?.fileName) {
      prompt += `File: ${request.context.fileName}\n`;
    }
    
    if (request.context?.projectType) {
      prompt += `Project Type: ${request.context.projectType}\n`;
    }
    
    if (request.code) {
      prompt += `\nCurrent Code:\n\`\`\`${request.language}\n${request.code}\n\`\`\`\n`;
    }
    
    if (request.context?.selectedText) {
      prompt += `\nSelected Text:\n\`\`\`${request.language}\n${request.context.selectedText}\n\`\`\`\n`;
    }
    
    prompt += `\nRequest: ${request.prompt}`;
    
    return prompt;
  }

  private extractContext(code: string, cursorPosition: number): { before: string; after: string } {
    const before = code.substring(Math.max(0, cursorPosition - 200), cursorPosition);
    const after = code.substring(cursorPosition, Math.min(code.length, cursorPosition + 100));
    
    return { before, after };
  }

  private cleanCodeResponse(content: string): string {
    // Remove markdown code blocks if present
    const codeBlockRegex = /```[\w]*\n?([\s\S]*?)\n?```/g;
    const match = codeBlockRegex.exec(content);
    
    if (match) {
      return match[1].trim();
    }
    
    return content.trim();
  }


}