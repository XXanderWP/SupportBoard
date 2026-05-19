import { GenerateInlineKeyboard } from './keycontrol';
import { LangString } from './lang';

describe('GenerateInlineKeyboard', () => {
  const originalLang = process.env.LANG;

  beforeEach(() => {
    process.env.LANG = 'en';
  });

  afterAll(() => {
    process.env.LANG = originalLang;
  });

  it('returns client keyboard with one END_DIALOG button', () => {
    const keyboard = GenerateInlineKeyboard(true);

    expect(keyboard).toHaveLength(1);
    expect(keyboard[0]).toHaveLength(1);
    expect(keyboard[0][0]).toEqual({
      text: LangString('topic.key.client.endDialog'),
      callback_data: 'END_DIALOG',
    });
  });

  it('returns admin keyboard with expected button layout', () => {
    const keyboard = GenerateInlineKeyboard(false);

    expect(keyboard).toHaveLength(3);
    expect(keyboard[0].map(button => button.callback_data)).toEqual([
      'ASSIGN',
      'MARK_DONE',
    ]);
    expect(keyboard[1].map(button => button.callback_data)).toEqual([
      'BLOCK',
      'INFO',
    ]);
    expect(keyboard[2].map(button => button.callback_data)).toEqual([
      'END_DIALOG',
    ]);
  });
});
