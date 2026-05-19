import {
  getAllLangs,
  langString,
  langStringExist,
  allLangStrings,
} from './index';

describe('lang index module', () => {
  it('returns supported language list', () => {
    expect(getAllLangs()).toEqual(['en', 'uk', 'ru']);
  });

  it('falls back to en for unknown language code', () => {
    const value = langString('de' as any, 'topic.info');
    expect(value).toBe(langString('en', 'topic.info'));
  });

  it('replaces placeholders in strings', () => {
    const value = langString('en', 'topic.key.assign.replace', 'Admin');
    expect(value).toContain('Admin');
    expect(value).not.toContain('%1%');
  });

  it('checks key existence against language dictionary', () => {
    expect(langStringExist('topic.info')).toBe(true);
    expect(langStringExist('unknown.key')).toBe(false);
    expect(langStringExist()).toBe(false);
  });

  it('returns string list for all languages', () => {
    const values = allLangStrings('topic.info');
    expect(values).toHaveLength(3);
    expect(values).toContain(langString('en', 'topic.info'));
  });
});
