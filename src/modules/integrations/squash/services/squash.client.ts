import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { SquashProject, SquashRequirement } from '../types/squash.types';

@Injectable()
export class SquashClient implements OnModuleInit {
  private readonly logger = new Logger(SquashClient.name);
  private baseUrl = '';
  private projectIdCache: number | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>('SQUASH_BASE_URL', '').replace(/\/$/, '');
    this.baseUrl = raw;
    if (!this.baseUrl) {
      this.logger.warn('SQUASH_BASE_URL is not set');
    }
  }

  private authHeaders(): Record<string, string> {
    const token = this.config.get<string>('SQUASH_API_TOKEN')?.trim();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }

    const user = this.config.get<string>('SQUASH_USER')?.trim();
    const password = this.config.get<string>('SQUASH_PASSWORD') ?? '';
    if (user) {
      const basic = Buffer.from(`${user}:${password}`).toString('base64');
      return { Authorization: `Basic ${basic}` };
    }

    return {};
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    data?: unknown,
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new ServiceUnavailableException('SQUASH_BASE_URL is not configured');
    }

    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const config: AxiosRequestConfig = {
      method,
      url,
      data,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      },
      validateStatus: () => true,
    };

    this.logger.debug(`[Squash API] -> ${method} ${path}`);
    const response = await firstValueFrom(this.http.request<T>(config));
    if (response.status >= 400) {
      this.logger.error(
        `[Squash API] ${method} ${path} failed (${response.status}): ${JSON.stringify(response.data)}`,
      );
      throw new ServiceUnavailableException(
        `Squash API error ${response.status} on ${method} ${path}`,
      );
    }

    this.logger.log(`[Squash API] ${method} ${path} -> ${response.status}`);
    return response.data;
  }

  async resolveProjectId(): Promise<number> {
    if (this.projectIdCache != null) {
      return this.projectIdCache;
    }

    const configuredId = this.config.get<string>('SQUASH_PROJECT_ID')?.trim();
    if (configuredId) {
      this.projectIdCache = Number(configuredId);
      this.logger.log(`Using configured Squash project ID: ${this.projectIdCache}`);
      return this.projectIdCache;
    }

    const projectName = this.config.get<string>('SQUASH_PROJECT_NAME', 'omni-suites');
    this.logger.log(`Resolving Squash project ID for project name "${projectName}"...`);
    const data = await this.request<{
      _embedded?: { projects?: SquashProject[] };
    }>('GET', '/api/rest/latest/projects?size=100');

    const projects = data._embedded?.projects ?? [];
    const match = projects.find(
      (p) => p.name?.toLowerCase() === projectName.toLowerCase(),
    );

    if (!match) {
      throw new ServiceUnavailableException(
        `Squash project "${projectName}" not found. Create it in Squash or set SQUASH_PROJECT_ID.`,
      );
    }

    this.projectIdCache = match.id;
    this.logger.log(`Resolved Squash project "${projectName}" -> ID ${match.id}`);
    return match.id;
  }

  async createRequirement(body: unknown): Promise<SquashRequirement> {
    return this.request<SquashRequirement>(
      'POST',
      '/api/rest/latest/requirements',
      body,
    );
  }

  async updateRequirement(id: number | string, body: unknown): Promise<SquashRequirement> {
    return this.request<SquashRequirement>(
      'PATCH',
      `/api/rest/latest/requirements/${id}`,
      body,
    );
  }
}
