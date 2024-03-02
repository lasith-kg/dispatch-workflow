import * as core from '@actions/core'
import {backOff} from 'exponential-backoff'
import {v4 as uuid} from 'uuid'
import {
  getConfig,
  DispatchMethod,
  ActionOutputs,
  getBackoffOptions
} from './action'
import * as api from './api'
import {getDispatchedWorkflowRun} from './utils'

const DISTINCT_ID = uuid()

async function run(): Promise<void> {
  try {
    const config = getConfig()
    api.init(config)
    const backoffOptions = getBackoffOptions(config)

    // Display Exponential Backoff Options (if debug mode is enabled)
    core.info(`🔄 Exponential backoff parameters:
    starting-delay: ${backoffOptions.startingDelay}
    max-attempts: ${backoffOptions.numOfAttempts}
    time-multiple: ${backoffOptions.timeMultiple}`)

    // Get the workflow ID if give a string
    if (typeof config.workflow === 'string') {
      const workflowFileName = config.workflow
      core.info(`⌛ Fetching workflow id for ${workflowFileName}`)
      const workflowId = await backOff(
        async () => api.getWorkflowId(workflowFileName),
        backoffOptions
      )
      core.info(`✅ Fetched workflow id: ${workflowId}`)
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
      core.info('✅ Workflow dispatched! Skipping the retrieval of the run-id')
      return
    }

    core.info(
      `⌛ Fetching run-ids for workflow with distinct-id=${DISTINCT_ID}`
    )

    const dispatchedWorkflowRun = await backOff(async () => {
      const workflowRuns = await api.getWorkflowRuns()
      const dispatchedWorkflowRun = getDispatchedWorkflowRun(
        workflowRuns,
        DISTINCT_ID
      )
      return dispatchedWorkflowRun
    }, backoffOptions)

    core.info(`✅ Successfully identified remote run:
    run-id: ${dispatchedWorkflowRun.id}
    run-url: ${dispatchedWorkflowRun.htmlUrl}`)
    core.setOutput(ActionOutputs.RunId, dispatchedWorkflowRun.id)
    core.setOutput(ActionOutputs.RunUrl, dispatchedWorkflowRun.htmlUrl)
  } catch (error) {
    if (error instanceof Error) {
      core.warning('🟠 Does the token have the correct permissions?')
      error.stack && core.debug(error.stack)
      core.setFailed(`🔴 Failed to complete: ${error.message}`)
    }
  }
}

run()
