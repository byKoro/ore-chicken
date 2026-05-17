/**
 * Ore Chickens — Test Suite
 *
 * Ativa via: /scriptevent oc:test <comando>
 *
 * Adicione ao main.js:
 *   import { registerTestEvents } from './oc_test';
 *   registerTestEvents();
 */

import { system, world, BlockPermutation, ItemStack } from '@minecraft/server';
import { Chickens } from './Configs/chickens_config';

// ─────────────────────────────────────────────
//  Constantes
// ─────────────────────────────────────────────

const EVENT_ID = 'oc:test';
const NEARBY_RADIUS = 12;

const STATUE_STAGES = [
  'oc:copper_chicken_statue_unoxidized',
  'oc:copper_chicken_statue_exposed',
  'oc:copper_chicken_statue_weathered',
  'oc:copper_chicken_statue_oxidized',
];

// Itens entregues pelo comando give_items
const TEST_ITEMS = [
  ['oc:cage',                                    8],
  ['minecraft:honeycomb',                       16],
  ['minecraft:wooden_axe',                       1],
  ['minecraft:gold_block',                       4],
  ['minecraft:iron_block',                       4],
  ['minecraft:coal_block',                       4],
  ['minecraft:lapis_block',                      4],
  ['minecraft:budding_amethyst',                 4],
  ['minecraft:redstone_block',                   4],
  ['minecraft:copper_block',                     4],
  ['minecraft:diamond_block',                    4],
  ['minecraft:emerald_block',                    4],
  ['minecraft:quartz_block',                     4],
  ['minecraft:netherite_upgrade_smithing_template', 1],
];

const HELP_LINES = [
  ['spawn_all',        'Spawna uma de cada ore chicken ao redor de você'],
  ['spawn <tipo>',     'Spawna uma galinha específica  ex: spawn gold'],
  ['boost',           'Coloca o bloco certo embaixo de cada ore chicken próxima'],
  ['give_items',      'Dá todos os itens de conversão + cage + honeycomb + machado'],
  ['statues',         'Coloca as 4 estátuas de cobre à sua frente (todos os estágios)'],
  ['copper_oxidize',  'Spawna copper chicken no estágio 3 — próxima oxidação vira estátua'],
  ['cage_test',       'Spawna uma gold chicken e dá uma cage para testar captura/soltura'],
  ['clear',           'Remove todas as oc: entities no raio de ' + NEARBY_RADIUS + ' blocos'],
  ['help',            'Exibe esta lista'],
];

// Map entity → config (para boost e validação)
const chickenByEntity = new Map(Object.values(Chickens).map(c => [c.entity, c]));

// ─────────────────────────────────────────────
//  Utilitários
// ─────────────────────────────────────────────

/**
 * Retorna o jogador que disparou o scriptevent,
 * ou o primeiro jogador online como fallback.
 */
function resolvePlayer(ev) {
  if (ev.sourceEntity?.typeId === 'minecraft:player') return ev.sourceEntity;
  const [first] = world.getAllPlayers();
  return first ?? null;
}

/**
 * Spawna entidades em círculo ao redor do jogador.
 */
function spawnInCircle(player, entityIds) {
  const { x, y, z } = player.location;
  const dim = player.dimension;
  const total = entityIds.length;

  return entityIds.map((typeId, i) => {
    const angle = (2 * Math.PI * i) / total;
    const chicken = dim.spawnEntity(typeId, {
      x: x + Math.cos(angle) * 4,
      y,
      z: z + Math.sin(angle) * 4,
    });
    chicken.triggerEvent('minecraft:ageable_grow_up');
    return chicken;
  });
}

/**
 * Converte rotation.y para vetor de direção horizontal (dx, dz).
 * Minecraft: y=0 → south (+Z), y=90 → west (-X), y=180 → north (-Z).
 */
function facingVector(player) {
  const rad = (player.getRotation().y * Math.PI) / 180;
  return { dx: -Math.sin(rad), dz: Math.cos(rad) };
}

/**
 * Retorna todas as oc: entities no raio definido.
 */
function getOreChickensNearby(player) {
  return player.dimension
    .getEntities({ location: player.location, maxDistance: NEARBY_RADIUS, families: ['chicken'] })
    .filter(e => e.typeId.startsWith('oc:') && e.isValid);
}

// ─────────────────────────────────────────────
//  Handlers de cada comando
// ─────────────────────────────────────────────

function cmdHelp(player) {
  player.sendMessage('§e§l=== Ore Chickens — Test Suite ===');
  player.sendMessage('§7Uso: §f/scriptevent oc:test §e<comando>');
  for (const [name, desc] of HELP_LINES) {
    player.sendMessage(`  §6${name.padEnd(18)}§7${desc}`);
  }
}

function cmdSpawnAll(player) {
  const types = Object.values(Chickens).map(c => c.entity);
  spawnInCircle(player, types);
  player.sendMessage(`§a✔ ${types.length} galinhas spawnadas em círculo ao seu redor.`);
}

function cmdSpawn(player, arg) {
  if (!arg) {
    player.sendMessage('§cUso: /scriptevent oc:test spawn <tipo>');
    player.sendMessage('§7Tipos disponíveis: §f' + [...chickenByEntity.keys()].join(', '));
    return;
  }
  // Aceita "gold" ou "oc:gold_chicken"
  const entityId = arg.includes(':') ? arg : `oc:${arg}_chicken`;

  try {
    const chicken = player.dimension.spawnEntity(entityId, player.location);
    chicken.triggerEvent('minecraft:ageable_grow_up');
    player.sendMessage(`§a✔ Spawnada: §f${entityId}`);
  } catch {
    player.sendMessage(`§cTipo inválido: §f${entityId}`);
    player.sendMessage('§7Tipos disponíveis: §f' + [...chickenByEntity.keys()].join(', '));
  }
}

function cmdBoost(player) {
  const chickens = getOreChickensNearby(player);
  let boosted = 0;

  for (const chicken of chickens) {
    const config = chickenByEntity.get(chicken.typeId);
    if (!config) continue;

    const loc = chicken.location;
    const blockLoc = {
      x: Math.floor(loc.x),
      y: Math.floor(loc.y) - 1,
      z: Math.floor(loc.z),
    };

    // Garante que não está no limite do mundo antes de acessar
    if (blockLoc.y < -64) continue;

    try {
      const block = chicken.dimension.getBlock(blockLoc);
      if (block) {
        block.setPermutation(BlockPermutation.resolve(config.block[0]));
        boosted++;
      }
    } catch {}
  }

  player.sendMessage(
    boosted > 0
      ? `§a✔ Bloco de boost colocado embaixo de §f${boosted}§a galinha(s).`
      : `§eNenhuma ore chicken encontrada no raio de §f${NEARBY_RADIUS}§e blocos.`
  );
}

function cmdGiveItems(player) {
  const container = player.getComponent('inventory').container;
  let given = 0;

  for (const [typeId, amount] of TEST_ITEMS) {
    try {
      container.addItem(new ItemStack(typeId, amount));
      given++;
    } catch {
      player.sendMessage(`§cFalha ao dar: §f${typeId}`);
    }
  }

  player.sendMessage(`§a✔ §f${given}§a tipos de item adicionados ao inventário.`);
  player.sendMessage('§7Inclui: cage, honeycomb, machado e todos os blocos de conversão.');
}

function cmdStatues(player) {
  const { dx, dz } = facingVector(player);
  const { x, y, z } = player.location;
  const dim = player.dimension;
  const floorY = Math.floor(y);
  let placed = 0;

  STATUE_STAGES.forEach((stageId, i) => {
    // 2 blocos de distância + 2 blocos de espaçamento entre cada estátua
    const bx = Math.floor(x + dx * 2 + dx * i * 2);
    const bz = Math.floor(z + dz * 2 + dz * i * 2);

    try {
      const block = dim.getBlock({ x: bx, y: floorY, z: bz });
      if (block) {
        block.setPermutation(
          BlockPermutation.resolve(stageId, {
            'minecraft:cardinal_direction': 'south',
            'oc:pose': 0,
            'oc:wax': false,
          })
        );
        placed++;
      }
    } catch {}
  });

  player.sendMessage(`§a✔ §f${placed}§a estátua(s) colocada(s) à sua frente.`);
  player.sendMessage('§7Ordem: §funoxidized → exposed → weathered → oxidized');
  player.sendMessage('§7Use §fhoneycomb§7 para encerar e §fmachado§7 para raspar/recuar estágio.');
}

function cmdCopperOxidize(player) {
  const chicken = player.dimension.spawnEntity('oc:copper_chicken', player.location);
  chicken.triggerEvent('minecraft:ageable_grow_up');
  chicken.setProperty('oc:oxidation', 3);
  chicken.triggerEvent('oc:become_statue');
  player.sendMessage('§a✔ Copper chicken spawnada no estágio §f3§a.');
  player.sendMessage('§7Na próxima rodada de oxidação ela se transforma em estátua automaticamente.');
}

function cmdCageTest(player) {
  const chicken = player.dimension.spawnEntity('oc:gold_chicken', player.location);
  chicken.triggerEvent('minecraft:ageable_grow_up');

  const container = player.getComponent('inventory').container;
  try {
    container.addItem(new ItemStack('oc:cage', 1));
  } catch {}

  player.sendMessage('§a✔ Gold chicken spawnada + §fcage§a adicionada ao inventário.');
  player.sendMessage('§7Clique na galinha com a cage para capturar → use a chicken_cage no chão para soltar.');
}

function cmdClear(player) {
  const chickens = getOreChickensNearby(player);
  let removed = 0;

  for (const e of chickens) {
    e.remove();
    removed++;
  }

  player.sendMessage(
    removed > 0
      ? `§a✔ §f${removed}§a ore chicken(s) removida(s).`
      : `§eNenhuma ore chicken encontrada no raio de §f${NEARBY_RADIUS}§e blocos.`
  );
}

// ─────────────────────────────────────────────
//  Registro do script event
// ─────────────────────────────────────────────

export function registerTestEvents() {
  system.afterEvents.scriptEventReceive.subscribe(
    ev => {
      if (ev.id !== EVENT_ID) return;

      const player = resolvePlayer(ev);
      if (!player) return;

      const args = ev.message.trim().split(/\s+/);
      const cmd = args[0]?.toLowerCase() ?? '';

      system.run(() => {
        switch (cmd) {
          case 'help':
          case '':        return cmdHelp(player);
          case 'spawn_all': return cmdSpawnAll(player);
          case 'spawn':   return cmdSpawn(player, args[1]);
          case 'boost':   return cmdBoost(player);
          case 'give_items': return cmdGiveItems(player);
          case 'statues': return cmdStatues(player);
          case 'copper_oxidize': return cmdCopperOxidize(player);
          case 'cage_test': return cmdCageTest(player);
          case 'clear':   return cmdClear(player);
          default:
            player.sendMessage(`§cComando desconhecido: "§f${cmd}§c". Use §e/scriptevent oc:test help`);
        }
      });
    },
    { namespaces: ['oc'] }
  );
}
