import * as core from '@actions/core'
import * as github from '@actions/github'
import type {GitHub} from '@actions/github/lib/utils'
import {ActionConfig, getConfig} from './action'
type Octokit = InstanceType<typeof GitHub>

let config: ActionConfig
let octokit: Octokit

export function init(cfg?: ActionConfig): void {
  config = cfg || getConfig()
  octokit = github.getOctokit(config.token)
}

export async function workflowDispatch(distinctId: string): Promise<void> {
  try {
    // https://docs.github.com/en/rest/reference/actions#create-a-workflow-dispatch-event
    const response = await octokit.rest.actions.createWorkflowDispatch({
      owner: config.owner,
      repo: config.repo,
      workflow_id: config.workflow!,
      ref: config.ref || 'main',
      inputs: {
        ...(config.workflowInputs ? config.workflowInputs : undefined),
        distinct_id: distinctId
      }
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
${
  config.workflowInputs
    ? `Workflow Inputs: ${JSON.stringify(config.workflowInputs)}`
    : ``
}`)
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
    // https://docs.github.com/en/rest/reference/actions#create-a-workflow-dispatch-event
    const response = await octokit.rest.repos.createDispatchEvent({
      owner: config.owner,
      repo: config.repo,
      event_type: config.eventType!,
      client_payload: {
        ...(config.workflowInputs ? config.workflowInputs : undefined),
        distinct_id: distinctId
      }
    })

    if (response.status !== 204) {
      throw new Error(
        `Failed to dispatch action, expected 204 but received ${response.status}`
      )
    }

    core.info(`
  Successfully dispatched workflow using repository_dispatch method:
  Repository: ${config.owner}/${config.repo}
  Branch: Default Branch
  Distinct ID: ${distinctId}
  ${
    config.workflowInputs
      ? `Client Payload: ${JSON.stringify(config.workflowInputs)}`
      : ``
  }`)
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
