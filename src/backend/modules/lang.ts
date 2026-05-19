import TelegramBot from 'node-telegram-bot-api';
import { getAllLangs, langData, langString, langType } from '../../lang';

export const DetectLangByMessage = (message: TelegramBot.Message): langType => {
  const code = message.from?.language_code;
  const allLangs = getAllLangs();
  if (code && allLangs.includes(code as any)) {
    return code as any;
  }
  return process.env.LANG as langType;
};

export const LangString = (
  key: langData,
  ...args: (number | string | boolean)[]
) => {
  return langString(process.env.LANG as any, key, ...args);
};

export const LangStringMsg = (
  msg: TelegramBot.Message,
  key: langData,
  ...args: (number | string | boolean)[]
) => {
  const lang = DetectLangByMessage(msg);
  return langString(lang, key, ...args);
};
