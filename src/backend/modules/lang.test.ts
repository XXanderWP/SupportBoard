import { DetectLangByMessage, LangString, LangStringMsg } from './lang';

describe('backend lang module', () => {
  const originalLang = process.env.LANG;

  beforeEach(() => {
    process.env.LANG = 'en';
  });

  afterAll(() => {
    process.env.LANG = originalLang;
  });

  it('detects language from message when supported', () => {
    const message = { from: { language_code: 'uk' } } as any;
    expect(DetectLangByMessage(message)).toBe('uk');
  });

  it('falls back to env LANG when message language is unsupported', () => {
    const message = { from: { language_code: 'de' } } as any;
    expect(DetectLangByMessage(message)).toBe('en');
  });

  it('returns localized text using env language', () => {
    process.env.LANG = 'uk';
    expect(LangString('topic.info')).toBe('💬 Інформація про тікет');
  });

  it('returns localized text by message language', () => {
    const message = { from: { language_code: 'uk' } } as any;
    expect(LangStringMsg(message, 'topic.info')).toBe('💬 Інформація про тікет');
  });
});
