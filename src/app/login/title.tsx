
export enum TitleFontSize {
  ExtraSmall = '1rem',
  Small = '1.5rem',
  Medium = '1.875rem',
  Big = '2.25rem',
  Large = '2.5rem',
}

interface TitleProps {
  fontSize?: TitleFontSize;
  showLogo?: boolean;
}

export const Title = ({ fontSize = TitleFontSize.Medium, showLogo = false }: TitleProps) => {

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
    }}>
      {showLogo && (
        <img
          src="/logo.png"
          alt="ExploreTMF Logo"
          style={{
            width: '36px',
            height: '36px',
            objectFit: 'contain',
          }}
        />
      )}
      <h2
        style={{
          color: '#2d3748',
          fontSize,
          fontWeight: 800,
          transition: 'font-size 0.2s ease',
          userSelect: 'none',
          margin: 0,
        }}
      >
        <span style={{ color: '#2d3748' }}>
          Explor
        </span>
        <span
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #4a37da 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          eTMF
        </span>
      </h2>
    </div>
  );
}