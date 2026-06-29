// The "S" mark, in two variants derived from the same designer-supplied
// artwork:
//  - 'gradient' keeps the original chrome shading — only legible at large
//    sizes (the home screen's hero mark), since its darker half nearly
//    vanishes against dark UI once shrunk to icon size.
//  - 'flat' is a solid-white silhouette extracted from the same art, used
//    everywhere small (topbars) where full contrast actually matters.

import gradientMark from '../assets/slate-mark.png';
import flatMark from '../assets/slate-mark-flat.png';

interface Props {
  size?: number;
  variant?: 'gradient' | 'flat';
}

export function SlateMark({ size = 22, variant = 'flat' }: Props) {
  const src = variant === 'gradient' ? gradientMark : flatMark;
  return <img src={src} width={size} height={size} alt="" draggable={false} />;
}
