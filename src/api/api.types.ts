import type { getOctokit } from '@actions/github'

export type Octokit = ReturnType<typeof getOctokit>

export interface WorkflowRun {
  id: number
  name: string
  htmlUrl: string
}

export interface WorkflowDispatch {
  id: number
  htmlUrl: string
}
