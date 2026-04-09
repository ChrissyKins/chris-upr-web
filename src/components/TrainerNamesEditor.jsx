import { useState } from 'react';
import { getGameClassNames, getGamePokemon } from '../data/gameData';
import { getTrainerSpriteUrl, getAllSpriteNames } from '../data/trainerSprites';

const defaults = getGameClassNames();
const defaultPokemon = getGamePokemon();

export function getDefaultClassNames() {
  return defaults.map(c => ({ ...c, spriteFrom: null }));
}

export default function TrainerNamesEditor({ classNames, onChange, pokemonEdits, onPokemonEditsChange }) {
  const [search, setSearch] = useState('');
  const [pokeSearch, setPokeSearch] = useState('');
  const [spritePicker, setSpritePicker] = useState(null);
  const [activeSection, setActiveSection] = useState('trainers');

  const allSprites = getAllSpriteNames();

  // --- Trainer classes ---
  const filteredClasses = search
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
    if (def) onChange(classNames.map(c => c.id === id ? { ...c, name: def.name, spriteFrom: null } : c));
  }
  function getSpriteUrl(cls) {
    if (cls.spriteFrom != null) return getTrainerSpriteUrl(cls.spriteFrom);
    return getTrainerSpriteUrl(cls.id);
  }

  // --- Pokemon names ---
  const filteredPokemon = pokeSearch
    ? defaultPokemon.filter(p => p.id > 0 && p.name.toLowerCase().includes(pokeSearch.toLowerCase()))
    : defaultPokemon.filter(p => p.id > 0);

  function getPokemonName(id) {
    const edit = (pokemonEdits || []).find(e => e.id === id);
    if (edit && edit.name != null) return edit.name;
    const orig = defaultPokemon.find(p => p.id === id);
    return orig ? orig.name : '';
  }
  function handlePokemonNameChange(id, newName) {
    const edits = pokemonEdits || [];
    const existing = edits.find(e => e.id === id);
    const orig = defaultPokemon.find(p => p.id === id);
    // If name matches original, remove the edit (or remove the name field)
    if (orig && newName === orig.name) {
      if (existing) {
        const updated = { ...existing };
        delete updated.name;
        const hasOtherFields = Object.keys(updated).some(k => k !== 'id');
        onPokemonEditsChange(hasOtherFields ? edits.map(e => e.id === id ? updated : e) : edits.filter(e => e.id !== id));
      }
      return;
    }
    if (existing) {
      onPokemonEditsChange(edits.map(e => e.id === id ? { ...e, name: newName } : e));
    } else {
      onPokemonEditsChange([...edits, { id, name: newName }]);
    }
  }
  function handlePokemonReset(id) {
    const orig = defaultPokemon.find(p => p.id === id);
    if (orig) handlePokemonNameChange(id, orig.name);
  }
  function isPokemonNameChanged(id) {
    const edit = (pokemonEdits || []).find(e => e.id === id);
    return edit && edit.name != null;
  }

  const editedPokemonCount = (pokemonEdits || []).filter(e => e.name != null).length;
  const editedClassCount = classNames.filter(c => {
    const def = defaults.find(d => d.id === c.id);
    return (def && c.name !== def.name) || c.spriteFrom != null;
  }).length;

  return (
    <div className="trainer-names-editor">
      <div className="names-tab-switcher">
        <a href="#" className={activeSection === 'trainers' ? 'active' : ''}
          onClick={e => { e.preventDefault(); setActiveSection('trainers'); }}>
          Trainer Classes{editedClassCount > 0 ? ` (${editedClassCount})` : ''}
        </a>
        {' | '}
        <a href="#" className={activeSection === 'pokemon' ? 'active' : ''}
          onClick={e => { e.preventDefault(); setActiveSection('pokemon'); }}>
          Pokemon{editedPokemonCount > 0 ? ` (${editedPokemonCount})` : ''}
        </a>
      </div>

      {activeSection === 'trainers' && (
        <>
          <div className="trainer-names-header">
            <input type="text" placeholder="Search classes..." value={search}
              onChange={e => setSearch(e.target.value)} className="pokemon-search" />
          </div>
          <div className="trainer-names-list">
            {filteredClasses.map(cls => {
              const def = defaults.find(d => d.id === cls.id);
              const nameChanged = def && cls.name !== def.name;
              const spriteChanged = cls.spriteFrom != null;
              const changed = nameChanged || spriteChanged;
              const spriteUrl = getSpriteUrl(cls);
              return (
                <div key={cls.id} className={`trainer-name-row ${changed ? 'trainer-name-changed' : ''}`}>
                  <div className="trainer-name-sprite-wrap" onClick={() => setSpritePicker(spritePicker === cls.id ? null : cls.id)}>
                    {spriteUrl && <img src={spriteUrl} alt="" className="trainer-name-sprite"
                      onError={(e) => { e.target.style.display = 'none'; }} />}
                    <span className="trainer-sprite-edit-hint">change</span>
                  </div>
                  <input type="text" className="trainer-name-class-input" value={cls.name}
                    onChange={e => handleNameChange(cls.id, e.target.value)} />
                  {changed && <a href="#" className="trainer-name-reset"
                    onClick={e => { e.preventDefault(); handleReset(cls.id); }}>(reset)</a>}
                  {spritePicker === cls.id && (
                    <div className="sprite-picker">
                      {allSprites.map(s => (
                        <img key={s.id} src={s.url} alt={s.name} title={s.name}
                          className={`sprite-picker-option ${cls.spriteFrom === s.id || (cls.spriteFrom == null && cls.id === s.id) ? 'selected' : ''}`}
                          onClick={() => handleSpriteChange(cls.id, s.id === cls.id ? null : s.id)}
                          onError={(e) => { e.target.style.display = 'none'; }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeSection === 'pokemon' && (
        <>
          <div className="trainer-names-header">
            <input type="text" placeholder="Search Pokemon..." value={pokeSearch}
              onChange={e => setPokeSearch(e.target.value)} className="pokemon-search" />
          </div>
          <div className="trainer-names-list">
            {filteredPokemon.map(pk => {
              const changed = isPokemonNameChanged(pk.id);
              return (
                <div key={pk.id} className={`trainer-name-row ${changed ? 'trainer-name-changed' : ''}`}>
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pk.id}.png`}
                    alt="" className="pokemon-name-sprite"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="pokemon-name-id">#{pk.id}</span>
                  <input type="text" className="trainer-name-class-input" maxLength={10}
                    value={getPokemonName(pk.id)}
                    onChange={e => handlePokemonNameChange(pk.id, e.target.value)} />
                  {changed && <a href="#" className="trainer-name-reset"
                    onClick={e => { e.preventDefault(); handlePokemonReset(pk.id); }}>(reset)</a>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
