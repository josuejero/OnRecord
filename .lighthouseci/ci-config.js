module.exports = {
  ci: {
    collect: {
      startServerCommand:
        'pnpm --filter @onrecord/web build && HOSTNAME=0.0.0.0 PORT=3000 pnpm --filter @onrecord/web start',
      startServerReadyPattern: 'Ready in|started server on',
      url: ['http://localhost:3000/', 'http://localhost:3000/demo-room'],
      numberOfRuns: 1,
      settings: {
        emulatedFormFactor: 'desktop',
        channel: 'chrome',
        throttlingMethod: 'simulate',
        chromeFlags: ['--no-sandbox', '--disable-gpu'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.6 }],
        'categories:accessibility': ['warn', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci/results',
    },
  },
};
