using Microsoft.JSInterop;
using System.Linq;

namespace WorldConquestGame.Client.Services;

public class StorageService
{
    private readonly IJSRuntime _js;

    public StorageService(IJSRuntime js)
    {
        _js = js;
    }

    // Generic get/set helpers for localStorage
    public async ValueTask SetItemAsync(string key, string value)
    {
        try { await _js.InvokeVoidAsync("localStorage.setItem", key, value); } catch { }
    }

    public async ValueTask<string?> GetItemAsync(string key)
    {
        try { return await _js.InvokeAsync<string?>("localStorage.getItem", key); } catch { return null; }
    }

    public async ValueTask RemoveItemAsync(string key)
    {
        try { await _js.InvokeVoidAsync("localStorage.removeItem", key); } catch { }
    }

    private const string CountriesKey = "wcg.countries.v1";

    // Persist a list of countries (we store minimal fields: Code, IsConquered, Owner, Color, Capital)
    public async ValueTask SaveCountriesAsync(List<WorldConquestGame.Shared.Models.Country> countries)
    {
        if (countries == null) return;
        try
        {
            var lite = countries.Select(c => new {
                c.Code,
                c.IsConquered,
                c.Owner,
                c.Color,
                c.Capital
            });
            var json = System.Text.Json.JsonSerializer.Serialize(lite);
            await SetItemAsync(CountriesKey, json);
        }
        catch { }
    }

    public async ValueTask<List<WorldConquestGame.Shared.Models.Country>> LoadCountriesAsync()
    {
        try
        {
            var txt = await GetItemAsync(CountriesKey);
            if (string.IsNullOrEmpty(txt)) return new List<WorldConquestGame.Shared.Models.Country>();
            var arr = System.Text.Json.JsonSerializer.Deserialize<List<CountryPersistDto>>(txt);
            if (arr == null) return new List<WorldConquestGame.Shared.Models.Country>();
            return arr.Select(a => new WorldConquestGame.Shared.Models.Country { Code = a.Code ?? string.Empty, IsConquered = a.IsConquered, Owner = a.Owner, Color = a.Color, Capital = a.Capital ?? string.Empty }).ToList();
        }
        catch { return new List<WorldConquestGame.Shared.Models.Country>(); }
    }

    public async ValueTask ClearCountriesAsync()
    {
        await RemoveItemAsync(CountriesKey);
    }

    private class CountryPersistDto { public string? Code { get; set; } public bool IsConquered { get; set; } public string? Owner { get; set; } public string? Color { get; set; } public string? Capital { get; set; } }
}
