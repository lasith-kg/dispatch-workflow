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
}

export interface ActionWorkflowInputs {
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
