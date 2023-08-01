import * as core from '@actions/core'
import {v4 as uuid} from 'uuid'
import {getConfig, DispatchMethod, ActionOutputs} from './action'
import * as api from './api'
import {WorkflowRun} from './api.types'

const DISTINCT_ID = uuid()
const WORKFLOW_FETCH_TIMEOUT_MS = 60 * 1000
const WORKFLOW_JOB_STEPS_RETRY_MS = 5000

async function run(): Promise<void> {
  try {
    const config = getConfig()
    const startTime = Date.now()
    api.init(config)

    // Get the workflow ID if give a string
    if (typeof config.workflow === 'string') {
      core.info(`Fetching Workflow ID for ${config.workflow}...`)
      const workflowId = await api.getWorkflowId(config.workflow)
      core.info(`Fetched Workflow ID: ${workflowId}`)
      config.workflow = workflowId
    }

    // Dispatch the action using the chosen dispatch method
    if (config.dispatchMethod === DispatchMethod.WorkflowDispatch) {
      await api.workflowDispatch(DISTINCT_ID)
    } else {
      await api.repositoryDispatch(DISTINCT_ID)
    }

    // Exit Early Early if export-run-id is disabled
    if (!config.exportRunId) {
      core.info('Workflow dispatched! Skipping the retrieval of the run-id')
      return
    }

    const timeoutMs = config.workflowTimeoutSeconds * 1000
    let attemptNo = 0
    let elapsedTime = Date.now() - startTime
    core.info("Attempt to extract run ID from 'run-name'...")
    while (elapsedTime < timeoutMs) {
      attemptNo++
      elapsedTime = Date.now() - startTime

      core.debug(
        `Attempting to fetch Run IDs for workflow with distinct id [${DISTINCT_ID}]`
      )

      // Get all runs for a given workflow ID
      const workflowRuns = await api.retryOrDie<WorkflowRun>(
        async () => api.getWorkflowRuns(),
        WORKFLOW_FETCH_TIMEOUT_MS > timeoutMs
          ? timeoutMs
          : WORKFLOW_FETCH_TIMEOUT_MS
      )

      const dispatchedWorkflowRun = workflowRuns.find(workflowRun =>
        new RegExp(DISTINCT_ID).test(workflowRun.name)
      )

      if (dispatchedWorkflowRun) {
        core.info(
          'Successfully identified remote Run:\n' +
            `  Run ID: ${dispatchedWorkflowRun.id}\n` +
            `  URL: ${dispatchedWorkflowRun.htmlUrl}`
        )
        core.setOutput(ActionOutputs.RunId, dispatchedWorkflowRun.id)
        core.setOutput(ActionOutputs.RunUrl, dispatchedWorkflowRun.htmlUrl)
        return
      }

      core.info(
        `Exhausted searching IDs in known runs, attempt ${attemptNo}...`
      )

      await new Promise(resolve =>
        setTimeout(resolve, WORKFLOW_JOB_STEPS_RETRY_MS)
      )
    }

    throw new Error('Timeout exceeded while attempting to get Run ID')
  } catch (error) {
    if (error instanceof Error) {
      core.error(`Failed to complete: ${error.message}`)
      core.warning('Does the token have the correct permissions?')
      error.stack && core.debug(error.stack)
      core.setFailed(error.message)
    }
  }
}

run()
