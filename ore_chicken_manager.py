#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ore Chicken Manager
-------------------
Interface gráfica (Tkinter) para gerenciar o addon "Ore Chickens" do Minecraft Bedrock.

Coloque este arquivo na pasta raiz do addon (ao lado de "Ore Chickens BP" e
"Ore Chickens RP") e execute:

    python ore_chicken_manager.py

Funcionalidades:
  * Listar / criar / editar / remover galinhas
  * Configurar nome (EN/PT), vida, escala do bebê, duração de crescimento
  * Configurar drops (loot table) com múltiplos itens
  * Configurar o "ovo de minério" (item botado, tempo mín/máx)
  * Configurar breeding entre a mesma espécie (breed_items, baby_type)
  * Configurar a "criação cruzada" do ecossistema (chickens_config.js):
        - quais itens, ao alimentar, convertem qual entidade nesta galinha
        - útil para definir "galinha X + item Y => galinha Z"
  * Gera/edita TODOS os arquivos necessários:
        BP/entities/<id>.behavior.json
        BP/loot_tables/entities/<id>.json
        BP/scripts/Configs/chickens_config.js (regenerado)
        RP/entity/<id>.entity.json
        RP/models/entity/<id>.geo.json
        RP/animations/<id>.animation.json
        RP/textures/item_texture.json (entradas spawn egg)
        RP/texts/en_US.lang  e  pt_BR.lang
        RP/textures/entity/<id>.png            (placeholder vazio - você pinta)
        RP/textures/items/spawn_eggs/<id>_spawn_egg.png  (placeholder)
  * Usa amethyst_chicken como template.

Requer apenas Python 3.8+ (Tkinter já incluído na maioria das instalações).
"""

import json
import os
import re
import sys
import shutil
import struct
import zlib
try:
    import tkinter as tk
    from tkinter import ttk, messagebox, simpledialog
except Exception:  # permite uso headless (testes)
    tk = None

# ----------------------------------------------------------------------------- 
# Caminhos
# -----------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.abspath(__file__))
BP   = os.path.join(ROOT, "Ore Chickens BP")
RP   = os.path.join(ROOT, "Ore Chickens RP")

P_BP_ENTITIES   = os.path.join(BP, "entities")
P_BP_LOOT       = os.path.join(BP, "loot_tables", "entities")
P_BP_CONFIG     = os.path.join(BP, "scripts", "Configs", "chickens_config.js")
P_RP_ENTITY     = os.path.join(RP, "entity")
P_RP_MODELS     = os.path.join(RP, "models", "entity")
P_RP_ANIMS      = os.path.join(RP, "animations")
P_RP_TEX_ENT    = os.path.join(RP, "textures", "entity")
P_RP_TEX_EGG    = os.path.join(RP, "textures", "items", "spawn_eggs")
P_RP_ITEM_TEX   = os.path.join(RP, "textures", "item_texture.json")
P_RP_LANG_EN    = os.path.join(RP, "texts", "en_US.lang")
P_RP_LANG_PT    = os.path.join(RP, "texts", "pt_BR.lang")

TEMPLATE_ID = "amethyst_chicken"   # usado como base

# ----------------------------------------------------------------------------- 
# Utilitários de arquivo
# -----------------------------------------------------------------------------
def ensure_dirs():
    for p in (P_BP_ENTITIES, P_BP_LOOT, os.path.dirname(P_BP_CONFIG),
              P_RP_ENTITY, P_RP_MODELS, P_RP_ANIMS,
              P_RP_TEX_ENT, P_RP_TEX_EGG,
              os.path.dirname(P_RP_LANG_EN)):
        os.makedirs(p, exist_ok=True)

def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def write_blank_png(path, w=64, h=32, color=(255, 0, 220, 255)):
    """Gera um PNG sólido para o usuário pintar por cima.
    Cor magenta (placeholder bem visível) por padrão."""
    if os.path.exists(path):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    def chunk(t, d):
        return (struct.pack(">I", len(d)) + t + d +
                struct.pack(">I", zlib.crc32(t + d) & 0xffffffff))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    raw = b""
    row = bytes(color) * w
    for _ in range(h):
        raw += b"\x00" + row
    idat = zlib.compress(raw, 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))

# ----------------------------------------------------------------------------- 
# Parser ingênuo do chickens_config.js
# -----------------------------------------------------------------------------
def parse_chickens_config():
    """Lê o arquivo chickens_config.js e devolve dict {key: entry}.
    O arquivo é JS, mas seu corpo é um objeto literal simples - convertemos
    para JSON e parseamos."""
    if not os.path.exists(P_BP_CONFIG):
        return {}
    src = open(P_BP_CONFIG, "r", encoding="utf-8").read()
    m = re.search(r"=\s*({.*})\s*;?\s*$", src, re.DOTALL)
    if not m:
        return {}
    body = m.group(1)
    # JS -> JSON: aspas simples -> duplas; remover vírgulas finais; quote nas keys
    body = re.sub(r"'", '"', body)
    body = re.sub(r",(\s*[}\]])", r"\1", body)
    body = re.sub(r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:", r'\1"\2":', body)
    try:
        return json.loads(body)
    except Exception as e:
        print("Falha ao parsear chickens_config.js:", e)
        return {}

def write_chickens_config(data):
    """Reescreve o chickens_config.js a partir do dict."""
    def js(v, indent=2):
        pad = " " * indent
        if isinstance(v, list):
            if not v:
                return "[]"
            inner = ",\n".join(pad + "  " + js(x, indent + 2) for x in v)
            return "[\n" + inner + ",\n" + pad + "]"
        if isinstance(v, dict):
            if not v:
                return "{}"
            lines = []
            for k, vv in v.items():
                lines.append(f"{pad}  {k}: {js(vv, indent + 2)}")
            return "{\n" + ",\n".join(lines) + ",\n" + pad + "}"
        if isinstance(v, bool):
            return "true" if v else "false"
        if v is None:
            return "null"
        if isinstance(v, (int, float)):
            return str(v)
        return "'" + str(v).replace("'", "\\'") + "'"

    out = "export const Chickens = {\n"
    for k, v in data.items():
        out += f"  {k}: {js(v, 2)},\n"
    out += "};\n"
    os.makedirs(os.path.dirname(P_BP_CONFIG), exist_ok=True)
    with open(P_BP_CONFIG, "w", encoding="utf-8") as f:
        f.write(out)

# ----------------------------------------------------------------------------- 
# Templates baseados na amethyst_chicken
# -----------------------------------------------------------------------------
def build_behavior(c):
    """c = dict com a config da galinha"""
    ident = f"oc:{c['id']}"
    feed = c["breed_items"]
    drop_item = c["egg_drop_item"]
    name_grp_baby  = f"minecraft:{c['id']}_baby"
    name_grp_adult = f"minecraft:{c['id']}_adult"
    return {
      "format_version": "1.16.0",
      "minecraft:entity": {
        "description": {
          "identifier": ident,
          "runtime_identifier": "minecraft:chicken",
          "is_spawnable": True,
          "is_summonable": True,
          "is_experimental": False
        },
        "component_groups": {
          name_grp_baby: {
            "minecraft:is_baby": {},
            "minecraft:scale": {"value": c["baby_scale"]},
            "minecraft:ageable": {
              "duration": c["grow_duration"],
              "feed_items": feed,
              "grow_up": {"event": "minecraft:ageable_grow_up", "target": "self"}
            },
            "minecraft:behavior.follow_parent": {"priority": 5, "speed_multiplier": 1.1}
          },
          "oc:ore_egg_normal": {
            "minecraft:spawn_entity": {"entities": [{
              "min_wait_time": c["egg_min_wait"],
              "max_wait_time": c["egg_max_wait"],
              "spawn_sound": "plop",
              "spawn_item": drop_item
            }]}
          },
          "oc:ore_egg_fast": {
            "minecraft:spawn_entity": {"entities": [{
              "min_wait_time": max(5, c["egg_min_wait"] // 4),
              "max_wait_time": max(10, c["egg_max_wait"] // 4),
              "spawn_sound": "plop",
              "spawn_item": drop_item
            }]}
          },
          name_grp_adult: {
            "minecraft:experience_reward": {
              "on_bred": "Math.Random(1,7)",
              "on_death": "query.last_hit_by_player ? Math.Random(1,3) : 0"
            },
            "minecraft:loot": {"table": f"loot_tables/entities/{c['id']}.json"},
            "minecraft:breedable": {
              "require_tame": False,
              "breeds_with": {
                "mate_type": c["mate_type"] or ident,
                "baby_type": c["baby_type"] or ident,
                "breed_event": {"event": "minecraft:entity_born", "target": "baby"}
              },
              "breed_items": feed
            },
            "minecraft:behavior.breed": {"priority": 3, "speed_multiplier": 1},
            "minecraft:rideable": {
              "seat_count": 1,
              "family_types": ["zombie"],
              "seats": {"position": [0, 0.4, 0]}
            }
          }
        },
        "components": {
          "minecraft:interact": {"interactions": [{
            "on_interact": {"filters": {"all_of": [
              {"test": "is_family", "subject": "other", "value": "player"},
              {"test": "has_equipment", "subject": "other", "domain": "hand", "value": "oc:cage"}
            ]}, "event": "oc:cage", "target": "other"},
            "swing": True, "use_item": True, "play_sounds": "plop"
          }]},
          "minecraft:type_family": {"family": ["chicken", "mob"]},
          "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
          "minecraft:collision_box": {"width": 0.6, "height": 0.8},
          "minecraft:nameable": {},
          "minecraft:health": {"value": c["health"], "max": c["health"]},
          "minecraft:hurt_on_condition": {"damage_conditions": [{
            "filters": {"test": "in_lava", "subject": "self", "operator": "==", "value": True},
            "cause": "lava", "damage_per_tick": 4
          }]},
          "minecraft:movement": {"value": 0.25},
          "minecraft:damage_sensor": {"triggers": {"cause": "fall", "deals_damage": "no"}},
          "minecraft:leashable": {"soft_distance": 4, "hard_distance": 6, "max_distance": 10},
          "minecraft:balloonable": {"mass": 0.5},
          "minecraft:navigation.walk": {"can_path_over_water": True, "avoid_damage_blocks": True},
          "minecraft:movement.basic": {},
          "minecraft:jump.static": {},
          "minecraft:can_climb": {},
          "minecraft:behavior.float": {"priority": 0},
          "minecraft:behavior.panic": {"priority": 1, "speed_multiplier": 1.5},
          "minecraft:behavior.mount_pathing": {"priority": 2, "speed_multiplier": 1.5, "target_dist": 0, "track_target": True},
          "minecraft:behavior.tempt": {"priority": 4, "speed_multiplier": 1, "items": feed},
          "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 1},
          "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 6, "probability": 0.02},
          "minecraft:behavior.random_look_around": {"priority": 8},
          "minecraft:physics": {},
          "minecraft:conditional_bandwidth_optimization": {},
          "minecraft:loot": {"table": f"loot_tables/entities/{c['id']}.json"}
        },
        "events": {
          "oc:cage": {},
          "minecraft:entity_spawned": {"randomize": [
            {"weight": 95, "trigger": "minecraft:spawn_adult"},
            {"weight": 5, "add": {"component_groups": [name_grp_baby]}}
          ]},
          "minecraft:entity_born": {"remove": {}, "add": {"component_groups": [name_grp_baby]}},
          "minecraft:ageable_grow_up": {
            "remove": {"component_groups": [name_grp_baby]},
            "add": {"component_groups": [name_grp_adult]}
          },
          "minecraft:spawn_adult": {"add": {"component_groups": [name_grp_adult, "oc:ore_egg_normal"]}},
          "oc:start_ore_egg_normal": {"add": {"component_groups": ["oc:ore_egg_normal"]}},
          "oc:start_ore_egg_fast":   {"add": {"component_groups": ["oc:ore_egg_fast"]}}
        }
      }
    }

def build_loot(c):
    entries = []
    for d in c["drops"]:
        entries.append({
          "type": "item",
          "name": d["item"],
          "weight": d.get("weight", 1),
          "functions": [{"function": "set_count",
                          "count": {"min": d["min"], "max": d["max"]} if d["min"] != d["max"] else d["min"]}]
        })
    return {"pools": [{"rolls": 1, "entries": entries}]}

def build_client_entity(c):
    return {
      "format_version": "1.10.0",
      "minecraft:client_entity": {
        "description": {
          "identifier": f"oc:{c['id']}",
          "min_engine_version": "1.12.0",
          "materials": {"default": "entity_alphatest", "legs": "chicken_legs"},
          "textures": {"default": f"textures/entity/{c['id']}"},
          "geometry": {"default": f"geometry.{c['id']}"},
          "animations": {
            "move": f"animation.{c['id']}.move",
            "general": f"animation.{c['id']}.general",
            "look_at_target": "animation.common.look_at_target",
            "baby_transform": f"animation.{c['id']}.baby_transform"
          },
          "scripts": {
            "initialize": ["variable.wing_flap = 0;"],
            "animate": ["general", {"move": "query.modified_move_speed"},
                        "look_at_target", {"baby_transform": "query.is_baby"}]
          },
          "render_controllers": ["controller.render.chicken"],
          "spawn_egg": {"texture": f"{c['id']}_spawn_egg"}
        }
      }
    }

def build_geometry(c):
    # Clona o geometry do amethyst_chicken e troca o identifier.
    tpl_path = os.path.join(P_RP_MODELS, f"{TEMPLATE_ID}.geo.json")
    if os.path.exists(tpl_path):
        g = read_json(tpl_path)
        for geo in g.get("minecraft:geometry", []):
            geo["description"]["identifier"] = f"geometry.{c['id']}"
        return g
    return {"format_version": "1.12.0", "minecraft:geometry": []}

def build_animation(c):
    tpl_path = os.path.join(P_RP_ANIMS, f"{TEMPLATE_ID}.animation.json")
    if os.path.exists(tpl_path):
        src = open(tpl_path, "r", encoding="utf-8").read()
        src = src.replace(TEMPLATE_ID, c["id"])
        return json.loads(src)
    return {"format_version": "1.8.0", "animations": {}}

# ----------------------------------------------------------------------------- 
# Leitura: extrai uma config a partir dos arquivos existentes
# -----------------------------------------------------------------------------
def load_chicken(cid):
    """Reconstrói um dict de config a partir dos arquivos existentes."""
    c = {
        "id": cid, "name_en": cid.replace("_", " ").title(), "name_pt": cid.replace("_", " ").title(),
        "health": 4, "baby_scale": 0.5, "grow_duration": 1200,
        "breed_items": [], "egg_drop_item": "", "egg_min_wait": 120, "egg_max_wait": 240,
        "mate_type": "", "baby_type": "",
        "drops": [],
        # chickens_config.js
        "config_key": cid.replace("_chicken", ""),
        "blocks": [], "item_convert": [], "entity_to_convert": "minecraft:chicken", "sound": ""
    }
    bp = os.path.join(P_BP_ENTITIES, f"{cid}.behavior.json")
    if os.path.exists(bp):
        b = read_json(bp)["minecraft:entity"]
        cg = b.get("component_groups", {})
        for k, g in cg.items():
            if k.endswith("_baby") or k.endswith("_baby_chicken"):
                if "minecraft:scale" in g: c["baby_scale"] = g["minecraft:scale"]["value"]
                ag = g.get("minecraft:ageable", {})
                c["grow_duration"] = ag.get("duration", c["grow_duration"])
                c["breed_items"]   = ag.get("feed_items", []) or c["breed_items"]
            if k.endswith("_adult"):
                br = g.get("minecraft:breedable", {})
                bw = br.get("breeds_with", {})
                c["mate_type"] = bw.get("mate_type", "")
                c["baby_type"] = bw.get("baby_type", "")
                if not c["breed_items"]:
                    c["breed_items"] = br.get("breed_items", [])
            if k == "oc:ore_egg_normal":
                se = g["minecraft:spawn_entity"]["entities"][0]
                c["egg_drop_item"] = se.get("spawn_item", "")
                c["egg_min_wait"]  = se.get("min_wait_time", 120)
                c["egg_max_wait"]  = se.get("max_wait_time", 240)
        comp = b.get("components", {})
        if "minecraft:health" in comp: c["health"] = comp["minecraft:health"]["value"]
    lp = os.path.join(P_BP_LOOT, f"{cid}.json")
    if os.path.exists(lp):
        try:
            l = read_json(lp)
            for pool in l.get("pools", []):
                for e in pool.get("entries", []):
                    item = e.get("name", "")
                    mn = mx = 1; wt = e.get("weight", 1)
                    for fn in e.get("functions", []):
                        if fn.get("function") == "set_count":
                            cnt = fn.get("count", 1)
                            if isinstance(cnt, dict):
                                mn, mx = cnt.get("min", 1), cnt.get("max", 1)
                            else:
                                mn = mx = cnt
                    c["drops"].append({"item": item, "min": mn, "max": mx, "weight": wt})
        except Exception:
            pass
    # lang
    for path, key in ((P_RP_LANG_EN, "name_en"), (P_RP_LANG_PT, "name_pt")):
        if os.path.exists(path):
            for line in open(path, "r", encoding="utf-8"):
                m = re.match(rf"entity\.oc:{re.escape(cid)}\.name\s*=\s*(.+)", line.strip())
                if m: c[key] = m.group(1)
    # chickens_config.js
    cfg = parse_chickens_config()
    for k, v in cfg.items():
        if v.get("entity") == f"oc:{cid}":
            c["config_key"] = k
            c["blocks"] = v.get("block", [])
            c["item_convert"] = v.get("itemConvert", [])
            c["entity_to_convert"] = v.get("entityToConvert", "minecraft:chicken")
            c["sound"] = v.get("sound", "")
            break
    return c

def list_existing_chickens():
    if not os.path.isdir(P_BP_ENTITIES): return []
    out = []
    for f in sorted(os.listdir(P_BP_ENTITIES)):
        if f.endswith(".behavior.json") and f != "chicken.json":
            out.append(f.replace(".behavior.json", ""))
    return out

# ----------------------------------------------------------------------------- 
# Salvar uma galinha (escreve todos os arquivos)
# -----------------------------------------------------------------------------
def save_chicken(c, original_id=None):
    ensure_dirs()
    cid = c["id"]

    # remover arquivos do id antigo se foi renomeado
    if original_id and original_id != cid:
        delete_chicken(original_id, write_config=False, remove_textures=False)

    # BP/entities
    write_json(os.path.join(P_BP_ENTITIES, f"{cid}.behavior.json"), build_behavior(c))
    # BP/loot_tables
    write_json(os.path.join(P_BP_LOOT, f"{cid}.json"), build_loot(c))
    # RP/entity
    write_json(os.path.join(P_RP_ENTITY, f"{cid}.entity.json"), build_client_entity(c))
    # RP/models/entity
    write_json(os.path.join(P_RP_MODELS, f"{cid}.geo.json"), build_geometry(c))
    # RP/animations
    write_json(os.path.join(P_RP_ANIMS, f"{cid}.animation.json"), build_animation(c))

    # texturas placeholder (somente cria se não existir)
    write_blank_png(os.path.join(P_RP_TEX_ENT, f"{cid}.png"), 64, 32)
    write_blank_png(os.path.join(P_RP_TEX_EGG, f"{cid}_spawn_egg.png"), 16, 16)

    # item_texture.json - adiciona entrada do spawn egg
    if os.path.exists(P_RP_ITEM_TEX):
        it = read_json(P_RP_ITEM_TEX)
    else:
        it = {"resource_pack_name": "Ore Chickens RP",
              "texture_name": "atlas.items", "texture_data": {}}
    it.setdefault("texture_data", {})[f"{cid}_spawn_egg"] = {
        "textures": [f"textures/items/spawn_eggs/{cid}_spawn_egg"]
    }
    write_json(P_RP_ITEM_TEX, it)

    # lang
    update_lang(P_RP_LANG_EN, cid, c["name_en"])
    update_lang(P_RP_LANG_PT, cid, c["name_pt"])

    # chickens_config.js
    cfg = parse_chickens_config()
    # remove possíveis antigos com mesma entity
    for k in list(cfg.keys()):
        if cfg[k].get("entity") == f"oc:{original_id or cid}":
            del cfg[k]
    entry = {
        "entity": f"oc:{cid}",
        "block": c["blocks"] or [],
        "itemConvert": c["item_convert"] or [],
        "entityToConvert": c["entity_to_convert"] or "minecraft:chicken",
    }
    if c["sound"]:
        entry["sound"] = c["sound"]
    cfg[c["config_key"] or cid.replace("_chicken", "")] = entry
    write_chickens_config(cfg)

def update_lang(path, cid, name):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    lines = []
    if os.path.exists(path):
        lines = open(path, "r", encoding="utf-8").read().splitlines()
    keys = {
        f"entity.oc:{cid}.name": name,
        f"item.spawn_egg.entity.oc:{cid}.name": f"Spawn {name}",
    }
    out = []
    seen = set()
    for ln in lines:
        m = re.match(r"([^=#]+)=", ln)
        if m and m.group(1).strip() in keys:
            k = m.group(1).strip()
            out.append(f"{k}={keys[k]}")
            seen.add(k)
        else:
            out.append(ln)
    for k, v in keys.items():
        if k not in seen:
            out.append(f"{k}={v}")
    open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")

def delete_chicken(cid, write_config=True, remove_textures=True):
    paths = [
        os.path.join(P_BP_ENTITIES, f"{cid}.behavior.json"),
        os.path.join(P_BP_LOOT, f"{cid}.json"),
        os.path.join(P_RP_ENTITY, f"{cid}.entity.json"),
        os.path.join(P_RP_MODELS, f"{cid}.geo.json"),
        os.path.join(P_RP_ANIMS, f"{cid}.animation.json"),
    ]
    if remove_textures:
        paths += [
            os.path.join(P_RP_TEX_ENT, f"{cid}.png"),
            os.path.join(P_RP_TEX_EGG, f"{cid}_spawn_egg.png"),
        ]
    for p in paths:
        if os.path.exists(p):
            try: os.remove(p)
            except Exception: pass
    # item_texture
    if os.path.exists(P_RP_ITEM_TEX):
        it = read_json(P_RP_ITEM_TEX)
        it.get("texture_data", {}).pop(f"{cid}_spawn_egg", None)
        write_json(P_RP_ITEM_TEX, it)
    # lang
    for path in (P_RP_LANG_EN, P_RP_LANG_PT):
        if os.path.exists(path):
            out = [l for l in open(path, "r", encoding="utf-8").read().splitlines()
                   if f"oc:{cid}." not in l]
            open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
    # config
    if write_config:
        cfg = parse_chickens_config()
        for k in list(cfg.keys()):
            if cfg[k].get("entity") == f"oc:{cid}":
                del cfg[k]
        write_chickens_config(cfg)

# ----------------------------------------------------------------------------- 
# Interface
# -----------------------------------------------------------------------------
class ChickenEditor(tk.Toplevel if tk else object):
    def __init__(self, master, cid=None, on_save=None):
        super().__init__(master)
        self.title("Editar Galinha" if cid else "Nova Galinha")
        self.geometry("780x720")
        self.on_save = on_save
        self.original_id = cid

        c = load_chicken(cid) if cid else {
            "id": "new_chicken", "name_en": "New Chicken", "name_pt": "Galinha Nova",
            "health": 4, "baby_scale": 0.5, "grow_duration": 1200,
            "breed_items": ["minecraft:wheat_seeds"],
            "egg_drop_item": "minecraft:egg",
            "egg_min_wait": 120, "egg_max_wait": 240,
            "mate_type": "", "baby_type": "",
            "drops": [{"item": "minecraft:feather", "min": 0, "max": 2, "weight": 1}],
            "config_key": "new", "blocks": [], "item_convert": [],
            "entity_to_convert": "minecraft:chicken", "sound": ""
        }
        self.c = c

        nb = ttk.Notebook(self); nb.pack(fill="both", expand=True, padx=8, pady=8)

        # ----- Aba Geral -----
        g = ttk.Frame(nb); nb.add(g, text="Geral")
        self.vars = {}
        rows = [
            ("ID (sem oc:)", "id"),
            ("Nome em Inglês", "name_en"),
            ("Nome em Português", "name_pt"),
            ("Vida (HP)", "health"),
            ("Escala do Bebê (0-1)", "baby_scale"),
            ("Duração até crescer (ticks)", "grow_duration"),
        ]
        for i, (lbl, key) in enumerate(rows):
            ttk.Label(g, text=lbl).grid(row=i, column=0, sticky="w", padx=6, pady=4)
            v = tk.StringVar(value=str(c.get(key, "")))
            self.vars[key] = v
            ttk.Entry(g, textvariable=v, width=50).grid(row=i, column=1, sticky="we", padx=6)

        ttk.Label(g, text="Chave no chickens_config.js").grid(row=99, column=0, sticky="w", padx=6, pady=4)
        self.vars["config_key"] = tk.StringVar(value=c.get("config_key", ""))
        ttk.Entry(g, textvariable=self.vars["config_key"], width=50).grid(row=99, column=1, sticky="we", padx=6)
        g.columnconfigure(1, weight=1)

        # ----- Aba Ovo / Spawn de item -----
        eg = ttk.Frame(nb); nb.add(eg, text="Ovo (item botado)")
        ttk.Label(eg, text="Item que a galinha bota").grid(row=0, column=0, sticky="w", padx=6, pady=4)
        self.vars["egg_drop_item"] = tk.StringVar(value=c["egg_drop_item"])
        ttk.Entry(eg, textvariable=self.vars["egg_drop_item"], width=50).grid(row=0, column=1, sticky="we", padx=6)
        ttk.Label(eg, text="Min. wait (s/20)").grid(row=1, column=0, sticky="w", padx=6, pady=4)
        self.vars["egg_min_wait"] = tk.StringVar(value=str(c["egg_min_wait"]))
        ttk.Entry(eg, textvariable=self.vars["egg_min_wait"]).grid(row=1, column=1, sticky="w", padx=6)
        ttk.Label(eg, text="Max. wait (s/20)").grid(row=2, column=0, sticky="w", padx=6, pady=4)
        self.vars["egg_max_wait"] = tk.StringVar(value=str(c["egg_max_wait"]))
        ttk.Entry(eg, textvariable=self.vars["egg_max_wait"]).grid(row=2, column=1, sticky="w", padx=6)
        eg.columnconfigure(1, weight=1)

        # ----- Aba Breeding (mesma espécie) -----
        bf = ttk.Frame(nb); nb.add(bf, text="Reprodução")
        ttk.Label(bf, text="Itens de breeding / tempt / feed (um por linha)").pack(anchor="w", padx=6, pady=4)
        self.breed_txt = tk.Text(bf, height=4); self.breed_txt.pack(fill="x", padx=6)
        self.breed_txt.insert("1.0", "\n".join(c["breed_items"]))

        ttk.Label(bf, text="Mate type (ex: oc:diamond_chicken — deixe vazio para mesma espécie)").pack(anchor="w", padx=6, pady=4)
        self.vars["mate_type"] = tk.StringVar(value=c["mate_type"])
        ttk.Entry(bf, textvariable=self.vars["mate_type"]).pack(fill="x", padx=6)

        ttk.Label(bf, text="Baby type (ex: oc:emerald_chicken — qual galinha nasce do cruzamento)").pack(anchor="w", padx=6, pady=4)
        self.vars["baby_type"] = tk.StringVar(value=c["baby_type"])
        ttk.Entry(bf, textvariable=self.vars["baby_type"]).pack(fill="x", padx=6)

        info = ("Dica: para fazer 'galinha A + galinha B = galinha C', configure NAS DUAS\n"
                "galinhas pais o mate_type apontando para a outra e baby_type apontando para C.")
        ttk.Label(bf, text=info, foreground="#555").pack(anchor="w", padx=6, pady=6)

        # ----- Aba Drops (loot table) -----
        dr = ttk.Frame(nb); nb.add(dr, text="Drops ao Morrer")
        ttk.Label(dr, text="Item, min, max, weight (um por linha, separado por |):").pack(anchor="w", padx=6, pady=4)
        self.drops_txt = tk.Text(dr, height=8); self.drops_txt.pack(fill="both", expand=True, padx=6)
        self.drops_txt.insert("1.0", "\n".join(
            f"{d['item']}|{d['min']}|{d['max']}|{d.get('weight',1)}" for d in c["drops"]))
        ttk.Label(dr, text="Exemplo: minecraft:feather|0|2|1", foreground="#555").pack(anchor="w", padx=6)

        # ----- Aba Cruzamento Cross (chickens_config.js) -----
        cc = ttk.Frame(nb); nb.add(cc, text="Conversão cruzada (config)")
        ttk.Label(cc, text=(
            "Sistema do chickens_config.js: ao alimentar 'Item Convert' em\n"
            "'Entidade a converter', ela vira ESTA galinha.\n"
            "É assim que se desbloqueia galinhas raras no ecossistema."
        ), foreground="#444").pack(anchor="w", padx=6, pady=4)

        ttk.Label(cc, text="Blocos associados (um por linha) - usado por boost/spawn:").pack(anchor="w", padx=6, pady=4)
        self.blocks_txt = tk.Text(cc, height=4); self.blocks_txt.pack(fill="x", padx=6)
        self.blocks_txt.insert("1.0", "\n".join(c["blocks"]))

        ttk.Label(cc, text="Itens que convertem (um por linha):").pack(anchor="w", padx=6, pady=4)
        self.conv_txt = tk.Text(cc, height=4); self.conv_txt.pack(fill="x", padx=6)
        self.conv_txt.insert("1.0", "\n".join(c["item_convert"]))

        ttk.Label(cc, text="Entidade que será convertida (ex: minecraft:chicken, oc:diamond_chicken):").pack(anchor="w", padx=6, pady=4)
        self.vars["entity_to_convert"] = tk.StringVar(value=c["entity_to_convert"])
        ttk.Entry(cc, textvariable=self.vars["entity_to_convert"]).pack(fill="x", padx=6)

        ttk.Label(cc, text="Som ao converter (opcional, ex: smithing_table.use):").pack(anchor="w", padx=6, pady=4)
        self.vars["sound"] = tk.StringVar(value=c["sound"])
        ttk.Entry(cc, textvariable=self.vars["sound"]).pack(fill="x", padx=6)

        # ----- Botões -----
        bar = ttk.Frame(self); bar.pack(fill="x", padx=8, pady=8)
        ttk.Button(bar, text="Salvar", command=self.do_save).pack(side="right")
        ttk.Button(bar, text="Cancelar", command=self.destroy).pack(side="right", padx=6)

    def do_save(self):
        try:
            c = self.c
            for k, v in self.vars.items():
                val = v.get().strip()
                if k in ("health", "grow_duration", "egg_min_wait", "egg_max_wait"):
                    c[k] = int(float(val))
                elif k == "baby_scale":
                    c[k] = float(val)
                else:
                    c[k] = val
            c["id"] = re.sub(r"[^a-z0-9_]", "_", c["id"].lower()) or "new_chicken"
            c["breed_items"] = [l.strip() for l in self.breed_txt.get("1.0", "end").splitlines() if l.strip()]
            c["blocks"]      = [l.strip() for l in self.blocks_txt.get("1.0", "end").splitlines() if l.strip()]
            c["item_convert"]= [l.strip() for l in self.conv_txt.get("1.0", "end").splitlines() if l.strip()]
            drops = []
            for ln in self.drops_txt.get("1.0", "end").splitlines():
                ln = ln.strip()
                if not ln: continue
                parts = [p.strip() for p in ln.split("|")]
                if len(parts) < 3:
                    raise ValueError(f"Linha de drop inválida: {ln}")
                drops.append({
                    "item": parts[0], "min": int(parts[1]), "max": int(parts[2]),
                    "weight": int(parts[3]) if len(parts) > 3 else 1
                })
            c["drops"] = drops
            if not c["config_key"]:
                c["config_key"] = c["id"].replace("_chicken", "")
            save_chicken(c, original_id=self.original_id)
        except Exception as e:
            messagebox.showerror("Erro ao salvar", str(e))
            return
        messagebox.showinfo("OK", f"Galinha '{c['id']}' salva com sucesso!\n\n"
                                  "Lembre-se de substituir as texturas placeholder em:\n"
                                  f"  {os.path.relpath(os.path.join(P_RP_TEX_ENT, c['id']+'.png'), ROOT)}\n"
                                  f"  {os.path.relpath(os.path.join(P_RP_TEX_EGG, c['id']+'_spawn_egg.png'), ROOT)}")
        if self.on_save: self.on_save()
        self.destroy()


class App(tk.Tk if tk else object):
    def __init__(self):
        super().__init__()
        self.title("Ore Chicken Manager")
        self.geometry("520x520")

        if not os.path.isdir(BP) or not os.path.isdir(RP):
            messagebox.showerror("Erro", "Coloque este script na pasta raiz do addon,\n"
                                         "junto a 'Ore Chickens BP' e 'Ore Chickens RP'.")
            self.destroy(); sys.exit(1)

        top = ttk.Frame(self); top.pack(fill="x", padx=10, pady=8)
        ttk.Label(top, text="Galinhas registradas:", font=("Segoe UI", 11, "bold")).pack(side="left")

        self.lb = tk.Listbox(self, font=("Consolas", 11))
        self.lb.pack(fill="both", expand=True, padx=10, pady=4)
        self.lb.bind("<Double-Button-1>", lambda e: self.edit())

        bar = ttk.Frame(self); bar.pack(fill="x", padx=10, pady=8)
        ttk.Button(bar, text="Nova",    command=self.new).pack(side="left")
        ttk.Button(bar, text="Editar",  command=self.edit).pack(side="left", padx=4)
        ttk.Button(bar, text="Remover", command=self.delete).pack(side="left", padx=4)
        ttk.Button(bar, text="Recarregar", command=self.refresh).pack(side="right")

        self.refresh()

    def refresh(self):
        self.lb.delete(0, "end")
        for c in list_existing_chickens():
            self.lb.insert("end", c)

    def selected(self):
        sel = self.lb.curselection()
        return self.lb.get(sel[0]) if sel else None

    def new(self):  ChickenEditor(self, None, on_save=self.refresh)
    def edit(self):
        cid = self.selected()
        if not cid: return
        ChickenEditor(self, cid, on_save=self.refresh)

    def delete(self):
        cid = self.selected()
        if not cid: return
        if not messagebox.askyesno("Remover", f"Remover a galinha '{cid}' e todos os seus arquivos?\n"
                                              "(inclui texturas placeholder)"):
            return
        delete_chicken(cid)
        self.refresh()


if __name__ == "__main__":
    App().mainloop()
