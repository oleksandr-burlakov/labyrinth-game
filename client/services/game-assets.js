import { createAssetRegistry } from "./asset-catalog.js";

const assetFiles = import.meta.glob("../assets/game/**/*.{png,webp}", {
  eager: true,
  import: "default",
  query: "?url",
});
const registry = createAssetRegistry(assetFiles);

export function gameAsset(id, context) {
  return registry[`${id}:${context ?? "base"}`] ?? null;
}
export function preloadGameAssets(scene) {
  for (const frame of new Map(
    Object.values(registry)
      .filter(Boolean)
      .flatMap((entry) => entry.frames)
      .map((entry) => [entry.key, entry]),
  ).values())
    scene.load.image(frame.key, frame.url);
}
export function hasGameAsset(scene, id, context) {
  const asset = gameAsset(id, context);
  return Boolean(asset && scene.textures.exists(asset.key));
}

/** Creates a static sprite or a looping sprite when the selected asset has numbered frames. */
export function addGameSprite(scene, id, context, x, y) {
  const asset = gameAsset(id, context);
  if (!asset || !scene.textures.exists(asset.key)) return null;
  const sprite = scene.add.sprite(x, y, asset.key);
  if (asset.frames.length > 1) {
    if (!scene.anims.exists(asset.animationKey))
      scene.anims.create({
        key: asset.animationKey,
        frames: asset.frames.map((frame) => ({ key: frame.key })),
        frameRate: 12,
        repeat: -1,
      });
    sprite.play(asset.animationKey);
  }
  return sprite;
}
