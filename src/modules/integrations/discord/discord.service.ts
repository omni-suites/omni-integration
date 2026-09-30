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

  // ─── Helpers ──────────────────────────────────────────────────────────
  private getOption(options: any[], name: string): string | undefined {
    return options.find((o: any) => o.name === name)?.value;
  }
}
