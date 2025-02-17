import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import utc from 'dayjs/plugin/utc';
import dayjs from 'dayjs';

dayjs.extend(utc);

class Tagger {
  kit: InstanceType<typeof GitHub>;

  constructor(token: string) {
    this.kit = getOctokit(token);
  }

  async tag(
    revision: string,
    channel: string,
    resources: string,
    tagPrefix?: string
  ) {
    const { owner, repo } = context.repo;
    if (context.eventName && context.eventName.includes('pull_request')) {
      return;
    }
    const content = this._build(
      owner,
      repo,
      process.env['GITHUB_SHA'] as string,
      revision,
      channel,
      resources,
      tagPrefix
    );

    await this.kit.rest.repos.createRelease(content);
  }

  _build(
    owner: string,
    repo: string,
    hash: string,
    revision: string,
    channel: string,
    resources: string,
    tagPrefix?: string
  ) {
    const suffix = revision || dayjs().utc().format('YYYYMMDDHHmmss');
    const name = `${tagPrefix ? `${tagPrefix}-` : ''}rev${suffix}`;
    const message = `${resources} Released to '${channel}' at ${this.get_date_text()}`;

    return {
      owner,
      repo,
      name: `Revision ${suffix}`,
      tag_name: name,
      body: message,
      draft: false,
      prerelease: false,
      generate_release_notes: true,
      target_commitish: hash,
    };
  }

  get_date_text() {
    // 12:00 UTC on 10 Feb 2022
    return dayjs().utc().format('HH:mm UTC on D MMM YYYY');
  }

  async getReleaseByTag(tagName: string) {
    const { owner, repo } = context.repo;
    try {
      const { data } = await this.kit.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag: tagName,
      });
      return data;
    } catch (error) {
      throw new Error(`Cannot find release by tag ${tagName}`);
    }
  }

  async updateRelease(release_id: number, newReleaseBody?: string) {
    const { owner, repo } = context.repo;
    try {
      const { data } = await this.kit.rest.repos.updateRelease({
        owner,
        repo,
        release_id,
        body: newReleaseBody,
      });
      return data;
    } catch (error) {
      throw new Error(`Failed to update release with id ${release_id}`);
    }
  }
}

export { Tagger };
