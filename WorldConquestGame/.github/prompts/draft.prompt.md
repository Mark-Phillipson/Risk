Any ideas why this is failing:

Azure Static Web Apps utilizes Oryx to build both static applications and Azure Functions. You can find more details on Oryx here: https://github.com/microsoft/Oryx
---Oryx build logs---


Operation performed by Microsoft Oryx, https://github.com/Microsoft/Oryx
You can report issues at https://github.com/Microsoft/Oryx/issues

Oryx Version: 0.2.20241003.1, Commit: d5352431d933306ccee1be9b5d822c73bf723e9e, ReleaseTagName: 20241003.1

Build Operation ID: a33852da215e89b9
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
0s
0s
