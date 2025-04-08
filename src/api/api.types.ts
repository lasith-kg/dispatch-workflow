import type {GitHub} from '@actions/github/lib/utils'

import {
  GetResponseDataTypeFromEndpointMethod
  // eslint-disable-next-line import/no-unresolved
} from '@octokit/types'

export type Octokit = InstanceType<typeof GitHub>
let octokit: Octokit

export interface WorkflowRun {
  id: number
  name: string
  htmlUrl: string
}

export type WorkflowRunResponse = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.paginate
>
