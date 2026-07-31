export const ASSET_IDS = Object.freeze(["player", "treasure", "walking_stick", "crossbow", "pirate_glass", "bear_trap"]);
const EXTENSIONS = ["png", "webp"];

function candidates(id, context) {
  return context ? [`${id}.${context}`, id] : [id];
}

function numberedFrames(files, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const pattern = new RegExp(`^../assets/game/${escaped}\\.(\\d+)\\.(png|webp)$`);
  return Object.entries(files).map(([path, url]) => ({ path, url, match: path.match(pattern) })).filter((entry) => entry.match).sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
}

function staticFrame(files, name) {
  const path = EXTENSIONS.map((extension) => `../assets/game/${name}.${extension}`).find((candidate) => files[candidate]);
  return path ? [{ path, url: files[path] }] : [];
}

/** Resolve the best available artwork without requiring optional files to exist. */
export function resolveAsset(files, id, context) {
  if (!ASSET_IDS.includes(id)) return null;
  for (const name of candidates(id, context)) {
    const frames = numberedFrames(files, name); const resolvedFrames = frames.length ? frames : staticFrame(files, name);
    if (resolvedFrames.length) return { key: `game-asset:${resolvedFrames[0].path}`, frames: resolvedFrames.map(({ path, url }) => ({ key: `game-asset:${path}`, url })), animationKey: `game-animation:${name}:${resolvedFrames.map(({ path }) => path).join("|")}` };
  }
  return null;
}

export function createAssetRegistry(files) {
  const registry = {};
  for (const id of ASSET_IDS) for (const context of [undefined, "board", "inventory", "explorer", "observer"]) registry[`${id}:${context ?? "base"}`] = resolveAsset(files, id, context);
  return registry;
}
