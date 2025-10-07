# Copilot Coding Agent Instructions for World Conquest Game

## Project Overview
- **WorldConquestGame.Client**: Blazor WebAssembly frontend. UI logic, pages, layouts, and JS interop live here.
- **WorldConquestGame.Server**: ASP.NET Core backend. Hosts API controllers (e.g., `LeaderboardController.cs`), Entity Framework context (`GameDbContext.cs`), and configuration files.
- **WorldConquestGame.Shared**: Shared C# models (e.g., `Country.cs`) used by both client and server for type safety.

## Architecture & Data Flow
- The client communicates with the server via HTTP APIs (see `Controllers/` in Server).
- Shared models in `WorldConquestGame.Shared/Models/` are referenced by both client and server for consistent data contracts.
- GeoJSON data for countries is loaded from `wwwroot/data/countries.geojson` in the client.
- JS interop for map features is handled via `wwwroot/js/mapInterop.js`.

## Developer Workflows
- **Build**: Use the VS Code task labeled `build` or run `dotnet build WorldConquestGame.sln` from the workspace root.
- **Run Client**: Use `dotnet run --project WorldConquestGame.Client`.
- **Run Server**: Use `dotnet run --project WorldConquestGame.Server`.
- **Debug**: Launch profiles are in `Properties/launchSettings.json` for both client and server.
- **Frontend Hot Reload**: Supported via Blazor WASM tooling.
 - **Terminal in-use note**: If the terminal you're using already has the application running (for example via `dotnet watch run` or `dotnet run`), shut down that terminal or stop the running process (Ctrl+C) before attempting to relaunch; leaving the app running can cause port/process-in-use errors when you try to start a new instance.

## Conventions & Patterns

**Razor File Organization**: When a `.razor` file becomes large, split the C# code into a backend file (code-behind) to improve maintainability. Use the partial class pattern (e.g., `Map.razor.cs` for `Map.razor`).

## Integration Points
- **Bootstrap**: UI styling via `wwwroot/lib/bootstrap/`.
- **Entity Framework**: Server-side data access via `GameDbContext.cs`.
- **API**: Server exposes REST endpoints in `Controllers/`.

## Examples
- To add a new country property, update `Country.cs` in Shared, then update usages in both Client and Server.
- To add a new API endpoint, create a controller in `WorldConquestGame.Server/Controllers/` and update client service calls.
- To add a new page, create a `.razor` file in `Pages/` and link it in navigation (`NavMenu.razor`).

## Key Files & Directories
- `WorldConquestGame.Client/Services/`: Client logic
- `WorldConquestGame.Server/Controllers/`: API endpoints
- `WorldConquestGame.Shared/Models/`: Shared data models
- `wwwroot/data/`: Static data
- `wwwroot/js/mapInterop.js`: JS interop

When using chat GPT-5 mini please SUMMARIZE your responses.
