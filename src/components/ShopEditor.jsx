import { useState } from 'react';
import { getGameShops, getGameItems } from '../data/gameData';

export function getDefaultShops() {
  return getGameShops().map(s => ({
    index: s.index,
    name: s.name,
    items: s.items.map(i => i.id),
  }));
}

export function getDefaultPrices() {
  const items = getGameItems();
  const prices = {};
  for (const i of items) {
    if (i.price != null) prices[i.id] = i.price;
  }
  return prices;
}

export default function ShopEditor({ shops, prices, onChange, onPriceChange }) {
  const [search, setSearch] = useState('');
  const defaults = getGameShops();
  const allItems = getGameItems();

  const itemById = {};
  for (const i of allItems) itemById[i.id] = i;

  // Track max item count per shop (from ROM defaults - can't grow beyond this)
  const maxItems = {};
  for (const d of defaults) maxItems[d.index] = d.items.length;

  // Effective price: custom override or default
  function getPrice(itemId) {
    if (prices && prices[itemId] != null) return prices[itemId];
    return itemById[itemId]?.price || 0;
  }

  const filtered = search
    ? shops.filter(s =>
        (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
        s.items.some(id => itemById[id]?.name?.toLowerCase().includes(search.toLowerCase()))
      )
    : shops;

  function handleItemChange(shopIdx, itemPos, newItemId) {
    onChange(shops.map(s => {
      if (s.index !== shopIdx) return s;
      const newItems = [...s.items];
      newItems[itemPos] = newItemId;
      return { ...s, items: newItems };
    }));
  }

  function handleAddItem(shopIdx) {
    onChange(shops.map(s => {
      if (s.index !== shopIdx) return s;
      return { ...s, items: [...s.items, allItems[0]?.id || 1] };
    }));
  }

  function handlePriceChange(itemId, newPrice) {
    onPriceChange({ ...prices, [itemId]: newPrice });
  }

  if (shops.length === 0) {
    return (
      <div className="extra-editor">
        <div className="extra-editor-header"><b>Shops</b></div>
        <p>No shop data available. Re-export game data with the updated randomizer to enable this editor.</p>
      </div>
    );
  }

  return (
    <div className="extra-editor">
      <div className="extra-editor-header">
        <b>Shops</b> ({shops.length} shops)
        {' '}<a href="#" onClick={(e) => { e.preventDefault(); onChange(getDefaultShops()); onPriceChange({}); }}>[Reset All]</a>
      </div>
      <input
        type="text"
        className="extra-search"
        placeholder="Search shops or items..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="shops-list">
        {filtered.map(shop => {
          const max = maxItems[shop.index] || 0;
          const atMax = shop.items.length >= max;
          return (
          <div key={shop.index} className="shop-row">
            <div className="shop-header">
              <b>{shop.name || `Shop #${shop.index}`}</b>
              {' '}({shop.items.length}/{max} slots)
              {!atMax && <>{' '}<a href="#" onClick={(e) => { e.preventDefault(); handleAddItem(shop.index); }}>[+ Add Item]</a></>}
            </div>
            <div className="shop-items">
              {shop.items.map((itemId, i) => (
                <div key={i} className="shop-item">
                  <ItemSelect
                    value={itemId}
                    items={allItems}
                    onChange={(id) => handleItemChange(shop.index, i, id)}
                  />
                  <span className="shop-price">
                    ¥<input
                      type="number"
                      className="price-input"
                      value={getPrice(itemId)}
                      min={0}
                      max={65535}
                      onChange={(e) => handlePriceChange(itemId, Math.min(65535, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        );})}
      </div>
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
          <input
            type="text"
            className="pokemon-search"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          />
          <div className="move-list">
            {options.map(i => (
              <div
                key={i.id}
                className={`pokemon-option ${value === i.id ? 'selected' : ''}`}
                onClick={() => { onChange(i.id); setIsOpen(false); setSearch(''); }}
              >
                {i.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
