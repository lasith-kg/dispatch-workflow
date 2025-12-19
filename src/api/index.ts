import * as core from '@actions/core'
import * as github from '@actions/github'
import {getConfig, ActionConfig, DispatchMethod} from '../action'
import {getBranchNameFromRef} from '../utils'
import {Octokit, WorkflowRun, WorkflowRunResponse} from './api.types'
import type {OctokitResponse} from '@octokit/types'

let config: ActionConfig
let octokit: Octokit

export function init(cfg?: ActionConfig): void {
  config = cfg || getConfig()
  octokit = github.getOctokit(config.token)
}

export async function workflowDispatch(distinctId: string): Promise<void> {
  const inputs = {
    ...config.workflowInputs,
    ...(config.discover ? {distinct_id: distinctId} : undefined)
  }
  if (!config.workflow) {
    throw new Error(
      `workflow_dispatch: An input to 'workflow' was not provided`
    )
  }
  if (!config.ref) {
    throw new Error(`workflow_dispatch: An input to 'ref' was not provided`)
  }
  // GitHub released a breaking change to the createWorkflowDispatch API that resulted in a change where the returned
  // status code changed to 200, from 204. At the time, the @octokit/types had not been updated to reflect this change.
  //
  // Given that we are in an interim state where the API behaviour, but the public documentation has not been updated
  // to reflect this change, and GitHub has not yet released any updates on this topic. I can going to play the safe
  // route and assume that the response status code could be either 200 or 204.
  //
  // Reference:     https://github.com/orgs/community/discussions/9752#discussioncomment-15295321
  // Documentation: https://docs.github.com/en/rest/reference/actions#create-a-workflow-dispatch-event
  const response = (await octokit.rest.actions.createWorkflowDispatch({
    owner: config.owner,
    repo: config.repo,
    workflow_id: config.workflow,
    ref: config.ref,
    inputs
  })) as OctokitResponse<never, 204 | 200>

  if (response.status !== 200 && response.status !== 204) {
    throw new Error(
      `workflow_dispatch: Failed to dispatch action, expected 200 or 204 but received ${response.status}`
    )
  }

  core.info(`✅ Successfully dispatched workflow using workflow_dispatch method:
    repository: ${config.owner}/${config.repo}
    branch: ${config.ref}
    workflow-id: ${config.workflow}
    distinct-id: ${distinctId}
    workflow-inputs: ${JSON.stringify(inputs)}`)
}

export async function repositoryDispatch(distinctId: string): Promise<void> {
  const clientPayload = {
    ...config.workflowInputs,
    ...(config.discover ? {distinct_id: distinctId} : undefined)
  }
  if (!config.eventType) {
    throw new Error(
      `repository_dispatch: An input to 'event-type' was not provided`
    )
  }
  // https://docs.github.com/en/rest/reference/actions#create-a-workflow-dispatch-event
  const response = await octokit.rest.repos.createDispatchEvent({
    owner: config.owner,
    repo: config.repo,
    event_type: config.eventType,
    client_payload: clientPayload
  })

  if (response.status !== 204) {
    throw new Error(
      `repository_dispatch: Failed to dispatch action, expected 204 but received ${response.status}`
    )
  }

  core.info(`✅ Successfully dispatched workflow using repository_dispatch method:
    repository: ${config.owner}/${config.repo}
    event-type: ${config.eventType}
    distinct-id: ${distinctId}
    client-payload: ${JSON.stringify(clientPayload)}`)
}

export async function getWorkflowId(workflowFilename: string): Promise<number> {
  // https://docs.github.com/en/rest/reference/actions#list-repository-workflows
  const response = await octokit.rest.actions.listRepoWorkflows({
    owner: config.owner,
    repo: config.repo
  })

  if (response.status !== 200) {
    throw new Error(
      `Failed to get workflows, expected 200 but received ${response.status}`
    )
  }

  const workflow = response.data.workflows.find(workflow =>
    workflow.path.includes(workflowFilename)
  )

  if (!workflow) {
    throw new Error(
      `getWorkflowId: Unable to find ID for Workflow: ${workflowFilename}`
    )
  }

  return workflow.id
}

export async function getWorkflowRuns(): Promise<WorkflowRun[]> {
  let status: number
  let branchName: string | undefined
  let response: WorkflowRunResponse

  if (config.dispatchMethod === DispatchMethod.WorkflowDispatch) {
    branchName = getBranchNameFromRef(config.ref)

    if (!config.workflow) {
      throw new Error(`An input to 'workflow' was not provided`)
    }
    // https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow
    response = await octokit.rest.actions.listWorkflowRuns({
      owner: config.owner,
      repo: config.repo,
      workflow_id: config.workflow,
      ...(branchName
        ? {
            branch: branchName,
            per_page: 5
          }
        : {
            per_page: 10
          })
    })
    status = response.status
  } else {
    // repository_dipsatch can only be triggered from the default branch
    const branchName = await getDefaultBranch()
    // https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
    response = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner: config.owner,
      repo: config.repo,
      branch: branchName,
      event: DispatchMethod.RepositoryDispatch,
      per_page: 5
    })
    status = response.status
  }

  if (status !== 200) {
    throw new Error(
      `getWorkflowRuns: Failed to get workflow runs, expected 200 but received ${status}`
    )
  }

  const workflowRuns: WorkflowRun[] = response.data.workflow_runs.map(
    workflowRun => ({
      id: workflowRun.id,
      name: workflowRun.name || '',
      htmlUrl: workflowRun.html_url
    })
  )

  core.debug(`
Fetched Workflow Runs
Repository: ${config.owner}/${config.repo}
Branch: ${branchName || 'undefined'}
Runs Fetched: [${workflowRuns.map(workflowRun => workflowRun.id)}]`)

  return workflowRuns
}

export async function getDefaultBranch(): Promise<string> {
  const response = await octokit.rest.repos.get({
    owner: config.owner,
    repo: config.repo
  })

  if (response.status !== 200) {
    throw new Error(
      `getDefaultBranch: Failed to get repository information, expected 200 but received ${response.status}`
    )
  }

  core.debug(`
Fetched Repository Information
Repository: ${config.owner}/${config.repo}
Default Branch: ${response.data.default_branch}`)

  return response.data.default_branch
}

export * from './api.types'
