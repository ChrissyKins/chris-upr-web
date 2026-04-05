import { useState } from 'react';
import { getGameMoveTutors, getGameMoves } from '../data/gameData';

export function getDefaultMoveTutors() {
  return getGameMoveTutors().map(mt => ({ index: mt.index, moveId: mt.moveId, moveName: mt.move }));
}

export default function MoveTutorEditor({ tutors, onChange }) {
  const [search, setSearch] = useState('');
  const allMoves = getGameMoves();
  const defaults = getGameMoveTutors();

  const moveById = {};
  for (const m of allMoves) moveById[m.id] = m;

  const filtered = search
    ? tutors.filter(t => {
        const move = moveById[t.moveId];
        return move && move.name.toLowerCase().includes(search.toLowerCase());
      })
    : tutors;

  function handleMoveChange(idx, moveId) {
    onChange(tutors.map(t => t.index === idx ? { ...t, moveId, moveName: moveById[moveId]?.name || '???' } : t));
  }

  if (tutors.length === 0) {
    return (
      <div className="extra-editor">
        <div className="extra-editor-header"><b>Move Tutors</b></div>
        <p>No move tutor data available. Re-export game data with the updated randomizer to enable this editor.</p>
      </div>
    );
  }

  return (
    <div className="extra-editor">
      <div className="extra-editor-header">
        <b>Move Tutors</b> ({tutors.length} tutors)
        {' '}<a href="#" onClick={(e) => { e.preventDefault(); onChange(getDefaultMoveTutors()); }}>[Reset All]</a>
      </div>
      <input
        type="text"
        className="extra-search"
        placeholder="Search tutors..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <table className="extra-table">
        <thead>
          <tr><th>#</th><th>Move</th><th>Type</th><th>Power</th><th>Acc</th><th>PP</th><th></th></tr>
        </thead>
        <tbody>
          {filtered.map(t => {
            const move = moveById[t.moveId];
            const def = defaults.find(d => d.index === t.index);
            const isChanged = def && def.moveId !== t.moveId;
            return (
              <tr key={t.index} className={isChanged ? 'row-changed' : ''}>
                <td className="col-label">{t.index + 1}</td>
                <td>
                  <MoveSelect value={t.moveId} allMoves={allMoves} onChange={(id) => handleMoveChange(t.index, id)} />
                </td>
                <td><span className="move-type-badge" data-type={move?.type?.toLowerCase()}>{move?.type || '?'}</span></td>
                <td className="col-num">{move?.power || '-'}</td>
                <td className="col-num">{move?.accuracy || '-'}</td>
                <td className="col-num">{move?.pp || '-'}</td>
                <td>{isChanged && <a href="#" onClick={(e) => { e.preventDefault(); handleMoveChange(t.index, def.moveId); }}>(reset)</a>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
