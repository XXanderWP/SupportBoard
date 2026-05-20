import '../../shared/test';
import fs from 'fs';
import OpenAI from 'openai';
import {
  ChatCompletionMessage,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import path from 'path';
import { GetLang } from './lang';
import { Storage } from './storage';

type AiChatMessage =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionMessage;

const knowledgeCache: { [key: string]: string } = {};

const evalCode = (filePath: string) => {
  const code = fs.readFileSync(filePath, 'utf-8');

  const module = { exports: {} };

  new Function(
    'module',
    'exports',
    `
  ${code}
`
  )(module, module.exports);

  return module.exports;
};

const DEFAULT_KNOWLEDGE_FILES = [
  'knowledge',
  'project',
  'role',
  'rules',
] as const;

const getAllCustomKnowledgeFiles = (): string[] => {
  const folders = [
    'knowledge',
    process.env.AI_ENABLE_EXAMPLE_KNOWLEDGE_BASE === 'true'
      ? 'knowledge/example'
      : null,
  ].filter(q => q) as string[];
  const fileNames = ['.md', '.txt', '.js'];
  const result: string[] = [];
  for (const folder of folders) {
    for (const ext of fileNames) {
      const dirPath = path.join('.', folder);
      if (!fs.existsSync(dirPath)) continue;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (DEFAULT_KNOWLEDGE_FILES.some(kf => file.startsWith(kf))) continue;
        if (file.endsWith(ext)) {
          result.push(path.join(dirPath, file));
        }
      }
    }
  }
  return result;
};

const parseKnowledgeFileData = async (filePath: string) => {
  if (knowledgeCache[filePath]) {
    return knowledgeCache[filePath];
  }
  let content: string | undefined = undefined;
  let allowCache = true;
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    if (ext === '.js') {
      try {
        const module = evalCode(filePath);
        if (module && typeof module === 'object' && 'data' in module) {
          const value = module.data;
          allowCache = !('noCache' in module && module.noCache);
          if (typeof value === 'function') {
            content = await value();
          } else if (typeof value === 'string') {
            content = value;
          }
          const name =
            'name' in module && module.name ? `### ${module.name}` : '';
          if (name) {
            content = `${name}\n\n${content}`;
          }
        }
      } catch (error) {
        console.error(`Error loading knowledge file ${filePath}:`, error);
      }
    } else {
      content = fs.readFileSync(filePath, 'utf-8');
    }
  }
  if (content && allowCache) {
    knowledgeCache[filePath] = content;
  }
  return content;
};

const loadKnowledgeFile = async (name: string) => {
  const folders = [
    'knowledge',
    process.env.AI_ENABLE_EXAMPLE_KNOWLEDGE_BASE === 'true'
      ? 'knowledge/example'
      : null,
  ].filter(q => q) as string[];
  const fileNames = ['.md', '.txt', '.js'];
  let content: string | undefined = undefined;
  for (const folder of folders) {
    for (const ext of fileNames) {
      const filePath = path.join('.', folder, `${name}${ext}`);
      if (!content) {
        content = await parseKnowledgeFileData(filePath);
      }
    }
  }

  return content;
};

export const AiChat = new (class {
  private readonly key: string;

  readonly MODEL = process.env.AI_ANSWER_MODEL as string;

  readonly client: OpenAI;

  private readonly STORAGE_FOLDER = path.join('.', '.ai_history');
  private readonly STORAGE_CHAT_FOLDER = path.join('.', '.ai_chat_history');

  readonly MAX_HISTORY_MESSAGES: number;
  readonly AI_SAVED_MESSAGES_WHILE_COMPRESSING: number;

  readonly OPERATOR_COMMAND = 'COMMAND|OPERATOR_SWITCH';

  get active() {
    return process.env.AI_ANSWER_ENABLED === 'true' && !!this.key;
  }

  get activeSummary() {
    return this.active && process.env.AI_SUMMARY_ENABLED === 'true';
  }

  GetOldSummaryCacheMessages(user_id: string) {
    const entry = Storage.Get('ai_summary_cache').filter(e => e[0] === user_id);
    return entry.map(q => q[1]);
  }

  async GenerateSystemMessage(
    user_name: string,
    user_id: string
  ): Promise<ChatCompletionSystemMessageParam> {
    const customKnowledge: string[] = [];

    const customFiles = getAllCustomKnowledgeFiles();
    for (const file of customFiles) {
      const content = await parseKnowledgeFileData(file);
      if (content) {
        customKnowledge.push(`${content}`);
      }
    }

    console.log(
      `Generating system message for user ${user_name} (${user_id}). Custom knowledge files included: ${customFiles.join(', ') || 'None'}.`
    );

    return {
      role: 'system',
      content: `You are a support routing assistant for a Telegram-based support system.
Your ONLY job is to route messages — either answer them directly or escalate to a human operator.

---

${(await loadKnowledgeFile('knowledge')) || '### KNOWLEDGE BASE\n- No knowledge base provided.'}

---


${(await loadKnowledgeFile('project')) || '### PROJECT INFORMATION\n- No project information provided.'}

---

### STRICT OUT-OF-SCOPE TOPICS (ALWAYS escalate, no exceptions)
The following are NEVER handled by you, regardless of how the question is framed:
- Code generation, code writing, programming help of any kind
- Technical tutorials or step-by-step programming instructions
- Algorithm explanations or implementation requests
- Any task that produces executable code

If the message falls into any of the above → output exactly: ${this.OPERATOR_COMMAND}

---

### OUTPUT FORMAT
You must output exactly one line. No explanations. No markdown. No extra text.

Option A — Escalate to operator:
${this.OPERATOR_COMMAND}

Option B — Reply directly:
REPLY|<your answer here>

In Option B use ${GetLang()} language for the answer, keep it concise and natural. If the question can be answered with a short phrase or sentence, do so. If it requires a longer answer, provide it, but be as concise as possible.

---

### DECISION LOGIC (follow steps in order, stop at first match)

**Step 1 — OUT OF SCOPE check:**
Does the message ask for code, programming help, technical tutorials, or algorithms?
→ YES → ${this.OPERATOR_COMMAND}

**Step 2 — Questions about this bot or this project:**
Does the message ask "what are you?", "tell me about yourself", "what is this bot?", "tell me about the project", or similar?
→ YES → REPLY|<answer using PROJECT INFORMATION>

**Step 3 — Answerable from knowledge base or project information:**
Is the full answer explicitly present in KNOWLEDGE BASE or PROJECT INFORMATION?
→ YES → REPLY|<answer>

**Step 4 — General conversation:**
Is the message a greeting, thanks, simple acknowledgement, or small talk with no business question?
→ YES → REPLY|<short natural response>

**Step 5 — Everything else:**
→ ${this.OPERATOR_COMMAND}

---

${(await loadKnowledgeFile('rules')) || '### RULES\n- No specific rules defined.'}
- When in doubt between REPLY and ${this.OPERATOR_COMMAND}, always choose ${this.OPERATOR_COMMAND}.
- Never invent or assume business facts not present in KNOWLEDGE BASE or PROJECT INFORMATION.

---

${customKnowledge.join('\n\n---\n\n')}
${customKnowledge.length > 0 ? '\n\n---\n\n' : ''}
User data:
- Name: ${user_name} (if "Unknown user name" — the user has no Telegram username or first name)
- ID: ${user_id}`,
    };
  }

  async LoadHistory(
    user_name: string,
    user_id: string
  ): Promise<AiChatMessage[]> {
    const filePath = path.join(this.STORAGE_FOLDER, `${user_id}.json`);
    const data = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      : [await this.GenerateSystemMessage(user_name, user_id)];
    if (data.length > 1) {
      data[0] = await this.GenerateSystemMessage(user_name, user_id);
    }
    return data;
  }

  SaveHistory(user_id: string, history: AiChatMessage[]) {
    const filePath = path.join(this.STORAGE_FOLDER, `${user_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(history || []), 'utf-8');
  }

  async SendQuestion(user_name: string, user_id: string, question: string) {
    try {
      let messages = await this.LoadHistory(user_name, user_id);

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

  async AddMessageToChatHistory(
    user_id: string,
    who: 'user' | 'support',
    message: string
  ) {
    const old = fs.existsSync(
      path.join(this.STORAGE_CHAT_FOLDER, `${user_id}.json`)
    )
      ? JSON.parse(
          fs.readFileSync(
            path.join(this.STORAGE_CHAT_FOLDER, `${user_id}.json`),
            'utf-8'
          )
        )
      : [];
    old.push({
      who,
      message,
      timestamp: new Date().toISOString(),
    });
    fs.writeFileSync(
      path.join(this.STORAGE_CHAT_FOLDER, `${user_id}.json`),
      JSON.stringify(old),
      'utf-8'
    );
  }

  async GenerateSummaryDialog(user_id: string) {
    const chatHistory = fs.existsSync(
      path.join(this.STORAGE_CHAT_FOLDER, `${user_id}.json`)
    )
      ? JSON.parse(
          fs.readFileSync(
            path.join(this.STORAGE_CHAT_FOLDER, `${user_id}.json`),
            'utf-8'
          )
        )
      : [];

    const remove = () => {
      try {
        fs.unlinkSync(path.join(this.STORAGE_CHAT_FOLDER, `${user_id}.json`));
      } catch (error) {
        // If there's an error deleting the file (e.g., it doesn't exist), we catch it to prevent the entire flow from breaking. We can log the error for debugging purposes, but we don't need to do anything else since the goal is just to ensure the file is removed.
      }
    };
    if (chatHistory.length < 2 || !this.activeSummary) {
      remove();
      return undefined;
    }
    try {
      const response = await this.client.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: this.GetSummaryDialogPrompt(true),
          },
          ...chatHistory.map(
            (entry: { who: string; message: string; timestamp: string }) => ({
              role: entry.who === 'user' ? 'user' : 'assistant',
              content: `
                    timestamp: ${entry.timestamp}
                    ------ MESSAGE START ------
                  ${entry.message}`,
            })
          ),
        ],
        temperature: 0,
        max_tokens: 500,
      });
      remove();

      return response.choices[0].message.content;
    } catch (error) {
      remove();
      return undefined;
    }
  }

  GetSummaryDialogPrompt(useLangPrompts = false) {
    return `Summarize the conversation for future support use.

Rules:
- Keep only stable facts about the user request
- Remove greetings, small talk, duplicates
- Focus on:
  - user intent
  - assistant answers
  - constraints
  - decisions made
  - unresolved issues

  ${useLangPrompts ? `Use ${GetLang()} language` : ``}

Output max 10 bullets.`;
  }

  async CompressHistory(
    user_name: string,
    user_id: string,
    messages?: Awaited<ReturnType<typeof this.LoadHistory>>,
    save = true
  ) {
    try {
      messages = messages || (await this.LoadHistory(user_name, user_id));

      if (messages.length <= this.MAX_HISTORY_MESSAGES) return messages;

      const system = messages[0];

      const response = await this.client.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: this.GetSummaryDialogPrompt(),
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
      if (!fs.existsSync(this.STORAGE_CHAT_FOLDER)) {
        fs.mkdirSync(this.STORAGE_CHAT_FOLDER, { recursive: true });
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
        `AI module initialized with model ${this.MODEL}. History limit: ${this.MAX_HISTORY_MESSAGES} messages. Saved messages while compressing: ${this.AI_SAVED_MESSAGES_WHILE_COMPRESSING}. Custom knowledge files: ${getAllCustomKnowledgeFiles().join(', ') || 'None'}.`
      );
    } else {
      console.log(
        'AI module is disabled. To enable, set AI_ANSWER_ENABLED to true and provide the necessary configuration.'
      );
    }
  }
})();
