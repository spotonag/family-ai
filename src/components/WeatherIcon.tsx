export function WeatherIcon({ bucket }: { bucket: "sun" | "cloud" | "rain" | "storm" }) {
  const stroke = "#3e7c8c";
  if (bucket === "sun") {
    return (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" fill="#f7ecd4" stroke="#a3760f" />
        <path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" stroke="#a3760f" />
      </svg>
    );
  }
  if (bucket === "storm") {
    return (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 15.5A4.5 4.5 0 0 1 8 6.6 5.5 5.5 0 0 1 18.6 8 4 4 0 0 1 18 16H7Z" fill="#e4eff1" />
        <path d="M13 15l-2.5 4h2.5l-1.5 3.5" stroke="#a3760f" />
      </svg>
    );
  }
  if (bucket === "rain") {
    return (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round">
        <path d="M7 16.5A4.5 4.5 0 0 1 8 7.6 5.5 5.5 0 0 1 18.6 9 4 4 0 0 1 18 17H7Z" fill="#e4eff1" />
        <path d="M9 19v1.6M13 19v1.6M17 19v1.6" />
      </svg>
    );
  }
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17A4.2 4.2 0 0 1 7.7 8.7 5.2 5.2 0 0 1 17.9 10 3.8 3.8 0 0 1 17.3 17H7Z" fill="#e4eff1" />
    </svg>
  );
}
