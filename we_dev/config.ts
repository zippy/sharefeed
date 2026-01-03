import { defineConfig } from '@theweave/cli';

export default defineConfig({
  toolCurations: [
    {
      url: 'https://raw.githubusercontent.com/lightningrodlabs/weave-tool-curation/refs/heads/test-0.14/0.14/lists/curations-0.14.json',
      useLists: ['default'],
    },
  ],
  groups: [
    {
      name: 'ShareFeed Test Group',
      networkSeed: 'sharefeed-dev-test-network-seed-12345',
      icon: {
        type: 'filesystem',
        path: './we_dev/sharefeed_icon.png',
      },
      creatingAgent: {
        agentIdx: 1,
        agentProfile: {
          nickname: 'Alice',
        },
      },
      joiningAgents: [
        {
          agentIdx: 2,
          agentProfile: {
            nickname: 'Bob',
          },
        },
      ],
      applets: [
        {
          name: 'ShareFeed Hot Reload',
          instanceName: 'ShareFeed Hot Reload',
          registeringAgent: 1,
          joiningAgents: [2],
        },
      ],
    },
  ],
  applets: [
    {
      name: 'ShareFeed Hot Reload',
      subtitle: 'Share links with family and friends',
      description: 'A simple way to share interesting web pages with your group',
      icon: {
        type: 'filesystem',
        path: './we_dev/sharefeed_icon.png',
      },
      source: {
        type: 'localhost',
        happPath: './workdir/sharefeed.happ',
        uiPort: 1420,
      },
    },
  ],
});
