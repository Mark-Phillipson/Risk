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
    private const string UkCountiesKey = "wcg.ukcounties.v1";

    private async ValueTask SaveCountryListAsync(string key, List<WorldConquestGame.Shared.Models.Country> countries)
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
            await SetItemAsync(key, json);
        }
        catch { }
    }

    private async ValueTask<List<WorldConquestGame.Shared.Models.Country>> LoadCountryListAsync(string key)
    {
        try
        {
            var txt = await GetItemAsync(key);
            if (string.IsNullOrEmpty(txt)) return new List<WorldConquestGame.Shared.Models.Country>();
            var arr = System.Text.Json.JsonSerializer.Deserialize<List<CountryPersistDto>>(txt);
            if (arr == null) return new List<WorldConquestGame.Shared.Models.Country>();
            return arr.Select(a => new WorldConquestGame.Shared.Models.Country { Code = a.Code ?? string.Empty, IsConquered = a.IsConquered, Owner = a.Owner, Color = a.Color, Capital = a.Capital ?? string.Empty }).ToList();
        }
        catch { return new List<WorldConquestGame.Shared.Models.Country>(); }
    }

    // Persist a list of countries (we store minimal fields: Code, IsConquered, Owner, Color, Capital)
    public ValueTask SaveCountriesAsync(List<WorldConquestGame.Shared.Models.Country> countries) => SaveCountryListAsync(CountriesKey, countries);

    public ValueTask<List<WorldConquestGame.Shared.Models.Country>> LoadCountriesAsync() => LoadCountryListAsync(CountriesKey);

    public async ValueTask ClearCountriesAsync()
    {
        await RemoveItemAsync(CountriesKey);
    }

    public ValueTask SaveUkCountiesAsync(List<WorldConquestGame.Shared.Models.Country> counties) => SaveCountryListAsync(UkCountiesKey, counties);

    public ValueTask<List<WorldConquestGame.Shared.Models.Country>> LoadUkCountiesAsync() => LoadCountryListAsync(UkCountiesKey);

    public async ValueTask ClearUkCountiesAsync()
    {
        await RemoveItemAsync(UkCountiesKey);
    }

    private class CountryPersistDto { public string? Code { get; set; } public bool IsConquered { get; set; } public string? Owner { get; set; } public string? Color { get; set; } public string? Capital { get; set; } }
}
