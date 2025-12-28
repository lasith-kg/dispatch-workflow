import * as core from '@actions/core'
import {
  jest,
  expect,
  test,
  describe,
  beforeEach,
  afterEach
} from '@jest/globals'
import {getBackoffOptions, getConfig} from '.'
import {ActionConfig, DispatchMethod, ExponentialBackoff} from './action.types'

jest.mock('@actions/core')

describe('Action', () => {
  const workflowInputs = {
    hello: 'world'
  }

  describe('getConfig', () => {
    let mockGitHubConfig: any

    beforeEach(() => {
      jest.spyOn(core, 'getInput').mockImplementation((input: string) => {
        switch (input) {
          case 'dispatch-method':
            return mockGitHubConfig.dispatchMethod
          case 'event-type':
            return mockGitHubConfig.eventType
          case 'repo':
            return mockGitHubConfig.repo
          case 'owner':
            return mockGitHubConfig.owner
          case 'ref':
            return mockGitHubConfig.ref
          case 'workflow':
            return mockGitHubConfig.workflow
          case 'workflow-inputs':
            return mockGitHubConfig.workflowInputs
          case 'token':
            return mockGitHubConfig.token
          case 'starting-delay-ms':
            return mockGitHubConfig.startingDelay
          case 'max-attempts':
            return mockGitHubConfig.maxAttempts
          case 'time-multiple':
            return mockGitHubConfig.timeMultiple
          default:
            throw new Error('invalid input requested')
        }
      })

      jest
        .spyOn(core, 'getBooleanInput')
        .mockImplementation((input: string) => {
          switch (input) {
            case 'discover':
              return mockGitHubConfig.discover
            default:
              throw new Error('invalid input requested')
          }
        })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    describe('workflowDispatch', () => {
      beforeEach(() => {
        mockGitHubConfig = {
          dispatchMethod: 'workflow_dispatch',
          eventType: '',
          repo: 'repository',
          owner: 'owner',
          ref: 'feature_branch',
          workflow: 'workflow.yml',
          workflowInputs: JSON.stringify(workflowInputs),
          token: 'token',
          discover: false,
          startingDelay: '100',
          maxAttempts: '5',
          timeMultiple: '2'
        }
      })

      test('Should return a valid config', () => {
        const config: ActionConfig = getConfig()

        expect(config.dispatchMethod).toStrictEqual(
          DispatchMethod.WorkflowDispatch
        )
        expect(config.eventType).toBeUndefined()
        expect(config.repo).toStrictEqual('repository')
        expect(config.owner).toStrictEqual('owner')
        expect(config.ref).toStrictEqual('feature_branch')
        expect(config.workflow).toStrictEqual('workflow.yml')
        expect(config.workflowInputs).toStrictEqual(workflowInputs)
        expect(config.token).toStrictEqual('token')
        expect(config.discover).toStrictEqual(false)
        expect(config.startingDelay).toStrictEqual(100)
        expect(config.maxAttempts).toStrictEqual(5)
        expect(config.timeMultiple).toStrictEqual(2)
      })

      test('Should throw an error if a ref is not provided', () => {
        mockGitHubConfig.ref = ''

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if an event-type is provided', () => {
        mockGitHubConfig.eventType = 'deploy'

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if no workflow is provided', () => {
        mockGitHubConfig.workflow = ''

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if workflowInputs contains a non-string value', () => {
        mockGitHubConfig.workflowInputs = JSON.stringify({
          hello: false
        })
        expect(() => getConfig()).toThrowError()

        mockGitHubConfig.workflowInputs = JSON.stringify({
          hello: 0
        })
        expect(() => getConfig()).toThrowError()
      })

      test('Should have a number for a workflow when given a workflow ID', () => {
        mockGitHubConfig.workflow = '123456'
        const config: ActionConfig = getConfig()

        expect(config.workflow).toStrictEqual(123456)
      })

      test('Should treat workflow filename starting with a number as a string, not a workflow ID', () => {
        mockGitHubConfig.workflow = '1-release.yaml'
        const config: ActionConfig = getConfig()

        expect(config.workflow).toStrictEqual('1-release.yaml')
      })
    })

    describe('repositoryDispatch', () => {
      beforeEach(() => {
        mockGitHubConfig = {
          dispatchMethod: 'repository_dispatch',
          eventType: 'deploy',
          repo: 'repository',
          owner: 'owner',
          ref: '',
          workflow: '',
          workflowInputs: JSON.stringify(workflowInputs),
          token: 'token',
          discover: false,
          startingDelay: '100',
          maxAttempts: '5',
          timeMultiple: '2'
        }
      })

      test('Should return a valid config', () => {
        const config: ActionConfig = getConfig()

        expect(config.dispatchMethod).toStrictEqual(
          DispatchMethod.RepositoryDispatch
        )
        expect(config.eventType).toStrictEqual('deploy')
        expect(config.repo).toStrictEqual('repository')
        expect(config.owner).toStrictEqual('owner')
        expect(config.ref).toBeUndefined()
        expect(config.workflow).toBeUndefined()
        expect(config.workflowInputs).toStrictEqual(workflowInputs)
        expect(config.token).toStrictEqual('token')
        expect(config.discover).toStrictEqual(false)
      })

      test('Should throw an error if a ref is provided', () => {
        mockGitHubConfig.ref = 'feature_branch'

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if no event-type is provided', () => {
        mockGitHubConfig.eventType = ''

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if a workflow is provided', () => {
        mockGitHubConfig.workflow = 'workflow.yml'

        expect(() => getConfig()).toThrowError()
      })
    })

    describe('common', () => {
      beforeEach(() => {
        mockGitHubConfig = {
          dispatchMethod: 'workflow_dispatch',
          eventType: '',
          repo: 'repository',
          owner: 'owner',
          ref: 'feature_branch',
          workflow: 'workflow.yml',
          workflowInputs: JSON.stringify(workflowInputs),
          token: 'token',
          discover: false,
          startingDelay: '100',
          maxAttempts: '5',
          timeMultiple: '2'
        }
      })

      test('Should throw if unsuported dispatch method is provided', () => {
        mockGitHubConfig.dispatchMethod = 'unsupported_dispatch_method'

        expect(() => getConfig()).toThrowError()
      })

      test('Should return an empty client payload if none is supplied', () => {
        mockGitHubConfig.workflowInputs = ''
        const config: ActionConfig = getConfig()

        expect(config.workflowInputs).toStrictEqual({})
      })

      test('Should throw if invalid workflow inputs JSON is provided', () => {
        mockGitHubConfig.workflowInputs = '{'

        expect(() => getConfig()).toThrowError()
      })

      test('Should fall back on default starting delay, if non-numeric value is provided', () => {
        mockGitHubConfig.startingDelay = 'non-numeric-input'
        const config: ActionConfig = getConfig()
        expect(config.startingDelay).toStrictEqual(
          ExponentialBackoff.StartingDelay
        )
      })

      test('Should fall back on default max attempts, if non-numeric value is provided', () => {
        mockGitHubConfig.maxAttempts = 'non-numeric-input'
        const config: ActionConfig = getConfig()
        expect(config.maxAttempts).toStrictEqual(ExponentialBackoff.MaxAttempts)
      })

      test('Should fall back on default time multiple, if non-numeric value is provided', () => {
        mockGitHubConfig.timeMultiple = 'non-numeric-input'
        const config: ActionConfig = getConfig()
        expect(config.timeMultiple).toStrictEqual(
          ExponentialBackoff.TimeMultiple
        )
      })
    })
  })

  describe('getBackoffOptions', () => {
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
    })

    test('Get backoff options from action config', () => {
      const backoffOptions = getBackoffOptions(mockActionConfig)
      expect(backoffOptions.startingDelay).toStrictEqual(
        ExponentialBackoff.StartingDelay
      )
      expect(backoffOptions.numOfAttempts).toStrictEqual(
        ExponentialBackoff.MaxAttempts
      )
      expect(backoffOptions.timeMultiple).toStrictEqual(
        ExponentialBackoff.TimeMultiple
      )
    })
  })
})
