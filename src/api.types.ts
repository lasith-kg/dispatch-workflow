import type {GitHub} from '@actions/github/lib/utils'
// eslint-disable-next-line import/no-unresolved
import {GetResponseTypeFromEndpointMethod} from '@octokit/types'

type Octokit = InstanceType<typeof GitHub>
let octokit: Octokit

export interface WorkflowRun {
  id: number
  name: string
  htmlUrl: string
}

export type WorkflowRunResponse = GetResponseTypeFromEndpointMethod<
  typeof octokit.rest.actions.listWorkflowRuns
>
