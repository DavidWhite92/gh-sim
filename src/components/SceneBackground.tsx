export type Scene = "plato" | "entrada" | "salon" | "nominacion" | "expulsion" | "final";

export function SceneBackground({ scene }: { scene: Scene }) {
  const dramatic = scene === "expulsion" || scene === "final";
  return <div aria-hidden="true" className="sceneBackground" data-scene={scene}
    style={{ backgroundImage: `linear-gradient(var(--scene-overlay), var(--scene-overlay)), url("/backgrounds/${scene}.png")` }}>
    {dramatic && <div className="sceneSpotlights" key={scene}>
      <span className="sceneSpotlight" />
      <span className="sceneSpotlight" />
      <span className="sceneSpotlight" />
    </div>}
  </div>;
}
