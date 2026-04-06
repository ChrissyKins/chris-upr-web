import { useState } from 'react';
import { getGameFieldItems, getGameItems } from '../data/gameData';

export function getDefaultFieldItems() {
  return getGameFieldItems().map(f => ({ index: f.index, item: f.item }));
}

export default function FieldItemEditor({ fieldItems, onChange }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const defaults = getGameFieldItems();
  const allItems = getGameItems();

  const itemById = {};
  for (const i of allItems) itemById[i.id] = i;

  // Merge location data from defaults into current state
  const withLocations = fieldItems.map(f => {
    const def = defaults.find(d => d.index === f.index);
    return { ...f, location: def?.location || null, defaultName: def?.name || null };
  });

  // Group by location
  const groups = {};
  for (const f of withLocations) {
    const loc = f.location || 'Unknown Location';
    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(f);
  }

  const locationOrder = Object.keys(groups);

  // Filter by search
  const filteredLocations = search
    ? locationOrder.filter(loc =>
        loc.toLowerCase().includes(search.toLowerCase()) ||
        groups[loc].some(f => itemById[f.item]?.name?.toLowerCase().includes(search.toLowerCase()))
      )
    : locationOrder;

  function handleItemChange(idx, newItemId) {
    onChange(fieldItems.map(f => f.index === idx ? { ...f, item: newItemId } : f));
  }

  function toggleCollapse(loc) {
    setCollapsed(prev => ({ ...prev, [loc]: !prev[loc] }));
  }

  if (fieldItems.length === 0) {
    return (
      <div className="extra-editor">
        <div className="extra-editor-header"><b>Field Items</b></div>
        <p>No field item data available. Re-export game data with the updated randomizer to enable this editor.</p>
      </div>
    );
  }

  const hasLocations = withLocations.some(f => f.location);

  // Flat list fallback if no location data
  if (!hasLocations) {
    return (
      <div className="extra-editor">
        <div className="extra-editor-header">
          <b>Field Items</b> ({fieldItems.length} items)
          {' '}<a href="#" onClick={(e) => { e.preventDefault(); onChange(getDefaultFieldItems()); }}>[Reset All]</a>
        </div>
        <input type="text" className="extra-search" placeholder="Search items..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <table className="extra-table">
          <thead><tr><th>#</th><th>Item</th><th></th></tr></thead>
          <tbody>
            {fieldItems.filter(f => !search || itemById[f.item]?.name?.toLowerCase().includes(search.toLowerCase())).map(f => {
              const def = defaults.find(d => d.index === f.index);
              const isChanged = def && def.item !== f.item;
              return (
                <tr key={f.index} className={isChanged ? 'row-changed' : ''}>
                  <td className="col-label">{f.index + 1}</td>
                  <td><ItemSelect value={f.item} items={allItems} onChange={(id) => handleItemChange(f.index, id)} /></td>
                  <td>{isChanged && <a href="#" onClick={(e) => { e.preventDefault(); handleItemChange(f.index, def.item); }}>(reset)</a>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="extra-editor">
      <div className="extra-editor-header">
        <b>Field Items</b> ({fieldItems.length} items across {locationOrder.length} locations)
        {' '}<a href="#" onClick={(e) => { e.preventDefault(); onChange(getDefaultFieldItems()); }}>[Reset All]</a>
      </div>
      <input type="text" className="extra-search" placeholder="Search locations or items..."
        value={search} onChange={e => setSearch(e.target.value)} />

      {filteredLocations.map(loc => {
        const items = groups[loc];
        const isCollapsed = collapsed[loc];
        const changedCount = items.filter(f => {
          const def = defaults.find(d => d.index === f.index);
          return def && def.item !== f.item;
        }).length;

        return (
          <div key={loc} className="field-item-group">
            <div className="field-item-header" onClick={() => toggleCollapse(loc)}>
              <span className="collapse-arrow">{isCollapsed ? '\u25b6' : '\u25bc'}</span>
              {' '}<b>{loc}</b>
              <span className="field-item-count"> ({items.length} item{items.length !== 1 ? 's' : ''})</span>
              {changedCount > 0 && <span className="field-item-changed"> - {changedCount} changed</span>}
            </div>
            {!isCollapsed && (
              <div className="field-item-list">
                {items.map(f => {
                  const item = itemById[f.item];
                  const def = defaults.find(d => d.index === f.index);
                  const isChanged = def && def.item !== f.item;
                  return (
                    <div key={f.index} className={`field-item-row ${isChanged ? 'row-changed' : ''}`}>
                      <ItemSelect value={f.item} items={allItems} onChange={(id) => handleItemChange(f.index, id)} />
                      {isChanged && (
                        <a href="#" onClick={(e) => { e.preventDefault(); handleItemChange(f.index, def.item); }}>(reset)</a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
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
