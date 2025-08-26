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

## Conventions & Patterns
- **Services**: Client-side logic is organized in `Services/` (e.g., `CountryService.cs`, `GameService.cs`).
- **Pages**: UI pages are in `Pages/` (e.g., `Map.razor`, `Scoreboard.razor`).
- **Layout**: Shared layouts and navigation in `Layout/` and `Shared/`.
- **Styling**: Component-specific CSS files (e.g., `Map.razor.css`) are colocated with their `.razor` files.
- **Data**: Static data (GeoJSON, sample weather) is in `wwwroot/data/` and `wwwroot/sample-data/`.
- **Interop**: JS interop is centralized in `wwwroot/js/mapInterop.js`.

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

---
For questions or unclear patterns, review the README or ask for clarification.
