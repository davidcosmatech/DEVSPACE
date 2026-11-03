import path from "node:path";

export function dataRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.DEVSPACE_DATA_DIR ?? ".data");
}
