import { PhysBody } from './body';

/** Left behind by a worm that blew up. Can be knocked around. */
export class Gravestone extends PhysBody {
  readonly kind = 'gravestone';

  constructor(
    x: number,
    y: number,
    readonly team: number,
  ) {
    super(x, y);
    this.radius = 4;
    this.restitution = 0.3;
    this.friction = 0.7;
  }

  // Gravestones never hold up the turn.
  override isBusy(): boolean {
    return false;
  }
}
