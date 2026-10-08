import { Container } from 'pixi.js';

/**
 * Для всех детей контейнера, чьи координаты выходят за границы [0, tileWidth],
 * создаёт копии с другой стороны, обеспечивая бесшовную стыковку.
 */
export function wrapContainer(container: Container, tileWidth: number): void {
  const children = [...container.children];
  for (const child of children) {
    const x = child.x;
    const bounds = child.getLocalBounds();
    const width = bounds.width;
    if (x + width > tileWidth) {
      const clone = child.clone();
      if (clone) {
        clone.x = x - tileWidth;
        clone.y = child.y;
        container.addChild(clone);
      }
    }
    if (x < 0) {
      const clone = child.clone();
      if (clone) {
        clone.x = x + tileWidth;
        clone.y = child.y;
        container.addChild(clone);
      }
    }
  }
}
