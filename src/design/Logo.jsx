// Poli logo — PNG cropped directly from the brand PDF. Zero modifications.
export function Logo({ height = 32 }) {
  const width = Math.round(height * (840 / 590));
  return (
    <img
      src="/logo/poli-wordmark.png"
      width={width}
      height={height}
      alt="Poli"
      style={{ display: "block" }}
    />
  );
}

export function LogoMark({ size = 32 }) {
  return (
    <img
      src="/logo/poli-wordmark.png"
      width={size}
      height={Math.round(size * (590 / 840))}
      alt="Poli"
      style={{ display: "block" }}
    />
  );
}
