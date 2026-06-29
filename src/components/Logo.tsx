// The Slate's mark: a transparent-background PNG (designer-supplied),
// served from public/ so it's a static asset rather than bundled inline.

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}slate-logo-256.png`}
      width={size}
      height={size}
      alt="The Slate"
      draggable={false}
    />
  );
}
