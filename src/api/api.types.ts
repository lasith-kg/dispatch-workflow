import type { getOctokit } from '@actions/github'
import type { GetResponseTypeFromEndpointMethod } from '@octokit/types'

export type Octokit = ReturnType<typeof getOctokit>

export interface WorkflowRun {
  id: number
  name: string
  htmlUrl: string
}

export type WorkflowRunResponse = GetResponseTypeFromEndpointMethod<
  Octokit['rest']['actions']['listWorkflowRuns']
>
