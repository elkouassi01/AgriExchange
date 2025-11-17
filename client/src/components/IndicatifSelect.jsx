import React from 'react';
import { useCallingCodes, countryCodeToFlag } from '../hooks/useCallingCodes';

export default function IndicatifSelect({ value, onChange }) {
  const { codes, loading } = useCallingCodes();

  if (loading) return <select disabled><option>Chargement...</option></select>;

  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="indicatif-select">
      {codes.map(c => (
        <option key={`${c.iso}-${c.code}`} value={`+${c.code}`}>
          {countryCodeToFlag(c.iso)} +{c.code} — {c.pays}
        </option>
      ))}
    </select>
  );
}
