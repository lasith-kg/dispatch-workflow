# GitHub Action for Dispatching Workflows

A **universal** action that supports dispatching workflows with either the `workflow_dispatch` or `repository_dispatch` event. Additionally, this action can be configured to **discover** the Run ID of a dispatched workflow through a **efficient** and **accurate** correlation algorithm.

The latter algorithm was designed as a workaround for a [technical limitation](https://github.com/orgs/community/discussions/9752#discussioncomment-1964203) that prevents the dispatch APIs from returning a Run ID.

There was a need for this action as currently available actions...

- Support the `workflow_dispatch` or `repository_dispatch` event, **but not both**
- Use Run ID extraction algorithms that are either **API-intensive** or **unreliable** on repositories that experience a high velocity of workflows

# Acknowledgements

This GitHub Action is a fork of [`codex-/return-dispatch`](https://github.com/Codex-/return-dispatch). This action supported the ability to extract a Run ID, but exclusively supported the `workflow_dispatch` method. I decided to fork this action as it had an intuitive code-base and excellent testing philosophy.

From a **compatibility** and **performance** perspective, this GitHub Action superseedes [`codex-/return-dispatch`](https://github.com/Codex-/return-dispatch), as it additionally supports the `repository_dispatch` method and uses a more efficient algorithm to extract the Run ID for a dispatched workflow

# Usage

## Creating Dispacth Events

### `workflow_dispatch`

```yaml
steps:
  - uses: lasith-kg/dispatch-workflow@v1
    id: workflow-dispatch
    name: "Dispatch Workflow using workflow_dispatch Method"
    with:
      dispatch-method: workflow_dispatch
      repo: repository-name
      owner: repository-owner
      ref: refs/heads/main # or main
      workflow: automation-test.yml # Or Workflow ID
      token: ${{ secrets.TOKEN }} # GitHub Token With Relevant Permissions
      workflow-inputs: |
        {
          "string-type": "placeholder",
          "number-type": "1"            // Workaround for 'Number' types
          "boolean-type": "true"        // Workaround for 'Boolean' types
        }
```

### `repository_dispatch`

```yaml
steps:
  - uses: lasith-kg/dispatch-workflow@v1
    id: repository-dispatch
    name: "Dispatch Workflow using repository_dispatch Method"
    with:
      dispatch-method: repository_dispatch
      repo: repository-name
      owner: repository-owner
      event-type: deploy # Event To Trigger From Workflow
      token: ${{ secrets.TOKEN }} # GitHub Token With Relevant Permissions
      workflow-inputs: |
        {
          "string-type": "placeholder",
          "nested": {                    // Supports Nesting
            "number-type": 1,            // Supports Native 'Number' types
            "boolean-type": true,        // Supports Native 'Boolean' types
          }
        }
```

## Receiving Dispatch Events

### `workflow_dispatch`

```yaml
# .github/workflows/automation-test.yml [refs/heads/main]
name: Workflow Name
on:
  workflow_dispatch:
    inputs:
      string-type:
        description: An input of type 'String'
        required: true
        type: string
      number-type:
        description: An input of type 'Number'
        type: number
      boolean-type:
        description: An input of type 'Boolean'
        type: boolean

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Echo Inputs
        run: |
          echo "${{ inputs.string-type }}" # "placeholder"
          if [[ "${{ inputs.number-type }}" -gt -1 ]]; then echo "🟢"; fi       # 🟢
          if [[ "${{ inputs.boolean-type }}" == "true" ]]; then echo "🟢"; fi   # 🟢
```

### `repository_dispatch`

```yaml
name: Workflow Name
on:
  repository_dispatch:
    types:
      - deploy

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Echo Inputs
        run: |
          echo "${{ github.event.client_payload.string-type }}" # "placeholder"
          if [[ "${{ github.event.client_payload.nested.number-type }}" -gt -1 ]]; then echo "🟢"; fi      # 🟢
          if [[ "${{ github.event.client_payload.nested.boolean-type }}" == "true" ]]; then echo "🟢"; fi  # 🟢
```

## Dicovery

One of the drawbacks with both workflow dispatch methods, is that they do not natively return a Run ID that allows us to query for the status of our dispatched workflow. This technical limitation is discussed more in-depth in this [community discussion](https://github.com/orgs/community/discussions/9752#discussioncomment-1964203). We can work around this by encorporating a **Distinct ID** into our workflow dispatch event. We then have the ability to **discover** the dispatched workflow, from all workflow runs, by correlating it to this **Distinct ID**.

This functionality is **disabled by default**, but can be enabled with the `discover: true` configuration. The receiving workflow must then be modified appropriated to intercept this **Distinct ID**.

### Creating Dispatch Events with Discovery

```yaml
steps:
  - uses: lasith-kg/dispatch-workflow@v1
    id: dispatch-with-discovery
    name: "Dispatch Workflow With Discovery"
    with:
      ...
      discover: true
      discover-timeout-seconds: 30  # Optional: Default to 30 seconds
  - id: echo-run-id-url
    name: "Echo Run ID and Run URL"
    run: |
      echo "${{ steps.dispatch-with-discovery.outputs.run-id }}"
      echo "${{ steps.dispatch-with-discovery.outputs.run-url }}"
```

### Receiving Events with Discovery

On September 26, 2022, GitHub introduced the ability to set [dynamic names for workflow runs](https://github.blog/changelog/2022-09-26-github-actions-dynamic-names-for-workflow-runs/). The new `run-name` attribute will accept expressions, thus allowing us to inject the **Distinct ID** into the queryable view.

The expression to expose the **Distinct ID** in the `run-name` depends on what dispatch method you are using. The included expressions have been configured in a way to return a placeholder value `N/A` if a **Distinct ID** is not available.

#### `workflow_dispatch`

```yaml
name: Workflow Name
run-name: Workflow Name [${{ inputs.distinct_id && inputs.distinct_id || 'N/A' }}]

on:
  workflow_dispatch:
    inputs:
      distinct_id:
        description: "Distinct ID"
        required: false
```

#### `repository_dispatch`

```yaml
name: Workflow Name
run-name: >
  Workflow Name [${{
    github.event.client_payload.distinct_id &&
    github.event.client_payload.distinct_id || 'N/A' }}]

on:
  repository_dispatch:
    types:
      - deploy
```

# Permissions

Dispatching a Workflow requires an authenticated `GITHUB_TOKEN`. The required permissions for this `GITHUB_TOKEN` depends on the following factors...

- **Dispatch Method**: `repository_dispatch`, `workflow_dispatch`
- **Discovery**: `true`, `false`
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

| Mode                                      | Fine Grained Tokens                 | Personal Access Token (Classic)         |
| ----------------------------------------  | ----------------------------------- | --------------------------------------- |
| `repository_dispatch`                     | `contents: write`                   | Private: `repo` / Public: `public_repo` |
| `repository_dispatch` + `discovery: true` | `contents: write` + `actions: read` | Private: `repo` / Public: `public_repo` |
| `worflow_dispatch`                        | `actions: write`                    | Private: `repo` / Public: `public_repo` |
| `workflow_dispatch` + `discovery: true`   | `actions: write`                    | Private: `repo` / Public: `public_repo` |

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
| `discover-timeout-seconds` | Time until giving up on the discovery of the dispatched workflow and corresponding Run ID                                             | `false`       | `30`   |

# Outputs

By default, this GitHub Action has no outputs. However, when discovery mode is **enabled**, the Run ID and Run URL become exposed as outputs. With the Run ID, you can create some powerful automation where the parent workflow can wait for the status of the child workflow using the [`Codex-/await-remote-run`](https://github.com/Codex-/await-remote-run) GitHub Action.

| Name      | Description                                    |
| --------- | ---------------------------------------------- |
| `run-id`  | The Run ID of the workflow that was dispatched |
| `run-url` | The URL of the workflow that was dispatched    |

```yaml
steps:
  - uses: lasith-kg/dispatch-workflow@v1
    id: wait-repository-dispatch
    name: 'Dispatch Using repository_dispatch Method And Wait For Run-ID'
    with:
      dispatch-method: 'repository_dispatch'
      event-type: 'deploy'
      repo: ${{ github.event.repository.name }}
      owner: ${{ github.repository_owner }}
      token: ${{ secrets.GITHUB_TOKEN }}
      discover: true
  - name: Await Run ID ${{ steps.wait-repository-dispatch.outputs.run-id }}
    uses: Codex-/await-remote-run@v1
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      repo: ${{ github.event.repository.name }}
      owner: ${{ github.repository_owner }}
      run_id: ${{ steps.wait-repository-dispatch.outputs.run-id }}
      run_timeout_seconds: 30 # Optional
      poll_interval_ms: 5000 # Optional
```

# Workflow Inputs

This action supports the ability to provide workflow inputs for both the `repository_dispatch` and `workflow_dispatch` method. However, both methods have their unique limitations.

## `repository_dispatch`

> Source: [peter-evans/repository-dispatch](https://github.com/peter-evans/repository-dispatch#client-payload) # Client Payload

The [Create a repository dispatch event](https://docs.github.com/en/free-pro-team@latest/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-dispatch-event) API call allows a maximum of **10** top-level properties in the workflow inputs JSON. If you use more than that you will see an error message like the following.

```
No more than 10 properties are allowed; 14 were supplied.
```

For example, this payload will fail because the `github` object has more than **10** top-level properties.

```yaml
workflow-inputs: ${{ toJson(github) }}
```

A simple work-around is that you can simply wrap the payload in a single top-level property. The following payload will succeed.

```yaml
workflow-inputs: '{"github": ${{ toJson(github) }}}'
```

Additionally, there is a limitation on the total data size of the client-payload. A very large payload may result in the following error

```
client_payload is too large
```

## `workflow_dispatch`

The [Create a workflow dispatch event](https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#create-a-workflow-dispatch-event) API call also sets the maximum number of top-level properties in the workflow inputs JSON to **10**. Any default properties configured in the workflow file will be considered towards this count when inputs are omitted.

An additional requirement is that all top-level properties **must** be a `string`. Any inputs represented as a `number` or `boolean` will get **rejected**. Therefore values of these
types must be wrapped in **quotes** to successfully dispatch the workflow.

```yaml
# Invalid ❌
  - uses: lasith-kg/dispatch-workflow@v1
    id: workflow-dispatch
    name: 'Dispatch Using workflow_dispatch Method'
    with:
      dispatch-method: 'workflow_dispatch'
      ...
      workflow-inputs: |
        {
          "foo": true,
          "bar: 1
        }

# Valid 🟢
  - uses: lasith-kg/dispatch-workflow@v1
    id: workflow-dispatch
    name: 'Dispatch Using workflow_dispatch Method'
    with:
      dispatch-method: 'workflow_dispatch'
      ...
      workflow-inputs: |
        {
          "foo": "true",
          "bar: "1"
        }
```
