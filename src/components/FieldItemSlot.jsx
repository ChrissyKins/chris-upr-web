import { useState } from 'react';
import { getGameItems, getGameFieldItems } from '../data/gameData';

export default function FieldItemSlot({ fieldItem, onChange }) {
  const allItems = getGameItems();
  const defaults = getGameFieldItems();
  const def = defaults.find(d => d.index === fieldItem.index);
  const isChanged = def && def.item !== fieldItem.item;
  const currentItem = allItems.find(i => i.id === fieldItem.item);

  function handleChange(newItemId) {
    onChange(fieldItem.index, newItemId);
  }

  function handleReset(e) {
    e.preventDefault();
    if (def) handleChange(def.item);
  }

  return (
    <div className={`field-item-slot ${isChanged ? 'slot-changed' : ''}`}>
      <ItemSelect value={fieldItem.item} items={allItems} onChange={handleChange} />
      {isChanged && <a href="#" onClick={handleReset}>(reset)</a>}
    </div>
  );
}

function ItemSelect({ value, items, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const options = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const current = items.find(i => i.id === value);

  return (
    <div className="move-picker inline-picker">
      <div className="move-picker-display" onClick={() => setIsOpen(!isOpen)}>
        <span className="move-name">{current?.name || '???'}</span>
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
