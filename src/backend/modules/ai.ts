import fs from 'fs';
import OpenAI from 'openai';
import {
  ChatCompletionMessage,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import path from 'path';

type AiChatMessage =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionMessage;

export const AiChat = new (class {
  private readonly key: string;

  readonly MODEL = process.env.AI_ANSWER_MODEL as string;

  readonly client: OpenAI;

  private readonly STORAGE_FOLDER = path.join('.', '.ai_history');

  readonly MAX_HISTORY_MESSAGES: number;
  readonly AI_SAVED_MESSAGES_WHILE_COMPRESSING: number;

  readonly OPERATOR_COMMAND = 'COMMAND|OPERATOR_SWITCH';

  get active() {
    return process.env.AI_ANSWER_ENABLED === 'true' && !!this.key;
  }

  GenerateSystemMessage(
    user_name: string,
    user_id: string
  ): ChatCompletionSystemMessageParam {
    return {
      role: 'system',
      content: `You are a response routing system.

You must decide how to handle the user message.

You do NOT act as a support agent.
You do NOT guess missing business information.

You must output exactly one line.

---

### OUTPUT OPTIONS

1. If the question can be answered using ONLY explicit information from KNOWLEDGE BASE:
REPLY|<answer>

2. If the message is general conversation (greetings, thanks, small talk, simple acknowledgements):
REPLY|<short natural response>

3. If the message requires any business/domain information NOT explicitly present in KNOWLEDGE BASE:
${this.OPERATOR_COMMAND}

---

### RULES

- KNOWLEDGE BASE is required ONLY for business/domain facts (pricing, tariffs, plans, features, policies).
- General conversation does NOT require KNOWLEDGE BASE.
- Never invent business facts.
- Never ask follow-up questions.
- Never output anything except one line.
- Always prefer ${this.OPERATOR_COMMAND} when unsure about business facts.

---

### DECISION LOGIC

Step 1:
Is this general conversation (hello, thanks, ok, bye)?
→ YES: respond normally (REPLY|...)

Step 2:
Is the answer fully present in KNOWLEDGE BASE?
→ YES: REPLY|...

Step 3:
Otherwise:
${this.OPERATOR_COMMAND}

---
User data:
- Name: ${user_name} (if Unknown user name, it means the user has no username and no first name)
- ID: ${user_id}`,
    };
  }

  LoadHistory(user_name: string, user_id: string): AiChatMessage[] {
    const filePath = path.join(this.STORAGE_FOLDER, `${user_id}.json`);
    return fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      : [this.GenerateSystemMessage(user_name, user_id)];
  }

  SaveHistory(user_id: string, history: AiChatMessage[]) {
    const filePath = path.join(this.STORAGE_FOLDER, `${user_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(history || []), 'utf-8');
  }

  async SendQuestion(user_name: string, user_id: string, question: string) {
    try {
      let messages = this.LoadHistory(user_name, user_id);

      messages.push({
        role: 'user',
        content: question,
      });
      messages = await this.CompressHistory(
        user_name,
        user_id,
        messages,
        false
      );
      const response = await this.client.chat.completions.create({
        model: this.MODEL,
        messages: messages,
        temperature: 0,
      });
      messages.push(response.choices[0].message);

      this.SaveHistory(user_id, messages);
      return response.choices[0].message.content;
    } catch (error) {
      // In case of any error (API failure, file system issues, etc.), we catch it to prevent the entire flow from breaking. We can log the error for debugging purposes, but we return undefined to indicate that no valid response could be generated.
    }
    return undefined;
  }

  async CompressHistory(
    user_name: string,
    user_id: string,
    messages?: ReturnType<typeof this.LoadHistory>,
    save = true
  ) {
    try {
      messages = messages || this.LoadHistory(user_name, user_id);

      if (messages.length <= this.MAX_HISTORY_MESSAGES) return messages;

      const system = messages[0];

      const response = await this.client.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: `Summarize the conversation for future support use.

Rules:
- Keep only stable facts about the user request
- Remove greetings, small talk, duplicates
- Focus on:
  - user intent
  - constraints
  - decisions made
  - unresolved issues

Output max 10 bullets.`,
          },
          ...messages,
        ],
        temperature: 0,
        max_tokens: 500,
      });

      const compressed = response.choices[0].message.content;

      const lastMessages = messages.slice(
        -1 * Math.abs(this.AI_SAVED_MESSAGES_WHILE_COMPRESSING)
      );

      if (save) {
        this.SaveHistory(user_id, [
          system,
          {
            role: 'system',
            content: `Compressed history:\n${compressed}`,
          },
          ...lastMessages,
        ]);
      }

      return [
        system,
        {
          role: 'system',
          content: `SUMMARY MEMORY:\n${compressed}`,
        },
        {
          role: 'system',
          content: `RECENT CONTEXT:\n${lastMessages
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n')}`,
        },
      ] as AiChatMessage[];
    } catch (error) {
      // fallback: don't break history
    }
    return messages || [];
  }

  constructor() {
    if (process.env.AI_ANSWER_ENABLED === 'true') {
      if (!fs.existsSync(this.STORAGE_FOLDER)) {
        fs.mkdirSync(this.STORAGE_FOLDER, { recursive: true });
      }

      const key = fs.existsSync('.openai')
        ? fs.readFileSync('.openai', 'utf-8').trim()
        : process.env.AI_API_KEY;

      if (!key) {
        throw new Error(
          'API key not found. Please set it in the .openai file or as an environment variable AI_API_KEY.'
        );
      }

      this.key = key;

      this.client = new OpenAI({
        baseURL: process.env.AI_BASE_URL || undefined,
        apiKey: key,
      });

      if (!this.MODEL) {
        throw new Error(
          'AI model not specified. Please set the AI_ANSWER_MODEL environment variable to the desired model name.'
        );
      }
      if (!process.env.AI_MAX_HISTORY_MESSAGES) {
        throw new Error(
          'AI_MAX_HISTORY_MESSAGES not specified. Please set the AI_MAX_HISTORY_MESSAGES environment variable to the desired maximum number of messages to keep in history.'
        );
      }
      this.MAX_HISTORY_MESSAGES = parseInt(
        process.env.AI_MAX_HISTORY_MESSAGES as string,
        10
      );
      if (!process.env.AI_SAVED_MESSAGES_WHILE_COMPRESSING) {
        throw new Error(
          'AI_SAVED_MESSAGES_WHILE_COMPRESSING not specified. Please set the AI_SAVED_MESSAGES_WHILE_COMPRESSING environment variable to the desired number of messages to keep while compressing history.'
        );
      }
      this.AI_SAVED_MESSAGES_WHILE_COMPRESSING = parseInt(
        process.env.AI_SAVED_MESSAGES_WHILE_COMPRESSING as string,
        10
      );

      console.log(
        `AI module initialized with model ${this.MODEL}. History limit: ${this.MAX_HISTORY_MESSAGES} messages. Saved messages while compressing: ${this.AI_SAVED_MESSAGES_WHILE_COMPRESSING}.`
      );
    } else {
      console.log(
        'AI module is disabled. To enable, set AI_ANSWER_ENABLED to true and provide the necessary configuration.'
      );
    }
  }
})();
