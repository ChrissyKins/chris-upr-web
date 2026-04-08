import { useState } from 'react';
import { getGameClassNames } from '../data/gameData';
import { getTrainerSpriteUrl, getAllSpriteNames } from '../data/trainerSprites';

const defaults = getGameClassNames();

export function getDefaultClassNames() {
  return defaults.map(c => ({ ...c, spriteFrom: null }));
}

export default function TrainerNamesEditor({ classNames, onChange }) {
  const [search, setSearch] = useState('');
  const [spritePicker, setSpritePicker] = useState(null); // classId being edited

  const allSprites = getAllSpriteNames();

  const filtered = search
    ? classNames.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : classNames;

  function handleNameChange(id, newName) {
    onChange(classNames.map(c => c.id === id ? { ...c, name: newName } : c));
  }

  function handleSpriteChange(id, spriteFromId) {
    onChange(classNames.map(c => c.id === id ? { ...c, spriteFrom: spriteFromId } : c));
    setSpritePicker(null);
  }

  function handleReset(id) {
    const def = defaults.find(d => d.id === id);
    if (def) {
      onChange(classNames.map(c => c.id === id ? { ...c, name: def.name, spriteFrom: null } : c));
    }
  }

  function getSpriteUrl(cls) {
    if (cls.spriteFrom != null) return getTrainerSpriteUrl(cls.spriteFrom);
    return getTrainerSpriteUrl(cls.id);
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
          const nameChanged = def && cls.name !== def.name;
          const spriteChanged = cls.spriteFrom != null;
          const changed = nameChanged || spriteChanged;
          const spriteUrl = getSpriteUrl(cls);
          return (
            <div key={cls.id} className={`trainer-name-row ${changed ? 'trainer-name-changed' : ''}`}>
              <div className="trainer-name-sprite-wrap" onClick={() => setSpritePicker(spritePicker === cls.id ? null : cls.id)}>
                {spriteUrl && (
                  <img src={spriteUrl} alt="" className="trainer-name-sprite"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                )}
                <span className="trainer-sprite-edit-hint">change</span>
              </div>
              <input
                type="text"
                className="trainer-name-class-input"
                value={cls.name}
                onChange={e => handleNameChange(cls.id, e.target.value)}
              />
              {changed && (
                <a href="#" className="trainer-name-reset" onClick={e => { e.preventDefault(); handleReset(cls.id); }}>(reset)</a>
              )}
              {spritePicker === cls.id && (
                <div className="sprite-picker">
                  {allSprites.map(s => (
                    <img
                      key={s.id}
                      src={s.url}
                      alt={s.name}
                      title={s.name}
                      className={`sprite-picker-option ${cls.spriteFrom === s.id || (cls.spriteFrom == null && cls.id === s.id) ? 'selected' : ''}`}
                      onClick={() => handleSpriteChange(cls.id, s.id === cls.id ? null : s.id)}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
