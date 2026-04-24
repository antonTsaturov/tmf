// components/reports/TableSkeleton.tsx
'use client';

import { Flex } from '@radix-ui/themes';

type Props = {
  loadingText?: string;
};

export function TableSkeleton({ loadingText }: Props) {
  return (
    <Flex direction="column" gap="3">
      <Flex justify="between" align="center">
        <div style={{ 
          width: 100, 
          height: 20, 
          background: 'var(--gray-5)', 
          borderRadius: 4,
        //   animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        <Flex gap="2">
          <div style={{ 
            width: 90, 
            height: 32, 
            background: 'var(--gray-5)', 
            borderRadius: 6,
            // animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{ 
            width: 90, 
            height: 32, 
            background: 'var(--gray-5)', 
            borderRadius: 6,
            // animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </Flex>
      </Flex>

      <div style={{ overflow: 'auto', maxHeight: 500, border: '1px solid var(--gray-6)', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--gray-3)' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <th key={i} style={{ padding: 12, textAlign: 'left' }}>
                  <div style={{ 
                    width: i === 3 ? 120 : 80, 
                    height: 20, 
                    background: 'var(--gray-7)', 
                    borderRadius: 4,
                    // animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((row) => (
              <tr key={row} style={{ borderBottom: '1px solid var(--gray-5)' }}>
                {[1, 2, 3, 4, 5].map((col) => (
                  <td key={col} style={{ padding: 12 }}>
                    <div style={{ 
                      width: col === 3 ? '70%' : col === 2 ? 60 : 80, 
                      height: 16, 
                      background: 'var(--gray-4)', 
                      borderRadius: 4,
                    //   animation: 'pulse 1.5s ease-in-out infinite',
                    //   animationDelay: `${row * 0.1}s`
                    }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loadingText && (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--gray-10)' }}>
          {loadingText}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Flex>
  );
}