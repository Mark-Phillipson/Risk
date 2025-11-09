using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using WorldConquestGame.Client;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// Register app services
builder.Services.AddScoped<WorldConquestGame.Client.Services.CountryService>();
builder.Services.AddScoped<WorldConquestGame.Client.Services.GameService>();
builder.Services.AddScoped<WorldConquestGame.Client.Services.StorageService>();
builder.Services.AddScoped<WorldConquestGame.Client.Services.UkCountyService>();
builder.Services.AddScoped<WorldConquestGame.Client.Services.UkCountyGameService>();
builder.Services.AddScoped<WorldConquestGame.Client.Services.KentTownService>();
builder.Services.AddScoped<WorldConquestGame.Client.Services.KentTownGameService>();

await builder.Build().RunAsync();
