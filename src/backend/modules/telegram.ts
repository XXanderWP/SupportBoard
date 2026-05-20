import TelegramBot from 'node-telegram-bot-api';
import { GetTelegramData } from './data';
import { Storage } from './storage';
import { TopicStatus } from '../../shared/topic';
import { time } from '@xxanderwp/jstoolkit';
import { LangString, LangStringMsg } from './lang';
import { GenerateInlineKeyboard } from './keycontrol';
import { StorageDefault } from '../../shared/storage';
import { AiChat } from './ai';
const data = GetTelegramData();

export const Telegram = new (class extends TelegramBot {
  readonly data = data;
  constructor() {
    super(data.token, { polling: true });

    Storage.OnLoad(() => {
      this.getMe()
        .then(async botInfo => {
          console.log(
            `Telegram bot started as @${botInfo.username}\nLink: https://t.me/${botInfo.username}\nGroup ID: ${data.groupId}`
          );
          const info = await this.getGroupInfo(botInfo);
          if (!info.inGroup) {
            throw new Error(
              'Warning: The bot is not in the specified group. Please add it to the group and make it an admin.'
            );
          } else if (!info.topic) {
            throw new Error(
              'Warning: The group does not have topics enabled. Please enable topics in the group settings for better performance.'
            );
          }

          const topics = Storage.Get('topics')?.length;
          console.log(`Current topics in storage: ${topics}`);
        })
        .catch(error => {
          console.error('Failed to start Telegram bot:', error);
        });
    });
  }

  HandleMessage = (callback: (message: TelegramBot.Message) => void) => {
    this.on('message', callback);
  };

  async getGroupInfo(me?: TelegramBot.User): Promise<TelegramCore.GroupInfo> {
    try {
      if (!me) me = await this.getMe();

      // Проверяем статус бота
      const member = await this.getChatMember(data.groupId, me.id);

      const inGroup =
        member.status === 'administrator' || member.status === 'creator';

      // Получаем информацию о чате
      const chat = await this.getChat(data.groupId);

      // В супергруппах Telegram отдаёт is_forum=true
      const topic = chat.is_forum === true;

      return {
        inGroup,
        topic,
      };
    } catch (err) {
      return {
        inGroup: false,
        topic: false,
      };
    }
  }

  get topics() {
    return Storage.Get('topics');
  }

  GetTopicIdByUserId(user_id: string) {
    return this.topics?.find(t => t.user_id === user_id);
  }

  /** Create a new topic in the forum */
  CreateTopic(message: TelegramBot.Message) {
    const user_id = String(message.from?.id);
    const user_login = message.from?.username;
    return new Promise<string | undefined>(async resolve => {
      const removeTopics = Storage.Get('removeTopics') || [];

      let count = Storage.Get('topics')?.length + removeTopics.length || 0;

      if (count >= Number(process.env.TOPIC_LIMITS)) {
        const removeCandidate = removeTopics[0];
        if (removeCandidate) {
          Storage.UpdateData(
            {
              removeTopics: removeTopics.slice(1),
            },
            true
          );
          try {
            await this.deleteForumTopic(
              String(data.groupId),
              parseInt(removeCandidate)
            );
            count--;
          } catch (error) {
            return resolve(undefined);
          }
        }
      }

      if (count >= Number(process.env.TOPIC_LIMITS)) {
        return resolve(undefined);
      }

      const name = `#${user_id} | ${user_login}`;
      this.createForumTopic(data.groupId, name, {
        icon_custom_emoji_id: TopicStatus.Done,
      })
        .then(async (topic: any) => {
          const topic_data = topic as {
            message_thread_id: number;
            name: string;
            icon_color: number;
          };

          let msgText = LangString(
            'topic.createmessage',
            user_id,
            user_login || 'Unknown',
            user_login ? `https://t.me/${user_login}` : 'Unknown'
          );
          const oldAiSummaryCache = AiChat.GetOldSummaryCacheMessages(user_id);
          if (oldAiSummaryCache.length > 0) {
            msgText += `\n\n${LangString('topic.createmessageSummaryInfo')}\n\n${oldAiSummaryCache
              .map(
                id =>
                  `- https://t.me/c/${String(data.groupId).substring(4)}/${id}`
              )
              .join('\n')}`;
          }
          await this.sendMessage(String(data.groupId), msgText, {
            message_thread_id: topic_data.message_thread_id,
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: GenerateInlineKeyboard(false),
            },

            disable_notification: true,
          }).then(msg => {
            if (msg) {
              this.pinChatMessage(String(data.groupId), msg.message_id, {
                message_thread_id: topic_data.message_thread_id,
              } as any).catch(err => {
                console.error('Failed to pin init message in topic:', err);
              });
            }
          });
          await this.sendMessage(
            String(user_id),
            LangString('topic.message.client.create'),
            {
              disable_web_page_preview: true,
              reply_markup: {
                inline_keyboard: GenerateInlineKeyboard(true),
              },
            }
          ).catch(err => {});
          Storage.UpdateData({
            topics: [
              ...(Storage.Get('topics') || []),
              {
                user_id,
                topic_id: String(topic_data.message_thread_id),
                user_login,
                answered: false,
                last_message_time: time.timestamp(),
                message_pairs: [],
              },
            ],
          });

          resolve(String(topic_data.message_thread_id));
        })
        .catch(err => {
          console.error('Failed to create topic:', err);
          resolve(undefined);
        });
    });
  }
  async EndDialog(message: TelegramBot.Message, userId: number) {
    const topics = Storage.Get('topics');
    const by_admin = String(message.chat?.id) === String(Telegram.data.groupId);
    const topic = by_admin
      ? topics?.find(t => t.topic_id === String(message.message_thread_id))
      : topics?.find(t => t.user_id === String(message.chat.id));
    if (!topic) return undefined;

    setTimeout(async () => {
      try {
        await this.sendMessage(
          String(data.groupId),
          LangString(
            'topic.message.admin.endDialog',
            LangString(
              by_admin
                ? 'topic.message.admin.endDialog.byAdmin'
                : 'topic.message.admin.endDialog.byClient'
            )
          ),
          {
            message_thread_id: parseInt(topic.topic_id),
          }
        );
      } catch (error) {}
      try {
        await this.sendMessage(
          String(topic.user_id),
          LangString('topic.message.client.endDialog')
        );
      } catch (error) {}
    }, 100);

    if (AiChat.activeSummary) {
      setTimeout(async () => {
        try {
          console.log(`Generating dialog summary for user ${topic.user_id}...`);
          const summary = await AiChat.GenerateSummaryDialog(topic.user_id);
          if (summary)
            this.sendMessage(
              this.data.groupId,
              `${LangString('ai.summaryDialogTitle', topic.user_login ? `@${topic.user_login}` : '')} ${topic.user_id}:\n\n${summary}`,
              {
                disable_web_page_preview: true,
                disable_notification: true,
              }
            ).then(msg => {
              if (msg) {
                Storage.UpdateData({
                  ai_summary_cache: [
                    ...(Storage.Get('ai_summary_cache') || []),
                    [topic.user_id, String(msg.message_id)],
                  ],
                });
              }
            });
        } catch (error) {
          // Error handling is important, but we don't want to disrupt the main flow if summary generation fails. We can log the error for debugging purposes.
        }
      }, 1000);
    }

    setTimeout(() => {
      if (process.env.KEEP_CLOSED_TOPICS !== 'true') {
        this.deleteForumTopic(String(data.groupId), parseInt(topic.topic_id));
      } else {
        this.editForumTopic(String(data.groupId), parseInt(topic.topic_id), {
          name: `#${topic.user_id} | ${topic.user_login || 'Unknown'} | Closed`,
          icon_custom_emoji_id: TopicStatus.Closed,
        }).catch(() => {});
      }
    }, 500);

    Storage.UpdateData(
      {
        topics:
          Storage.Get('topics')?.filter(t => t.topic_id !== topic.topic_id) ||
          [],
        removeTopics:
          process.env.KEEP_CLOSED_TOPICS !== 'true'
            ? Storage.Get('removeTopics') || []
            : [...(Storage.Get('removeTopics') || []), topic.topic_id],
      },
      true
    );

    console.log(`Dialog with user ${topic.user_id} ended and topic deleted.`);

    return LangString('topic.message.notify.endDialog');
  }
  AssignTopic(message: TelegramBot.Message, userId: number) {
    const topic_id = String(message.message_thread_id);
    if (!userId) return undefined;
    const topics = Storage.Get('topics');
    const topic = topics?.find(t => t.topic_id === topic_id);
    if (!topic) return undefined;
    if (topic.assigned_to === String(userId))
      return LangString('topic.key.assign.already');
    const text = LangString(
      topic.assigned_to ? 'topic.key.assign.replace' : 'topic.key.assign.done',
      String(topic.assigned_to)
    );

    topic.assigned_to = String(userId);
    this.UpdateTopicInfo(topic);
    return text;
  }
  MarkTopicDone(message: TelegramBot.Message, userId: number) {
    const topic_id = String(message.message_thread_id);
    const topics = Storage.Get('topics');
    const topic = topics?.find(t => t.topic_id === topic_id);
    if (!topic) return undefined;
    topic.answered = true;
    this.UpdateTopicInfo(topic);
    LangString('topic.key.markDone.done');
  }
  BlockUser(message: TelegramBot.Message, userId: number) {
    const topic_id = String(message.message_thread_id);
    const topics = Storage.Get('topics');
    const topic = topics?.find(t => t.topic_id === topic_id);
    if (!topic) return undefined;
    topic.answered = true;
    if (userId) {
      topic.blocked_by = String(userId);
    }
    this.UpdateTopicInfo(topic);
    LangString('topic.key.block.done');
  }
  async SendTopicInfo(message: TelegramBot.Message, userId: number) {
    const topic_id = String(message.message_thread_id);
    const topics = Storage.Get('topics');
    const topic = topics?.find(t => t.topic_id === topic_id);
    if (!topic) return;
    const user_id = topic.user_id;
    const user_login = topic.user_login;

    const admin = topic.assigned_to
      ? await this.getChat(topic.assigned_to)
      : null;
    const admin_name = admin
      ? admin.username
        ? `@${admin.username}`
        : admin.first_name || 'Unknown'
      : LangString('topic.no_admin');

    let msgText = LangString(
      'topic.infomessage',
      user_id,
      user_login ? `@${user_login}` : 'Unknown',
      user_login ? `https://t.me/${user_login}` : 'Unknown',
      admin_name
    );

    const client = await this.getChat(topic.user_id);

    if (!client) {
      msgText += `\n${LangString('topic.no_client')}`;
    }
    if (topic.blocked_by) {
      msgText += `\n${LangString('topic.blocked')} (${topic.blocked_by})`;
    }

    this.sendMessage(String(data.groupId), msgText, {
      message_thread_id: parseInt(topic.topic_id),
      disable_web_page_preview: true,
      disable_notification: true,
      reply_markup: {
        inline_keyboard: GenerateInlineKeyboard(false),
      },
    });
  }
  async UpdateTopicInfo(topic: (typeof StorageDefault.topics)[0]) {
    if (!topic) return;
    const topics = Storage.Get('topics');
    const topicIndex = topics?.findIndex(
      t => t.topic_id === String(topic.topic_id)
    );
    if (topicIndex !== undefined && topicIndex >= 0) {
      topics![topicIndex] = topic;
      Storage.UpdateData({ topics: topics || [] }, true);
    }
    const client = await this.getChat(topic.user_id);
    let user_id = topic.user_id;
    let user_login = topic.user_login;
    if (client) {
      user_id = client.id ? String(client.id) : user_id;
      user_login = client.username || user_login;
    }

    this.editForumTopic(
      String(data.groupId),
      parseInt(topic.topic_id as string),
      {
        name: `#${user_id} | ${user_login || 'Unknown'} | ${topic.assigned_to ? `Admin: ${topic.assigned_to}` : 'No admin'}`,
        icon_custom_emoji_id: this.GetTopicIcon(topic),
      }
    ).catch(err => {
      // console.error('Failed to update topic name:', err);
    });
  }

  GetTopicIcon(topic: (typeof StorageDefault.topics)[0]) {
    if (topic.blocked_by) {
      return TopicStatus.Blocked;
    }
    if (topic.answered) {
      return TopicStatus.Done;
    }
    if (topic.deleted) {
      return TopicStatus.Closed;
    }
    if (topic.writing_admin || topic.writing_client) {
      return TopicStatus.Writing;
    }
    return TopicStatus.Waiting;
  }

  async syncMessage(msg: TelegramBot.Message, topic_id: string) {
    const topic = Storage.Get('topics')?.find(t => t.topic_id === topic_id);
    if (!topic) return;
    const mapping = topic.message_pairs.find(
      pair => pair[0] === String(msg.message_id)
    );
    if (!mapping) return;
    const target_message_id = mapping[1];
    if (!target_message_id) return;
    const fromClient = String(msg.chat.id) !== String(this.data.groupId);
    const chat_id = fromClient ? String(this.data.groupId) : topic.user_id;

    if (msg.text) {
      return this.editMessageText(msg.text, {
        chat_id: chat_id,
        message_id: parseInt(target_message_id),
        entities: msg.entities,
        reply_markup: {
          inline_keyboard: GenerateInlineKeyboard(fromClient),
        },
      } as any);
    }

    if (msg.caption) {
      return this.editMessageCaption(msg.caption, {
        chat_id: chat_id,
        message_id: parseInt(target_message_id),
        caption_entities: msg.caption_entities,
        reply_markup: {
          inline_keyboard: GenerateInlineKeyboard(fromClient),
        },
      });
    }
  }
})();
