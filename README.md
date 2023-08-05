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

Dispatching a Workflow requires an authenticated `GITHUB_TOKEN`. The required permissions for this `GITHUB_TOKEN` depends on the following factors...

- **Dispatch Method**: `repository_dispatch`, `workflow_dispatch`
- **Run ID Discovery**: Enabled, Disabled
- **Repository Visiblity**: Private, Public

## Generating a `GITHUB_TOKEN`

There are also multiple methods of generating `GITHUB_TOKEN`. If you are dispatching a workflow from the **current repository**, a **GitHub Actions Token** would be the most secure option. If you are dispatching a workflow to a **remote repository**, I would personally recommend a **GitHub App Token**. GitHub App Tokens are ephemeral (valid for 1 hour) and have fine grained access control over permissions and repositories. Additionally they are not bound to a particular developers identity, unlike a Personal Access Token.

- Fine Grained Tokens
  - [GitHub Actions Token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
  - [GitHub App Token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow)
  - [Personal Access Token 🆕](https://github.blog/2022-10-18-introducing-fine-grained-personal-access-tokens-for-github/)
- Personal Access Tokens (Classic)
  - I would **strongly** advise using this as they are not as secure as the fine-grained counterparts and can potentially be configured without an expiry time.

The below table shows the neccessary permissions for all the unique combinations of these factors. If using a Fine Grained Token, ensure that the permissions correspond to the repository that contains the workflow you are attempting to dispatch.

| Mode                               | Fine Grained Tokens                 | Personal Access Token (Classic)         |
| ---------------------------------- | ----------------------------------- | --------------------------------------- |
| `repository_dispatch`              | `contents: write`                   | Private: `repo` / Public: `public_repo` |
| `repository_dispatch` + `discover` | `contents: write` + `actions: read` | Private: `repo` / Public: `public_repo` |
| `worflow_dispatch`                 | `actions: write`                    | Private: `repo` / Public: `public_repo` |
| `workflow_dispatch` + `discover`   | `actions: write`                    | Private: `repo` / Public: `public_repo` |

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
