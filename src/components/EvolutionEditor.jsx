import { useState } from 'react';
import PokemonPicker from './PokemonPicker';
import { getGameEvolutions, getGamePokemon } from '../data/gameData';
import { POKEMON_BY_NAME } from '../data/pokemon';

const EVOLUTION_METHODS = ['LEVEL', 'STONE', 'HAPPINESS'];

const STONES = [
  { id: 8, name: 'Moon Stone' },
  { id: 22, name: 'Fire Stone' },
  { id: 23, name: 'Thunderstone' },
  { id: 24, name: 'Water Stone' },
  { id: 34, name: 'Leaf Stone' },
  { id: 169, name: 'Sun Stone' },
];

function getMethodLabel(method) {
  switch (method) {
    case 'LEVEL': return 'Level Up';
    case 'STONE': return 'Stone';
    case 'HAPPINESS': return 'Happiness';
    default: return method.replace(/_/g, ' ');
  }
}

// Map all method variants to the simplified set for display
function simplifyMethod(method) {
  if (method.startsWith('LEVEL')) return 'LEVEL';
  if (method === 'STONE' || method === 'STONE_MALE_ONLY' || method === 'STONE_FEMALE_ONLY') return 'STONE';
  if (method.startsWith('HAPPINESS')) return 'HAPPINESS';
  if (method.startsWith('TRADE')) return 'LEVEL'; // trade evos become level-based when customised
  return 'LEVEL';
}

export default function EvolutionEditor({ edits, onChange }) {
  const [selectedPokemon, setSelectedPokemon] = useState('');
  const allEvolutions = getGameEvolutions();
  const gamePokemon = getGamePokemon();

  const pokemonId = selectedPokemon ? (POKEMON_BY_NAME[selectedPokemon.toUpperCase()]?.id || 0) : 0;

  const originalEvos = allEvolutions.filter(e => e.fromId === pokemonId);
  const customEvos = edits.filter(e => e.fromId === pokemonId);

  // For removed evolutions, track by a special edit with method: 'REMOVED'
  const removedToIds = new Set(edits.filter(e => e.fromId === pokemonId && e.method === 'REMOVED').map(e => e.toId));

  const displayEvos = originalEvos
    .filter(orig => !removedToIds.has(orig.toId))
    .map(orig => {
      const edit = customEvos.find(e => e.toId === orig.toId && e.method !== 'REMOVED');
      if (edit) return edit;
      // Parse extraInfo from the detail string for unedited originals
      let extraInfo = 0;
      const levelMatch = orig.detail?.match(/Level\s+(\d+)/);
      if (levelMatch) extraInfo = parseInt(levelMatch[1]);
      // For stones, extract the stone item ID from the original data
      if (orig.method === 'STONE') {
        const stoneNames = { 'Moon Stone': 8, 'Fire Stone': 22, 'Thunderstone': 23, 'Water Stone': 24, 'Leaf Stone': 34, 'Sun Stone': 169 };
        extraInfo = stoneNames[orig.detail] || 0;
      }
      return { fromId: orig.fromId, toId: orig.toId, method: orig.method, extraInfo, isOriginal: true, detail: orig.detail };
    });
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

  function handleMethodChange(toId, newMethod) {
    // When changing method, set a sensible default for extraInfo
    let defaultExtra = 0;
    if (newMethod === 'LEVEL') defaultExtra = 30;
    else if (newMethod === 'STONE') defaultExtra = STONES[0].id;

    const existing = edits.find(e => e.fromId === pokemonId && e.toId === toId);
    if (existing) {
      onChange(edits.map(e => (e.fromId === pokemonId && e.toId === toId) ? { ...e, method: newMethod, extraInfo: defaultExtra } : e));
    } else {
      const orig = originalEvos.find(o => o.toId === toId);
      onChange([...edits, {
        fromId: pokemonId,
        toId,
        method: newMethod,
        extraInfo: defaultExtra,
      }]);
    }
  }

  function handleRemoveEvo(toId, isOriginal) {
    if (isOriginal) {
      // For original evolutions, add a 'REMOVED' marker so we know to exclude it
      const alreadyRemoved = edits.some(e => e.fromId === pokemonId && e.toId === toId && e.method === 'REMOVED');
      if (!alreadyRemoved) {
        // Remove any existing edits for this evo first, then add the REMOVED marker
        const cleaned = edits.filter(e => !(e.fromId === pokemonId && e.toId === toId));
        onChange([...cleaned, { fromId: pokemonId, toId, method: 'REMOVED', extraInfo: 0 }]);
      }
    } else {
      // For custom-added evolutions, just remove the edit
      onChange(edits.filter(e => !(e.fromId === pokemonId && e.toId === toId)));
    }
  }

  function handleRestoreEvo(toId) {
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

          {displayEvos.length === 0 && removedToIds.size === 0 && <p>No evolutions for this Pokemon.</p>}

          {removedToIds.size > 0 && (
            <div className="removed-evos">
              Removed:{' '}
              {[...removedToIds].map((toId, i) => {
                const pk = gamePokemon.find(p => p.id === toId);
                return (
                  <span key={toId}>
                    {i > 0 && ', '}
                    <s>{pk?.name || '???'}</s>
                    {' '}<a href="#" onClick={(e) => { e.preventDefault(); handleRestoreEvo(toId); }}>(restore)</a>
                  </span>
                );
              })}
            </div>
          )}

          {displayEvos.map((evo, i) => {
            const toPokemon = gamePokemon.find(p => p.id === evo.toId);
            const isCustom = edits.some(e => e.fromId === pokemonId && e.toId === evo.toId);
            const displayMethod = simplifyMethod(evo.method);

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
                    value={displayMethod}
                    onChange={(e) => handleMethodChange(evo.toId, e.target.value)}
                    className="type-select"
                  >
                    {EVOLUTION_METHODS.map(m => (
                      <option key={m} value={m}>{getMethodLabel(m)}</option>
                    ))}
                  </select>

                  {displayMethod === 'LEVEL' && (
                    <>
                      <span className="trade-label" style={{ marginLeft: 12 }}>Level:</span>
                      <input
                        type="number"
                        className="level-input"
                        min="1"
                        max="100"
                        value={evo.extraInfo || 0}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v)) handleEvoChange(evo.toId, 'extraInfo', v);
                        }}
                      />
                    </>
                  )}

                  {displayMethod === 'STONE' && (
                    <>
                      <span className="trade-label" style={{ marginLeft: 12 }}>Stone:</span>
                      <select
                        value={evo.extraInfo || STONES[0].id}
                        onChange={(e) => handleEvoChange(evo.toId, 'extraInfo', parseInt(e.target.value))}
                        className="type-select"
                      >
                        {STONES.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </>
                  )}

                  {isCustom && (
                    <> <a href="#" onClick={(e) => { e.preventDefault(); handleRemoveEvo(evo.toId, false); }}>(remove edit)</a></>
                  )}
                  {!isCustom && (
                    <> <a href="#" onClick={(e) => { e.preventDefault(); handleRemoveEvo(evo.toId, true); }}>(remove)</a></>
                  )}
                </div>
                {evo.isOriginal && !isCustom && evo.detail && (
                  <span className="evo-detail">{evo.detail}</span>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
