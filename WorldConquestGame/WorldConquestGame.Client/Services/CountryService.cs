using System.Net.Http.Json;
using System.Text.Json;
using WorldConquestGame.Shared.Models;

namespace WorldConquestGame.Client.Services;

public class CountryService
{
    private readonly HttpClient _http;

    public CountryService(HttpClient http)
    {
        _http = http;
    }

    // Load countries from the client-side geojson file (wwwroot/data/countries.geojson)
    public async Task<List<Country>> GetAllAsync()
    {
        try
        {
            // geojson is served relative to the app base
            var geo = await _http.GetFromJsonAsync<JsonElement>("data/countries.geojson");
            var list = new List<Country>();

            if (geo.ValueKind == JsonValueKind.Object && geo.TryGetProperty("features", out var features) && features.ValueKind == JsonValueKind.Array)
            {
                foreach (var f in features.EnumerateArray())
                {
                    string code = string.Empty;
                    string name = string.Empty;
                    if (f.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.String)
                    {
                        code = idProp.GetString() ?? string.Empty;
                    }
                    if (f.TryGetProperty("properties", out var props) && props.ValueKind == JsonValueKind.Object)
                    {
                        if (props.TryGetProperty("name", out var nameProp) && nameProp.ValueKind == JsonValueKind.String)
                        {
                            name = nameProp.GetString() ?? string.Empty;
                        }
                        // also try common iso fields if code is empty
                        if (string.IsNullOrEmpty(code))
                        {
                            if (props.TryGetProperty("iso_a3", out var iso3) && iso3.ValueKind == JsonValueKind.String)
                            {
                                code = iso3.GetString() ?? string.Empty;
                            }
                            else if (props.TryGetProperty("code", out var codeProp) && codeProp.ValueKind == JsonValueKind.String)
                            {
                                code = codeProp.GetString() ?? string.Empty;
                            }
                        }
                    }

                    if (!string.IsNullOrEmpty(name) || !string.IsNullOrEmpty(code))
                    {
                        list.Add(new Country
                        {
                            Name = name ?? string.Empty,
                            Code = code ?? string.Empty,
                            Capital = string.Empty,
                            Region = string.Empty,
                            FlagUrl = string.Empty
                        });
                    }
                }
            }

            // Enrich with capitals where possible using restcountries API (by alpha3 code)
            try
            {
                // collect codes to query (alpha3)
                var codes = list.Where(c => !string.IsNullOrEmpty(c.Code)).Select(c => c.Code).Distinct().ToList();
                if (codes.Any())
                {
                    // restcountries supports multiple codes via /alpha?codes=USA;CAN
                    // but it expects alpha2 or alpha3 concatenated; try to batch in chunks of ~50
                    const int chunkSize = 50;
                    for (int i = 0; i < codes.Count; i += chunkSize)
                    {
                        var chunk = codes.Skip(i).Take(chunkSize);
                        var codeQuery = string.Join(";", chunk);
                        try
                        {
                            var endpoint = $"https://restcountries.com/v3.1/alpha?codes={codeQuery}";
                            var resp = await _http.GetFromJsonAsync<List<JsonElement>>(endpoint);
                            if (resp != null)
                            {
                                foreach (var item in resp)
                                {
                                    string? a3 = null;
                                    string? capital = null;
                                    if (item.TryGetProperty("cca3", out var cca3) && cca3.ValueKind == JsonValueKind.String) a3 = cca3.GetString();
                                    if (item.TryGetProperty("capital", out var cap) && cap.ValueKind == JsonValueKind.Array && cap.GetArrayLength() > 0)
                                    {
                                        capital = cap[0].GetString();
                                    }
                                    if (!string.IsNullOrEmpty(a3) && !string.IsNullOrEmpty(capital))
                                    {
                                        var match = list.FirstOrDefault(c => string.Equals(c.Code, a3, StringComparison.OrdinalIgnoreCase));
                                        if (match != null) match.Capital = capital!;
                                    }
                                }
                            }
                        }
                        catch { /* ignore API errors, capitals are optional */ }
                    }
                }
            }
            catch { }

            return list;
        }
        catch (Exception)
        {
            // If anything fails, return an empty list instead of throwing to keep UI responsive
            return new List<Country>();
        }
    }

    // Try to fetch a capital for a single alpha code (e.g. "RUS"). Returns empty string on failure.
    public async Task<string> GetCapitalByCodeAsync(string code)
    {
        if (string.IsNullOrEmpty(code)) return string.Empty;
        try
        {
            // Use restcountries alpha lookup for a single code
            var endpoint = $"https://restcountries.com/v3.1/alpha?codes={code}";
            var resp = await _http.GetFromJsonAsync<List<JsonElement>>(endpoint);
            if (resp != null && resp.Count > 0)
            {
                var item = resp[0];
                if (item.TryGetProperty("capital", out var cap) && cap.ValueKind == JsonValueKind.Array && cap.GetArrayLength() > 0)
                {
                    return cap[0].GetString() ?? string.Empty;
                }
            }
        }
        catch { }
        return string.Empty;
    }
}
