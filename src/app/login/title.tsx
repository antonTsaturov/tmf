
export enum TitleFontSize {
  ExtraSmall = '1rem',
  Small = '1.5rem',
  Medium = '1.875rem',
  Big = '2.25rem',
  Large = '2.5rem',
}

interface TitleProps {
  fontSize?: TitleFontSize;
}

export const Title = ({ fontSize = TitleFontSize.Medium }: TitleProps) => {

  return (
    <div>
      <h2
        style={{
          color: '#2d3748',
          fontSize,
          fontWeight: 800,
          transition: 'font-size 0.2s ease',
          userSelect: 'none',
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