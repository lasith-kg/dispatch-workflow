import {describe, expect, it, jest} from '@jest/globals'
import {getBranchNameFromRef, getDispatchedWorkflowRun} from '.'
import {v4 as uuid} from 'uuid'
import {WorkflowRun} from '../api'

jest.mock('@actions/core')

describe('utils', () => {
  describe('getBranchNameFromHeadRef', () => {
    it('should return the branch name for a valid branch ref', () => {
      const branchName = 'cool_feature'
      const ref = `/refs/heads/${branchName}`
      const branch = getBranchNameFromRef(ref)

      expect(branch).toStrictEqual(branchName)
    })

    it('should return the branch name for a valid branch ref without a leading slash', () => {
      const branchName = 'cool_feature'
      const ref = `refs/heads/${branchName}`
      const branch = getBranchNameFromRef(ref)

      expect(branch).toStrictEqual(branchName)
    })

    it('should return the malformed ref as a last ditch effort', () => {
      const branch = getBranchNameFromRef('refs/heads/')

      expect(branch).toStrictEqual('refs/heads/')
    })

    it('should return undefined if the ref is for a tag', () => {
      const branch = getBranchNameFromRef('refs/tags/v1.0.1')

      expect(branch).toBeUndefined()
    })

    it('should return undefined if the ref is for an invalid tag', () => {
      const branch = getBranchNameFromRef('refs/tags/')

      expect(branch).toBeUndefined()
    })

    it('should return undefined if the ref is an undefined value', () => {
      const branch = getBranchNameFromRef(undefined)

      expect(branch).toBeUndefined()
    })
  })

  describe('getDispatchedWorkflowRun', () => {
    const mockWorkflowName = 'Mock Workflow'
    const distinctId = uuid()

    it('should return the dispatched workflow run', () => {
      const mockWorkflowRuns: WorkflowRun[] = [
        {
          id: 0,
          name: `${mockWorkflowName} [${distinctId}]`,
          htmlUrl: 'http://github.com/0'
        },
        {
          id: 1,
          name: `${mockWorkflowName} [${uuid()}]`,
          htmlUrl: 'http://github.com/1'
        }
      ]
      const dispatchedWorkflowRun = getDispatchedWorkflowRun(
        mockWorkflowRuns,
        distinctId
      )

      expect(dispatchedWorkflowRun).toBeDefined()
      expect(dispatchedWorkflowRun.id).toStrictEqual(0)
      expect(dispatchedWorkflowRun.name).toContain(distinctId)
    })

    it('should throw an error if dispatched workflow is not found', () => {
      const mockWorkflowRuns: WorkflowRun[] = [
        {
          id: 1,
          name: `${mockWorkflowName} [${uuid()}]`,
          htmlUrl: 'http://github.com/1'
        }
      ]
      expect(() =>
        getDispatchedWorkflowRun(mockWorkflowRuns, distinctId)
      ).toThrowError()
    })

    it('should throw an error if no workflow runs are provided', () => {
      const mockWorkflowRuns: WorkflowRun[] = []
      expect(() =>
        getDispatchedWorkflowRun(mockWorkflowRuns, distinctId)
      ).toThrowError()
    })
  })
})
