import * as core from '@actions/core'
import * as github from '@actions/github'
import type {GitHub} from '@actions/github/lib/utils'
import {ActionConfig, DispatchMethod, getConfig} from './action'
import {getBranchNameFromRef} from './utils'
import {WorkflowRun, WorkflowRunResponse} from './api.types'

type Octokit = InstanceType<typeof GitHub>

let config: ActionConfig
let octokit: Octokit

export function init(cfg?: ActionConfig): void {
  config = cfg || getConfig()
  octokit = github.getOctokit(config.token)
}

export async function workflowDispatch(distinctId: string): Promise<void> {
  try {
    const inputs = {
      ...config.workflowInputs,
      ...(config.discover ? {distinct_id: distinctId} : undefined)
    }
    if (!config.workflow) {
      throw new Error(`An input to 'workflow' was not provided`)
    }
    if (!config.ref) {
      throw new Error(`An input to 'ref' was not provided`)
    }
    // https://docs.github.com/en/rest/reference/actions#create-a-workflow-dispatch-event
    const response = await octokit.rest.actions.createWorkflowDispatch({
      owner: config.owner,
      repo: config.repo,
      workflow_id: config.workflow,
      ref: config.ref,
      inputs
    })

    if (response.status !== 204) {
      throw new Error(
        `Failed to dispatch action, expected 204 but received ${response.status}`
      )
    }

    core.info(`
Successfully dispatched workflow using workflow_dispatch method:
Repository: ${config.owner}/${config.repo}
Branch: ${config.ref}
Workflow ID: ${config.workflow}
Distinct ID: ${distinctId}
Workflow Inputs: ${JSON.stringify(inputs)}`)
  } catch (error) {
    if (error instanceof Error) {
      core.error(
        `workflowDispatch: An unexpected error has occurred: ${error.message}`
      )
      error.stack && core.debug(error.stack)
    }
    throw error
  }
}

export async function repositoryDispatch(distinctId: string): Promise<void> {
  try {
    const clientPayload = {
      ...config.workflowInputs,
      ...(config.discover ? {distinct_id: distinctId} : undefined)
    }
    if (!config.eventType) {
      throw new Error(`An input to 'event-type' was not provided`)
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
        `Failed to dispatch action, expected 204 but received ${response.status}`
      )
    }

    core.info(`
Successfully dispatched workflow using repository_dispatch method:
Repository: ${config.owner}/${config.repo}
Event Type: ${config.eventType}
Distinct ID: ${distinctId}
Client Payload: ${JSON.stringify(clientPayload)}`)
  } catch (error) {
    if (error instanceof Error) {
      core.error(
        `repositoryDispatch: An unexpected error has occurred: ${error.message}`
      )
      error.stack && core.debug(error.stack)
    }
    throw error
  }
}

export async function getWorkflowId(workflowFilename: string): Promise<number> {
  try {
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

    const workflowId = response.data.workflows.find(workflow =>
      new RegExp(workflowFilename).test(workflow.path)
    )?.id

    if (workflowId === undefined) {
      throw new Error(`Unable to find ID for Workflow: ${workflowFilename}`)
    }

    return workflowId
  } catch (error) {
    if (error instanceof Error) {
      core.error(
        `getWorkflowId: An unexpected error has occurred: ${error.message}`
      )
      error.stack && core.debug(error.stack)
    }
    throw error
  }
}

export async function getWorkflowRuns(): Promise<WorkflowRun[]> {
  try {
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
        `Failed to get workflow runs, expected 200 but received ${status}`
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
  } catch (error) {
    if (error instanceof Error) {
      core.error(
        `getWorkflowRuns: An unexpected error has occurred: ${error.message}`
      )
      error.stack && core.debug(error.stack)
    }
    throw error
  }
}

export async function getDefaultBranch(): Promise<string> {
  try {
    const response = await octokit.rest.repos.get({
      owner: config.owner,
      repo: config.repo
    })

    if (response.status !== 200) {
      throw new Error(
        `Failed to get repository information, expected 200 but received ${response.status}`
      )
    }

    core.debug(`
Fetched Repository Information
Repository: ${config.owner}/${config.repo}
Default Branch: ${response.data.default_branch}`)

    return response.data.default_branch
  } catch (error) {
    if (error instanceof Error) {
      core.error(
        `getDefaultBranch: An unexpected error has occurred: ${error.message}`
      )
      error.stack && core.debug(error.stack)
    }
    throw error
  }
}

/**
 * Attempt to get a non-empty array from the API.
 */
export async function retryOrDie<T>(
  callback: () => Promise<T[]>,
  timeoutMs: number
): Promise<T[]> {
  const startTime = Date.now()
  let elapsedTime = 0
  while (elapsedTime < timeoutMs) {
    elapsedTime = Date.now() - startTime

    const response = await callback()
    if (response.length > 0) {
      return response
    }

    await new Promise<void>(resolve => setTimeout(resolve, 1000))
  }

  throw new Error('Timed out while attempting to fetch data')
}
