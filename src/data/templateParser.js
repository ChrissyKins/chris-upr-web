import { POKEMON_BY_NAME, POKEMON_BY_ID } from './pokemon';
import { expandTimeOfDay, getGameMoves, getPhoneRematchMap } from './gameData';
import { getDefaultCrystalEncounters, getDefaultCrystalTrainers } from './crystalEncounters';

let _moveNameToId = null;
function moveNameToId(name) {
  if (!name) return 0;
  if (!_moveNameToId) {
    _moveNameToId = {};
    for (const m of getGameMoves()) _moveNameToId[m.name.toUpperCase()] = m.id;
  }
  return _moveNameToId[name.toUpperCase()] || 0;
}

function nameToId(name) {
  if (!name) return 0;
  const pk = POKEMON_BY_NAME[name.toUpperCase()];
  return pk ? pk.id : 0;
}

function idToName(id) {
  if (!id || id === 0) return { name: '', isRandom: true };
  const pk = POKEMON_BY_ID[id];
  return pk ? { name: pk.name, isRandom: false } : { name: '', isRandom: true };
}

/**
 * Export structured data as JSON using pokemon IDs.
 * 0 = RANDOM (let the randomizer pick).
 */
export function exportJSON(areas, trainers, extras) {
  const expandedAreas = expandTimeOfDay(areas);

  const jsonAreas = expandedAreas.map(area => {
    const isStatic = area.name.startsWith('[STATIC]');
    const isStarters = area.isStarters || area.name === '[STATIC] Starters';

    return {
      name: area.name,
      slots: area.slots.map(slot => {
        const entry = {};

        if (isStatic && !isStarters && slot.romIndex >= 0) {
          entry.slot = slot.romIndex + 1;
        } else if (isStarters) {
          entry.slot = slot.starterIndex >= 0 ? slot.starterIndex + 1 : slot.slotNum;
        } else {
          entry.slot = slot.slotNum;
        }

        if (slot.label) entry.label = slot.label;

        entry.pokemon = slot.isRandom || !slot.pokemonName ? 0 : nameToId(slot.pokemonName);
        entry.level = slot.level;
        if (slot.maxLevel > 0) entry.maxLevel = slot.maxLevel;

        return entry;
      }),
    };
  });

  const jsonTrainers = (trainers || []).map(trainer => ({
    index: trainer.index,
    name: trainer.displayName,
    ...(trainer.tag ? { tag: trainer.tag } : {}),
    pokemon: trainer.pokemon.map(poke => {
      const entry = {
        slot: poke.slotNum,
        pokemon: poke.isRandom || !poke.pokemonName ? 0 : nameToId(poke.pokemonName),
        level: poke.level,
      };
      if (poke.item) entry.item = poke.item;
      if (poke.moves && poke.moves.length > 0) entry.moves = poke.moves.map(m => moveNameToId(m));
      return entry;
    }),
  }));

  const result = {
    format: 'pokemon-crystal-custom',
    version: 3,
    encounters: jsonAreas,
    trainers: jsonTrainers,
  };

  // Include extra data sections if they have any edits
  if (extras) {
    if (extras.tms && extras.tms.length > 0) {
      result.tms = extras.tms.map(tm => ({ tm: tm.tm, moveId: tm.moveId }));
    }
    if (extras.moveTutors && extras.moveTutors.length > 0) {
      result.moveTutors = extras.moveTutors.map(mt => ({ index: mt.index, moveId: mt.moveId }));
    }
    if (extras.trades && extras.trades.length > 0) {
      result.trades = extras.trades.map(t => ({
        index: t.index,
        givenPokemon: nameToId(t.givenPokemon),
        requestedPokemon: nameToId(t.requestedPokemon),
        nickname: t.nickname || undefined,
        otName: t.otName || undefined,
        item: t.item || undefined,
      }));
    }
    if (extras.shops && extras.shops.length > 0) {
      result.shops = extras.shops.map(s => ({
        index: s.index,
        name: s.name || undefined,
        items: s.items,
      }));
    }
    if (extras.prices && Object.keys(extras.prices).length > 0) {
      result.prices = Object.entries(extras.prices).map(([item, price]) => ({
        item: parseInt(item),
        price,
      }));
    }
    if (extras.fieldItems && extras.fieldItems.length > 0) {
      result.fieldItems = extras.fieldItems.map(f => ({
        index: f.index,
        item: f.item,
      }));
    }
    if (extras.learnsets && Object.keys(extras.learnsets).length > 0) {
      result.learnsets = extras.learnsets;
    }
    if (extras.pokemonEdits && extras.pokemonEdits.length > 0) {
      result.pokemonEdits = extras.pokemonEdits;
    }
    if (extras.evolutionEdits && extras.evolutionEdits.length > 0) {
      result.evolutionEdits = extras.evolutionEdits;
    }
  }

  return result;
}

/**
 * Check if an area has any slots that differ from vanilla defaults.
 */
function isAreaChanged(area, defaultAreas) {
  const def = defaultAreas.find(d => d.name === area.name);
  if (!def) return true; // new area not in defaults — include it
  if (area.slots.length !== def.slots.length) return true;
  return area.slots.some((slot, i) => {
    const ds = def.slots[i];
    if (!ds) return true;
    if (slot.isRandom && !ds.isRandom) return true;
    if (!slot.isRandom && ds.isRandom) return true;
    if ((slot.pokemonName || '') !== (ds.pokemonName || '')) return true;
    if (slot.level !== ds.level) return true;
    if ((slot.maxLevel || 0) !== (ds.maxLevel || 0)) return true;
    return false;
  });
}

/**
 * Check if a trainer has any pokemon that differ from vanilla defaults.
 */
function isTrainerChanged(trainer, defaultTrainers) {
  const def = defaultTrainers.find(d => d.index === trainer.index);
  if (!def) return true;
  // Check dialogue changes
  if ((trainer.seenText || '') !== (def.seenText || '')) return true;
  if ((trainer.beatenText || '') !== (def.beatenText || '')) return true;
  if ((trainer.afterText || '') !== (def.afterText || '')) return true;
  if (trainer.pokemon.length !== def.pokemon.length) return true;
  return trainer.pokemon.some((poke, i) => {
    const dp = def.pokemon[i];
    if (!dp) return true;
    if (poke.isRandom && !dp.isRandom) return true;
    if (!poke.isRandom && dp.isRandom) return true;
    if ((poke.pokemonName || '') !== (dp.pokemonName || '')) return true;
    if (poke.level !== dp.level) return true;
    if ((poke.item || null) !== (dp.item || null)) return true;
    if (poke.moves && !dp.moves) return true;
    if (!poke.moves && dp.moves) return true;
    if (poke.moves && dp.moves && JSON.stringify(poke.moves) !== JSON.stringify(dp.moves)) return true;
    return false;
  });
}

/**
 * Export only changed data as JSON (delta mode).
 * Areas/trainers that match vanilla defaults are omitted, letting the
 * randomizer handle them with its own settings.
 */
export function exportChangesOnlyJSON(areas, trainers, extras) {
  const defaultAreas = getDefaultCrystalEncounters();
  const defaultTrainers = getDefaultCrystalTrainers();

  const changedAreas = areas.filter(area => isAreaChanged(area, defaultAreas));
  const changedTrainers = (trainers || []).filter(t => isTrainerChanged(t, defaultTrainers));

  const expandedAreas = expandTimeOfDay(changedAreas);

  const jsonAreas = expandedAreas.map(area => {
    const isStatic = area.name.startsWith('[STATIC]');
    const isStarters = area.isStarters || area.name === '[STATIC] Starters';

    return {
      name: area.name,
      slots: area.slots.map(slot => {
        const entry = {};

        if (isStatic && !isStarters && slot.romIndex >= 0) {
          entry.slot = slot.romIndex + 1;
        } else if (isStarters) {
          entry.slot = slot.starterIndex >= 0 ? slot.starterIndex + 1 : slot.slotNum;
        } else {
          entry.slot = slot.slotNum;
        }

        if (slot.label) entry.label = slot.label;

        entry.pokemon = slot.isRandom || !slot.pokemonName ? 0 : nameToId(slot.pokemonName);
        entry.level = slot.level;
        if (slot.maxLevel > 0) entry.maxLevel = slot.maxLevel;

        return entry;
      }),
    };
  });

  const jsonTrainers = changedTrainers.map(trainer => {
    const def = defaultTrainers.find(d => d.index === trainer.index);
    const seenChanged = def && (trainer.seenText || '') !== (def.seenText || '');
    const beatenChanged = def && (trainer.beatenText || '') !== (def.beatenText || '');
    const afterChanged = def && (trainer.afterText || '') !== (def.afterText || '');
    const nameChanged = def && trainer.name !== def.name;
    return {
      index: trainer.index,
      name: trainer.displayName,
      ...(trainer.tag ? { tag: trainer.tag } : {}),
      ...(nameChanged ? { trainerName: trainer.name } : {}),
      ...(seenChanged ? { seenText: trainer.seenText } : {}),
      ...(beatenChanged ? { beatenText: trainer.beatenText } : {}),
      ...(afterChanged ? { afterText: trainer.afterText } : {}),
      pokemon: trainer.pokemon.map(poke => {
        const entry = {
          slot: poke.slotNum,
          pokemon: poke.isRandom || !poke.pokemonName ? 0 : nameToId(poke.pokemonName),
          level: poke.level,
        };
        if (poke.item) entry.item = poke.item;
        if (poke.moves && poke.moves.length > 0) entry.moves = poke.moves.map(m => moveNameToId(m));
        return entry;
      }),
    };
  });

  // Propagate Pokemon species changes to phone rematches.
  // Rematches keep their own levels/items/moves but get the same species.
  const rematchMap = getPhoneRematchMap();
  const rematchEntries = [];
  for (const jt of jsonTrainers) {
    const rematches = rematchMap[jt.index];
    if (!rematches) continue;
    for (const rm of rematches) {
      rematchEntries.push({
        index: rm.index,
        pokemon: rm.pokemon.map((rp, i) => {
          const basePoke = jt.pokemon[i] || jt.pokemon[jt.pokemon.length - 1];
          return {
            slot: rp.slotNum,
            pokemon: basePoke.pokemon, // species from base trainer
            level: rp.level,           // keep rematch level
            ...(rp.item ? { item: rp.item } : {}),
            ...(rp.moves ? { moves: rp.moves } : {}),
          };
        }),
      });
    }
  }
  jsonTrainers.push(...rematchEntries);

  const result = {
    format: 'pokemon-crystal-custom',
    version: 3,
  };

  // Only include encounters/trainers if there are changes
  if (jsonAreas.length > 0) result.encounters = jsonAreas;
  if (jsonTrainers.length > 0) result.trainers = jsonTrainers;

  // Extras already only export if they have content
  if (extras) {
    if (extras.tms && extras.tms.length > 0) {
      result.tms = extras.tms.map(tm => ({ tm: tm.tm, moveId: tm.moveId }));
    }
    if (extras.moveTutors && extras.moveTutors.length > 0) {
      result.moveTutors = extras.moveTutors.map(mt => ({ index: mt.index, moveId: mt.moveId }));
    }
    if (extras.trades && extras.trades.length > 0) {
      result.trades = extras.trades.map(t => ({
        index: t.index,
        givenPokemon: nameToId(t.givenPokemon),
        requestedPokemon: nameToId(t.requestedPokemon),
        nickname: t.nickname || undefined,
        otName: t.otName || undefined,
        item: t.item || undefined,
      }));
    }
    if (extras.shops && extras.shops.length > 0) {
      result.shops = extras.shops.map(s => ({
        index: s.index,
        name: s.name || undefined,
        items: s.items,
      }));
    }
    if (extras.prices && Object.keys(extras.prices).length > 0) {
      result.prices = Object.entries(extras.prices).map(([item, price]) => ({
        item: parseInt(item),
        price,
      }));
    }
    if (extras.fieldItems && extras.fieldItems.length > 0) {
      result.fieldItems = extras.fieldItems.map(f => ({
        index: f.index,
        item: f.item,
      }));
    }
    if (extras.learnsets && Object.keys(extras.learnsets).length > 0) {
      result.learnsets = extras.learnsets;
    }
    if (extras.pokemonEdits && extras.pokemonEdits.length > 0) {
      result.pokemonEdits = extras.pokemonEdits;
    }
    if (extras.evolutionEdits && extras.evolutionEdits.length > 0) {
      result.evolutionEdits = extras.evolutionEdits;
    }
  }

  return result;
}

/**
 * Parse a JSON object back into { areas, trainers, extras }.
 * Pokemon are referenced by national dex ID; 0 = RANDOM.
 */
export function parseJSON(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;

  const areas = (data.encounters || []).map(area => {
    const isStatic = area.name.startsWith('[STATIC]');
    const isStarters = area.name === '[STATIC] Starters' || area.name === 'New Bark Town Starters';

    return {
      name: area.name,
      ...(isStarters ? { isStarters: true } : {}),
      slots: (area.slots || []).map((slot, i) => {
        const resolved = idToName(slot.pokemon);
        const entry = {
          slotNum: isStatic ? i + 1 : (slot.slot || i + 1),
          pokemonName: resolved.name,
          isRandom: resolved.isRandom,
          level: slot.level || 5,
          maxLevel: slot.maxLevel || 0,
        };
        if (slot.label) entry.label = slot.label;
        if (isStatic && !isStarters) {
          entry.romIndex = (slot.slot || i + 1) - 1;
          entry.starterIndex = -1;
        }
        if (isStarters) {
          entry.starterIndex = (slot.slot || i + 1) - 1;
          entry.romIndex = -1;
        }
        return entry;
      }),
    };
  });

  const trainers = (data.trainers || []).map(trainer => ({
    index: trainer.index,
    displayName: trainer.name,
    tag: trainer.tag || null,
    ...(trainer.seenText !== undefined ? { seenText: trainer.seenText } : {}),
    ...(trainer.beatenText !== undefined ? { beatenText: trainer.beatenText } : {}),
    ...(trainer.afterText !== undefined ? { afterText: trainer.afterText } : {}),
    pokemon: (trainer.pokemon || []).map(poke => {
      const resolved = idToName(poke.pokemon);
      return {
        slotNum: poke.slot,
        pokemonName: resolved.name,
        isRandom: resolved.isRandom,
        level: poke.level || 5,
        item: poke.item || null,
        moves: poke.moves ? poke.moves.map(m => {
          if (typeof m === 'number') {
            const move = getGameMoves().find(gm => gm.id === m);
            return move ? move.name : null;
          }
          return m || null;
        }) : null,
      };
    }),
  }));

  // Parse extra data sections
  const extras = {};

  if (data.tms) {
    extras.tms = data.tms.map(t => ({ tm: t.tm, moveId: t.moveId }));
  }
  if (data.moveTutors) {
    extras.moveTutors = data.moveTutors.map(mt => ({ index: mt.index, moveId: mt.moveId }));
  }
  if (data.trades) {
    extras.trades = data.trades.map(t => {
      const given = idToName(t.givenPokemon);
      const requested = idToName(t.requestedPokemon);
      return {
        index: t.index,
        givenPokemon: given.name,
        requestedPokemon: requested.name,
        nickname: t.nickname || '',
        otName: t.otName || '',
        item: t.item || 0,
      };
    });
  }
  if (data.shops) {
    extras.shops = data.shops.map(s => ({
      index: s.index,
      name: s.name || '',
      items: s.items || [],
    }));
  }
  if (data.prices) {
    extras.prices = {};
    for (const p of data.prices) {
      if (p.item > 0) extras.prices[p.item] = p.price;
    }
  }
  if (data.fieldItems) {
    extras.fieldItems = data.fieldItems.map(f => ({
      index: f.index,
      item: f.item,
    }));
  }
  if (data.learnsets) {
    extras.learnsets = data.learnsets;
  }
  if (data.pokemonEdits) {
    extras.pokemonEdits = data.pokemonEdits;
  }
  if (data.evolutionEdits) {
    extras.evolutionEdits = data.evolutionEdits;
  }

  return { areas, trainers, extras };
}
