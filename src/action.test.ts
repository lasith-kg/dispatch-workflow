import * as core from '@actions/core'
import {
  jest,
  expect,
  test,
  describe,
  beforeEach,
  afterEach
} from '@jest/globals'
import {ActionConfig, getConfig, DispatchMethod} from './action'

jest.mock('@actions/core')

describe('Action', () => {
  const workflowInputs = {
    hello: 'world'
  }

  describe('getConfig', () => {
    let mockEnvConfig: any

    beforeEach(() => {
      mockEnvConfig = {
        dispatchMethod: 'workflow_dispatch',
        eventType: '',
        repo: 'repository',
        owner: 'owner',
        ref: 'feature_branch',
        workflow: 'workflow',
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

      jest
        .spyOn(core, 'getBooleanInput')
        .mockImplementation((input: string) => {
          switch (input) {
            case 'export-run-id':
              return mockEnvConfig.exportRunId
            default:
              throw new Error('invalid input requested')
          }
        })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    test('Should return a valid config', () => {
      const config: ActionConfig = getConfig()

      expect(config.dispatchMethod).toStrictEqual(
        DispatchMethod.WorkflowDispatch
      )
      expect(config.eventType).toStrictEqual(undefined)
      expect(config.repo).toStrictEqual('repository')
      expect(config.owner).toStrictEqual('owner')
      expect(config.ref).toStrictEqual('feature_branch')
      expect(config.workflow).toStrictEqual('workflow')
      expect(config.workflowInputs).toStrictEqual(workflowInputs)
      expect(config.workflowTimeoutSeconds).toStrictEqual(60)
      expect(config.token).toStrictEqual('token')
      expect(config.exportRunId).toStrictEqual(false)
    })

    test('Should return a valid config for supported dispatch methods', () => {
      let config: ActionConfig

      mockEnvConfig.dispatchMethod = 'repository_dispatch'
      mockEnvConfig.eventType = 'deploy'
      mockEnvConfig.ref = ''
      config = getConfig()
      expect(config.dispatchMethod).toStrictEqual(
        DispatchMethod.RepositoryDispatch
      )
      expect(config.ref).toStrictEqual(undefined)

      mockEnvConfig.dispatchMethod = 'workflow_dispatch'
      mockEnvConfig.eventType = ''
      mockEnvConfig.ref = 'feature_branch'
      config = getConfig()
      expect(config.dispatchMethod).toStrictEqual(
        DispatchMethod.WorkflowDispatch
      )
      expect(config.ref).toStrictEqual('feature_branch')
    })

    test('Should throw if unsuported dispatch method is provided', () => {
      mockEnvConfig.dispatchMethod = 'unsupported_dispatch_method'

      expect(() => getConfig()).toThrowError()
    })

    test('Should throw an error if a ref is provided alongside the repository_dispatch method', () => {
      mockEnvConfig.dispatchMethod = 'repository_dispatch'
      mockEnvConfig.eventType = 'deploy'
      mockEnvConfig.ref = 'feature_branch'

      expect(() => getConfig()).toThrowError()
    })

    test('Should throw an error if no event-type is provided alongside the repository_dispatch method', () => {
      mockEnvConfig.dispatchMethod = 'repository_dispatch'
      mockEnvConfig.eventType = ''
      mockEnvConfig.ref = ''

      expect(() => getConfig()).toThrowError()
    })

    test('Should throw an error if a ref is not provided alongside the workflow_dispatch method', () => {
      mockEnvConfig.dispatchMethod = 'workflow_dispatch'
      mockEnvConfig.eventType = ''
      mockEnvConfig.ref = ''

      expect(() => getConfig()).toThrowError()
    })

    test('Should throw an error if an event-type is provided alongside the workflow_dispatch method', () => {
      mockEnvConfig.dispatchMethod = 'workflow_dispatch'
      mockEnvConfig.eventType = 'deploy'
      mockEnvConfig.ref = 'feature_branch'

      expect(() => getConfig()).toThrowError()
    })

    test('Should have a number for a workflow when given a workflow ID', () => {
      mockEnvConfig.workflow = '123456'
      const config: ActionConfig = getConfig()

      expect(config.workflow).toStrictEqual(123456)
    })

    test('Should provide a default workflow timeout if none is supplied', () => {
      mockEnvConfig.workflowTimeoutSeconds = ''
      const config: ActionConfig = getConfig()

      expect(config.workflowTimeoutSeconds).toStrictEqual(300)
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
