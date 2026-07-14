import * as core from '@actions/core'
import * as github from '@actions/github'
import { getConfig, ActionConfig, DispatchMethod } from '../action/index.js'
import { Octokit, WorkflowDispatch, WorkflowRun } from './api.types.js'
import type { OctokitResponse } from '@octokit/types'

let config: ActionConfig
let octokit: Octokit

type DispatchWorkflowResponse = {
  workflow_run_id: number
  run_url: string
  html_url: string
}

export function init(cfg?: ActionConfig): void {
  config = cfg || getConfig()
  octokit = github.getOctokit(config.token)
}

export async function workflowDispatch(): Promise<WorkflowDispatch> {
  const inputs = {
    ...config.workflowInputs
  }
  if (!config.workflow) {
    throw new Error(
      `workflow_dispatch: An input to 'workflow' was not provided`
    )
  }
  if (!config.ref) {
    throw new Error(`workflow_dispatch: An input to 'ref' was not provided`)
  }
  // When invoked with `return_run_details: true`, the createWorkflowDispatch API responds with a 200 status code and
  // includes the ID of the dispatched workflow run in the response data. We temporarily cast the response because the
  // `@octokit/types` library, as of v16.0.0, still does not recognise that this endpoint can return a 200 status code
  // and the Run ID in the response data.
  //
  // Reference:     https://github.blog/changelog/2026-02-19-workflow-dispatch-api-now-returns-run-ids/
  // Documentation: https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#create-a-workflow-dispatch-event
  const response = (await octokit.rest.actions.createWorkflowDispatch({
    owner: config.owner,
    repo: config.repo,
    workflow_id: config.workflow,
    ref: config.ref,
    inputs,
    return_run_details: true
  })) as unknown as OctokitResponse<DispatchWorkflowResponse, 200>

  // On instances where `return_run_details` is not honoured (outdated GitHub Enterprise Server),
  // this endpoint falls back to its legacy `204 No Content` response, which Octokit resolves rather than throwing.
  // Without this check we would silently return an undefined run ID and html_url.
  if (response.status !== 200) {
    throw new Error(
      `workflow_dispatch: Failed to dispatch action, expected 200 but received ${response.status}`
    )
  }

  core.info(`✅ Successfully dispatched workflow using workflow_dispatch method:
    repository: ${config.owner}/${config.repo}
    branch: ${config.ref}
    workflow-id: ${config.workflow}
    workflow-inputs: ${JSON.stringify(inputs)}`)

  return {
    id: response.data.workflow_run_id,
    htmlUrl: response.data.html_url
  }
}

export async function repositoryDispatch(distinctId: string): Promise<void> {
  const clientPayload = {
    ...config.workflowInputs,
    ...(config.discover ? { distinct_id: distinctId } : undefined)
  }
  if (!config.eventType) {
    throw new Error(
      `repository_dispatch: An input to 'event-type' was not provided`
    )
  }
  // https://docs.github.com/en/rest/reference/actions#create-a-workflow-dispatch-event
  await octokit.rest.repos.createDispatchEvent({
    owner: config.owner,
    repo: config.repo,
    event_type: config.eventType,
    client_payload: clientPayload
  })

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

  const workflow = response.data.workflows.find((workflow) =>
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
  // Discovery is only reachable for repository_dispatch. workflow_dispatch obtains the run details directly from the
  // createWorkflowDispatch response (via `return_run_details`), so it never falls back to listing workflow runs.
  //
  // repository_dispatch can only be triggered from the default branch
  const branchName = await getDefaultBranch()
  // https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
  const response = await octokit.rest.actions.listWorkflowRunsForRepo({
    owner: config.owner,
    repo: config.repo,
    branch: branchName,
    event: DispatchMethod.RepositoryDispatch,
    per_page: 5
  })

  const workflowRuns: WorkflowRun[] = response.data.workflow_runs.map(
    (workflowRun) => ({
      id: workflowRun.id,
      name: workflowRun.name || '',
      htmlUrl: workflowRun.html_url
    })
  )

  core.debug(`
Fetched Workflow Runs
Repository: ${config.owner}/${config.repo}
Branch: ${branchName}
Runs Fetched: [${workflowRuns.map((workflowRun) => workflowRun.id)}]`)

  return workflowRuns
}

export async function getDefaultBranch(): Promise<string> {
  const response = await octokit.rest.repos.get({
    owner: config.owner,
    repo: config.repo
  })

  core.debug(`
Fetched Repository Information
Repository: ${config.owner}/${config.repo}
Default Branch: ${response.data.default_branch}`)

  return response.data.default_branch
}

export * from './api.types.js'
