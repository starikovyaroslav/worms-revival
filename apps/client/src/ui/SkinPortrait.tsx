import { assets } from '@wr/render';

/** Show one atlas frame, never the entire sheet. Uses actual manifest coordinates. */
export function SkinPortrait({ id, compact = false }: { id: string; compact?: boolean }) {
  const texture = assets.get(`skins/${id}/idle`);
  const url = assets.url(`skins/${id}/idle`);
  if (!texture || !url)
    return (
      <span class="portrait-fallback" aria-hidden="true">
        ?
      </span>
    );
  const frame = texture.frame;
  return (
    <svg
      class="skin-portrait"
      viewBox={`${frame.x + frame.width * 0.12} ${frame.y + frame.height * 0.12} ${frame.width * 0.76} ${frame.height * 0.6}`}
      preserveAspectRatio={compact ? 'xMidYMax meet' : 'xMidYMax slice'}
      aria-hidden="true"
    >
      <image href={url} width={texture.source.width} height={texture.source.height} />
    </svg>
  );
}
