import * as core from '@actions/core'

const WORKFLOW_TIMEOUT_SECONDS = 5 * 60

/**
 * action.yml definition.
 */
export interface ActionConfig {
  /**
   * The method that will be used for dispatching GitHub workflows: repository_dispatch,
   * workflow_dispatch
   */
  dispatchMethod: DispatchMethod

  /**
   * Repository of the workflow to dispatch
   */
  repo: string

  /**
   * Owner of the given repository.
   */
  owner: string

  /**
   * GitHub API token for making requests.
   */
  token: string

  /**
   * If the selected method is workflow_dispatch, the git reference for the workflow.
   * The reference can be a branch or tag name.
   */
  ref?: string

  /**
   * If the selected dispatch method is workflow_dispatch, the ID or the workflow file name to dispatch
   */
  workflow?: string | number

  /**
   * If the selected dispatch method is repository_dispatch, what event type will be triggered
   * in the repository.
   */
  eventType?: string

  /**
   * A JSON object that contains extra information that will be provided to the dispatch call
   */
  workflowInputs: ActionWorkflowInputs

  /**
   * A flag to enable the discovery of the Run ID from the dispatched workflow.
   */
  discover: boolean

  /**
   * Time until giving up on the discovery of the dispatched workflow and corresponding Run ID
   */
  discoverTimeoutSeconds: number
}

interface ActionWorkflowInputs {
  [input: string]: string
}

export enum DispatchMethod {
  RepositoryDispatch = 'repository_dispatch',
  WorkflowDispatch = 'workflow_dispatch'
}

export enum ActionOutputs {
  RunId = 'run-id',
  RunUrl = 'run-url'
}

function getNumberFromValue(value: string): number | undefined {
  if (value === '') {
    return undefined
  }

  try {
    const num = parseInt(value)
    if (isNaN(num)) {
      throw new Error('Parsed value is NaN')
    }
    return num
  } catch {
    return undefined
  }
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
    core.error('Failed to parse workflow_inputs JSON')
    if (error instanceof Error) {
      error.stack && core.debug(error.stack)
    }
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
    core.error(`Failed to parse dispatch-method`)
    if (error instanceof Error) {
      error.stack && core.debug(error.stack)
    }
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
    core.error(`Failed to parse ref`)
    if (error instanceof Error) {
      error.stack && core.debug(error.stack)
    }
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
    core.error(`Failed to parse event-type`)
    if (error instanceof Error) {
      error.stack && core.debug(error.stack)
    }
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
    core.error(`Failed to parse workflow`)
    if (error instanceof Error) {
      error.stack && core.debug(error.stack)
    }
    throw error
  }

  if (dispatchMethod === DispatchMethod.WorkflowDispatch) {
    return getNumberFromValue(workflow) || workflow
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
    discoverTimeoutSeconds:
      getNumberFromValue(core.getInput('discover-timeout-seconds')) ||
      WORKFLOW_TIMEOUT_SECONDS
  }
}
