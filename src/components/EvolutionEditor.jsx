import { useState } from 'react';
import PokemonPicker from './PokemonPicker';
import { getGameEvolutions, getGamePokemon } from '../data/gameData';
import { POKEMON_BY_NAME } from '../data/pokemon';

const EVOLUTION_METHODS = [
  'LEVEL', 'STONE', 'TRADE', 'TRADE_ITEM', 'HAPPINESS', 'HAPPINESS_DAY', 'HAPPINESS_NIGHT',
  'LEVEL_ATTACK_HIGHER', 'LEVEL_DEFENSE_HIGHER', 'LEVEL_ATK_DEF_SAME',
  'LEVEL_HIGH_BEAUTY', 'LEVEL_ITEM_DAY', 'LEVEL_ITEM_NIGHT',
  'LEVEL_WITH_MOVE', 'LEVEL_WITH_OTHER',
  'LEVEL_MALE_ONLY', 'LEVEL_FEMALE_ONLY',
];

export default function EvolutionEditor({ edits, onChange }) {
  const [selectedPokemon, setSelectedPokemon] = useState('');
  const allEvolutions = getGameEvolutions();
  const gamePokemon = getGamePokemon();

  const pokemonId = selectedPokemon ? (POKEMON_BY_NAME[selectedPokemon.toUpperCase()]?.id || 0) : 0;

  // Get original evolutions from this Pokemon
  const originalEvos = allEvolutions.filter(e => e.fromId === pokemonId);
  // Get custom edits for this Pokemon
  const customEvos = edits.filter(e => e.fromId === pokemonId);

  // Merge: show originals with overrides, plus any new additions
  const displayEvos = originalEvos.map(orig => {
    const edit = customEvos.find(e => e.toId === orig.toId);
    return edit || { fromId: orig.fromId, toId: orig.toId, method: orig.method, extraInfo: 0, isOriginal: true };
  });
  // Add any custom evos that don't match an original
  for (const edit of customEvos) {
    if (!originalEvos.find(o => o.toId === edit.toId)) {
      displayEvos.push(edit);
    }
  }

  function handleEvoChange(toId, field, value) {
    const existing = edits.find(e => e.fromId === pokemonId && e.toId === toId);
    if (existing) {
      onChange(edits.map(e => (e.fromId === pokemonId && e.toId === toId) ? { ...e, [field]: value } : e));
    } else {
      const orig = originalEvos.find(o => o.toId === toId);
      const newEdit = {
        fromId: pokemonId,
        toId,
        method: orig?.method || 'LEVEL',
        extraInfo: 0,
        [field]: value,
      };
      onChange([...edits, newEdit]);
    }
  }

  function handleRemoveEvo(toId) {
    onChange(edits.filter(e => !(e.fromId === pokemonId && e.toId === toId)));
  }

  function handleAddEvo() {
    const newEdit = { fromId: pokemonId, toId: 0, method: 'LEVEL', extraInfo: 30 };
    onChange([...edits, newEdit]);
  }

  function handleNewEvoTarget(oldToId, newName) {
    const newId = newName ? (POKEMON_BY_NAME[newName.toUpperCase()]?.id || 0) : 0;
    onChange(edits.map(e => (e.fromId === pokemonId && e.toId === oldToId) ? { ...e, toId: newId } : e));
  }

  const editedFromIds = [...new Set(edits.map(e => e.fromId))];

  return (
    <div className="extra-editor">
      <div className="extra-editor-header">
        <b>Evolutions</b>
        {edits.length > 0 && ` (${edits.length} edits)`}
      </div>

      {editedFromIds.length > 0 && (
        <div className="edited-list">
          Edited:{' '}
          {editedFromIds.map((id, i) => {
            const pk = gamePokemon.find(p => p.id === id);
            return (
              <span key={id}>
                {i > 0 && ', '}
                <a href="#" onClick={(e) => { e.preventDefault(); setSelectedPokemon(pk?.name || ''); }}>{pk?.name || `#${id}`}</a>
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

      {pokemonId > 0 && (
        <>
          <div className="extra-editor-header" style={{ marginTop: 8 }}>
            <b>{selectedPokemon}</b> - Evolutions
            {' '}<a href="#" onClick={(e) => { e.preventDefault(); handleAddEvo(); }}>[+ Add Evolution]</a>
          </div>

          {displayEvos.length === 0 && <p>No evolutions for this Pokemon.</p>}

          {displayEvos.map((evo, i) => {
            const toPokemon = gamePokemon.find(p => p.id === evo.toId);
            const isCustom = edits.some(e => e.fromId === pokemonId && e.toId === evo.toId);

            return (
              <div key={i} className={`evo-row ${isCustom ? 'row-changed' : ''}`}>
                <div className="evo-fields">
                  <span className="trade-label">Evolves to:</span>
                  {isCustom && !evo.isOriginal ? (
                    <PokemonPicker
                      value={toPokemon?.name || ''}
                      onChange={(name) => handleNewEvoTarget(evo.toId, name)}
                    />
                  ) : (
                    <b>{toPokemon?.name || '???'}</b>
                  )}
                  <span className="trade-label" style={{ marginLeft: 12 }}>Method:</span>
                  <select
                    value={evo.method}
                    onChange={(e) => handleEvoChange(evo.toId, 'method', e.target.value)}
                    className="type-select"
                  >
                    {EVOLUTION_METHODS.map(m => (
                      <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <span className="trade-label" style={{ marginLeft: 12 }}>Extra:</span>
                  <input
                    type="number"
                    className="level-input"
                    min="0"
                    max="999"
                    value={evo.extraInfo || 0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v)) handleEvoChange(evo.toId, 'extraInfo', v);
                    }}
                  />
                  {isCustom && (
                    <> <a href="#" onClick={(e) => { e.preventDefault(); handleRemoveEvo(evo.toId); }}>(remove edit)</a></>
                  )}
                </div>
                {evo.isOriginal && !isCustom && (
                  <span className="evo-detail">{allEvolutions.find(o => o.fromId === pokemonId && o.toId === evo.toId)?.detail || ''}</span>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
