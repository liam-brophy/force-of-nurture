import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';

export default function ArticleCard({ article }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        borderBottom: '1px solid #c9a96e22',
        padding: '16px 0',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 17,
              color: '#f2e9d8',
              lineHeight: 1.3,
              marginBottom: 4,
            }}
          >
            {article.title}
          </div>
          <div
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 10,
              color: '#c9a96e',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            {format(parseISO(article.date_written), 'MMM d, yyyy')}
            {article.sign ? ` · ${article.sign}` : ''}
          </div>
        </div>
        <span style={{ color: '#c9a96e', fontSize: 12, marginLeft: 8, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {!expanded && (
        <p
          style={{
            fontFamily: 'Spectral, serif',
            fontSize: 13,
            color: '#f2e9d8aa',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {article.excerpt}
        </p>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                fontFamily: 'Spectral, serif',
                fontSize: 14,
                color: '#f2e9d8cc',
                lineHeight: 1.75,
                paddingTop: 8,
                whiteSpace: 'pre-wrap',
              }}
            >
              {article.content}
            </div>
            {article.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 9,
                      color: '#7b5ea7',
                      border: '1px solid #7b5ea755',
                      borderRadius: 4,
                      padding: '2px 6px',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
