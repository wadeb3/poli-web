// Poli wordmark — Manrope 800, dotless ı, purple dot above.
// Spec: Manrope 800, letter-spacing -0.01em, dot #7C3AED (#A855F7 dark).

const FONT = "https://fonts.googleapis.com/css2?family=Manrope:wght@800&display=swap";

export function Logo({ height = 32, dark = false }) {
  const color    = dark ? "#FFFFFF" : "#17171A";
  const dotColor = dark ? "#A855F7" : "#7C3AED";
  const fontSize = height * 1.2;

  return (
    <>
      <link rel="stylesheet" href={FONT} />
      <span
        aria-label="Poli"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize,
          letterSpacing: "-0.01em",
          color,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "baseline",
          userSelect: "none",
        }}
      >
        Pol
        <span style={{ position: "relative", display: "inline-block", lineHeight: 1 }}>
          ı
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "100%",
              marginBottom: fontSize * 0.05,
              width:  fontSize * 0.18,
              height: fontSize * 0.18,
              borderRadius: "50%",
              background: dotColor,
              display: "block",
            }}
          />
        </span>
      </span>
    </>
  );
}

export function LogoMark({ size = 32, dark = false }) {
  const color    = dark ? "#FFFFFF" : "#17171A";
  const dotColor = dark ? "#A855F7" : "#7C3AED";
  return (
    <>
      <link rel="stylesheet" href={FONT} />
      <span
        aria-label="Poli"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: size * 1.2,
          letterSpacing: "-0.03em",
          color,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "baseline",
          userSelect: "none",
        }}
      >
        <span style={{ position: "relative", display: "inline-block", lineHeight: 1 }}>
          ı
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "100%",
              marginBottom: size * 0.06,
              width:  size * 0.22,
              height: size * 0.22,
              borderRadius: "50%",
              background: dotColor,
              display: "block",
            }}
          />
        </span>
      </span>
    </>
  );
}
