import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { getAllLangs, langData, langString, langType } from '../../lang';
import { isJest } from '../../shared/test';

const DEBUG_LANG =
  !isJest && fs.existsSync('.lang')
    ? (fs.readFileSync('.lang', 'utf-8') as langType)
    : undefined;

let DefaultLang: langType = DEBUG_LANG
  ? DEBUG_LANG
  : (process.env.LANG as langType);

if (!getAllLangs().includes(DefaultLang)) {
  console.warn(
    `Default language "${DefaultLang}" is not in the list of supported languages. Falling back to "en".`
  );
  DefaultLang = 'en';
}

export const GetLang = () => {
  return isJest ? (process.env.LANG as langType) : DefaultLang;
};

export const DetectLangByMessage = (message: TelegramBot.Message): langType => {
  const code = message.from?.language_code;
  const allLangs = getAllLangs();
  if (code && allLangs.includes(code as any)) {
    return code as any;
  }
  return GetLang();
};

export const LangString = (
  key: langData,
  ...args: (number | string | boolean)[]
) => {
  return langString(GetLang(), key, ...args);
};

export const LangStringMsg = (
  msg: TelegramBot.Message,
  key: langData,
  ...args: (number | string | boolean)[]
) => {
  const lang = DetectLangByMessage(msg);
  return langString(lang, key, ...args);
};
