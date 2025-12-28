import * as core from '@actions/core'
import {
  ActionConfig,
  ActionWorkflowInputs,
  DispatchMethod,
  ExponentialBackoff
} from './action.types'
import {BackoffOptions} from 'exponential-backoff'

function getNumberFromValue(value: string): number | undefined {
  const num = parseFloat(value)
  return isNaN(num) ? undefined : num
}

function getWorkflowIdFromValue(value: string): number | undefined {
  // Only treat as a workflow ID if the entire string is a positive integer
  // This prevents filenames like "1-release.yaml" from being parsed as workflow ID 1
  if (!/^\d+$/.test(value)) {
    return undefined
  }
  const num = parseInt(value, 10)
  return isNaN(num) ? undefined : num
}

function getWorkflowInputs(
  dispatchMethod: DispatchMethod
): ActionWorkflowInputs {
  const workflowInputs = core.getInput('workflow-inputs')
  if (workflowInputs === '') {
    return {}
  }

  try {
    const parsedWorkflowInputs = JSON.parse(workflowInputs)

    if (dispatchMethod === DispatchMethod.RepositoryDispatch) {
      return parsedWorkflowInputs
    }

    for (const key in parsedWorkflowInputs) {
      if (typeof parsedWorkflowInputs[key] !== 'string') {
        throw new Error(`
For the workflow_dispatch method, the only supported value type is string
Key: ${key}
Current Type: ${typeof parsedWorkflowInputs[key]}
Expected Type: string
`)
      }
    }
    return parsedWorkflowInputs
  } catch (error) {
    core.error('Failed to parse input: workflow_inputs')
    throw error
  }
}

function getDispatchMethod(): DispatchMethod {
  const dispatchMethod = core.getInput('dispatch-method', {required: true})
  try {
    if (
      Object.values(DispatchMethod).includes(dispatchMethod as DispatchMethod)
    ) {
      return dispatchMethod as DispatchMethod
    } else {
      throw new Error(`
Allowed Values: [${Object.values(DispatchMethod).join(', ')}]
Current Value: ${dispatchMethod}
`)
    }
  } catch (error) {
    core.error(`Failed to parse input: dispatch-method`)
    throw error
  }
}

function getRef(dispatchMethod: DispatchMethod): string | undefined {
  const ref = core.getInput('ref')
  try {
    if (dispatchMethod === DispatchMethod.RepositoryDispatch && !!ref) {
      throw new Error(`
Currently the repository_dispatch method only supports dispatching workflows
from the default branch. Therefore, the 'ref' input is not supported and must be ignored.
The workflow_dispatch method supports dispatching workflows from non-default branches`)
    }
    if (dispatchMethod === DispatchMethod.WorkflowDispatch && !ref) {
      throw new Error(`
A valid git reference must be provided to the 'ref' input, if using the workflow_dispatch method.
Can be formatted as 'main' or 'refs/heads/main'`)
    }
  } catch (error) {
    core.error(`Failed to parse input: ref`)
    throw error
  }

  return ref || undefined
}

function getEventType(dispatchMethod: DispatchMethod): string | undefined {
  const eventType = core.getInput('event-type')
  try {
    if (dispatchMethod === DispatchMethod.RepositoryDispatch && !eventType) {
      throw new Error(`
An event-type must be provided to the 'event-type' input, if using the repository_dispatch method.`)
    }
    if (dispatchMethod === DispatchMethod.WorkflowDispatch && !!eventType) {
      throw new Error(`
The 'event-type' input is not supported for the workflow_dispatch method and must be ignored.`)
    }
  } catch (error) {
    core.error(`Failed to parse input: event-type`)
    throw error
  }

  return eventType || undefined
}

function getWorkflow(
  dispatchMethod: DispatchMethod
): string | number | undefined {
  const workflow = core.getInput('workflow')

  try {
    if (dispatchMethod === DispatchMethod.WorkflowDispatch && !workflow) {
      throw new Error(`
A workflow file name or ID must be provided to the 'workflow' input, if using the workflow_dispatch method`)
    }
    if (dispatchMethod === DispatchMethod.RepositoryDispatch && !!workflow) {
      throw new Error(`
The 'workflow' input is not supported for the repository_dispatch method and must be ignored.`)
    }
  } catch (error) {
    core.error(`Failed to parse input: workflow`)
    if (error instanceof Error) {
      error.stack && core.debug(error.stack)
    }
    throw error
  }

  if (dispatchMethod === DispatchMethod.WorkflowDispatch) {
    return getWorkflowIdFromValue(workflow) || workflow
  }
  return undefined
}

export function getConfig(): ActionConfig {
  const dispatchMethod = getDispatchMethod()

  return {
    dispatchMethod,
    repo: core.getInput('repo', {required: true}),
    owner: core.getInput('owner', {required: true}),
    token: core.getInput('token', {required: true}),
    ref: getRef(dispatchMethod),
    workflow: getWorkflow(dispatchMethod),
    eventType: getEventType(dispatchMethod),
    workflowInputs: getWorkflowInputs(dispatchMethod),
    discover: core.getBooleanInput('discover'),
    startingDelay:
      getNumberFromValue(core.getInput('starting-delay-ms')) ||
      ExponentialBackoff.StartingDelay,
    maxAttempts:
      getNumberFromValue(core.getInput('max-attempts')) ||
      ExponentialBackoff.MaxAttempts,
    timeMultiple:
      getNumberFromValue(core.getInput('time-multiple')) ||
      ExponentialBackoff.TimeMultiple
  }
}

export function getBackoffOptions(config: ActionConfig): BackoffOptions {
  return {
    timeMultiple: config.timeMultiple,
    numOfAttempts: config.maxAttempts,
    startingDelay: config.startingDelay
  }
}

export * from './action.types'
