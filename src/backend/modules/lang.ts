import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { getAllLangs, langData, langString, langType } from '../../lang';

let DefaultLang: langType = fs.existsSync('.lang')
  ? (fs.readFileSync('.lang', 'utf-8') as langType)
  : (process.env.LANG as langType);

if (!getAllLangs().includes(DefaultLang)) {
  console.warn(
    `Default language "${DefaultLang}" is not in the list of supported languages. Falling back to "en".`
  );
  DefaultLang = 'en';
}

export const GetLang = () => {
  return DefaultLang;
};

export const DetectLangByMessage = (message: TelegramBot.Message): langType => {
  const code = message.from?.language_code;
  const allLangs = getAllLangs();
  if (code && allLangs.includes(code as any)) {
    return code as any;
  }
  return DefaultLang;
};

export const LangString = (
  key: langData,
  ...args: (number | string | boolean)[]
) => {
  return langString(DefaultLang, key, ...args);
};

export const LangStringMsg = (
  msg: TelegramBot.Message,
  key: langData,
  ...args: (number | string | boolean)[]
) => {
  const lang = DetectLangByMessage(msg);
  return langString(lang, key, ...args);
};
