module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm --filter @onrecord/web dev --hostname 0.0.0.0 --port 3000',
      url: [
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3000/rooms/demo-figure/demo-room',
      ],
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
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'metrics:largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'metrics:total-blocking-time': ['error', { maxNumericValue: 200 }],
        'metrics:cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
