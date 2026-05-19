import TelegramBot from 'node-telegram-bot-api';
import { langData } from '../../lang';
import { LangString } from './lang';

export const AdminKeys = {
  ASSIGN: 'topic.key.assign' as langData,
  BLOCK: 'topic.key.block' as langData,
  INFO: 'topic.info' as langData,
  MARK_DONE: 'topic.key.markDone' as langData,
  END_DIALOG: 'topic.key.client.endDialog' as langData,
} as const;
export const UsersKeys = {
  END_DIALOG: 'topic.key.client.endDialog' as langData,
} as const;

export const GenerateInlineKeyboard = (
  forClient: boolean
): TelegramBot.InlineKeyboardButton[][] => {
  return forClient
    ? [
        [
          {
            text: LangString(UsersKeys.END_DIALOG),
            callback_data: 'END_DIALOG',
          },
        ],
      ]
    : [
        [
          {
            text: LangString(AdminKeys.ASSIGN),
            callback_data: 'ASSIGN',
          },
          {
            text: LangString(AdminKeys.MARK_DONE),
            callback_data: 'MARK_DONE',
          },
        ],
        [
          {
            text: LangString(AdminKeys.BLOCK),
            callback_data: 'BLOCK',
          },
          {
            text: LangString(AdminKeys.INFO),
            callback_data: 'INFO',
          },
        ],
        [
          {
            text: LangString(AdminKeys.END_DIALOG),
            callback_data: 'END_DIALOG',
          },
        ],
      ];
};
