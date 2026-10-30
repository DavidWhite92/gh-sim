export type Scene = "plato" | "entrada" | "salon" | "nominacion" | "expulsion" | "final";

export function SceneBackground({ scene }: { scene: Scene }) {
  return <div aria-hidden="true" className="sceneBackground" data-scene={scene}
    style={{ backgroundImage: `linear-gradient(var(--scene-overlay), var(--scene-overlay)), url("/backgrounds/${scene}.png")` }} />;
}
