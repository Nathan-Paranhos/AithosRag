// Infrastructure Service Implementation
import { IGroqService } from '../../application/interfaces/IGroqService';
import { Message, ChatConfig } from '../../domain/entities/Message';

export class GroqService implements IGroqService {
  private readonly baseUrl = 'http://localhost:3005/api/groq-advanced';
  private readonly availableModels = [
    'openai/gpt-oss-120b',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile'
  ];

  async generateResponse(
    messages: Message[],
    model: string,
    config: ChatConfig
  ): Promise<{
    content: string;
    tokens: number;
    tools_used?: string[];
    reasoning?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat-with-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model,
          config: {
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p,
            reasoning_effort: config.reasoning_effort,
            tools: config.tools
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      return {
        content: data.data.content,
        tokens: data.data.usage?.total_tokens || 0,
        tools_used: data.data.tools_used,
        reasoning: data.data.reasoning
      };
    } catch (error) {
      console.error('Error calling Groq API:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStreamResponse(
    messages: Message[],
    model: string,
    config: ChatConfig,
    onChunk: (chunk: string) => void
  ): Promise<{
    content: string;
    tokens: number;
    tools_used?: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model,
          config: {
            ...config,
            stream: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullContent = '';
      let totalTokens = 0;
      let toolsUsed: string[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  fullContent += content;
                  onChunk(content);
                }
                if (parsed.usage) {
                  totalTokens = parsed.usage.total_tokens;
                }
                if (parsed.tools_used) {
                  toolsUsed = parsed.tools_used;
                }
              } catch (parseError) {
                // Ignore parsing errors for individual chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        content: fullContent,
        tokens: totalTokens,
        tools_used: toolsUsed
      };
    } catch (error) {
      console.error('Error in stream response:', error);
      throw new Error(`Failed to generate stream response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateModel(model: string): boolean {
    return this.availableModels.includes(model);
  }

  getAvailableModels(): string[] {
    return [...this.availableModels];
  }
}