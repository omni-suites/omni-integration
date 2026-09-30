/**
 * Register /run-tests slash command with Discord (guild-scoped, instant).
 *
 * Env vars required:
 *   DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID
 *
 * Usage:
 *   node scripts/register-commands.mjs
 */

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APPLICATION_ID || !BOT_TOKEN || !GUILD_ID) {
  console.error('❌ Set DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, and DISCORD_GUILD_ID env vars first.');
  process.exit(1);
}

const commands = [
  {
    name: 'run-tests',
    description: 'Trigger E2E test suite via GitHub Actions',
    type: 1, // CHAT_INPUT
    options: [
      {
        name: 'suite',
        description: 'Which test suite to run',
        type: 3, // STRING
        required: true,
        choices: [
          { name: '🔥 Smoke',             value: 'smoke' },
          { name: '🧪 Sanity',            value: 'sanity' },
          { name: '🔁 Regression',         value: 'regression' },
          { name: '🖥️ UI',                value: 'ui' },
          { name: '🔌 API',                value: 'api' },
          { name: '🌐 All',                value: 'all' },
          { name: '🎯 Custom (use grep)',  value: 'custom' },
        ],
      },
      {
        name: 'grep',
        description: 'Tags or regex filter (e.g. TC-106, TC-105 or @auth) — used with "custom" suite',
        type: 3, // STRING
        required: false,
      },
      {
        name: 'test_env',
        description: 'Target environment label',
        type: 3, // STRING
        required: false,
        choices: [
          { name: '🚀 Staging', value: 'staging' },
          { name: '💻 Local',   value: 'local' },
        ],
      },
    ],
  },
];

const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`;

console.log(`Registering ${commands.length} command(s) → ${url}\n`);

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bot ${BOT_TOKEN}`,
  },
  body: JSON.stringify(commands),
});

const data = await res.json();

if (res.ok) {
  console.log('✅ Commands registered successfully!\n');
  for (const cmd of data) {
    console.log(`  /${cmd.name} (id: ${cmd.id})`);
  }
} else {
  console.error('❌ Failed to register commands:');
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}
