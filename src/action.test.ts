import * as core from '@actions/core'
import {
  jest,
  expect,
  test,
  describe,
  beforeEach,
  afterEach
} from '@jest/globals'
import {getConfig} from './action'
import {ActionConfig, DispatchMethod} from './action.types'

jest.mock('@actions/core')

describe('Action', () => {
  const workflowInputs = {
    hello: 'world'
  }

  describe('getConfig', () => {
    let mockEnvConfig: any

    beforeEach(() => {
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
          case 'token':
            return mockEnvConfig.token
          default:
            throw new Error('invalid input requested')
        }
      })

      jest
        .spyOn(core, 'getBooleanInput')
        .mockImplementation((input: string) => {
          switch (input) {
            case 'discover':
              return mockEnvConfig.discover
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
        mockEnvConfig = {
          dispatchMethod: 'workflow_dispatch',
          eventType: '',
          repo: 'repository',
          owner: 'owner',
          ref: 'feature_branch',
          workflow: 'workflow.yml',
          workflowInputs: JSON.stringify(workflowInputs),
          discoverTimeoutSeconds: '60',
          token: 'token',
          discover: false
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
      })

      test('Should throw an error if a ref is not provided', () => {
        mockEnvConfig.ref = ''

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if an event-type is provided', () => {
        mockEnvConfig.eventType = 'deploy'

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if no workflow is provided', () => {
        mockEnvConfig.workflow = ''

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if workflowInputs contains a non-string value', () => {
        mockEnvConfig.workflowInputs = JSON.stringify({
          hello: false
        })
        expect(() => getConfig()).toThrowError()

        mockEnvConfig.workflowInputs = JSON.stringify({
          hello: 0
        })
        expect(() => getConfig()).toThrowError()
      })

      test('Should have a number for a workflow when given a workflow ID', () => {
        mockEnvConfig.workflow = '123456'
        const config: ActionConfig = getConfig()

        expect(config.workflow).toStrictEqual(123456)
      })
    })

    describe('repositoryDispatch', () => {
      beforeEach(() => {
        mockEnvConfig = {
          dispatchMethod: 'repository_dispatch',
          eventType: 'deploy',
          repo: 'repository',
          owner: 'owner',
          ref: '',
          workflow: '',
          workflowInputs: JSON.stringify(workflowInputs),
          discoverTimeoutSeconds: '60',
          token: 'token',
          discover: false
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
        mockEnvConfig.ref = 'feature_branch'

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if no event-type is provided', () => {
        mockEnvConfig.eventType = ''

        expect(() => getConfig()).toThrowError()
      })

      test('Should throw an error if a workflow is provided', () => {
        mockEnvConfig.workflow = 'workflow.yml'

        expect(() => getConfig()).toThrowError()
      })
    })

    describe('common', () => {
      beforeEach(() => {
        mockEnvConfig = {
          dispatchMethod: 'workflow_dispatch',
          eventType: '',
          repo: 'repository',
          owner: 'owner',
          ref: 'feature_branch',
          workflow: 'workflow.yml',
          workflowInputs: JSON.stringify(workflowInputs),
          discoverTimeoutSeconds: '60',
          token: 'token',
          discover: false
        }
      })

      test('Should throw if unsuported dispatch method is provided', () => {
        mockEnvConfig.dispatchMethod = 'unsupported_dispatch_method'

        expect(() => getConfig()).toThrowError()
      })

      test('Should return an empty client payload if none is supplied', () => {
        mockEnvConfig.workflowInputs = ''
        const config: ActionConfig = getConfig()

        expect(config.workflowInputs).toStrictEqual({})
      })

      test('Should throw if invalid workflow inputs JSON is provided', () => {
        mockEnvConfig.workflowInputs = '{'

        expect(() => getConfig()).toThrowError()
      })
    })
  })
})
