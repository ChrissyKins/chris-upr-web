import { useState } from 'react';
import PokemonPicker from './PokemonPicker';
import { getGamePokemon } from '../data/gameData';
import { POKEMON_BY_NAME } from '../data/pokemon';
import { ALL_TYPES } from '../data/pokemonFilters';

export default function PokemonStatsEditor({ edits, onChange }) {
  const [selectedPokemon, setSelectedPokemon] = useState('');
  const gamePokemon = getGamePokemon();

  const pokemonId = selectedPokemon ? (POKEMON_BY_NAME[selectedPokemon.toUpperCase()]?.id || 0) : 0;
  const original = gamePokemon.find(p => p.id === pokemonId);
  const currentEdit = edits.find(e => e.id === pokemonId);

  function getField(field) {
    if (currentEdit && currentEdit[field] !== undefined && currentEdit[field] !== null) return currentEdit[field];
    return original ? original[field] : '';
  }

  function handleFieldChange(field, value) {
    const existing = edits.find(e => e.id === pokemonId);
    if (existing) {
      onChange(edits.map(e => e.id === pokemonId ? { ...e, [field]: value } : e));
    } else {
      onChange([...edits, { id: pokemonId, [field]: value }]);
    }
  }

  function handleReset() {
    onChange(edits.filter(e => e.id !== pokemonId));
  }

  const isEdited = !!currentEdit;

  const STAT_FIELDS = [
    { key: 'hp', label: 'HP' },
    { key: 'atk', label: 'Atk' },
    { key: 'def', label: 'Def' },
    { key: 'spatk', label: 'SpAtk' },
    { key: 'spdef', label: 'SpDef' },
    { key: 'speed', label: 'Speed' },
  ];

  return (
    <div className="extra-editor">
      <div className="extra-editor-header">
        <b>Pokemon Stats / Types</b>
        {edits.length > 0 && ` (${edits.length} Pokemon edited)`}
      </div>

      {edits.length > 0 && (
        <div className="edited-list">
          Edited:{' '}
          {edits.map((e, i) => {
            const pk = gamePokemon.find(p => p.id === e.id);
            return (
              <span key={e.id}>
                {i > 0 && ', '}
                <a href="#" onClick={(ev) => { ev.preventDefault(); setSelectedPokemon(pk?.name || ''); }}>{pk?.name || `#${e.id}`}</a>
              </span>
            );
          })}
          {' '}<a href="#" onClick={(e) => { e.preventDefault(); onChange([]); }}>[Clear All Edits]</a>
        </div>
      )}

      <div className="learnset-picker">
        <span className="trade-label">Select Pokemon:</span>
        <PokemonPicker value={selectedPokemon} onChange={setSelectedPokemon} />
      </div>

      {pokemonId > 0 && original && (
        <div className="pokemon-edit-panel">
          <div className="extra-editor-header" style={{ marginTop: 8 }}>
            <b>{selectedPokemon}</b>
            {isEdited && <> (customized) <a href="#" onClick={(e) => { e.preventDefault(); handleReset(); }}>[Reset to Default]</a></>}
          </div>

          <div className="stats-edit-section">
            <div className="type-edit-row">
              <span className="trade-label">Type 1:</span>
              <select
                value={getField('type1') || ''}
                onChange={(e) => handleFieldChange('type1', e.target.value || null)}
                className="type-select"
              >
                {ALL_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="trade-label" style={{ marginLeft: 12 }}>Type 2:</span>
              <select
                value={getField('type2') || ''}
                onChange={(e) => handleFieldChange('type2', e.target.value || null)}
                className="type-select"
              >
                <option value="">(none)</option>
                {ALL_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <table className="extra-table stats-table">
              <thead>
                <tr>
                  <th></th>
                  {STAT_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                  <th>BST</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="col-label">Original</td>
                  {STAT_FIELDS.map(f => <td key={f.key} className="col-num">{original[f.key]}</td>)}
                  <td className="col-num"><b>{original.bst}</b></td>
                </tr>
                <tr>
                  <td className="col-label">Custom</td>
                  {STAT_FIELDS.map(f => (
                    <td key={f.key}>
                      <input
                        type="number"
                        className="stat-input"
                        min="1"
                        max="255"
                        value={getField(f.key)}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v) && v >= 1 && v <= 255) handleFieldChange(f.key, v);
                        }}
                      />
                    </td>
                  ))}
                  <td className="col-num">
                    <b>{STAT_FIELDS.reduce((sum, f) => sum + (parseInt(getField(f.key)) || 0), 0)}</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
