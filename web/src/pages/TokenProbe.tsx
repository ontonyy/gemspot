const CATEGORIES = [
  "tabletennis",
  "basketball",
  "football",
  "tennis",
  "padel",
  "scenic",
  "sakura",
] as const;

const NEUTRALS = [
  "paper",
  "paper-2",
  "paper-3",
  "ink",
  "ink-2",
  "ink-3",
  "line",
  "line-2",
] as const;

const SEMANTIC = ["stamp", "fresh"] as const;

function Swatch({ token }: { token: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          width: 96,
          height: 64,
          background: `var(--c-${token}, var(--${token}))`,
          border: "1px solid var(--ink)",
        }}
      />
      <span className="mono" style={{ fontSize: 11 }}>
        {token}
      </span>
    </div>
  );
}

export default function TokenProbe() {
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 28 }}>
      <header>
        <span className="kicker">GemSpot · token probe</span>
        <h1 style={{ fontSize: 40, fontFamily: "var(--font-display)" }}>
          Spotter&rsquo;s Field Guide
        </h1>
      </header>

      <section>
        <span className="kicker">categories (color = taxonomy)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
          {CATEGORIES.map((c) => (
            <Swatch key={c} token={c} />
          ))}
        </div>
      </section>

      <section>
        <span className="kicker">neutrals (paper &amp; ink)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
          {NEUTRALS.map((c) => (
            <Swatch key={c} token={c} />
          ))}
        </div>
      </section>

      <section>
        <span className="kicker">semantic (stamp = saved · fresh = verify)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
          {SEMANTIC.map((c) => (
            <Swatch key={c} token={c} />
          ))}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="kicker">fonts</span>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800 }}>
          Bricolage Grotesque — display 800
        </p>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 17 }}>
          Hanken Grotesk — ui 400 · the quick brown fox jumps over the lazy dog
        </p>
        <p className="mono" style={{ fontSize: 15 }}>
          Space Mono — 59.437, 24.745 · Specimen №07
        </p>
      </section>
    </div>
  );
}
