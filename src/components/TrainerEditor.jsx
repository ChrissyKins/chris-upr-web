import { useState } from 'react';
import PokemonPicker, { getFilteredPokemonList } from './PokemonPicker';
import PasteLink from './PasteLink';
import { POKEMON_BY_NAME } from '../data/pokemon';
import { getLearnset, getGameMoves } from '../data/gameData';
import { getTrainerSpriteUrl } from '../data/trainerSprites';
import { copyPokemon, getClipboard } from '../data/clipboard';
import { usePokemonFilters } from '../data/pokemonFilterContext';
import { getDefaultTrainerPokemon } from '../data/crystalEncounters';

/**
 * Compute the default moveset a Pokemon would have at a given level.
 * Mimics how the game works: learn moves in order, keeping the last 4.
 */
export function getDefaultMoveset(pokemonId, level) {
  if (!pokemonId) return [];
  const learnset = getLearnset(pokemonId);
  const learned = [];
  for (const entry of learnset) {
    if (entry.level <= level) {
      learned.push(entry.move);
      if (learned.length > 4) {
        learned.shift();
      }
    }
  }
  while (learned.length < 4) learned.push(null);
  return learned;
}

function getPokemonId(name) {
  if (!name) return 0;
  const obj = POKEMON_BY_NAME[name.toUpperCase()];
  return obj?.id || 0;
}

// Game Boy text box: 18 chars per line, 2 lines per page
const CHARS_PER_LINE = 18;

// Token display widths: [TOKEN] in the text → how many tiles it takes on screen
const TOKEN_WIDTHS = {
  '[POKé]': 4, '[POK?]': 4,  // POKé = 4 tiles
  '[pk]': 2, '[PK]': 2, '[MN]': 2,  // 2-tile tokens
  '[.]': 1,  // 1-tile token
};

// Count displayed characters (tiles) for a line of text
// Handles [TOKEN] sequences and \xHH escapes
function countDisplayChars(line) {
  let count = 0;
  let i = 0;
  while (i < line.length) {
    if (line[i] === '[') {
      const end = line.indexOf(']', i);
      if (end >= 0) {
        const token = line.substring(i, end + 1);
        count += TOKEN_WIDTHS[token] || token.length - 2; // fallback: content length
        i = end + 1;
        continue;
      }
    }
    if (line[i] === '\\' && i + 3 < line.length && line[i+1] === 'x') {
      count += 1; // \xHH = 1 display char
      i += 4;
      continue;
    }
    count++;
    i++;
  }
  return count;
}

// Split ROM dialogue into pages (separated by \p) and lines (separated by \n or \l)
function splitPages(text) {
  if (!text) return [''];
  return text.split('\\p').map(page => page.replace(/\\n/g, '\n').replace(/\\l/g, '\n'));
}

// Rejoin edited pages back to ROM control codes
function joinPages(pages) {
  return pages.map(page => page.replace(/\n/g, '\\n')).join('\\p');
}

export default function TrainerEditor({ trainer, trainerIndex, allTrainers, onPokemonChange, onDialogueChange }) {
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [linked, setLinked] = useState(true);
  const tagLabel = trainer.tag ? ` [${trainer.tag}]` : '';
  const spriteUrl = getTrainerSpriteUrl(trainer.classId);
  const globalFilters = usePokemonFilters();

  // Find linked rival variants: same tag prefix (e.g. RIVAL1-1, RIVAL1-2, RIVAL1-0)
  const tagPrefix = trainer.tag && trainer.tag.includes('-')
    ? trainer.tag.substring(0, trainer.tag.lastIndexOf('-')) : null;
  const linkedTrainers = tagPrefix && allTrainers
    ? allTrainers.filter(t => t.index !== trainer.index && t.tag && t.tag.startsWith(tagPrefix + '-'))
    : [];

  function handleRandomize(e) {
    e.preventDefault();
    e.stopPropagation();
    const pool = getFilteredPokemonList(globalFilters);
    if (pool.length === 0) return;
    // Pick random species per slot, then apply to this + linked trainers
    const picks = trainer.pokemon.map(() => pool[Math.floor(Math.random() * pool.length)]);
    trainer.pokemon.forEach((poke, i) => {
      const moves = getDefaultMoveset(picks[i].id, poke.level);
      onPokemonChange(trainerIndex, i, { ...poke, pokemonName: picks[i].name, isRandom: false, moves });
    });
    if (linked && linkedTrainers.length > 0) {
      for (const lt of linkedTrainers) {
        lt.pokemon.forEach((poke, i) => {
          if (i < picks.length) {
            const moves = getDefaultMoveset(picks[i].id, poke.level);
            onPokemonChange(lt.index, i, { ...poke, pokemonName: picks[i].name, isRandom: false, moves });
          }
        });
      }
    }
  }

  function handlePokemonNameChange(pokeIdx, name) {
    const poke = trainer.pokemon[pokeIdx];
    const pokemonId = getPokemonId(name);
    const moves = pokemonId ? getDefaultMoveset(pokemonId, poke.level) : null;
    onPokemonChange(trainerIndex, pokeIdx, {
      ...poke,
      pokemonName: name,
      isRandom: !name,
      moves,
    });
    // Propagate species to linked variants (keep their levels)
    if (linked && linkedTrainers.length > 0) {
      for (const lt of linkedTrainers) {
        const ltPoke = lt.pokemon[pokeIdx];
        if (ltPoke) {
          const ltMoves = pokemonId ? getDefaultMoveset(pokemonId, ltPoke.level) : null;
          onPokemonChange(lt.index, pokeIdx, {
            ...ltPoke,
            pokemonName: name,
            isRandom: !name,
            moves: ltMoves,
          });
        }
      }
    }
  }

  function handleLevelChange(pokeIdx, e) {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= 100) {
      const poke = trainer.pokemon[pokeIdx];
      onPokemonChange(trainerIndex, pokeIdx, { ...poke, level: val });
    }
  }

  return (
    <div className="trainer-editor">
      <div className="trainer-layout">
        {spriteUrl && (
          <img
            src={spriteUrl}
            alt={trainer.displayName}
            className="trainer-sprite"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <div className="trainer-content">
          <div className="trainer-name-line">
            <b><span className="trainer-class-label">{trainer.classPrefix}</span>{' '}<input
              type="text"
              className="trainer-name-input"
              value={trainer.name}
              onChange={(e) => onDialogueChange && onDialogueChange(trainerIndex, 'name', e.target.value)}
            /></b>
            <span className="trainer-tag">{tagLabel}</span>
            {' '}
            <a href="#" onClick={handleRandomize}>[Randomize]</a>
            {linkedTrainers.length > 0 && (
              <>
                {' '}
                <a href="#" className={`trainer-link-btn ${linked ? 'linked' : ''}`} onClick={(e) => {
                  e.preventDefault();
                  setLinked(!linked);
                }} title={linked ? 'Linked: changes apply to all variants' : 'Unlinked: changes only apply to this variant'}>
                  {linked ? '[Linked]' : '[Unlinked]'}
                </a>
              </>
            )}
            {onDialogueChange && (
              <>
                {' '}
                <a href="#" className="trainer-expand-btn" onClick={(e) => {
                  e.preventDefault();
                  setDialogueOpen(!dialogueOpen);
                }}>{dialogueOpen ? '[-Dialogue]' : '[+Dialogue]'}</a>
              </>
            )}
          </div>
          {dialogueOpen && onDialogueChange && (
            <div className="trainer-dialogue">
              {trainer.seenText != null ? (
                <DialogueField
                  label="Before battle"
                  text={trainer.seenText}
                  onChange={(text) => onDialogueChange(trainerIndex, 'seenText', text)}
                />
              ) : (
                <div className="dialogue-field"><label>Before battle:</label> <span className="dialogue-no-data">(no data)</span></div>
              )}
              {trainer.beatenText != null ? (
                <DialogueField
                  label="After defeat"
                  text={trainer.beatenText}
                  onChange={(text) => onDialogueChange(trainerIndex, 'beatenText', text)}
                />
              ) : (
                <div className="dialogue-field"><label>After defeat:</label> <span className="dialogue-no-data">(no data)</span></div>
              )}
              {trainer.afterText != null ? (
                <DialogueField
                  label="Idle (after beaten)"
                  text={trainer.afterText}
                  onChange={(text) => onDialogueChange(trainerIndex, 'afterText', text)}
                />
              ) : (
                <div className="dialogue-field"><label>Idle (after beaten):</label> <span className="dialogue-no-data">(no data)</span></div>
              )}
            </div>
          )}
          <div className="trainer-pokemon-list">
            {trainer.pokemon.map((poke, i) => {
              const defaults = getDefaultTrainerPokemon(trainerIndex);
              const defaultPoke = defaults ? defaults[i] : null;
              return <TrainerPokemonSlot
                key={i}
                poke={poke}
                defaultPoke={defaultPoke}
                pokeIdx={i}
                trainerIndex={trainerIndex}
                onPokemonNameChange={handlePokemonNameChange}
                onLevelChange={handleLevelChange}
                onPokemonChange={onPokemonChange}
              />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainerPokemonSlot({ poke, defaultPoke, pokeIdx, trainerIndex, onPokemonNameChange, onLevelChange, onPokemonChange }) {
  const [expanded, setExpanded] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  const pokemonId = getPokemonId(poke.pokemonName);
  const learnset = pokemonId ? getLearnset(pokemonId) : [];
  const allMoves = getGameMoves();

  function handleMoveChange(moveSlot, moveName) {
    const currentMoves = poke.moves ? [...poke.moves] : [null, null, null, null];
    while (currentMoves.length < 4) currentMoves.push(null);
    currentMoves[moveSlot] = moveName || null;
    const hasAnyMove = currentMoves.some(m => m);
    onPokemonChange(trainerIndex, pokeIdx, {
      ...poke,
      moves: hasAnyMove ? currentMoves : null,
    });
  }

  function handleResetMoves() {
    const moves = pokemonId ? getDefaultMoveset(pokemonId, poke.level) : null;
    onPokemonChange(trainerIndex, pokeIdx, { ...poke, moves });
  }

  function handleCopy(e) {
    e.preventDefault();
    copyPokemon({ pokemonName: poke.pokemonName, isRandom: poke.isRandom });
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 800);
  }

  function handlePaste(e) {
    e.preventDefault();
    const clip = getClipboard();
    if (!clip) return;
    const newPokemonId = getPokemonId(clip.pokemonName);
    const moves = newPokemonId ? getDefaultMoveset(newPokemonId, poke.level) : null;
    onPokemonChange(trainerIndex, pokeIdx, {
      ...poke,
      pokemonName: clip.pokemonName,
      isRandom: clip.isRandom,
      moves,
    });
  }

  const currentMoves = poke.moves || [];
  const displayMoves = currentMoves.filter(Boolean);

  return (
    <div className={`trainer-poke-slot ${poke.isRandom || !poke.pokemonName ? 'slot-random' : ''}`}>
      <div className="trainer-poke-main">
        <span className="slot-number">#{pokeIdx + 1}</span>
        {' '}
        <PokemonPicker value={poke.pokemonName} onChange={(name) => onPokemonNameChange(pokeIdx, name)} />
        {' '}
        <span className="trainer-poke-actions">
          <a href="#" onClick={handleCopy}>{justCopied ? '(copied!)' : '(copy)'}</a>
          <PasteLink onPaste={handlePaste} />
        </span>
        {' '}
        <span className="level-inputs">
          Lv<input
            type="number"
            min="1"
            max="100"
            value={poke.level}
            onChange={(e) => onLevelChange(pokeIdx, e)}
            className="level-input"
          />
        </span>
        {displayMoves.length > 0 && (
          <span className="trainer-moves-preview">
            {' '}{displayMoves.join(' / ')}
          </span>
        )}
        {pokemonId > 0 && (
          <a href="#" className="trainer-expand-btn" onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}>{expanded ? '[-]' : '[+]'}</a>
        )}
        {defaultPoke && (
          <span className="slot-actions">
            <a href="#" onClick={(e) => {
              e.preventDefault();
              onPokemonChange(trainerIndex, pokeIdx, { ...defaultPoke });
            }}>(reset)</a>
          </span>
        )}
      </div>

      {expanded && pokemonId > 0 && (
        <div className="trainer-poke-details">
          <div className="trainer-moves-editor">
            <span className="trainer-detail-label">
              Moves
              {' '}<a href="#" onClick={(e) => { e.preventDefault(); handleResetMoves(); }}>(reset to default)</a>
            </span>
            {[0, 1, 2, 3].map(slot => (
              <div key={slot} className="trainer-move-slot">
                <MovePicker
                  value={currentMoves[slot] || ''}
                  learnset={learnset}
                  allMoves={allMoves}
                  level={poke.level}
                  onChange={(name) => handleMoveChange(slot, name)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DialogueField({ label, text, onChange }) {
  const pages = splitPages(text);

  function handlePageChange(pageIndex, newValue) {
    const updated = [...pages];
    updated[pageIndex] = newValue;
    onChange(joinPages(updated));
  }

  function addPage() {
    onChange(joinPages([...pages, '']));
  }

  function removePage(pageIndex) {
    if (pages.length <= 1) {
      onChange(joinPages(['']));
      return;
    }
    const updated = pages.filter((_, i) => i !== pageIndex);
    onChange(joinPages(updated));
  }

  // Count displayed characters per line (tokens like [POKé] count as display width)
  function getLineInfo(page) {
    const lines = page.split('\n');
    return lines.map(line => {
      const displayLen = countDisplayChars(line);
      return { text: line, len: displayLen, over: displayLen > CHARS_PER_LINE };
    });
  }

  return (
    <div className="dialogue-field">
      <div className="dialogue-field-header">
        <label>{label}:</label>
        <a href="#" className="dialogue-add-page" onClick={(e) => {
          e.preventDefault();
          addPage();
        }}>[+ page]</a>
      </div>
      {pages.map((page, i) => {
        const lineInfo = getLineInfo(page);
        const anyOver = lineInfo.some(l => l.over);
        return (
          <div key={i} className="dialogue-page">
            <div className="dialogue-page-header">
              <span className="dialogue-page-num">Page {i + 1}</span>
              {pages.length > 1 && (
                <a href="#" className="dialogue-remove-page" onClick={(e) => {
                  e.preventDefault();
                  removePage(i);
                }}>[x]</a>
              )}
              <span className={`dialogue-line-counts ${anyOver ? 'over-limit' : ''}`}>
                {lineInfo.map((l, li) => (
                  <span key={li} className={l.over ? 'over-limit' : ''}>
                    {li > 0 && ' / '}{l.len}/{CHARS_PER_LINE}
                  </span>
                ))}
              </span>
            </div>
            <textarea
              className={`dialogue-input ${anyOver ? 'dialogue-over' : ''}`}
              value={page}
              onChange={(e) => handlePageChange(i, e.target.value)}
              rows={3}
            />
          </div>
        );
      })}
    </div>
  );
}

function MovePicker({ value, learnset, allMoves, level, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const learnableMoves = learnset
    .filter(m => m.level <= level)
    .sort((a, b) => b.level - a.level);

  const moveById = {};
  for (const m of allMoves) {
    moveById[m.id] = m;
  }

  const options = search
    ? allMoves.filter(m => m.name && m.name.toLowerCase().includes(search.toLowerCase()))
    : learnableMoves.map(lm => moveById[lm.moveId]).filter(Boolean);

  const currentMove = value ? allMoves.find(m => m.name === value) : null;

  return (
    <div className="move-picker">
      <div className="move-picker-display" onClick={() => setIsOpen(!isOpen)}>
        {currentMove ? (
          <>
            <span className="move-type-badge" data-type={currentMove.type?.toLowerCase()}>{currentMove.type || '?'}</span>
            <span className="move-name">{currentMove.name}</span>
            {currentMove.power > 0 && <span className="move-power">({currentMove.power})</span>}
          </>
        ) : (
          <span className="move-empty">-- empty --</span>
        )}
        <span className="dropdown-arrow">▾</span>
      </div>

      {isOpen && (
        <div className="move-dropdown">
          <input
            type="text"
            className="pokemon-search"
            placeholder="Search moves... (or browse learnable)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          />
          <div className="move-list">
            <div className="pokemon-option" onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}>
              <span className="move-empty">-- clear --</span>
            </div>
            {options.map((m) => (
              <div
                key={m.id}
                className={`pokemon-option ${value === m.name ? 'selected' : ''}`}
                onClick={() => { onChange(m.name); setIsOpen(false); setSearch(''); }}
              >
                <span className="move-type-badge" data-type={m.type?.toLowerCase()}>{m.type || '?'}</span>
                {' '}{m.name}
                {m.power > 0 && <span className="move-power"> ({m.power})</span>}
              </div>
            ))}
            {options.length === 0 && (
              <div className="pokemon-option"><span className="move-empty">No moves found</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
