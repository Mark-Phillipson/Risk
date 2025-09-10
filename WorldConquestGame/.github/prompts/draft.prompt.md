Run Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ***
    repo_token: ***
    action: upload
    app_location: ./WorldConquestGame
    output_location: wwwroot
/usr/bin/docker run --name ac2e054f5cbf6c664ded92c2d4fe71f5f82d_3d3181 --label 09ac2e --workdir /github/workspace --rm -e "INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN" -e "INPUT_REPO_TOKEN" -e "INPUT_ACTION" -e "INPUT_APP_LOCATION" -e "INPUT_API_LOCATION" -e "INPUT_OUTPUT_LOCATION" -e "INPUT_API_BUILD_COMMAND" -e "INPUT_APP_ARTIFACT_LOCATION" -e "INPUT_APP_BUILD_COMMAND" -e "INPUT_ROUTES_LOCATION" -e "INPUT_SKIP_APP_BUILD" -e "INPUT_CONFIG_FILE_LOCATION" -e "INPUT_SKIP_API_BUILD" -e "INPUT_PRODUCTION_BRANCH" -e "INPUT_DEPLOYMENT_ENVIRONMENT" -e "INPUT_IS_STATIC_EXPORT" -e "INPUT_DATA_API_LOCATION" -e "INPUT_GITHUB_ID_TOKEN" -e "HOME" -e "GITHUB_JOB" -e "GITHUB_REF" -e "GITHUB_SHA" -e "GITHUB_REPOSITORY" -e "GITHUB_REPOSITORY_OWNER" -e "GITHUB_REPOSITORY_OWNER_ID" -e "GITHUB_RUN_ID" -e "GITHUB_RUN_NUMBER" -e "GITHUB_RETENTION_DAYS" -e "GITHUB_RUN_ATTEMPT" -e "GITHUB_ACTOR_ID" -e "GITHUB_ACTOR" -e "GITHUB_WORKFLOW" -e "GITHUB_HEAD_REF" -e "GITHUB_BASE_REF" -e "GITHUB_EVENT_NAME" -e "GITHUB_SERVER_URL" -e "GITHUB_API_URL" -e "GITHUB_GRAPHQL_URL" -e "GITHUB_REF_NAME" -e "GITHUB_REF_PROTECTED" -e "GITHUB_REF_TYPE" -e "GITHUB_WORKFLOW_REF" -e "GITHUB_WORKFLOW_SHA" -e "GITHUB_REPOSITORY_ID" -e "GITHUB_TRIGGERING_ACTOR" -e "GITHUB_WORKSPACE" -e "GITHUB_ACTION" -e "GITHUB_EVENT_PATH" -e "GITHUB_ACTION_REPOSITORY" -e "GITHUB_ACTION_REF" -e "GITHUB_PATH" -e "GITHUB_ENV" -e "GITHUB_STEP_SUMMARY" -e "GITHUB_STATE" -e "GITHUB_OUTPUT" -e "RUNNER_OS" -e "RUNNER_ARCH" -e "RUNNER_NAME" -e "RUNNER_ENVIRONMENT" -e "RUNNER_TOOL_CACHE" -e "RUNNER_TEMP" -e "RUNNER_WORKSPACE" -e "ACTIONS_RUNTIME_URL" -e "ACTIONS_RUNTIME_TOKEN" -e "ACTIONS_CACHE_URL" -e "ACTIONS_RESULTS_URL" -e GITHUB_ACTIONS=true -e CI=true -v "/var/run/docker.sock":"/var/run/docker.sock" -v "/home/runner/work/_temp/_github_home":"/github/home" -v "/home/runner/work/_temp/_github_workflow":"/github/workflow" -v "/home/runner/work/_temp/_runner_file_commands":"/github/file_commands" -v "/home/runner/work/Risk/Risk":"/github/workspace" 09ac2e:054f5cbf6c664ded92c2d4fe71f5f82d
DeploymentId: e4146ad0-b0ab-4bc1-a43b-9594f7727d33

Try to validate location at: '/github/workspace/./WorldConquestGame'.
App Directory Location: './WorldConquestGame' was found.
Try to validate location at: '/github/workspace/swa-db-connections'.
Looking for event info
Starting to build app with Oryx
Azure Static Web Apps utilizes Oryx to build both static applications and Azure Functions. You can find more details on Oryx here: https://github.com/microsoft/Oryx
---Oryx build logs---


Operation performed by Microsoft Oryx, https://github.com/Microsoft/Oryx
You can report issues at https://github.com/Microsoft/Oryx/issues

Oryx Version: 0.2.20241003.1, Commit: d5352431d933306ccee1be9b5d822c73bf723e9e, ReleaseTagName: 20241003.1

Build Operation ID: a8aff92bb17872e8
OS Type           : bullseye
Image Type        : githubactions

Detecting platforms...
Could not detect any platform in the source directory.
Error: Could not detect the language from repo.


---End of Oryx build logs---
Oryx was unable to determine the build steps. Continuing assuming the assets in this folder are already built. If this is an unexpected behavior please contact support.
Finished building app with Oryx
Failed to find a default file in the app artifacts folder (/). Valid default files: index.html,Index.html.
If your application contains purely static content, please verify that the variable 'app_location' in your workflow file points to the root of your application.
If your application requires build steps, please validate that a default file exists in the build output directory.


For further information, please visit the Azure Static Web Apps documentation at https://docs.microsoft.com/en-us/azure/static-web-apps/
If you believe this behavior is unexpected, please raise a GitHub issue at https://github.com/azure/static-web-apps/issues/
Exiting
1s
0s
