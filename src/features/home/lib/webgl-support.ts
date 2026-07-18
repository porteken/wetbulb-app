export const isWebglSupported = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    // MapLibre GL v4+ requires WebGL2; probing it up front avoids the
    // "Failed to initialize WebGL" throw from the Map constructor.
    const context = canvas.getContext("webgl2");
    if (!context) {
      return false;
    }
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
};
