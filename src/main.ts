import * as core from '@actions/core'
import {v4 as uuid} from 'uuid'
import {getConfig, DispatchMethod, ActionOutputs} from './action'
import * as api from './api'
import {backOff} from 'exponential-backoff'
import {getDispatchedWorkflowRun} from './utils'

const DISTINCT_ID = uuid()

enum NumberOfAttempts {
  WorkflowId = 3,
  WorkflowRuns = 5
}

async function run(): Promise<void> {
  try {
    const config = getConfig()
    api.init(config)

    // Get the workflow ID if give a string
    if (typeof config.workflow === 'string') {
      const workflowFileName = config.workflow
      core.info(`Fetching Workflow ID for ${workflowFileName}...`)
      const workflowId = await backOff(
        async () => api.getWorkflowId(workflowFileName),
        {numOfAttempts: NumberOfAttempts.WorkflowId}
      )
      core.info(`Fetched Workflow ID: ${workflowId}`)
      config.workflow = workflowId
    }

    // Dispatch the action using the chosen dispatch method
    if (config.dispatchMethod === DispatchMethod.WorkflowDispatch) {
      await api.workflowDispatch(DISTINCT_ID)
    } else {
      await api.repositoryDispatch(DISTINCT_ID)
    }

    // Exit Early Early if discover is disabled
    if (!config.discover) {
      core.info('Workflow dispatched! Skipping the retrieval of the run-id')
      return
    }

    core.debug(
      `Attempting to fetch Run IDs for workflow with distinct id [${DISTINCT_ID}]`
    )

    const dispatchedWorkflowRun = await backOff(
      async () => {
        const workflowRuns = await api.getWorkflowRuns()
        const dispatchedWorkflowRun = getDispatchedWorkflowRun(
          workflowRuns,
          DISTINCT_ID
        )
        return dispatchedWorkflowRun
      },
      {numOfAttempts: NumberOfAttempts.WorkflowRuns}
    )

    core.info(
      'Successfully identified remote Run:\n' +
        `  Run ID: ${dispatchedWorkflowRun.id}\n` +
        `  URL: ${dispatchedWorkflowRun.htmlUrl}`
    )
    core.setOutput(ActionOutputs.RunId, dispatchedWorkflowRun.id)
    core.setOutput(ActionOutputs.RunUrl, dispatchedWorkflowRun.htmlUrl)
  } catch (error) {
    if (error instanceof Error) {
      core.warning('Does the token have the correct permissions?')
      error.stack && core.debug(error.stack)
      core.setFailed(`Failed to complete: ${error.message}`)
    }
  }
}

run()
