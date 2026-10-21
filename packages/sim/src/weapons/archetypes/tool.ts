import { DigTool } from '../digTool';
import { JetPack } from '../jetpack';
import { BUNGEE_SPEC, Rope, ropeSpec } from '../rope';
import type { SimFlags, ViewSpec } from '../spec';
import type { FireContext } from '../weapon';

/**
 * Tools the worm keeps using after the shot: dig, swing, fly, glide. What they do is the entity's
 * own code (`DigTool`, `Rope`, `JetPack`); the spec says which one and when it may be used.
 */
export interface ToolSim extends SimFlags {
  archetype: 'tool';
  tool: 'torch' | 'drill' | 'rope' | 'bungee' | 'jetpack' | 'parachute';
}

export function fireTool(ctx: FireContext, sim: ToolSim, view: ViewSpec): void {
  const { world, worm } = ctx;
  const sound = () => {
    if (view.sound) world.emit({ type: 'sound', id: view.sound, x: worm.x, y: worm.y });
  };
  switch (sim.tool) {
    case 'torch':
    case 'drill':
      ctx.control(world.spawn(new DigTool(sim.tool, worm.id, worm)).id);
      break;
    case 'rope':
      ctx.control(
        world.spawn(new Rope(worm.id, worm, ctx.dirX, ctx.dirY, ropeSpec(ctx.setting.power))).id,
      );
      sound();
      break;
    case 'bungee':
      ctx.control(world.spawn(new Rope(worm.id, worm, ctx.dirX, ctx.dirY, BUNGEE_SPEC)).id);
      sound();
      break;
    case 'jetpack':
      ctx.control(world.spawn(new JetPack(worm.id)).id);
      break;
    case 'parachute':
      worm.chute = true;
      sound();
      break;
  }
}
