import { useState } from 'react';
import PokemonPicker from './PokemonPicker';
import { getLearnset, getGameMoves, getGamePokemon } from '../data/gameData';
import { POKEMON_BY_NAME } from '../data/pokemon';

export default function LearnsetEditor({ learnsets, onChange }) {
  const [selectedPokemon, setSelectedPokemon] = useState('');
  const allMoves = getGameMoves();

  const moveById = {};
  for (const m of allMoves) moveById[m.id] = m;

  const pokemonId = selectedPokemon ? (POKEMON_BY_NAME[selectedPokemon.toUpperCase()]?.id || 0) : 0;
  const defaultLearnset = pokemonId ? getLearnset(pokemonId) : [];
  const customLearnset = learnsets[String(pokemonId)];

  // Use custom if exists, otherwise show default
  const currentMoves = customLearnset || defaultLearnset.map(m => ({ moveId: m.moveId, level: m.level }));

  function handleMoveChange(moveIdx, field, value) {
    const updated = currentMoves.map((m, i) => i === moveIdx ? { ...m, [field]: value } : m);
    onChange({ ...learnsets, [String(pokemonId)]: updated });
  }

  function handleAddMove() {
    const updated = [...currentMoves, { moveId: 1, level: 1 }];
    onChange({ ...learnsets, [String(pokemonId)]: updated });
  }

  function handleRemoveMove(moveIdx) {
    const updated = currentMoves.filter((_, i) => i !== moveIdx);
    onChange({ ...learnsets, [String(pokemonId)]: updated });
  }

  function handleReset() {
    const updated = { ...learnsets };
    delete updated[String(pokemonId)];
    onChange(updated);
  }

  const isCustomized = !!customLearnset;
  const editedPokemonIds = Object.keys(learnsets);
  const gamePokemon = getGamePokemon();

  return (
    <div className="extra-editor">
      <div className="extra-editor-header">
        <b>Learnsets</b>
        {editedPokemonIds.length > 0 && ` (${editedPokemonIds.length} Pokemon edited)`}
      </div>

      {editedPokemonIds.length > 0 && (
        <div className="edited-list">
          Edited:{' '}
          {editedPokemonIds.map((id, i) => {
            const pk = gamePokemon.find(p => p.id === parseInt(id));
            return (
              <span key={id}>
                {i > 0 && ', '}
                <a href="#" onClick={(e) => { e.preventDefault(); setSelectedPokemon(pk?.name || ''); }}>{pk?.name || `#${id}`}</a>
              </span>
            );
          })}
          {' '}<a href="#" onClick={(e) => { e.preventDefault(); onChange({}); }}>[Clear All Edits]</a>
        </div>
      )}

      <div className="learnset-picker">
        <span className="trade-label">Select Pokemon:</span>
        <PokemonPicker value={selectedPokemon} onChange={setSelectedPokemon} />
      </div>

      {pokemonId > 0 && (
        <>
          <div className="extra-editor-header" style={{ marginTop: 8 }}>
            <b>{selectedPokemon}</b> - Learnset
            {isCustomized && <> (customized) <a href="#" onClick={(e) => { e.preventDefault(); handleReset(); }}>[Reset to Default]</a></>}
            {' '}<a href="#" onClick={(e) => { e.preventDefault(); handleAddMove(); }}>[+ Add Move]</a>
          </div>
          <table className="extra-table">
            <thead>
              <tr><th>Level</th><th>Move</th><th>Type</th><th>Power</th><th></th></tr>
            </thead>
            <tbody>
              {currentMoves.map((entry, i) => {
                const move = moveById[entry.moveId];
                return (
                  <tr key={i}>
                    <td className="col-num">
                      <input
                        type="number"
                        className="level-input"
                        min="1"
                        max="100"
                        value={entry.level}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v)) handleMoveChange(i, 'level', v);
                        }}
                      />
                    </td>
                    <td>
                      <MoveSelect value={entry.moveId} allMoves={allMoves} onChange={(id) => handleMoveChange(i, 'moveId', id)} />
                    </td>
                    <td><span className="move-type-badge" data-type={move?.type?.toLowerCase()}>{move?.type || '?'}</span></td>
                    <td className="col-num">{move?.power || '-'}</td>
                    <td><a href="#" onClick={(e) => { e.preventDefault(); handleRemoveMove(i); }}>(x)</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function MoveSelect({ value, allMoves, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const options = search
    ? allMoves.filter(m => m.name && m.name.toLowerCase().includes(search.toLowerCase()))
    : allMoves;

  const current = allMoves.find(m => m.id === value);

  return (
    <div className="move-picker inline-picker">
      <div className="move-picker-display" onClick={() => setIsOpen(!isOpen)}>
        <span className="move-name">{current?.name || '???'}</span>
        <span className="dropdown-arrow">&#9662;</span>
      </div>
      {isOpen && (
        <div className="move-dropdown">
          <input
            type="text"
            className="pokemon-search"
            placeholder="Search moves..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          />
          <div className="move-list">
            {options.map(m => (
              <div
                key={m.id}
                className={`pokemon-option ${value === m.id ? 'selected' : ''}`}
                onClick={() => { onChange(m.id); setIsOpen(false); setSearch(''); }}
              >
                <span className="move-type-badge" data-type={m.type?.toLowerCase()}>{m.type || '?'}</span>
                {' '}{m.name}
                {m.power > 0 && <span className="move-power"> ({m.power})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
