import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import LocationCarousel from './components/LocationCarousel';
import DownloadsPage from './components/DownloadsPage';
import FindReplace from './components/FindReplace';
import TMEditor, { getDefaultTMs } from './components/TMEditor';
import MoveTutorEditor, { getDefaultMoveTutors } from './components/MoveTutorEditor';
import TradeEditor, { getDefaultTrades } from './components/TradeEditor';
import ShopEditor, { getDefaultShops, getDefaultPrices } from './components/ShopEditor';
import { getDefaultFieldItems } from './components/FieldItemEditor';
import LearnsetEditor from './components/LearnsetEditor';
import PokemonStatsEditor from './components/PokemonStatsEditor';
import EvolutionEditor from './components/EvolutionEditor';
import { exportChangesOnlyJSON, parseJSON } from './data/templateParser';
import { getDefaultCrystalEncounters, getDefaultSlotsForArea, getDefaultCrystalTrainers } from './data/crystalEncounters';
import { ALL_TYPES } from './data/pokemonFilters';
import { PokemonFilterContext } from './data/pokemonFilterContext';
import { pushState, undo } from './data/undoHistory';
import { POKEMON_BY_NAME } from './data/pokemon';
import { getDefaultMoveset } from './components/TrainerEditor';
import './App.css';

const SAVE_KEY = 'pkcrystal_editor_save';
const SAVE_VERSION = 4; // v4: descriptive fishing names, starters under New Bark Town

function loadSavedState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved.areas || !saved.trainers) return null;
    // Migrate old saves: collapse time-of-day areas
    if ((saved.version || 1) < 2) {
      saved.areas = saved.areas.filter(a => {
        const name = a.name || '';
        return !name.includes('(Morning)') && !name.includes('(Night)');
      }).map(a => {
        const name = a.name || '';
        if (name.includes('(Day)')) {
          return { ...a, name: name.replace(' (Day)', ''), originalName: name };
        }
        return a;
      });
    }
    // v4: rename fishing groups and starters
    if ((saved.version || 1) < 4) {
      const nameMap = {
        '[STATIC] Starters': 'New Bark Town Starters',
        'Fishing Group 1': 'Fishing - Shore (Cherrygrove, Olivine, Cianwood)',
        'Fishing Group 2': 'Fishing - Ocean (New Bark, Ports, Sea Routes)',
        'Fishing Group 3': 'Fishing - Caves (Dark Cave, Union Cave, Mt. Mortar)',
        'Fishing Group 4': 'Fishing - Ponds (Violet, Ecruteak, Ilex Forest)',
        'Fishing Group 5': "Fishing - Dragon's Den / Ice Path",
        'Fishing Group 6': 'Fishing - Qwilfish Swarm',
        'Fishing Group 7': 'Fishing - Remoraid Swarm',
        'Fishing Group 8': 'Fishing - Lake of Rage / Fuchsia City',
        'Fishing Group 9': 'Fishing - Route 45',
        'Fishing Group 10': 'Fishing - Whirl Islands',
        'Fishing Group 11': 'Fishing - Route 32 (Qwilfish)',
        'Fishing Group 12': 'Fishing - Route 44 (Remoraid)',
      };
      saved.areas = saved.areas.map(a => ({
        ...a,
        name: nameMap[a.name] || a.name,
      }));
    }
    saved.version = SAVE_VERSION;
    return saved;
  } catch (_) { /* ignore corrupt data */ }
  return null;
}

function saveState(areas, trainers, extras) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ areas, trainers, extras, version: SAVE_VERSION }));
  } catch (_) { /* storage full, ignore */ }
}

const EDITOR_TABS = [
  { id: 'encounters', label: 'Encounters / Trainers' },
  { id: 'tms', label: 'TMs' },
  { id: 'tutors', label: 'Move Tutors' },
  { id: 'trades', label: 'Trades' },
  { id: 'shops', label: 'Shops' },
  { id: 'learnsets', label: 'Learnsets' },
  { id: 'stats', label: 'Stats / Types' },
  { id: 'evolutions', label: 'Evolutions' },
];

function App() {
  const [areas, setAreas] = useState(() => {
    const saved = loadSavedState();
    return saved ? saved.areas : getDefaultCrystalEncounters();
  });
  const [trainers, setTrainers] = useState(() => {
    const saved = loadSavedState();
    return saved ? saved.trainers : getDefaultCrystalTrainers();
  });
  const [extras, setExtras] = useState(() => {
    const saved = loadSavedState();
    return saved?.extras || {};
  });
  const [fileName, setFileName] = useState('custom_encounters.json');
  const [page, setPage] = useState('home');
  const [editorTab, setEditorTab] = useState('encounters');
  const isInitial = useRef(true);

  // Update browser title based on page
  useEffect(() => {
    const titles = {
      home: "Chris' Pokemon Randomiser",
      downloads: "Downloads - Chris' Pokemon Randomiser",
      editor: "Pokemon Crystal - Chris' Randomiser",
    };
    document.title = titles[page] || "Chris' Pokemon Randomiser";
  }, [page]);

  // Push initial state to undo history
  useEffect(() => {
    pushState(areas, trainers);
  }, []);

  // Auto-save and push undo on every change (skip initial)
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    saveState(areas, trainers, extras);
    pushState(areas, trainers);
  }, [areas, trainers, extras]);

  // Ctrl+Z handler
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        const prev = undo();
        if (prev) {
          isInitial.current = true; // prevent double-push
          setAreas(prev.areas);
          setTrainers(prev.trainers);
          saveState(prev.areas, prev.trainers, extras);
          // Reset flag after state settles
          setTimeout(() => { isInitial.current = false; }, 0);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [extras]);

  // Global filters
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterStage, setFilterStage] = useState('any');
  const [filterLegendary, setFilterLegendary] = useState('any');
  const [filterEvolved, setFilterEvolved] = useState('any');
  const [filterBstRanges, setFilterBstRanges] = useState([]);

  const filters = useMemo(() => ({
    types: filterTypes,
    stage: filterStage,
    legendary: filterLegendary,
    evolved: filterEvolved,
    bstRanges: filterBstRanges,
  }), [filterTypes, filterStage, filterLegendary, filterEvolved, filterBstRanges]);

  function toggleType(type) {
    setFilterTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { areas: parsedAreas, trainers: parsedTrainers, extras: parsedExtras } = parseJSON(ev.target.result);
      if (parsedAreas.length > 0) setAreas(parsedAreas);
      if (parsedTrainers.length > 0) setTrainers(parsedTrainers);
      if (parsedExtras && Object.keys(parsedExtras).length > 0) {
        setExtras(prev => ({ ...prev, ...parsedExtras }));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleExport() {
    if (!areas) return;
    const json = exportChangesOnlyJSON(areas, trainers, extras);
    const hasContent = json.encounters || json.trainers || json.tms || json.moveTutors
      || json.trades || json.shops || json.prices || json.fieldItems || json.learnsets
      || json.pokemonEdits || json.evolutionEdits;
    if (!hasContent) {
      alert('No changes detected - nothing to export.');
      return;
    }
    const text = JSON.stringify(json, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'custom_encounters.json';
    a.click();
    URL.revokeObjectURL(url);
  }


  const handleSlotChange = useCallback((areaIndex, slotIndex, newSlot) => {
    setAreas(prev => {
      const next = [...prev];
      next[areaIndex] = {
        ...next[areaIndex],
        slots: next[areaIndex].slots.map((s, i) => i === slotIndex ? newSlot : s),
      };
      return next;
    });
  }, []);

  const handleResetArea = useCallback((areaIndices) => {
    setAreas(prev => {
      const next = [...prev];
      for (const idx of areaIndices) {
        const defaults = getDefaultSlotsForArea(idx);
        if (defaults) {
          next[idx] = { ...next[idx], slots: defaults };
        }
      }
      return next;
    });
  }, []);

  const handleTrainerPokemonChange = useCallback((trainerIndex, pokeIndex, newPoke) => {
    setTrainers(prev => {
      const next = [...prev];
      const idx = next.findIndex(t => t.index === trainerIndex);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          pokemon: next[idx].pokemon.map((p, i) => i === pokeIndex ? newPoke : p),
        };
      }
      return next;
    });
  }, []);

  const handleFieldItemChange = useCallback((fieldItemIndex, newItemId) => {
    setExtras(prev => {
      const items = prev.fieldItems || getDefaultFieldItems();
      return {
        ...prev,
        fieldItems: items.map(f => f.index === fieldItemIndex ? { ...f, item: newItemId } : f),
      };
    });
  }, []);

  function handleResetAll() {
    if (!window.confirm('Reset everything to defaults? This cannot be undone.')) return;
    localStorage.removeItem(SAVE_KEY);
    setAreas(getDefaultCrystalEncounters());
    setTrainers(getDefaultCrystalTrainers());
    setExtras({});
  }

  function handleFindReplace(findName, replaceName, inEncounters, inTrainers) {
    const findUpper = findName.toUpperCase();

    if (inEncounters) {
      setAreas(prev => prev.map(area => ({
        ...area,
        slots: area.slots.map(slot => {
          if (slot.pokemonName && slot.pokemonName.toUpperCase() === findUpper) {
            return { ...slot, pokemonName: replaceName, isRandom: false };
          }
          return slot;
        }),
      })));
    }

    if (inTrainers) {
      setTrainers(prev => prev.map(trainer => ({
        ...trainer,
        pokemon: trainer.pokemon.map(poke => {
          if (poke.pokemonName && poke.pokemonName.toUpperCase() === findUpper) {
            return { ...poke, pokemonName: replaceName, isRandom: false };
          }
          return poke;
        }),
      })));
    }
  }

  function handleRandomizeAll(pool, inEncounters, inTrainers) {
    if (inEncounters) {
      setAreas(prev => prev.map(area => ({
        ...area,
        slots: area.slots.map(slot => {
          const randPoke = pool[Math.floor(Math.random() * pool.length)];
          return { ...slot, pokemonName: randPoke.name, isRandom: false };
        }),
      })));
    }
    if (inTrainers) {
      setTrainers(prev => prev.map(trainer => ({
        ...trainer,
        pokemon: trainer.pokemon.map(poke => {
          const randPoke = pool[Math.floor(Math.random() * pool.length)];
          const pokemonId = POKEMON_BY_NAME[randPoke.name.toUpperCase()]?.id || 0;
          const moves = pokemonId ? getDefaultMoveset(pokemonId, poke.level) : null;
          return { ...poke, pokemonName: randPoke.name, isRandom: false, moves };
        }),
      })));
    }
  }

  // Extra editor state helpers
  function getExtraState(key, defaultFn) {
    return extras[key] || defaultFn();
  }

  function setExtraState(key, value) {
    setExtras(prev => ({ ...prev, [key]: value }));
  }

  const nav = (
    <div className="nav">
      <a href="#" onClick={(e) => { e.preventDefault(); setPage('home'); }}
        style={page === 'home' ? { fontWeight: 'bold' } : {}}>[Home]</a>
      {' '}
      <a href="#" onClick={(e) => { e.preventDefault(); setPage('downloads'); }}
        style={page === 'downloads' ? { fontWeight: 'bold' } : {}}>[Downloads]</a>
    </div>
  );

  if (page === 'home') {
    return (
      <div className="app">
        <h1>Chris' Pokemon Randomiser</h1>
        {nav}
        <hr />
        <h3>Encounter & Trainer Editors</h3>
        <ul>
          <li><a href="#" onClick={(e) => { e.preventDefault(); setPage('editor'); }}>Pokemon Crystal</a></li>
        </ul>
      </div>
    );
  }

  if (page === 'downloads') {
    return (
      <div className="app">
        <h1>Downloads</h1>
        {nav}
        <DownloadsPage />
      </div>
    );
  }

  const hasFilters = filterTypes.length > 0 || filterStage !== 'any' || filterLegendary !== 'any' || filterEvolved !== 'any' || filterBstRanges.length > 0;

  const BST_RANGES = [
    { label: '<200', min: 0, max: 199 },
    { label: '200-299', min: 200, max: 299 },
    { label: '300-399', min: 300, max: 399 },
    { label: '400-499', min: 400, max: 499 },
    { label: '500+', min: 500, max: 999 },
  ];

  function toggleBstRange(range) {
    setFilterBstRanges(prev => {
      const key = range.label;
      const has = prev.some(r => r.label === key);
      return has ? prev.filter(r => r.label !== key) : [...prev, range];
    });
  }

  return (
    <PokemonFilterContext.Provider value={filters}>
      <div className="app">
        <h1>Pokemon Crystal - Custom Editor</h1>
        {nav}
        <hr />

        <div className="toolbar">
          <div className="toolbar-right">
            <label className="file-label">
              [<span className="link">Load File</span>]
              <input type="file" accept=".json" onChange={handleFileImport} hidden />
            </label>
            {' '}
            <a href="#" onClick={(e) => { e.preventDefault(); handleExport(); }}>[Save File]</a>
            {' '}
            <a href="#" onClick={(e) => { e.preventDefault(); handleResetAll(); }}>[Reset to Defaults]</a>
          </div>
        </div>

        <hr />

        <div className="editor-tabs">
          {EDITOR_TABS.map(tab => (
            <a
              key={tab.id}
              href="#"
              className={`editor-tab ${editorTab === tab.id ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setEditorTab(tab.id); }}
            >{tab.label}</a>
          ))}
        </div>

        <hr />

        {editorTab === 'encounters' && (
          <>
            <div className="toolbar">
              <div className="toolbar-right">
                <FindReplace areas={areas} trainers={trainers} onReplace={handleFindReplace} onRandomizeAll={handleRandomizeAll} />
              </div>
            </div>

            <hr />

            <div className="global-filters">
              <div className="filter-row">
                <span className="filter-label">Type:</span>
                {ALL_TYPES.map(t => (
                  <a
                    key={t}
                    href="#"
                    className={`type-filter-btn ${filterTypes.includes(t) ? 'active' : ''}`}
                    data-type={t.toLowerCase()}
                    onClick={(e) => { e.preventDefault(); toggleType(t); }}
                  >{t.charAt(0) + t.slice(1).toLowerCase()}</a>
                ))}
              </div>
              <div className="filter-row">
                <span className="filter-label">Stage:</span>
                {[['any', 'Any'], ['1', 'Basic'], ['2', 'Stage 2'], ['3', 'Stage 3']].map(([val, label]) => (
                  <a
                    key={val}
                    href="#"
                    className={`filter-btn ${filterStage === val ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); setFilterStage(val); }}
                  >{label}</a>
                ))}
                <span className="filter-label" style={{ marginLeft: 12 }}>Evolved:</span>
                {[['any', 'Any'], ['fully', 'Fully Evolved'], ['not_fully', 'Not Fully Evolved']].map(([val, label]) => (
                  <a
                    key={val}
                    href="#"
                    className={`filter-btn ${filterEvolved === val ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); setFilterEvolved(val); }}
                  >{label}</a>
                ))}
                <span className="filter-label" style={{ marginLeft: 12 }}>Legendary:</span>
                {[['any', 'Any'], ['none', 'None'], ['only', 'Only']].map(([val, label]) => (
                  <a
                    key={val}
                    href="#"
                    className={`filter-btn ${filterLegendary === val ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); setFilterLegendary(val); }}
                  >{label}</a>
                ))}
              </div>
              <div className="filter-row">
                <span className="filter-label">BST:</span>
                {BST_RANGES.map(r => (
                  <a
                    key={r.label}
                    href="#"
                    className={`filter-btn ${filterBstRanges.some(b => b.label === r.label) ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); toggleBstRange(r); }}
                  >{r.label}</a>
                ))}
                {hasFilters && (
                  <>
                    {' | '}
                    <a href="#" onClick={(e) => {
                      e.preventDefault();
                      setFilterTypes([]);
                      setFilterStage('any');
                      setFilterLegendary('any');
                      setFilterEvolved('any');
                      setFilterBstRanges([]);
                    }}>[Clear Filters]</a>
                  </>
                )}
              </div>
            </div>

            <hr />

            <LocationCarousel
              areas={areas}
              trainers={trainers}
              fieldItems={getExtraState('fieldItems', getDefaultFieldItems)}
              onSlotChange={handleSlotChange}
              onResetArea={handleResetArea}
              onTrainerPokemonChange={handleTrainerPokemonChange}
              onFieldItemChange={handleFieldItemChange}
            />
          </>
        )}

        {editorTab === 'tms' && (
          <TMEditor
            tms={getExtraState('tms', getDefaultTMs)}
            onChange={(val) => setExtraState('tms', val)}
          />
        )}

        {editorTab === 'tutors' && (
          <MoveTutorEditor
            tutors={getExtraState('moveTutors', getDefaultMoveTutors)}
            onChange={(val) => setExtraState('moveTutors', val)}
          />
        )}

        {editorTab === 'trades' && (
          <TradeEditor
            trades={getExtraState('trades', getDefaultTrades)}
            onChange={(val) => setExtraState('trades', val)}
          />
        )}

        {editorTab === 'shops' && (
          <ShopEditor
            shops={getExtraState('shops', getDefaultShops)}
            prices={getExtraState('prices', () => ({}))}
            onChange={(val) => setExtraState('shops', val)}
            onPriceChange={(val) => setExtraState('prices', val)}
          />
        )}

        {editorTab === 'learnsets' && (
          <LearnsetEditor
            learnsets={getExtraState('learnsets', () => ({}))}
            onChange={(val) => setExtraState('learnsets', val)}
          />
        )}

        {editorTab === 'stats' && (
          <PokemonStatsEditor
            edits={getExtraState('pokemonEdits', () => [])}
            onChange={(val) => setExtraState('pokemonEdits', val)}
          />
        )}

        {editorTab === 'evolutions' && (
          <EvolutionEditor
            edits={getExtraState('evolutionEdits', () => [])}
            onChange={(val) => setExtraState('evolutionEdits', val)}
          />
        )}
      </div>
    </PokemonFilterContext.Provider>
  );
}

export default App;
