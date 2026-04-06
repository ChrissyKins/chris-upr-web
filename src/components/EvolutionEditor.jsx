import { useState } from 'react';
import PokemonPicker from './PokemonPicker';
import { getGameEvolutions, getGamePokemon, getGameMoves, getGameItems } from '../data/gameData';
import { POKEMON_BY_NAME } from '../data/pokemon';

const EVOLUTION_METHODS = [
  'LEVEL', 'STONE', 'TRADE', 'TRADE_ITEM', 'HAPPINESS', 'HAPPINESS_DAY', 'HAPPINESS_NIGHT',
  'LEVEL_ATTACK_HIGHER', 'LEVEL_DEFENSE_HIGHER', 'LEVEL_ATK_DEF_SAME',
  'LEVEL_HIGH_BEAUTY', 'LEVEL_ITEM_DAY', 'LEVEL_ITEM_NIGHT',
  'LEVEL_WITH_MOVE', 'LEVEL_WITH_OTHER',
  'LEVEL_MALE_ONLY', 'LEVEL_FEMALE_ONLY',
];

// What kind of "extra" value each method expects
function getExtraType(method) {
  switch (method) {
    case 'LEVEL':
    case 'LEVEL_ATTACK_HIGHER':
    case 'LEVEL_DEFENSE_HIGHER':
    case 'LEVEL_ATK_DEF_SAME':
    case 'LEVEL_HIGH_BEAUTY':
    case 'LEVEL_MALE_ONLY':
    case 'LEVEL_FEMALE_ONLY':
      return 'level';
    case 'STONE':
    case 'TRADE_ITEM':
    case 'LEVEL_ITEM_DAY':
    case 'LEVEL_ITEM_NIGHT':
      return 'item';
    case 'LEVEL_WITH_MOVE':
      return 'move';
    case 'LEVEL_WITH_OTHER':
      return 'pokemon';
    case 'TRADE':
    case 'HAPPINESS':
    case 'HAPPINESS_DAY':
    case 'HAPPINESS_NIGHT':
    default:
      return 'none';
  }
}

function getMethodLabel(method) {
  return method.replace(/_/g, ' ');
}

export default function EvolutionEditor({ edits, onChange }) {
  const [selectedPokemon, setSelectedPokemon] = useState('');
  const allEvolutions = getGameEvolutions();
  const gamePokemon = getGamePokemon();

  const pokemonId = selectedPokemon ? (POKEMON_BY_NAME[selectedPokemon.toUpperCase()]?.id || 0) : 0;

  const originalEvos = allEvolutions.filter(e => e.fromId === pokemonId);
  const customEvos = edits.filter(e => e.fromId === pokemonId);

  const displayEvos = originalEvos.map(orig => {
    const edit = customEvos.find(e => e.toId === orig.toId);
    return edit || { fromId: orig.fromId, toId: orig.toId, method: orig.method, extraInfo: 0, isOriginal: true };
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
            const extraType = getExtraType(evo.method);

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
                      <option key={m} value={m}>{getMethodLabel(m)}</option>
                    ))}
                  </select>

                  {extraType === 'level' && (
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

                  {extraType === 'item' && (
                    <>
                      <span className="trade-label" style={{ marginLeft: 12 }}>Item:</span>
                      <EvoItemPicker value={evo.extraInfo || 0} onChange={(id) => handleEvoChange(evo.toId, 'extraInfo', id)} />
                    </>
                  )}

                  {extraType === 'move' && (
                    <>
                      <span className="trade-label" style={{ marginLeft: 12 }}>Move:</span>
                      <EvoMovePicker value={evo.extraInfo || 0} onChange={(id) => handleEvoChange(evo.toId, 'extraInfo', id)} />
                    </>
                  )}

                  {extraType === 'pokemon' && (
                    <>
                      <span className="trade-label" style={{ marginLeft: 12 }}>With:</span>
                      <EvoPokemonPicker value={evo.extraInfo || 0} onChange={(id) => handleEvoChange(evo.toId, 'extraInfo', id)} />
                    </>
                  )}

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

function EvoItemPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const items = getGameItems();

  const options = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const current = items.find(i => i.id === value);

  return (
    <div className="move-picker inline-picker">
      <div className="move-picker-display" onClick={() => setIsOpen(!isOpen)}>
        <span className="move-name">{current?.name || `Item #${value}`}</span>
        <span className="dropdown-arrow">&#9662;</span>
      </div>
      {isOpen && (
        <div className="move-dropdown">
          <input type="text" className="pokemon-search" placeholder="Search items..."
            value={search} onChange={e => setSearch(e.target.value)} autoFocus
            onBlur={() => setTimeout(() => setIsOpen(false), 200)} />
          <div className="move-list">
            {options.map(i => (
              <div key={i.id} className={`pokemon-option ${value === i.id ? 'selected' : ''}`}
                onClick={() => { onChange(i.id); setIsOpen(false); setSearch(''); }}>
                {i.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EvoMovePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const moves = getGameMoves();

  const options = search
    ? moves.filter(m => m.name && m.name.toLowerCase().includes(search.toLowerCase()))
    : moves;

  const current = moves.find(m => m.id === value);

  return (
    <div className="move-picker inline-picker">
      <div className="move-picker-display" onClick={() => setIsOpen(!isOpen)}>
        <span className="move-name">{current?.name || `Move #${value}`}</span>
        <span className="dropdown-arrow">&#9662;</span>
      </div>
      {isOpen && (
        <div className="move-dropdown">
          <input type="text" className="pokemon-search" placeholder="Search moves..."
            value={search} onChange={e => setSearch(e.target.value)} autoFocus
            onBlur={() => setTimeout(() => setIsOpen(false), 200)} />
          <div className="move-list">
            {options.map(m => (
              <div key={m.id} className={`pokemon-option ${value === m.id ? 'selected' : ''}`}
                onClick={() => { onChange(m.id); setIsOpen(false); setSearch(''); }}>
                <span className="move-type-badge" data-type={m.type?.toLowerCase()}>{m.type || '?'}</span>
                {' '}{m.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EvoPokemonPicker({ value, onChange }) {
  const gamePokemon = getGamePokemon();
  const current = gamePokemon.find(p => p.id === value);

  function handleChange(name) {
    const pk = name ? (POKEMON_BY_NAME[name.toUpperCase()] || null) : null;
    onChange(pk ? pk.id : 0);
  }

  return <PokemonPicker value={current?.name || ''} onChange={handleChange} />;
}
