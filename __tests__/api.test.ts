/**
 * Unit tests for the action's GitHub API layer, src/api/index.ts
 *
 * To mock dependencies in ESM, mocks are declared via jest.unstable_mockModule
 * before the module being tested is imported dynamically.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { randomUUID } from 'node:crypto'
import * as core from '../__fixtures__/core.js'
import * as github from '../__fixtures__/github.js'
import type { ActionConfig } from '../src/action/action.types.js'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)

const {
  workflowDispatch,
  getWorkflowId,
  init,
  repositoryDispatch,
  getDefaultBranch,
  getWorkflowRuns
} = await import('../src/api/index.js')
const { DispatchMethod, ExponentialBackoff } =
  await import('../src/action/index.js')

interface MockResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  status: number
}

const mockOctokit = {
  rest: {
    actions: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      createWorkflowDispatch: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      listRepoWorkflows: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      listWorkflowRuns: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      listWorkflowRunsForRepo: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      }
    },
    repos: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      get: async (_req?: any): Promise<MockResponse> => {
        throw new Error('Should be mocked')
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
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

  let mockActionConfig: ActionConfig

  beforeEach(() => {
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

    github.getOctokit.mockReturnValue(
      mockOctokit as unknown as ReturnType<typeof github.getOctokit>
    )
    init(mockActionConfig)
  })

  describe('workflowDispatch', () => {
    beforeEach(() => {
      mockActionConfig.dispatchMethod = DispatchMethod.WorkflowDispatch
      mockActionConfig.workflow = 'workflow.yml'
      mockActionConfig.eventType = ''
      mockActionConfig.ref = 'feature_branch'
      init(mockActionConfig)
    })

    // When createWorkflowDispatch API (version `2022-11-28`) is invoked with the `return_run_details: true`,
    // it returns a 200 status code with the body of the response containing the ID of the dispatched workflow.
    // Documentation: https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#create-a-workflow-dispatch-event
    it('should return the dispatched workflow run details after a successful dispatch with a 200 status', async () => {
      const mockData = {
        workflow_run_id: 123456789,
        run_url:
          'https://api.github.com/repos/owner/repository/actions/runs/123456789',
        html_url: 'https://github.com/owner/repository/actions/runs/123456789'
      }
      jest
        .spyOn(mockOctokit.rest.actions, 'createWorkflowDispatch')
        .mockReturnValue(
          Promise.resolve({
            data: mockData,
            status: 200
          })
        )

      expect(await workflowDispatch()).toStrictEqual({
        id: mockData.workflow_run_id,
        htmlUrl: mockData.html_url
      })
    })

    it('should throw if a non-200 status is returned', async () => {
      const errorStatus = 401
      jest
        .spyOn(mockOctokit.rest.actions, 'createWorkflowDispatch')
        .mockReturnValue(
          Promise.resolve({
            data: undefined,
            status: errorStatus
          })
        )

      await expect(workflowDispatch()).rejects.toThrow(
        `Failed to dispatch action, expected 200 but received ${errorStatus}`
      )
    })

    // Regression test: returning run details currently requires explicitly passing `return_run_details: true`. From the
    // `2026-03-10` API version onwards this becomes the default behaviour and the flag no longer needs to be passed, so
    // this test can be removed once we adopt that API version.
    it('should pass return_run_details in the request', async () => {
      let returnRunDetails: boolean | undefined
      jest
        .spyOn(mockOctokit.rest.actions, 'createWorkflowDispatch')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(async (req?: any) => {
          returnRunDetails = req.return_run_details

          return {
            data: {
              workflow_run_id: 123456789,
              run_url:
                'https://api.github.com/repos/owner/repository/actions/runs/123456789',
              html_url:
                'https://github.com/owner/repository/actions/runs/123456789'
            },
            status: 200
          }
        })

      await workflowDispatch()
      expect(returnRunDetails).toStrictEqual(true)
    })

    it('should throw if workflowDispatch is invoked without workflow configured', async () => {
      mockActionConfig.workflow = ''
      init(mockActionConfig)

      await expect(workflowDispatch()).rejects.toThrow(
        `An input to 'workflow' was not provided`
      )
    })

    it('should throw if workflowDispatch is invoked without ref configured', async () => {
      mockActionConfig.ref = ''
      init(mockActionConfig)

      await expect(workflowDispatch()).rejects.toThrow(
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
      const distinctId = randomUUID()
      let dispatchedId: string | undefined
      jest
        .spyOn(mockOctokit.rest.repos, 'createDispatchEvent')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      const distinctId = randomUUID()
      let dispatchedId: string | undefined
      jest
        .spyOn(mockOctokit.rest.repos, 'createDispatchEvent')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // getWorkflowRuns discovery is only reachable for repository_dispatch. workflow_dispatch obtains the run details
  // directly from the createWorkflowDispatch response, so it never lists workflow runs.
  describe('getWorkflowRuns', () => {
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
      const mockData = {
        workflow_runs: [
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
      }

      jest
        .spyOn(mockOctokit.rest.actions, 'listWorkflowRunsForRepo')
        .mockReturnValue(
          Promise.resolve({
            data: mockData,
            status: 200
          })
        )

      const workflowRuns = await getWorkflowRuns()
      expect(workflowRuns.length).toStrictEqual(mockData.workflow_runs.length)
    })

    it('should throw if a non-200 status is returned', async () => {
      const errorStatus = 404

      jest
        .spyOn(mockOctokit.rest.actions, 'listWorkflowRunsForRepo')
        .mockReturnValue(
          Promise.resolve({
            data: undefined,
            status: errorStatus
          })
        )

      await expect(getWorkflowRuns()).rejects.toThrow(
        `Failed to get workflow runs, expected 200 but received ${errorStatus}`
      )
    })
  })
})
