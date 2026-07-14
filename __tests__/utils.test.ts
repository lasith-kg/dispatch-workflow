/**
 * Unit tests for the action's utilities, src/utils/index.ts
 *
 * To mock dependencies in ESM, mocks are declared via jest.unstable_mockModule
 * before the module being tested is imported dynamically.
 */
import { describe, expect, it, jest } from '@jest/globals'
import { randomUUID } from 'node:crypto'
import * as core from '../__fixtures__/core.js'
import type { WorkflowRun } from '../src/api/api.types.js'

jest.unstable_mockModule('@actions/core', () => core)

const { getBranchNameFromRef, getDispatchedWorkflowRun } =
  await import('../src/utils/index.js')

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
    const distinctId = randomUUID()

    it('should return the dispatched workflow run', () => {
      const mockWorkflowRuns: WorkflowRun[] = [
        {
          id: 0,
          name: `${mockWorkflowName} [${distinctId}]`,
          htmlUrl: 'http://github.com/0'
        },
        {
          id: 1,
          name: `${mockWorkflowName} [${randomUUID()}]`,
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
          name: `${mockWorkflowName} [${randomUUID()}]`,
          htmlUrl: 'http://github.com/1'
        }
      ]
      expect(() =>
        getDispatchedWorkflowRun(mockWorkflowRuns, distinctId)
      ).toThrow()
    })

    it('should throw an error if no workflow runs are provided', () => {
      const mockWorkflowRuns: WorkflowRun[] = []
      expect(() =>
        getDispatchedWorkflowRun(mockWorkflowRuns, distinctId)
      ).toThrow()
    })
  })
})
