import * as github from '@actions/github'
import {v4 as uuid} from 'uuid'
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'
import {
  workflowDispatch,
  getWorkflowId,
  init,
  repositoryDispatch,
  getDefaultBranch,
  getWorkflowRuns
} from '.'
import {ActionConfig, DispatchMethod, ExponentialBackoff} from '../action'
import {RequestError} from '@octokit/request-error'

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
      },
      listWorkflowRuns: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      },
      listWorkflowRunsForRepo: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      }
    },
    repos: {
      get: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      },
      createDispatchEvent: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      }
    }
  },
  paginate: async (_method: any, _params: any, _mapFn: any): Promise<any> => {
    throw new Error('Should be mocked')
  }
}

describe('API', () => {
  const workflowInputs = {
    placeholder: 'placeholder'
  }

  let startEpoch: number
  let mockActionConfig: ActionConfig

  beforeEach(() => {
    startEpoch = Date.now()

    mockActionConfig = {
      dispatchMethod: DispatchMethod.WorkflowDispatch,
      eventType: '',
      repo: 'repository',
      owner: 'owner',
      ref: 'feature_branch',
      workflow: 'workflow.yml',
      workflowInputs,
      token: 'token',
      discover: true,
      startingDelay: ExponentialBackoff.StartingDelay,
      maxAttempts: ExponentialBackoff.MaxAttempts,
      timeMultiple: ExponentialBackoff.TimeMultiple
    }

    jest.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit as any)
    init(mockActionConfig)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('workflowDispatch', () => {
    beforeEach(() => {
      mockActionConfig.dispatchMethod = DispatchMethod.WorkflowDispatch
      mockActionConfig.workflow = 'workflow.yml'
      mockActionConfig.eventType = ''
      mockActionConfig.ref = 'feature_branch'
      init(mockActionConfig)
    })

    it('should resolve after a successful dispatch', async () => {
      jest
        .spyOn(mockOctokit.rest.actions, 'createWorkflowDispatch')
        .mockReturnValue(
          Promise.resolve({
            headers: null,
            url: '',
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
      let dispatchedId: string | undefined
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

    it('should dispatch without a distinctId in the inputs if discover is set to false', async () => {
      mockActionConfig.discover = false
      init(mockActionConfig)

      const distinctId = uuid()
      let dispatchedId: string | undefined
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
      expect(dispatchedId).toBeUndefined()
    })

    it('should throw if workflowDispatch is invoked without workflow configured', async () => {
      mockActionConfig.workflow = ''
      init(mockActionConfig)

      await expect(workflowDispatch('')).rejects.toThrow(
        `An input to 'workflow' was not provided`
      )
    })

    it('should throw if workflowDispatch is invoked without ref configured', async () => {
      mockActionConfig.ref = ''
      init(mockActionConfig)

      await expect(workflowDispatch('')).rejects.toThrow(
        `An input to 'ref' was not provided`
      )
    })
  })

  describe('repositoryDispatch', () => {
    beforeEach(() => {
      mockActionConfig.dispatchMethod = DispatchMethod.RepositoryDispatch
      mockActionConfig.workflow = ''
      mockActionConfig.eventType = 'deploy'
      mockActionConfig.ref = ''
      init(mockActionConfig)
    })

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
      let dispatchedId: string | undefined
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

    it('should dispatch without a distinctId in the inputs if discover is set to false', async () => {
      mockActionConfig.discover = false
      init(mockActionConfig)

      const distinctId = uuid()
      let dispatchedId: string | undefined
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
      expect(dispatchedId).toBeUndefined()
    })

    it('should throw if repositoryDispatch is invoked without an event-type configured', async () => {
      mockActionConfig.eventType = ''
      init(mockActionConfig)

      await expect(repositoryDispatch('')).rejects.toThrow(
        `An input to 'event-type' was not provided`
      )
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

  describe('getDefaultBranch', () => {
    it('should return the default branch for a given repository', async () => {
      jest.spyOn(mockOctokit.rest.repos, 'get').mockReturnValue(
        Promise.resolve({
          data: {
            default_branch: 'main'
          },
          status: 200
        })
      )

      expect(await getDefaultBranch()).toStrictEqual('main')
    })

    it('should throw if a non-200 status is returned', async () => {
      const errorStatus = 404
      jest.spyOn(mockOctokit.rest.repos, 'get').mockReturnValue(
        Promise.resolve({
          data: undefined,
          status: errorStatus
        })
      )

      await expect(getDefaultBranch()).rejects.toThrow(
        `Failed to get repository information, expected 200 but received ${errorStatus}`
      )
    })
  })

  describe('getWorkflowRuns', () => {
    describe('workflowDispatch', () => {
      beforeEach(() => {
        mockActionConfig.dispatchMethod = DispatchMethod.WorkflowDispatch
        mockActionConfig.workflow = 'workflow.yml'
        mockActionConfig.eventType = ''
        mockActionConfig.ref = 'refs/heads/feature_branch'
        init(mockActionConfig)
      })

      it('should return the workflow runs for a valid configuration', async () => {
        const mockData = [
          {
            id: 0,
            name: 'Apple',
            html_url: 'http://github.com/0'
          },
          {
            id: 1,
            html_url: 'http://github.com/1'
          }
        ]

        jest
          .spyOn(mockOctokit, 'paginate')
          .mockImplementation(async (method, _params, _mapFn) => {
            if (method === mockOctokit.rest.actions.listWorkflowRuns) {
              return mockData
            }
            throw new Error(`Unexpected paginate call, got ${method}`)
          })

        const workflowRuns = await getWorkflowRuns(startEpoch)
        expect(workflowRuns.length).toStrictEqual(mockData.length)
      })

      it('should return the workflow runs for a tags ref', async () => {
        mockActionConfig.ref = 'refs/tags/v1.0.0'
        init(mockActionConfig)

        const mockData = [
          {
            id: 0,
            name: 'Apple',
            html_url: 'http://github.com/0'
          },
          {
            id: 1,
            html_url: 'http://github.com/1'
          }
        ]

        jest
          .spyOn(mockOctokit, 'paginate')
          .mockImplementation(async (method, _params, _mapFn) => {
            if (method === mockOctokit.rest.actions.listWorkflowRuns) {
              return mockData
            }
            throw new Error(`Unexpected paginate call, got ${method}`)
          })

        const workflowRuns = await getWorkflowRuns(startEpoch)
        expect(workflowRuns.length).toStrictEqual(mockData.length)
      })

      it('should throw if getWorkflowRuns is invoked without a workflow configured', async () => {
        mockActionConfig.workflow = ''
        init(mockActionConfig)

        await expect(getWorkflowRuns(startEpoch)).rejects.toThrow(
          `An input to 'workflow' was not provided`
        )
      })
    })

    describe('repositoryDispatch', () => {
      beforeEach(() => {
        mockActionConfig.dispatchMethod = DispatchMethod.RepositoryDispatch
        mockActionConfig.workflow = ''
        mockActionConfig.eventType = 'deploy'
        mockActionConfig.ref = ''
        init(mockActionConfig)

        jest.spyOn(mockOctokit.rest.repos, 'get').mockReturnValue(
          Promise.resolve({
            data: {
              default_branch: 'main'
            },
            status: 200
          })
        )
      })

      it('should return the workflow runs for a valid configuration', async () => {
        const mockData = [
          {
            id: 0,
            name: 'Apple',
            html_url: 'http://github.com/0'
          },
          {
            id: 1,
            html_url: 'http://github.com/1'
          }
        ]

        jest
          .spyOn(mockOctokit, 'paginate')
          .mockImplementation(async (method, _params, _mapFn) => {
            if (method === mockOctokit.rest.actions.listWorkflowRunsForRepo) {
              return mockData
            }
            throw new Error(`Unexpected paginate call, got ${method}`)
          })

        const workflowRuns = await getWorkflowRuns(startEpoch)
        expect(workflowRuns.length).toStrictEqual(mockData.length)
      })
    })

    describe('common', () => {
      it('should throw if a non-200 status is returned', async () => {
        const errorStatus = 404

        jest
          .spyOn(mockOctokit, 'paginate')
          .mockImplementation(async (method, _params, _mapFn) => {
            if (method === mockOctokit.rest.actions.listWorkflowRuns) {
              throw new RequestError('Request failed', errorStatus, {
                request: {
                  method: 'GET',
                  url: 'https://api.github.com/foo',
                  headers: {}
                },
                response: {
                  status: 500,
                  url: 'https://api.github.com/foo',
                  headers: {},
                  data: []
                }
              })
            }
            throw new Error(`Unexpected paginate call, got ${method}`)
          })

        await expect(getWorkflowRuns(startEpoch)).rejects.toThrowError(
          `Expected 200 but received ${errorStatus}`
        )
      })
    })
  })
})
