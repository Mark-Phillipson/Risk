using System.Net.Http.Json;
using System.Text.Json;
using WorldConquestGame.Shared.Models;

namespace WorldConquestGame.Client.Services;

public class UkCountyService
{
    private readonly HttpClient _http;
    public const string DataPath = "data/uk-counties.geojson";

    public UkCountyService(HttpClient http)
    {
        _http = http;
    }

    public async Task<List<Country>> GetAllAsync()
    {
        var list = new List<Country>();
        try
        {
            var geo = await _http.GetFromJsonAsync<JsonElement>(DataPath);
            if (geo.ValueKind != JsonValueKind.Object || !geo.TryGetProperty("features", out var features) || features.ValueKind != JsonValueKind.Array)
            {
                return list;
            }

            foreach (var feature in features.EnumerateArray())
            {
                if (!feature.TryGetProperty("properties", out var props) || props.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                string code = ReadString(props, "CTYUA22CD");
                if (string.IsNullOrWhiteSpace(code))
                {
                    code = ReadString(props, "ctyua22cd");
                }

                if (string.IsNullOrWhiteSpace(code))
                {
                    // use other known code fallbacks
                    code = ReadString(props, "CTYUA21CD");
                    if (string.IsNullOrWhiteSpace(code)) code = ReadString(props, "ctyua21cd");
                    if (string.IsNullOrWhiteSpace(code)) code = feature.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.Number ? idEl.GetInt32().ToString() : string.Empty;
                }

                if (string.IsNullOrWhiteSpace(code))
                {
                    continue;
                }

                var name = ReadString(props, "CTYUA22NM");
                if (string.IsNullOrWhiteSpace(name)) name = ReadString(props, "ctyua22nm");
                if (string.IsNullOrWhiteSpace(name)) name = ReadString(props, "CTYUA21NM");
                if (string.IsNullOrWhiteSpace(name)) name = ReadString(props, "ctyua21nm");
                if (string.IsNullOrWhiteSpace(name)) name = code;

                var region = ReadString(props, "CTYUA22NMW");
                if (string.IsNullOrWhiteSpace(region)) region = "United Kingdom";

                list.Add(new Country
                {
                    Code = code,
                    Name = name,
                    Region = region,
                    Capital = string.Empty,
                    FlagUrl = string.Empty,
                    IsConquered = false
                });
            }
        }
        catch
        {
            // ignore and return best-effort list
        }

        return list;
    }

    private static string ReadString(JsonElement props, string propertyName)
    {
        if (props.TryGetProperty(propertyName, out var value))
        {
            if (value.ValueKind == JsonValueKind.String)
            {
                return value.GetString() ?? string.Empty;
            }
            if (value.ValueKind == JsonValueKind.Number)
            {
                return value.ToString();
            }
        }
        return string.Empty;
    }
}
