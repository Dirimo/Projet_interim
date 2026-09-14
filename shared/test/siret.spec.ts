import { describe, expect, it } from 'vitest';
import { siretValide } from '../src/siret';
import { clientCreateSchema } from '../src/client';

describe('siretValide', () => {
  it('accepte un SIRET dont la cle de Luhn est bonne', () => {
    expect(siretValide('48291736500017')).toBe(true);
    expect(siretValide('73282932000074')).toBe(true);
  });

  it('refuse un SIRET dont la cle est fausse', () => {
    expect(siretValide('48291736500019')).toBe(false);
  });

  it('refuse ce qui n est pas 14 chiffres', () => {
    expect(siretValide('482917365')).toBe(false);
    expect(siretValide('4829173650001A')).toBe(false);
    expect(siretValide('')).toBe(false);
  });

  it('accepte l exception documentee de La Poste', () => {
    expect(siretValide('35600000000048')).toBe(true);
  });
});

describe('clientCreateSchema', () => {
  const base = { raisonSociale: 'SAAD Test' };

  it('normalise un SIRET saisi avec des espaces', () => {
    const resultat = clientCreateSchema.safeParse({ ...base, siret: '732 829 320 00074' });

    expect(resultat.success).toBe(true);
    expect(resultat.data?.siret).toBe('73282932000074');
  });

  it('refuse un IDCC qui n est pas a quatre chiffres', () => {
    expect(
      clientCreateSchema.safeParse({ ...base, siret: '73282932000074', idcc: '12' }).success,
    ).toBe(false);
  });

  // Le perimetre est reduit aux SAAD : le type n'est plus a saisir, et un type
  // hors perimetre doit etre refuse plutot qu'ignore en silence.
  it('retient SAAD quand le type est omis', () => {
    const resultat = clientCreateSchema.safeParse({ ...base, siret: '73282932000074' });

    expect(resultat.success).toBe(true);
    expect(resultat.data?.type).toBe('SAAD');
  });

  it('refuse un type hors perimetre', () => {
    expect(
      clientCreateSchema.safeParse({ ...base, siret: '73282932000074', type: 'EHPAD' }).success,
    ).toBe(false);
  });
});
