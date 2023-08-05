# GitHub Action for Dispatching Workflows

# Acknowledgements

This GitHub Action is a fork of [`codex-/return-dispatch`](https://github.com/Codex-/return-dispatch). This action supported the ability to extract a Run ID, but exclusively supported the `workflow_dispatch` method. I decided to fork this action as it had an intuitive code-base and excellent testing philosophy.

From a **compatibility** and **performance** perspective, this GitHub Action superseedes [`codex-/return-dispatch`](https://github.com/Codex-/return-dispatch), as it additionally supports the `repository_dispatch` method and uses a more efficient algorithm to extract the Run ID from a dispatched workflow

# Usage

## Workflow Dispatch

... Code Examples

## Repository Dispatch

... Code Examples

## Dicovery Mode

... Code Examples

# Permissions

... Markdown Table

# Inputs

| Name                       | Description                                                                                                                           | Required      | Default |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------- |
| `dispatch-method`          | The method that will be used for dispatching GitHub workflows: `repository_dispatch`, `workflow_dispatch`                             | `true`        |         |
| `repo`                     | Repository of the workflow to dispatch                                                                                                | `true`        |         |
| `owner`                    | Owner of the given repository                                                                                                         | `true`        |         |
| `token`                    | GitHub API token for making API requests                                                                                              | `true`        |         |
| `ref`                      | If the selected dispatch method is `workflow_dispatch`, the git reference for the workflow. The reference can be a branch or tag name | `conditional` |         |
| `workflow`                 | If the selected dispatch method is `workflow_dispatch`, the ID or the workflow file name to dispatch                                  | `conditional` |         |
| `event-type`               | If the selected dispatch method is `repository_dispatch`, what event type will be triggered in the repository.                        | `conditional` |         |
| `workflow-inputs`          | A JSON object that contains extra information that will be provided to the dispatch call                                              | `false`       | `'{}'`  |
| `discover`                 | A flag to enable the discovery of the Run ID from the dispatched workflow                                                             | `false`       | `false` |
| `discover-timeout-seconds` | Time until giving up on the discovery of the dispatched workflow and corresponding Run ID                                             | `false`       | `300`   |

# Outputs

... Markdown Table

# Workflow Inputs

Explain Limitations

# Flow

... Explanation of Algorithm
