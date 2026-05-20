import TelegramBot from 'node-telegram-bot-api';
import { AdminKeys, GenerateInlineKeyboard } from './keycontrol';
import { LangString } from './lang';
import { Telegram } from './telegram';
import { TopicStatus } from '../../shared/topic';
import { AiChat } from './ai';

Telegram.HandleMessage(async message => {
  if (String(message.chat.id) !== String(Telegram.data.groupId)) return;
  //   console.log('Received message:', message);
  if (!message.from) return;
  if (message.from.is_bot) return;
  if (!message.message_thread_id) return;

  let topic = Telegram.topics.find(
    t => t.topic_id === String(message.message_thread_id)
  );
  if (!topic) {
    Telegram.sendMessage(
      String(Telegram.data.groupId),
      LangString('topic.message.admin.dialogNotExist'),
      {
        reply_to_message_id: message.message_id,
        message_thread_id: message.message_thread_id,
      }
    ).catch(() => {});
    setTimeout(() => {
      if (process.env.KEEP_CLOSED_TOPICS !== 'true') {
        Telegram.deleteForumTopic(
          String(Telegram.data.groupId),
          message.message_thread_id as number
        );
      } else {
        Telegram.editForumTopic(
          String(Telegram.data.groupId),
          message.message_thread_id as number,
          {
            icon_custom_emoji_id: TopicStatus.Closed,
          }
        ).catch(() => {});
      }
    }, 5000);
    return;
  }

  if (String(message.from.id) !== String(topic.assigned_to)) {
    const admin = topic.assigned_to
      ? await Telegram.getChat(topic.assigned_to)
      : null;
    const admin_name = admin
      ? admin.username
        ? `@${admin.username}`
        : admin.first_name || 'Unknown'
      : 'Unknown';
    Telegram.sendMessage(
      String(Telegram.data.groupId),
      `${LangString('topic.message.admin.notYour', LangString(AdminKeys.ASSIGN))}${topic.assigned_to ? `\n\n${LangString('topic.message.admin.who', admin_name, topic.assigned_to)}` : ''}`,
      {
        reply_to_message_id: message.message_id,
        message_thread_id: message.message_thread_id,
        reply_markup: {
          inline_keyboard: GenerateInlineKeyboard(false),
        },
      }
    ).catch(() => {});
    return;
  }

  const user_id = topic.user_id;

  let failedToCopy = false;
  let newMsg = await Telegram.copyMessage(
    user_id,
    String(Telegram.data.groupId),
    message.message_id,
    {
      reply_markup: {
        inline_keyboard: GenerateInlineKeyboard(true),
      },
    }
  ).catch(() => {});

  if (!newMsg) {
    newMsg = await Telegram.sendMessage(user_id, message.text || '', {
      reply_markup: {
        inline_keyboard: GenerateInlineKeyboard(true),
      },
    }).catch(() => {});
    failedToCopy = true;
  }

  if (!newMsg) {
    await Telegram.sendMessage(
      String(Telegram.data.groupId),
      LangString('topic.failedSendSupportMessage'),
      {
        message_thread_id: parseInt(topic.topic_id),
        reply_markup: {
          inline_keyboard: GenerateInlineKeyboard(false),
        },
      }
    ).catch(() => {});
  } else {
    if (failedToCopy) {
      Telegram.sendMessage(
        String(Telegram.data.groupId),
        LangString('topic.failedCopySupportMessage'),
        {
          message_thread_id: parseInt(topic.topic_id),
          reply_markup: {
            inline_keyboard: GenerateInlineKeyboard(false),
          },
        }
      ).catch(() => {});
    } else {
      if (
        AiChat.activeSummary &&
        message.text &&
        message.text.trim().length > 0
      ) {
        AiChat.AddMessageToChatHistory(
          topic.user_id,
          'support',
          message.text.trim()
        );
      }
    }

    topic = Telegram.topics.find(
      t => t.topic_id === String(message.message_thread_id)
    );
    if (!topic) return;
    topic.last_message_time = Date.now();
    topic.answered = true;
    topic.message_pairs.push([
      String(message.message_id),
      String(newMsg.message_id),
    ]);

    Telegram.UpdateTopicInfo(topic);
  }
});

Telegram.on('edited_message', msg => {
  if (String(msg.chat.id) !== String(Telegram.data.groupId)) return;
  if (!msg.from) return;
  if (msg.from.is_bot) return;
  const topic = Telegram.topics.find(
    t => t.topic_id === String(msg.message_thread_id)
  );
  if (!topic) return;
  Telegram.syncMessage(msg, topic.topic_id);
});

Telegram.on('callback_query', async query => {
  if (!query.message) return;
  const message = query.message;
  if (String(message.chat.id) !== String(Telegram.data.groupId)) return;
  if (!query.from) return;
  if (query.from.is_bot) return;
  if (!message.message_thread_id) return;
  const command = Object.entries(AdminKeys).find(
    ([key]) => key === query.data?.trim().split('|')[0]
  );

  if (!command) return;
  const res = await handleAdminCommand(
    command[0] as keyof typeof AdminKeys,
    message,
    query.from.id
  );
  Telegram.answerCallbackQuery(query.id, {
    show_alert: typeof res === 'string',
    text: typeof res === 'string' ? res : undefined,
  }).catch(() => {});
});

const handleAdminCommand = async (
  command: keyof typeof AdminKeys,
  message: TelegramBot.Message,
  userId: number
) => {
  if (String(message.chat.id) !== String(Telegram.data.groupId))
    return undefined;
  if (command === 'ASSIGN') {
    return await Telegram.AssignTopic(message, userId);
  } else if (command === 'MARK_DONE') {
    return await Telegram.MarkTopicDone(message, userId);
  } else if (command === 'BLOCK') {
    return await Telegram.BlockUser(message, userId);
  } else if (command === 'INFO') {
    return await Telegram.SendTopicInfo(message, userId);
  } else if (command === 'END_DIALOG') {
    return await Telegram.EndDialog(message, userId);
  }
  return undefined;
};
