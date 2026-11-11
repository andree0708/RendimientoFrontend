import { normalizeRisk, riskEs } from './risk-labels';

describe('risk-labels', () => {
  it('translates bare risk codes', () => {
    expect(riskEs('low')).toBe('Bajo');
    expect(riskEs('moderate')).toBe('Moderado');
    expect(riskEs('high')).toBe('Alto');
    expect(riskEs('unknown')).toBe('Desconocido');
  });

  it('translates suffixed codes from the ML API', () => {
    expect(riskEs('low_risk')).toBe('Bajo');
    expect(riskEs('moderate_risk')).toBe('Moderado');
    expect(riskEs('high_risk')).toBe('Alto');
    expect(riskEs('LOW_RISK')).toBe('Bajo');
  });

  it('never leaks raw codes or blanks', () => {
    expect(riskEs(null)).toBe('Desconocido');
    expect(riskEs(undefined)).toBe('Desconocido');
    expect(riskEs('')).toBe('Desconocido');
    expect(riskEs('weird_status')).toBe('Weird status');
  });

  it('normalizes codes for downstream use', () => {
    expect(normalizeRisk('moderate_risk')).toBe('moderate');
    expect(normalizeRisk('high')).toBe('high');
  });
});
