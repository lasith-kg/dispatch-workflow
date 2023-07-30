import * as core from '@actions/core'
import {v4 as uuid} from 'uuid'
import {getConfig, DispatchMethod} from './action'
import * as api from './api'

const DISTINCT_ID = uuid()

async function run(): Promise<void> {
  try {
    const config = getConfig()
    api.init(config)

    let workflowId: number
    // Get the workflow ID if give a string
    if (typeof config.workflow === 'string') {
      core.info(`Fetching Workflow ID for ${config.workflow}...`)
      workflowId = await api.getWorkflowId(config.workflow)
      core.info(`Fetched Workflow ID: ${workflowId}`)
    } else {
      workflowId = config.workflow
    }

    // Dispatch the action
    if (config.dispatchMethod === DispatchMethod.WorkflowDispatch) {
      await api.workflowDispatch(DISTINCT_ID)
    } else {
      await api.repositoryDispatch(DISTINCT_ID)
    }
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
