export const demoRoom = {
  roomName: 'Press Room: Demo',
  publicFigure: 'Demo Public Figure',
  questions: [
    {
      id: 'q_001',
      from: 'Reporter A',
      body: 'What is the purpose of this demo room?',
      status: 'queued' as const,
    },
    {
      id: 'q_002',
      from: 'Reporter B',
      body: 'When does the real realtime queue arrive?',
      status: 'queued' as const,
    },
  ],
};
