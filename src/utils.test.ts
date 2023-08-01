import {describe, expect, it, jest} from '@jest/globals'
import {getBranchNameFromRef} from './utils'

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
})
