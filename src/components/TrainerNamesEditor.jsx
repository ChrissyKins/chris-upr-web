import { useState } from 'react';
import { getGameClassNames } from '../data/gameData';
import { getTrainerSpriteUrl } from '../data/trainerSprites';

const defaults = getGameClassNames();

export function getDefaultClassNames() {
  return defaults.map(c => ({ ...c }));
}

export default function TrainerNamesEditor({ classNames, onChange }) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? classNames.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : classNames;

  function handleNameChange(id, newName) {
    const updated = classNames.map(c => c.id === id ? { ...c, name: newName } : c);
    onChange(updated);
  }

  function handleReset(id) {
    const def = defaults.find(d => d.id === id);
    if (def) handleNameChange(id, def.name);
  }

  return (
    <div className="trainer-names-editor">
      <div className="trainer-names-header">
        <input
          type="text"
          placeholder="Search classes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pokemon-search"
        />
      </div>
      <div className="trainer-names-list">
        {filtered.map(cls => {
          const def = defaults.find(d => d.id === cls.id);
          const changed = def && cls.name !== def.name;
          const spriteUrl = getTrainerSpriteUrl(cls.id);
          return (
            <div key={cls.id} className={`trainer-name-row ${changed ? 'trainer-name-changed' : ''}`}>
              {spriteUrl && (
                <img src={spriteUrl} alt="" className="trainer-name-sprite"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <input
                type="text"
                className="trainer-name-class-input"
                value={cls.name}
                onChange={e => handleNameChange(cls.id, e.target.value)}
              />
              {changed && (
                <a href="#" className="trainer-name-reset" onClick={e => { e.preventDefault(); handleReset(cls.id); }}>(reset)</a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
