import fs from 'fs';

export const GetTelegramData = () => {
  let data = fs.readFileSync('.group', 'utf-8');
  if (!data) data = process.env.TELEGRAM_GROUP_ID || '';
  const groupId = data.trim();
  let token = fs.readFileSync('.secret', 'utf-8').trim();
  if (!token) token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!groupId || !token) {
    throw new Error(
      'Telegram group ID or bot token is missing. Please set them in the .group and .secret files or in the environment variables.'
    );
  }
  return { groupId, token };
};
