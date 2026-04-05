import { useState } from 'react';
import PokemonPicker from './PokemonPicker';
import { getGameTrades, getGameItems } from '../data/gameData';

export function getDefaultTrades() {
  return getGameTrades().map(t => ({
    index: t.index,
    givenPokemon: t.givenPokemon,
    requestedPokemon: t.requestedPokemon,
    nickname: t.nickname || '',
    otName: t.otName || '',
    item: t.item || 0,
  }));
}

export default function TradeEditor({ trades, onChange }) {
  const defaults = getGameTrades();
  const items = getGameItems();

  function handleChange(index, field, value) {
    onChange(trades.map(t => t.index === index ? { ...t, [field]: value } : t));
  }

  if (trades.length === 0) {
    return (
      <div className="extra-editor">
        <div className="extra-editor-header"><b>In-Game Trades</b></div>
        <p>No trade data available. Re-export game data with the updated randomizer to enable this editor.</p>
      </div>
    );
  }

  return (
    <div className="extra-editor">
      <div className="extra-editor-header">
        <b>In-Game Trades</b> ({trades.length} trades)
        {' '}<a href="#" onClick={(e) => { e.preventDefault(); onChange(getDefaultTrades()); }}>[Reset All]</a>
      </div>
      <div className="trades-list">
        {trades.map(trade => {
          const def = defaults.find(d => d.index === trade.index);
          return (
            <div key={trade.index} className="trade-row">
              <div className="trade-header">Trade #{trade.index + 1}</div>
              <div className="trade-fields">
                <div className="trade-field">
                  <span className="trade-label">They want:</span>
                  <PokemonPicker
                    value={trade.requestedPokemon}
                    onChange={(name) => handleChange(trade.index, 'requestedPokemon', name)}
                  />
                </div>
                <div className="trade-field">
                  <span className="trade-label">You get:</span>
                  <PokemonPicker
                    value={trade.givenPokemon}
                    onChange={(name) => handleChange(trade.index, 'givenPokemon', name)}
                  />
                </div>
                <div className="trade-field">
                  <span className="trade-label">Nickname:</span>
                  <input
                    type="text"
                    className="trade-input"
                    value={trade.nickname}
                    onChange={(e) => handleChange(trade.index, 'nickname', e.target.value)}
                    maxLength={10}
                  />
                </div>
                <div className="trade-field">
                  <span className="trade-label">OT Name:</span>
                  <input
                    type="text"
                    className="trade-input"
                    value={trade.otName}
                    onChange={(e) => handleChange(trade.index, 'otName', e.target.value)}
                    maxLength={7}
                  />
                </div>
                <div className="trade-field">
                  <span className="trade-label">Held Item:</span>
                  <ItemSelect value={trade.item} items={items} onChange={(id) => handleChange(trade.index, 'item', id)} />
                </div>
                {def && (
                  <a href="#" onClick={(e) => { e.preventDefault(); onChange(trades.map(t => t.index === trade.index ? { ...def } : t)); }}>(reset)</a>
                )}
              </div>
            </div>
          );
        })}
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
        <span className="move-name">{value === 0 ? '(none)' : current?.name || '???'}</span>
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
            <div className="pokemon-option" onClick={() => { onChange(0); setIsOpen(false); setSearch(''); }}>
              (none)
            </div>
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
