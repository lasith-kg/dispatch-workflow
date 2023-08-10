import * as core from '@actions/core'
import {WorkflowRun} from './api.types'

function getBranchNameFromHeadRef(ref: string): string | undefined {
  const refItems = ref.split(/\/?refs\/heads\//)
  if (refItems.length > 1 && refItems[1].length > 0) {
    return refItems[1]
  }
}

function isTagRef(ref: string): boolean {
  return new RegExp(/\/?refs\/tags\//).test(ref)
}

export function getBranchNameFromRef(ref?: string): string | undefined {
  if (!ref) {
    return undefined
  }

  if (isTagRef(ref)) {
    core.debug(`Unable to filter branch, unsupported ref: ${ref}`)
    return undefined
  }

  /**
   * Worst case scenario: return original ref if getBranchNameFromHeadRef
   * cannot extract a valid branch name. This is to allow valid ref
   * like 'main' to be supported by this function. The implication of this
   * is that malformed ref like 'refs/heads/' are pass through this function
   * undetected.
   *
   * We could introduce an external third party call to validate
   * the authenticity of the branch name, but this requires additional permissions
   * for workflow_dispatch: [actions:write -> contents:read + actions:write]
   *
   * This would be a neglibile issue for repository_dispatch as it already has
   * [contents:write] permissions
   */
  return getBranchNameFromHeadRef(ref) || ref
}

export function getDispatchedWorkflowRun(
  workflowRuns: WorkflowRun[],
  distinctID: string
): WorkflowRun {
  const dispatchedWorkflow = workflowRuns.find(workflowRun =>
    new RegExp(distinctID).test(workflowRun.name)
  )
  if (dispatchedWorkflow) {
    return dispatchedWorkflow
  }
  throw new Error(
    'getDispatchedWorkflowRun: Failed to find dispatched workflow'
  )
}
