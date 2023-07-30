import * as core from '@actions/core'
import * as github from '@actions/github'
import {v4 as uuid} from 'uuid'
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'
import {workflowDispatch, getWorkflowId, init, repositoryDispatch} from './api'

jest.mock('@actions/core')

interface MockResponse {
  data: any
  status: number
}

const mockOctokit = {
  rest: {
    actions: {
      createWorkflowDispatch: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      },
      listRepoWorkflows: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      }
    },
    repos: {
      createDispatchEvent: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      }
    }
  }
}

describe('API', () => {
  const workflowInputs = {
    placeholder: 'placeholder'
  }

  let mockEnvConfig: any

  beforeEach(() => {
    mockEnvConfig = {
      dispatchMethod: 'workflow_dispatch',
      eventType: '',
      repo: 'repository',
      owner: 'owner',
      ref: 'feature_branch',
      workflow: 'workflow.yml',
      workflowInputs: JSON.stringify(workflowInputs),
      workflowTimeoutSeconds: '60',
      token: 'token',
      exportRunId: false
    }

    jest.spyOn(core, 'getInput').mockImplementation((input: string) => {
      switch (input) {
        case 'dispatch-method':
          return mockEnvConfig.dispatchMethod
        case 'event-type':
          return mockEnvConfig.eventType
        case 'repo':
          return mockEnvConfig.repo
        case 'owner':
          return mockEnvConfig.owner
        case 'ref':
          return mockEnvConfig.ref
        case 'workflow':
          return mockEnvConfig.workflow
        case 'workflow-inputs':
          return mockEnvConfig.workflowInputs
        case 'workflow-timeout-seconds':
          return mockEnvConfig.workflowTimeoutSeconds
        case 'token':
          return mockEnvConfig.token
        default:
          throw new Error('invalid input requested')
      }
    })

    jest.spyOn(core, 'getBooleanInput').mockImplementation((input: string) => {
      switch (input) {
        case 'export-run-id':
          return mockEnvConfig.exportRunId
        default:
          throw new Error('invalid input requested')
      }
    })

    jest.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit as any)
    init()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('workflowDispatch', () => {
    it('should resolve after a successful dispatch', async () => {
      jest
        .spyOn(mockOctokit.rest.actions, 'createWorkflowDispatch')
        .mockReturnValue(
          Promise.resolve({
            data: undefined,
            status: 204
          })
        )

      await workflowDispatch('')
    })

    it('should throw if a non-204 status is returned', async () => {
      const errorStatus = 401
      jest
        .spyOn(mockOctokit.rest.actions, 'createWorkflowDispatch')
        .mockReturnValue(
          Promise.resolve({
            data: undefined,
            status: errorStatus
          })
        )

      await expect(workflowDispatch('')).rejects.toThrow(
        `Failed to dispatch action, expected 204 but received ${errorStatus}`
      )
    })

    it('should dispatch with a distinctId in the inputs', async () => {
      const distinctId = uuid()
      let dispatchedId = ''
      jest
        .spyOn(mockOctokit.rest.actions, 'createWorkflowDispatch')
        .mockImplementation(async (req?: any) => {
          dispatchedId = req.inputs.distinct_id

          return {
            data: undefined,
            status: 204
          }
        })

      await workflowDispatch(distinctId)
      expect(dispatchedId).toStrictEqual(distinctId)
    })
  })

  describe('repositoryDispatch', () => {
    it('should resolve after a successful dispatch', async () => {
      jest.spyOn(mockOctokit.rest.repos, 'createDispatchEvent').mockReturnValue(
        Promise.resolve({
          data: undefined,
          status: 204
        })
      )

      await repositoryDispatch('')
    })

    it('should throw if a non-204 status is returned', async () => {
      const errorStatus = 422
      jest.spyOn(mockOctokit.rest.repos, 'createDispatchEvent').mockReturnValue(
        Promise.resolve({
          data: undefined,
          status: errorStatus
        })
      )

      await expect(repositoryDispatch('')).rejects.toThrow(
        `Failed to dispatch action, expected 204 but received ${errorStatus}`
      )
    })

    it('should dispatch with a distinctId in the inputs', async () => {
      const distinctId = uuid()
      let dispatchedId = ''
      jest
        .spyOn(mockOctokit.rest.repos, 'createDispatchEvent')
        .mockImplementation(async (req?: any) => {
          dispatchedId = req.client_payload.distinct_id

          return {
            data: undefined,
            status: 204
          }
        })

      await repositoryDispatch(distinctId)
      expect(dispatchedId).toStrictEqual(distinctId)
    })
  })

  describe('getWorkflowId', () => {
    it('should return the workflow ID for a given workflow filename', async () => {
      const mockData = {
        total_count: 3,
        workflows: [
          {
            id: 0,
            path: '.github/workflows/cake.yml'
          },
          {
            id: 1,
            path: '.github/workflows/pie.yml'
          },
          {
            id: 2,
            path: '.github/workflows/slice.yml'
          }
        ]
      }
      jest.spyOn(mockOctokit.rest.actions, 'listRepoWorkflows').mockReturnValue(
        Promise.resolve({
          data: mockData,
          status: 200
        })
      )

      expect(await getWorkflowId('slice.yml')).toStrictEqual(
        mockData.workflows[2].id
      )
    })

    it('should throw if a non-200 status is returned', async () => {
      const errorStatus = 401
      jest.spyOn(mockOctokit.rest.actions, 'listRepoWorkflows').mockReturnValue(
        Promise.resolve({
          data: undefined,
          status: errorStatus
        })
      )

      await expect(getWorkflowId('implode')).rejects.toThrow(
        `Failed to get workflows, expected 200 but received ${errorStatus}`
      )
    })

    it('should throw if a given workflow name cannot be found in the response', async () => {
      const workflowName = 'slice'
      jest.spyOn(mockOctokit.rest.actions, 'listRepoWorkflows').mockReturnValue(
        Promise.resolve({
          data: {
            total_count: 0,
            workflows: []
          },
          status: 200
        })
      )

      await expect(getWorkflowId(workflowName)).rejects.toThrow(
        `Unable to find ID for Workflow: ${workflowName}`
      )
    })
  })
})
