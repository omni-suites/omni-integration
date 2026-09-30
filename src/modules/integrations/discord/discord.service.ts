import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';
import type { Request } from 'express';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly publicKey: string;
  private readonly botToken: string;
  private readonly appId: string;
  private readonly githubToken: string;
  private readonly testReleasesChannelId: string;

  // GitHub repo that hosts the e2e workflow
  private readonly GH_OWNER = 'omni-suites';
  private readonly GH_REPO = 'test-suites';
  private readonly GH_WORKFLOW = 'e2e.yml';
  private readonly GH_REF = 'main';

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.configService.get<string>('DISCORD_PUBLIC_KEY') || '';
    this.botToken = this.configService.get<string>('DISCORD_BOT_TOKEN') || '';
    this.appId = this.configService.get<string>('DISCORD_APPLICATION_ID') || '';
    this.githubToken = this.configService.get<string>('DISCORD_GITHUB_PAT_TOKEN') || '';
    this.testReleasesChannelId = this.configService.get<string>('DISCORD_TEST_RELEASES_CHANNEL_ID') || '1554846127709487215';
  }

  // ─── Signature Verification ───────────────────────────────────────────

  async verifyRequest(req: Request): Promise<boolean> {
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;
    const rawBody = (req as any).rawBody;

    if (!signature || !timestamp || !rawBody) {
      this.logger.warn('Missing signature headers or rawBody');
      return false;
    }

    try {
      return await verifyKey(rawBody, signature, timestamp, this.publicKey);
    } catch (err) {
      this.logger.error('Signature verification error', err);
      return false;
    }
  }

  // ─── Interaction Router ───────────────────────────────────────────────
  async handleInteraction(interaction: any): Promise<any> {
    // Discord Verification Ping
    if (interaction.type === InteractionType.PING) {
      return { type: InteractionResponseType.PONG };
    }

    // Slash Commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data?.name;
      this.logger.log(`Received slash command: /${commandName}`);

      if (commandName === 'run-tests') {
        return this.handleRunTests(interaction);
      }
    }

    // Fallback
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: '❓ Unknown command.' },
    };
  }

  // ─── /run-tests Handler ───────────────────────────────────────────────
  private handleRunTests(interaction: any): any {
    // Parse options from the interaction
    const options = interaction.data?.options || [];
    const suite = this.getOption(options, 'suite') || 'smoke';
    const grep = this.getOption(options, 'grep') || '';
    const testEnv = this.getOption(options, 'test_env') || 'staging';

    this.logger.log(`/run-tests → suite=${suite}, grep=${grep}, test_env=${testEnv}`);

    // Fire-and-forget: trigger GitHub Actions in the background
    // We respond to Discord immediately (must reply within 3 seconds)
    this.triggerGitHubWorkflow(suite, grep, testEnv, interaction)
      .then(() => this.logger.log('GitHub workflow dispatched successfully'))
      .catch((err) => {
        this.logger.error('Failed to dispatch GitHub workflow', err);
        // Edit the original message to show the error
        this.editOriginalResponse(interaction.token, `❌ Failed to trigger workflow: ${err.message}`)
          .catch((e) => this.logger.error('Failed to edit error response', e));
      });

    // Immediate response to Discord (within 3s deadline)
    const grepDisplay = grep ? `\n> **Grep:** \`${grep}\`` : '';
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: [
          `🚀 **Triggering E2E Tests**`,
          `> **Suite:** \`${suite}\`${grepDisplay}`,
          `> **Environment:** \`${testEnv}\``,
          ``,
          `⏳ Dispatching to GitHub Actions...`,
        ].join('\n'),
      },
    };
  }

  // ─── GitHub Actions Dispatch ──────────────────────────────────────────
  private async triggerGitHubWorkflow(
    suite: string,
    grep: string,
    testEnv: string,
    interaction: any,
  ): Promise<void> {
    const url = `https://api.github.com/repos/${this.GH_OWNER}/${this.GH_REPO}/actions/workflows/${this.GH_WORKFLOW}/dispatches`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: this.GH_REF,
        inputs: {
          suite,
          grep,
          test_env: testEnv,
        },
      }),
    });

    if (res.status === 204) {
      // Success — edit the original Discord message to confirm
      const actionsUrl = `https://github.com/${this.GH_OWNER}/${this.GH_REPO}/actions/workflows/${this.GH_WORKFLOW}`;
      await this.editOriginalResponse(interaction.token, [
        `✅ **E2E Tests Triggered!**`,
        `> **Suite:** \`${suite}\`${grep ? `\n> **Grep:** \`${grep}\`` : ''}`,
        `> **Environment:** \`${testEnv}\``,
        ``,
        `🔗 [View workflow runs](${actionsUrl})`,
      ].join('\n'));
    } else {
      const body = await res.text();
      throw new Error(`GitHub API responded ${res.status}: ${body}`);
    }
  }

  // ─── Discord Follow-up: Edit Original Response ────────────────────────
  private async editOriginalResponse(interactionToken: string, content: string): Promise<void> {
    const url = `https://discord.com/api/v10/webhooks/${this.appId}/${interactionToken}/messages/@original`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Failed to edit Discord message: ${res.status} ${body}`);
    }
  }

  // ─── Post Test Results to Discord Channel ──────────────────────────────
  async publishTestResult(payload: {
    suite?: string;
    status?: string;
    test_env?: string;
    run_id?: string;
    run_url?: string;
    ref?: string;
    sha?: string;
    rp_launch?: string;
    rp_project?: string;
    channel_id?: string;
  }): Promise<void> {
    const channelId = payload.channel_id || this.testReleasesChannelId;
    if (!channelId) {
      throw new Error('No target Discord channel ID configured for test results.');
    }

    const isSuccess = payload.status === 'success';
    const statusIcon = isSuccess ? '✅' : '❌';
    const statusText = isSuccess ? 'PASSED' : (payload.status?.toUpperCase() || 'FAILED');
    const color = isSuccess ? 0x22c55e : 0xef4444; // Green or Red
    const suiteName = (payload.suite || 'smoke').toUpperCase();

    const embed = {
      title: `${statusIcon} E2E Test Suite ${statusText} — ${suiteName}`,
      color,
      description: `Playwright test execution completed on **${payload.test_env || 'staging'}**.`,
      fields: [
        {
          name: 'Suite',
          value: `\`${payload.suite || 'smoke'}\``,
          inline: true,
        },
        {
          name: 'Environment',
          value: `\`${payload.test_env || 'staging'}\``,
          inline: true,
        },
        {
          name: 'Status',
          value: `**${statusText}**`,
          inline: true,
        },
        {
          name: 'Branch / Commit',
          value: `\`${payload.ref || 'main'}\` (${payload.sha ? payload.sha.substring(0, 7) : 'latest'})`,
          inline: true,
        },
        {
          name: 'GitHub Run',
          value: payload.run_url ? `[#${payload.run_id || 'run'}](${payload.run_url})` : `#${payload.run_id || 'N/A'}`,
          inline: true,
        },
        {
          name: 'ReportPortal',
          value: payload.rp_launch 
            ? `[View Launch ${payload.rp_launch}](https://report-portal.test-suites-poc.work.gd/ui/#${payload.rp_project || 'omni-suites'}/launches/all?filter.eq.name=${payload.rp_launch})`
            : '[Open Dashboard](https://report-portal.test-suites-poc.work.gd)',
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Omni Test Automation Platform',
      },
    };

    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Failed to post test results to Discord: ${res.status} ${body}`);
      throw new Error(`Discord API responded ${res.status}: ${body}`);
    }

    this.logger.log(`Successfully published test results to Discord channel ${channelId}`);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────
  private getOption(options: any[], name: string): string | undefined {
    return options.find((o: any) => o.name === name)?.value;
  }
}
