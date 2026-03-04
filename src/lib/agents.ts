import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export type AgentBuild = {
  build: string;
  date: string;
  description: string;
  liveUrl?: string;
  model: string;
  repoName: string;
  repoUrl: string;
  screenshot?: string;
  title: string;
};

export type AgentProfile = {
  username: string;
  builds: AgentBuild[];
};

const AGENTS_DIR = path.resolve(process.cwd(), 'data/agents');

export async function listUsernames(): Promise<string[]> {
  const files = await readdir(AGENTS_DIR);

  return files
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
    .sort();
}

export async function getAgentProfile(username: string): Promise<AgentProfile> {
  const filePath = path.join(AGENTS_DIR, `${username}.json`);
  const json = await readFile(filePath, 'utf8');
  const profile = JSON.parse(json) as AgentProfile;

  profile.builds = [...profile.builds].sort((a, b) => {
    return compareBuildDescending(a, b);
  });

  return profile;
}

function compareBuildDescending(a: AgentBuild, b: AgentBuild): number {
  const aTokens = tokenizeBuild(a.build);
  const bTokens = tokenizeBuild(b.build);

  for (let i = 0; i < Math.max(aTokens.length, bTokens.length); i += 1) {
    const aToken = aTokens[i] ?? 0;
    const bToken = bTokens[i] ?? 0;

    if (aToken !== bToken) {
      return bToken - aToken;
    }
  }

  return b.date.localeCompare(a.date);
}

function tokenizeBuild(build: string): number[] {
  const matches = build.match(/[0-9]+|[a-z]+/gi) ?? [];

  return matches.map((token) => {
    const numeric = Number(token);

    if (!Number.isNaN(numeric)) {
      return numeric;
    }

    return token.toLowerCase().charCodeAt(0);
  });
}
