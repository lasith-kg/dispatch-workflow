import * as core from '@actions/core'
import {getConfig} from './action'

async function run(): Promise<void> {
  try {
    const config = getConfig()
    core.info(JSON.stringify(config))
  } catch (error) {
    if (error instanceof Error) {
      core.error(`Failed to complete: ${error.message}`)
      core.warning('Does the token have the correct permissions?')
      error.stack && core.debug(error.stack)
      core.setFailed(error.message)
    }
  }
}

run()
