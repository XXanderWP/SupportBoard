import { Telegram } from './telegram';

// Remove system messages in the support group to keep it clean
if (process.env.REMOVE_SYSTEM_MESSAGES === 'true')
  Telegram.HandleMessage(async message => {
    if (String(message.chat.id) !== String(Telegram.data.groupId)) return;
    if (message.forum_topic_edited) {
      Telegram.deleteMessage(Telegram.data.groupId, message.message_id);
    }
  });
