import { sleep } from '@xxanderwp/jstoolkit';
import { Telegram } from './telegram';
import { LangString } from './lang';
import { GenerateInlineKeyboard, UsersKeys } from './keycontrol';
import TelegramBot from 'node-telegram-bot-api';

Telegram.HandleMessage(async message => {
  if (String(message.chat.id) === String(Telegram.data.groupId)) return;
  if (!message.from) return;

  let topic = Telegram.GetTopicIdByUserId(String(message.from.id));
  if (!topic) {
    if (message.text && message.text.trim().toLowerCase() === '/start') {
      Telegram.sendMessage(
        String(message.chat.id),
        LangString('topic.message.client.create.startIgnore'),
        {
          reply_to_message_id: message.message_id,
        }
      ).catch(() => {});
      return;
    }
    const topicId = await Telegram.CreateTopic(message);
    if (!topicId) {
      Telegram.sendMessage(
        String(message.chat.id),
        LangString('topic.message.client.create.limit'),
        {
          reply_to_message_id: message.message_id,
        }
      ).catch(() => {});
      return;
    }
    await sleep(500);
  }
  topic = Telegram.GetTopicIdByUserId(String(message.from.id));
  if (!topic) {
    console.error(
      'Failed to create or retrieve topic for user:',
      message.from.id
    );
    return;
  }

  let failedToCopy = false;
  let newMsg = await Telegram.copyMessage(
    String(Telegram.data.groupId),
    String(message.chat.id),
    message.message_id,
    {
      message_thread_id: parseInt(topic.topic_id),
      reply_markup: {
        inline_keyboard: GenerateInlineKeyboard(false),
      },
    }
  ).catch(() => {});

  if (!newMsg) {
    failedToCopy = true;
    newMsg = await Telegram.sendMessage(
      String(message.chat.id),
      LangString('topic.failedCopyMessage'),
      {
        reply_to_message_id: message.message_id,
        reply_markup: {
          inline_keyboard: GenerateInlineKeyboard(true),
        },
      }
    );
  }

  if (newMsg) {
    topic = Telegram.GetTopicIdByUserId(String(message.from.id));
    if (!topic) return;
    topic.last_message_time = Date.now();
    topic.answered = false;
    topic.message_pairs.push([
      String(message.message_id),
      String(newMsg.message_id),
    ]);
    Telegram.UpdateTopicInfo(topic);
    if (failedToCopy) {
      Telegram.sendMessage(
        String(Telegram.data.groupId),
        LangString('topic.failedCopyMessageSupportInfo', message.text || ''),
        {
          message_thread_id: parseInt(topic.topic_id),
          reply_markup: {
            inline_keyboard: GenerateInlineKeyboard(false),
          },
        }
      );
    }
  }
});

Telegram.on('edited_message', msg => {
  if (String(msg.chat.id) === String(Telegram.data.groupId)) return;
  if (!msg.from) return;
  if (msg.from.is_bot) return;
  const topic = Telegram.GetTopicIdByUserId(String(msg.chat.id));
  if (!topic) return;
  Telegram.syncMessage(msg, topic.topic_id);
});

Telegram.on('callback_query', async query => {
  if (!query.message) return;
  const message = query.message;
  if (String(message.chat.id) === String(Telegram.data.groupId)) return;
  if (!query.from) return;
  if (query.from.is_bot) return;
  const command = Object.entries(UsersKeys).find(
    ([key]) => key === query.data?.trim().split('|')[0]
  );

  if (!command) return;
  const res = await handleUserCommand(
    command[0] as keyof typeof UsersKeys,
    message,
    query.from.id
  );
  Telegram.answerCallbackQuery(query.id, {
    show_alert: typeof res === 'string',
    text: typeof res === 'string' ? res : undefined,
  }).catch(() => {});
});

const handleUserCommand = async (
  command: keyof typeof UsersKeys,
  message: TelegramBot.Message,
  userId: number
) => {
  if (String(message.chat.id) === String(Telegram.data.groupId))
    return undefined;
  if (command === 'END_DIALOG') {
    return await Telegram.EndDialog(message, userId);
  }
  return undefined;
};
