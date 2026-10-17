import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLanguage, getCurrentLanguage, LANGUAGES, translations, localizeLogEntry } from './i18n';

describe('Internationalization (i18n) Engine', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  it('supports all 6 requested languages', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(['en', 'de', 'es', 'fr', 'pirate', 'klingon']);
  });

  it('translates strings in English by default', () => {
    setLanguage('en');
    expect(getCurrentLanguage()).toBe('en');
    expect(t('fold')).toBe('Fold');
    expect(t('check')).toBe('Check');
    expect(t('total_pot')).toBe('Total Pot');
  });

  it('translates correctly in German (Deutsch)', () => {
    setLanguage('de');
    expect(getCurrentLanguage()).toBe('de');
    expect(t('fold')).toBe('Passen');
    expect(t('check')).toBe('Checken');
    expect(t('total_pot')).toBe('Gesamtpot');
  });

  it('translates correctly in Spanish (Español)', () => {
    setLanguage('es');
    expect(getCurrentLanguage()).toBe('es');
    expect(t('fold')).toBe('Retirarse');
    expect(t('check')).toBe('Pasar');
    expect(t('total_pot')).toBe('Bote Total');
  });

  it('translates correctly in French (Français)', () => {
    setLanguage('fr');
    expect(getCurrentLanguage()).toBe('fr');
    expect(t('fold')).toBe('Se coucher');
    expect(t('check')).toBe('Parole');
    expect(t('total_pot')).toBe('Pot Total');
  });

  it('translates correctly in Pirate Speak', () => {
    setLanguage('pirate');
    expect(getCurrentLanguage()).toBe('pirate');
    expect(t('fold')).toBe('Walk the Plank');
    expect(t('total_pot')).toBe("Captain's Chest");
    expect(t('dealer_badge')).toBe("Cap'n");
  });

  it('translates correctly in tlhIngan Hol (Klingon)', () => {
    setLanguage('klingon');
    expect(getCurrentLanguage()).toBe('klingon');
    expect(t('fold')).toBe('yImej (Fold)');
    expect(t('dealer_badge')).toBe('HoD');
  });

  it('interpolates template parameters properly', () => {
    setLanguage('en');
    expect(t('waiting_on', { name: 'Kirk' })).toBe('Waiting on Kirk to act...');
    expect(t('hand_number', { number: 42 })).toBe('Hand #42');
  });

  it('ensures each language dictionary has complete keys', () => {
    const enKeys = Object.keys(translations.en);
    for (const lang of LANGUAGES) {
      const dict = translations[lang.code];
      for (const key of enKeys) {
        expect(dict[key as keyof typeof translations.en], `Missing translation for key ${key} in ${lang.code}`).toBeDefined();
      }
    }
  });

  it('localizes action log entries dynamically into the user language', () => {
    // English
    setLanguage('en');
    expect(localizeLogEntry('Alice folds.')).toBe('Alice folds.');
    expect(localizeLogEntry('Bob checks.')).toBe('Bob checks.');
    expect(localizeLogEntry('Charlie raises to 150.')).toBe('Charlie raises to 150.');
    expect(localizeLogEntry('--- Hand #3 Started ---')).toBe('--- Hand #3 Started ---');
    expect(localizeLogEntry('--- Dealing FLOP ---')).toBe('--- Dealing Flop ---');

    // German
    setLanguage('de');
    expect(localizeLogEntry('Alice folds.')).toBe('Alice passt.');
    expect(localizeLogEntry('Bob checks.')).toBe('Bob checkt.');
    expect(localizeLogEntry('Charlie raises to 150.')).toBe('Charlie erhöht auf 150.');
    expect(localizeLogEntry('--- Hand #3 Started ---')).toBe('--- Hand #3 gestartet ---');
    expect(localizeLogEntry('--- Dealing FLOP ---')).toBe('--- Gebe Flop aus ---');

    // Pirate
    setLanguage('pirate');
    expect(localizeLogEntry('Alice folds.')).toBe('Alice walked the plank (folded).');
    expect(localizeLogEntry('Bob checks.')).toBe('Bob taps the timber.');
    expect(localizeLogEntry('Charlie raises to 150.')).toBe('Charlie raises the bounty to 150.');
    expect(localizeLogEntry('--- Hand #3 Started ---')).toBe('--- Bout #3 under sail! ---');

    // Klingon
    setLanguage('klingon');
    expect(localizeLogEntry('Alice folds.')).toBe('Alice jegh (folded).');
  });
});

